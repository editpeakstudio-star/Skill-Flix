import React from 'react';
import { 
  User, 
  Crown, 
  Shield, 
  CheckCircle, 
  Clock, 
  Lock, 
  LogOut, 
  Layers, 
  PlayCircle,
  CreditCard,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { UserProfile, Category, VideoLesson, PaymentRequest } from '../types';
import { logoutUser, getWatchProgress } from '../services/firebase';
import { useToast } from '../components/Toast';

interface ProfileViewProps {
  currentUser: UserProfile | null;
  categories: Category[];
  videos: VideoLesson[];
  paymentRequests: PaymentRequest[];
  onOpenSubscribe: () => void;
  onOpenAuth: () => void;
  onNavigate: (view: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  categories,
  videos,
  paymentRequests,
  onOpenSubscribe,
  onOpenAuth,
  onNavigate
}) => {
  const { showToast } = useToast();
  const watchProgress = getWatchProgress();

  const handleLogout = async () => {
    try {
      await logoutUser();
      showToast('Logged out successfully', 'info');
    } catch (e: any) {
      showToast(e.message || 'Logout failed', 'error');
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-[#090D18] border border-white/[0.08] text-center max-w-md mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Student Account Portal</h2>
        <p className="text-xs text-slate-400 mb-6">
          Sign in to track your learning progress, check subscription access, and review submitted payment proofs.
        </p>
        <button
          onClick={onOpenAuth}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all"
        >
          Sign In or Register
        </button>
      </div>
    );
  }

  const completedVideos = videos.filter(v => watchProgress[v.id]);
  const userRequests = paymentRequests.filter(r => r.uid === currentUser.uid || r.userEmail === currentUser.email);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      
      {/* Profile Card */}
      <div className="p-6 rounded-3xl bg-[#090D18] border border-white/[0.08] shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold uppercase shadow-lg shadow-blue-600/20">
              {currentUser.displayName ? currentUser.displayName[0] : 'U'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white">
                  {currentUser.displayName}
                </h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                  currentUser.role === 'master_admin'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : currentUser.role === 'admin'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  {currentUser.role === 'master_admin' ? 'Master Admin' : currentUser.role === 'admin' ? 'Admin' : 'Student'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">UID: {currentUser.uid}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentUser.role !== 'user' && (
              <button
                onClick={() => onNavigate('admin')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Console</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-red-950/80 hover:text-red-300 text-slate-400 text-xs font-medium border border-white/[0.06] transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subscription & Pass Access Status */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0B1124] to-[#070B14] border border-blue-500/20 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              Membership & Unlocked Passes
            </h2>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            currentUser.hasAllAccess
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : currentUser.subscriptionStatus === 'active'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}>
            {currentUser.hasAllAccess ? 'All-Access Active' : currentUser.subscriptionStatus === 'active' ? 'Category Pass' : 'Free Tier'}
          </span>
        </div>

        {currentUser.hasAllAccess ? (
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold block text-white">Universal All-Access Pass Active</span>
                <span className="text-[11px] text-emerald-400/80">
                  Unlimited access to all video editing categories, masterclasses, and PDF downloads.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-[#05070D] border border-white/[0.08] gap-4">
              <div>
                <span className="text-xs font-bold text-white block">
                  Category Passes Unlocked ({currentUser.allowedCategories?.length || 0})
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {currentUser.allowedCategories?.length
                    ? categories.filter(c => currentUser.allowedCategories.includes(c.id)).map(c => c.name).join(', ')
                    : 'No individual categories unlocked yet.'}
                </p>
              </div>

              <button
                onClick={onOpenSubscribe}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-extrabold shadow-md transition-all shrink-0"
              >
                <Crown className="w-4 h-4" />
                <span>Get All-Access (₹999)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Learning Progress Summary */}
      <div className="p-6 rounded-3xl bg-[#090D18] border border-white/[0.08] shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              Course Progress ({completedVideos.length} Completed)
            </h2>
          </div>
        </div>

        {completedVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {completedVideos.map(v => (
              <div key={v.id} className="p-3 rounded-xl bg-[#05070D] border border-white/[0.06] flex items-center justify-between">
                <div className="truncate pr-2">
                  <span className="text-[10px] text-blue-400 font-bold uppercase">{v.categoryName}</span>
                  <span className="text-xs font-semibold text-white block truncate">{v.title}</span>
                </div>
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            No lessons completed yet. Watch any masterclass video and tap "Mark Complete" to track progress.
          </p>
        )}
      </div>

      {/* Payment History / Proof Submissions */}
      <div className="p-6 rounded-3xl bg-[#090D18] border border-white/[0.08] shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              Payment Proof Submissions
            </h2>
          </div>
        </div>

        {userRequests.length > 0 ? (
          <div className="space-y-3">
            {userRequests.map(req => (
              <div key={req.id} className="p-3.5 rounded-xl bg-[#05070D] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {req.planType === 'all_access' ? 'All-Access Pass' : req.categoryName} (₹{req.amount})
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      req.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : req.status === 'rejected'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                    UTR: {req.utr} • {new Date(req.submittedAt).toLocaleDateString()}
                  </span>
                  {req.adminNote && (
                    <p className="text-[11px] text-red-300 mt-1">Note: {req.adminNote}</p>
                  )}
                </div>

                {req.status === 'pending' && (
                  <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5" /> Under Admin Review
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            No payments submitted yet.
          </p>
        )}
      </div>

    </div>
  );
};
