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
  const [authMethod, setAuthMethod] = useState<AuthMethod>('google');

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
      <div className="relative w-full max-w-4xl bg-[#050B1B] border border-blue-500/50 rounded-[28px] sm:rounded-[36px] shadow-[0_0_55px_rgba(29,78,216,0.16)] p-6 sm:p-10 text-slate-100 my-5">
        
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
        <div className="text-center mb-7">
          <div className="w-20 h-20 rounded-[26px] bg-gradient-to-br from-cyan-400 via-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-[0_0_38px_rgba(59,130,246,0.5)] ring-1 ring-white/20">
            <svg className="w-10 h-10 text-cyan-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="m8 5 12 7-12 7V5Z" /></svg>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isForgotPassword 
              ? 'Reset Password' 
              : isRegister 
                ? 'Create Your Skill-Flix Account' 
                : 'Sign In to Skill-Flix'}
          </h2>
          <p className="text-sm sm:text-lg text-slate-400 mt-3">
            Choose how you want to continue
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {/* Reference-style Google button and OR divider */}
        {!isForgotPassword && (
          <div className="mb-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full rounded-2xl border-2 border-cyan-400 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-4 py-4 text-white shadow-[0_0_24px_rgba(37,99,235,0.25)] transition hover:brightness-110 disabled:opacity-60"
            >
              <span className="flex min-h-[34px] items-center justify-center gap-4 text-base sm:text-lg font-bold">
                {loading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <svg className="h-8 w-8 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                      <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                      <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </span>
            </button>

            <div className="my-7 flex items-center gap-5 text-base font-medium text-slate-400">
              <span className="h-px flex-1 bg-blue-300/40" />
              <span>OR</span>
              <span className="h-px flex-1 bg-blue-300/40" />
            </div>
          </div>
        )}

        {/* METHOD 3: EMAIL & PASSWORD (LOGIN / REGISTER / FORGOT) */}
        {true && (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
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
              <label className="text-sm sm:text-base font-semibold text-slate-200 block mb-2">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full bg-[#050B1B]/90 border border-blue-400/40 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 rounded-2xl pl-12 pr-4 py-4 text-sm sm:text-base text-white placeholder:text-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm sm:text-base font-semibold text-slate-200">Password</label>
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
                    placeholder="Enter your password"
                    className="w-full bg-[#050B1B]/90 border border-blue-400/40 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 rounded-2xl pl-12 pr-12 py-4 text-sm sm:text-base text-white placeholder:text-slate-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:brightness-110 disabled:opacity-50 text-white text-base sm:text-lg font-bold shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all cursor-pointer"
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
