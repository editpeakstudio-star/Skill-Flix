import React, { useState, useRef } from 'react';
import { 
  X, 
  Crown, 
  CheckCircle2, 
  UploadCloud, 
  Image as ImageIcon, 
  Send, 
  Zap, 
  Copy, 
  Check, 
  QrCode, 
  Smartphone, 
  Clock, 
  CheckCircle,
  MessageCircle,
  Phone
} from 'lucide-react';
import { UserProfile, Category, PaymentRequest, PlatformSettings } from '../types';
import { submitPaymentProof, getWhatsAppUrl } from '../services/firebase';
import { useToast } from './Toast';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  selectedCategory?: Category | null;
  settings: PlatformSettings;
  existingRequests: PaymentRequest[];
  onOpenAuth: () => void;
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  selectedCategory,
  settings,
  existingRequests,
  onOpenAuth
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [proofImage, setProofImage] = useState<string | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!isOpen) return null;

  const planType = selectedCategory ? 'category' : 'all_access';
  const planTitle = selectedCategory ? `${selectedCategory.name} Pass` : 'All-Access Pass';
  const amount = selectedCategory ? (selectedCategory.price || 499) : (settings.allAccessPrice || 999);
  
  const effectiveEmail = currentUser?.email || guestEmail;
  const effectiveName = currentUser?.displayName || guestName || effectiveEmail.split('@')[0];

  const upiId = settings.upiId || 'rg570251-1@oksbi';
  const payeeName = settings.payeeName || 'RAVI CHAUHAN';
  const encodedNote = encodeURIComponent(`SkillFlix ${planTitle}`);
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodedNote}`;
  const upiQuery = `pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodedNote}`;
  const phonepeUrl = `phonepe://pay?${upiQuery}`;
  const gpayUrl = `tez://upi/pay?${upiQuery}`;
  const paytmUrl = `paytmmp://pay?${upiQuery}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=2&format=png&data=${encodeURIComponent(upiUrl)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    showToast('UPI ID copied to clipboard!', 'info');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('Image size exceeds 8MB. Please select a smaller screenshot.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setProofImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!effectiveEmail || !effectiveEmail.includes('@')) {
      showToast('Please sign in or enter a valid email address.', 'error');
      return;
    }

    if (!proofImage) {
      showToast('Please select your payment screenshot from Gallery.', 'error');
      fileInputRef.current?.click();
      return;
    }

    try {
      setIsSubmitting(true);
      const generatedUtr = utrNumber.trim() || `UTR_${Date.now().toString().slice(-10)}`;
      await submitPaymentProof({
        uid: currentUser?.uid || `guest_${Date.now()}`,
        userEmail: effectiveEmail.trim().toLowerCase(),
        userName: effectiveName.trim(),
        planType,
        categoryId: selectedCategory?.id,
        categoryName: selectedCategory?.name,
        amount,
        utr: generatedUtr,
        proofUrl: proofImage
      });

      showToast(`Payment proof of ₹${amount} for ${planTitle} submitted! Admin will verify shortly.`, 'success');
      setProofImage(null);
      setUtrNumber('');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit payment proof.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Main Subscribe Modal matching Screenshot 6 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
        <div className="relative w-full max-w-md bg-[#090D18] border border-blue-500/25 rounded-2xl shadow-2xl p-4 sm:p-5 text-zinc-100 my-6">
          
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1 rounded-lg text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Brand Header matching Screenshot 6 */}
          <div className="flex items-center gap-2 mb-3.5 select-none">
            <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 p-[1px] shadow-sm shadow-blue-900/30">
              <div className="w-full h-full bg-[#05070D] rounded-[7px] flex items-center justify-center">
                <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[7px] border-l-cyan-400 ml-0.5" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="brand-font text-base font-bold tracking-tight text-white flex items-center">
                Skill<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Flix</span>
              </span>
              <span className="text-[8px] font-bold tracking-wider uppercase px-1 py-0.2 rounded bg-blue-500/10 text-cyan-300 border border-blue-500/30">
                PRO
              </span>
            </div>
          </div>

          {/* AUTO-DETECTED user bar matching Screenshot 6 */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-[#090D16] border border-blue-500/25 flex items-center justify-between gap-2 shadow-xs mb-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-blue-600/30 text-cyan-400 border border-blue-500/40 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {currentUser?.email ? currentUser.email[0].toUpperCase() : 'P'}
              </div>
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-bold tracking-wider text-cyan-400 block leading-tight">
                  AUTO-DETECTED
                </span>
                <span className="text-xs text-white font-mono truncate block">
                  {currentUser?.email || (guestEmail || 'Enter your email below')}
                </span>
              </div>
            </div>

            {!currentUser && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 flex-shrink-0"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Guest Email Field if not logged in */}
          {!currentUser && (
            <div className="mb-3.5 space-y-2">
              <input
                type="email"
                required
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Enter your Gmail to link your pass..."
                className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-xs text-white placeholder-zinc-500 outline-none"
              />
            </div>
          )}

          {/* Universal Plan Card matching Screenshot 6 */}
          <div className="relative p-4 rounded-2xl bg-gradient-to-b from-[#0F172A] to-[#0A0F1D] border border-amber-500/40 shadow-xl overflow-hidden mb-3.5">
            <div className="flex items-start justify-between gap-2 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-1.5 flex items-center justify-center text-black shadow-md shadow-yellow-500/30 flex-shrink-0">
                  <Crown className="w-5 h-5 fill-black text-black" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-sm font-bold text-white tracking-tight">
                      {planTitle}
                    </h2>
                    <span className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.2 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      {selectedCategory ? 'CATEGORY PLAN' : 'UNIVERSAL PLAN'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Fixed lifetime platform access</p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="text-base font-extrabold text-amber-400 leading-none">
                  ₹{amount}
                </span>
                <span className="text-[9px] text-zinc-400 block mt-0.5 font-medium">
                  One-time payment
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-300 leading-relaxed relative z-10 mt-3">
              {selectedCategory
                ? `Unlock all masterclass videos, project files, and PDF resources for ${selectedCategory.name}.`
                : 'Unlock all categories, tutorials, masterclasses, and PDF resources across the entire platform.'}
            </p>

            <div className="pt-2.5 border-t border-zinc-800/80 grid grid-cols-2 gap-1.5 text-[11px] text-zinc-300 relative z-10 mt-3">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>{selectedCategory ? selectedCategory.name : 'All Categories'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>All Video Tutorials</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>All Masterclasses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>All PDF Resources</span>
              </div>
            </div>
          </div>

          {/* Payment Proof Screenshot Section matching Screenshot 6 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-white px-0.5">
              <div className="flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span>Payment Proof Screenshot</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono">
                ₹{amount}
              </span>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Select screenshot box matching Screenshot 6 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-500/30 hover:border-cyan-400/60 rounded-2xl p-4 text-center cursor-pointer bg-[#05070D]/80 transition-colors group"
            >
              {proofImage ? (
                <div className="flex flex-col items-center">
                  <img
                    src={proofImage}
                    alt="Selected Screenshot"
                    className="max-h-28 object-contain rounded-lg border border-white/20 mb-2 shadow-md"
                  />
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Screenshot Attached (Tap to change)
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-white block">
                    Tap to select screenshot from Gallery
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    PhonePe, Google Pay, or Paytm receipt for {planTitle}
                  </span>
                </div>
              )}
            </div>

            {/* Optional UTR Input */}
            <div className="pt-0.5">
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="Optional: Enter 12-digit UPI UTR / Ref Number"
                className="w-full px-3 py-1.5 rounded-xl bg-[#05070D] border border-zinc-800 text-xs text-white font-mono placeholder-zinc-500 outline-none"
              />
            </div>

            {/* Payment Contact & Assistance (Only rendered if a valid contact number is configured) */}
            {settings.paymentPhone && settings.paymentPhone.trim() && (
              <div className="p-2.5 rounded-xl bg-[#05070D] border border-blue-500/20 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6.5 h-6.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9.5px] uppercase font-bold text-zinc-400 tracking-wider block leading-tight">
                      Payment Support Contact
                    </span>
                    <span className="text-white font-mono font-bold text-xs truncate block">
                      {settings.paymentPhone}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${settings.paymentPhone.replace(/\D/g, '')}`}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10.5px] font-semibold border border-zinc-700"
                    title="Call Support"
                  >
                    Call
                  </a>
                  <a
                    href={getWhatsAppUrl(settings.paymentPhone, `Hi Skill-Flix Support, I need help with paying ₹${amount} for ${planTitle}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] font-bold shadow-xs"
                    title="Chat on WhatsApp"
                  >
                    <MessageCircle className="w-3 h-3 fill-white" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            )}

            {/* Buttons matching Screenshot 6 */}
            <div className="space-y-2 pt-1">
              {/* Blue Button: Upload Proof for All-Access Pass */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmitProof()}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Upload Proof for {planTitle}</span>
                  </>
                )}
              </button>

              {/* Yellow-Gold Button: Pay ₹999 for All-Access Pass */}
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
              >
                <Zap className="w-3.5 h-3.5 fill-black text-black" />
                <span>Pay ₹{amount} for {planTitle}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code & Deep Link Modal matching reference */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-[#0B0F19] border border-blue-500/30 rounded-2xl text-zinc-100 shadow-2xl p-4 sm:p-5">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-3.5 right-3.5 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Scan or Tap App to Pay
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">₹{amount} for {planTitle}</p>
            </div>

            {/* QR box matching reference */}
            <div className="p-3.5 rounded-2xl bg-[#05070D] border border-amber-500/35 flex flex-col items-center text-center shadow-inner mb-3">
              <div className="p-2.5 bg-white rounded-xl shadow-xl border border-neutral-300 flex items-center justify-center">
                <img
                  src={qrCodeUrl}
                  alt={`Scan to Pay ₹${amount}`}
                  className="w-44 h-44 object-contain rounded-md"
                />
              </div>

              <div className="mt-2.5 text-[11px] text-zinc-300 flex items-center gap-1.5 font-medium">
                <span className="font-bold text-white">{planTitle}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-amber-400 font-bold">₹{amount}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-[10px] text-emerald-400 font-semibold">Lifetime Access</span>
              </div>

              {/* Payee name indication */}
              <div className="mt-1 text-[10px] text-zinc-400">
                Payee: <span className="text-zinc-200 font-semibold">{payeeName}</span>
              </div>

              {/* UPI copy row */}
              <div className="mt-2 flex items-center justify-between w-full max-w-[260px] px-3 py-1.5 rounded-lg bg-[#0B0F19] border border-zinc-800 text-[11px] font-mono text-zinc-300">
                <span className="truncate">{upiId}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="text-cyan-400 hover:text-cyan-300 p-0.5 cursor-pointer ml-2 flex items-center gap-1 flex-shrink-0"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[10px] font-sans font-semibold">{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Contact Mobile Number on QR Box (Only rendered if configured) */}
              {settings.paymentPhone && settings.paymentPhone.trim() && (
                <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between w-full max-w-[260px] text-[11px]">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-cyan-400" />
                    <span>Helpline:</span>
                  </span>
                  <a
                    href={getWhatsAppUrl(settings.paymentPhone, `Hi, I need assistance paying ₹${amount} for ${planTitle}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 font-mono font-bold flex items-center gap-1 text-[10.5px]"
                  >
                    <MessageCircle className="w-3 h-3 fill-emerald-400" />
                    <span>{settings.paymentPhone}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Direct App Launchers */}
            <div className="space-y-1.5 mb-3">
              <a
                href={phonepeUrl}
                className="w-full p-2 rounded-xl bg-[#05070D] hover:bg-[#5f259f]/20 border border-zinc-800 flex items-center justify-between px-3 text-xs text-white"
              >
                <span>PhonePe</span>
                <span className="text-cyan-400 text-[10px]">Open App →</span>
              </a>

              <a
                href={gpayUrl}
                className="w-full p-2 rounded-xl bg-[#05070D] hover:bg-blue-600/20 border border-zinc-800 flex items-center justify-between px-3 text-xs text-white"
              >
                <span>Google Pay</span>
                <span className="text-cyan-400 text-[10px]">Open App →</span>
              </a>

              <a
                href={paytmUrl}
                className="w-full p-2 rounded-xl bg-[#05070D] hover:bg-cyan-600/20 border border-zinc-800 flex items-center justify-between px-3 text-xs text-white"
              >
                <span>Paytm</span>
                <span className="text-cyan-400 text-[10px]">Open App →</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Done — Upload Screenshot
            </button>
          </div>
        </div>
      )}
    </>
  );
};
