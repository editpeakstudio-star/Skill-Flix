import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight,
  Phone,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RotateCcw
} from 'lucide-react';
import { 
  loginUser, 
  registerUser, 
  loginWithGoogle, 
  setupRecaptcha, 
  sendPhoneOtp, 
  verifyPhoneOtp, 
  sendPasswordReset, 
} from '../services/firebase';
import { useToast } from './Toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMethod = 'google' | 'phone' | 'email';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');

  // Email form state
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Phone form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Common UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setOtpSent(false);
      setOtpCode('');
      setPhoneNumber('');
      setIsForgotPassword(false);
    } else if (typeof window !== 'undefined' && (window as any).recaptchaVerifier) {
      try { (window as any).recaptchaVerifier.clear(); } catch { /* verifier may already be cleared */ }
      delete (window as any).recaptchaVerifier;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Google Auth Handler
  const handleGoogleLogin = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const user = await loginWithGoogle();
      showToast(user.ownerVerificationPending
        ? 'Owner access requires verified email. Check for a Firebase verification link; if none arrives, send one from Firebase Console → Authentication → Users, then sign out and sign in again.'
        : `Welcome to Skill-Flix, ${user.displayName || user.email}!`, user.ownerVerificationPending ? 'info' : 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed.');
      showToast(err.message || 'Failed to authenticate with Google', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Phone OTP: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorMessage(null);

    const cleanDigits = phoneNumber.trim().replace(/[^0-9]/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Take the 10-digit mobile number (handles accidental 0 or country code paste)
    const mobile10 = cleanDigits.slice(-10);
    const fullNumber = `+91${mobile10}`;

    try {
      setLoading(true);
      // Setup Recaptcha
      const verifier = setupRecaptcha('recaptcha-verifier-box');
      const confirmation = await sendPhoneOtp(fullNumber, verifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setResendCountdown(60);
      showToast(`OTP code sent successfully to +91 ${mobile10}!`, 'success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification SMS.');
      showToast(err.message || 'SMS OTP failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Phone OTP: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorMessage(null);

    if (!confirmationResult) {
      setErrorMessage('Please request an OTP code first.');
      return;
    }

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      const user = await verifyPhoneOtp(confirmationResult, otpCode.trim());
      showToast(`Phone verified! Welcome, ${user.displayName}!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Code might be invalid or expired.');
      showToast(err.message || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 3. Email & Password: Login / Register / Forgot
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (isForgotPassword) {
      try {
        setLoading(true);
        await sendPasswordReset(email);
        showToast('Password reset link sent to your email! Please check your inbox.', 'success');
        setIsForgotPassword(false);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to send password reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      if (isRegister) {
        const user = await registerUser(email, password, name);
        showToast(user.ownerVerificationPending
          ? 'Account created. Owner access requires verified email. Check for a Firebase verification link; if none arrives, send one from Firebase Console → Authentication → Users, then sign out and sign in again.'
          : `Account created! Welcome to Skill-Flix, ${name || email}!`, user.ownerVerificationPending ? 'info' : 'success');
      } else {
        const user = await loginUser(email, password);
        showToast(user.ownerVerificationPending
          ? 'Owner access requires verified email. Check for a Firebase verification link; if none arrives, send one from Firebase Console → Authentication → Users, then sign out and sign in again.'
          : 'Signed in successfully!', user.ownerVerificationPending ? 'info' : 'success');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#090D18] border border-blue-500/25 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 my-8">
        
        {/* Invisible Recaptcha Anchor */}
        <div id="recaptcha-verifier-box" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-700/80 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center mx-auto mb-2.5 shadow-lg shadow-blue-500/30">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            {isForgotPassword 
              ? 'Reset Password' 
              : isRegister 
                ? 'Create Your Skill-Flix Account' 
                : 'Sign In to Skill-Flix'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose your preferred sign-in method to access your masterclasses.
          </p>
        </div>

        {/* 3 Login Options Switcher Tabs */}
        {!isForgotPassword && (
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#05070D] border border-white/[0.08] mb-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => { setAuthMethod('google'); setErrorMessage(null); }}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMethod === 'google'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"/>
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setAuthMethod('phone');
                setErrorMessage(null);
                setPhoneNumber('');
                setOtpSent(false);
                setOtpCode('');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMethod === 'phone'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Phone OTP</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => { setAuthMethod('email'); setErrorMessage(null); }}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMethod === 'email'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {/* METHOD 1: GOOGLE AUTH */}
        {authMethod === 'google' && !isForgotPassword && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-300 text-center">
              Sign in with your Google account for instantaneous, secure access without needing passwords.
            </p>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* METHOD 2: PHONE NUMBER OTP */}
        {authMethod === 'phone' && !isForgotPassword && (
          <div className="space-y-3.5">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Mobile Phone Number
                  </label>
                  <div className="flex items-center rounded-xl bg-[#05070D] border border-white/[0.08] focus-within:border-blue-500 overflow-hidden transition-all">
                    {/* Separate Country Code Prefix */}
                    <div className="flex items-center gap-1.5 px-3 py-2.5 bg-white/[0.03] border-r border-white/[0.08] text-slate-300 select-none shrink-0">
                      <span className="text-sm">🇮🇳</span>
                      <span className="font-mono text-xs font-bold text-white">+91</span>
                    </div>

                    {/* Clean Phone Number Input */}
                    <div className="relative flex-1">
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        required
                        value={phoneNumber}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          setPhoneNumber(digitsOnly);
                        }}
                        placeholder="Enter your mobile number"
                        className="w-full bg-transparent px-3 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none font-mono"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5 block">
                    We will send a 6-digit OTP code to verify your number.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send 6-Digit OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between text-xs text-blue-300">
                  <span className="font-mono">+91 {phoneNumber}</span>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(''); }}
                    className="text-xs text-cyan-400 hover:underline cursor-pointer"
                  >
                    Change Number
                  </button>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Enter 6-Digit OTP Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123456"
                      className="w-full bg-[#05070D] border border-white/[0.08] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-center tracking-widest text-base font-bold text-white placeholder:text-slate-600 outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify OTP & Sign In</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  {resendCountdown > 0 ? (
                    <span className="text-[11px] text-slate-500">
                      Resend OTP in {resendCountdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                    >
                      Resend OTP Code
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* METHOD 3: EMAIL & PASSWORD (LOGIN / REGISTER / FORGOT) */}
        {(authMethod === 'email' || isForgotPassword) && (
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {isRegister && !isForgotPassword && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Chauhan"
                    className="w-full bg-[#05070D] border border-white/[0.08] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-[#05070D] border border-white/[0.08] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none"
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#05070D] border border-white/[0.08] focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {isForgotPassword 
                      ? 'Send Password Reset Link' 
                      : isRegister 
                        ? 'Create Account' 
                        : 'Sign In to Skill-Flix'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Toggle Forgot Password / Register */}
            <div className="text-center pt-3 border-t border-white/[0.06] text-xs text-slate-400">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              ) : isRegister ? (
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Already have an account? <span className="text-blue-400 font-bold">Sign In</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  New to Skill-Flix? <span className="text-blue-400 font-bold">Create Account</span>
                </button>
              )}
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
