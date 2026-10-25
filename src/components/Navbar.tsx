import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Home as HomeIcon, 
  PlaySquare, 
  FileText, 
  Shield, 
  User as UserIcon, 
  Crown,
  LogOut,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenSubscribe: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onOpenAuth,
  onOpenSubscribe,
  onLogout
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === 'master_admin' || currentUser?.role === 'admin';
  const isMaster = currentUser?.role === 'master_admin';

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <>
      {/* Top Header matching reference */}
      <header className="sticky top-0 z-40 w-full border-b border-blue-500/10 bg-[#05070D]/90 backdrop-blur-md transition-all">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-12 sm:h-13 flex items-center justify-between">
          
          {/* Logo Branding */}
          <div 
            onClick={() => onNavigate('home')} 
            className="flex items-center gap-2 cursor-pointer group select-none"
          >
            <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 p-[1px] shadow-sm shadow-blue-900/30">
              <div className="w-full h-full bg-[#05070D] rounded-[7px] flex items-center justify-center">
                <Play className="w-3 h-3 text-cyan-400 fill-cyan-400 ml-0.5" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="brand-font text-base sm:text-lg font-bold tracking-tight text-white flex items-center">
                Skill<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Flix</span>
              </span>
              <span className="text-[8px] font-bold tracking-wider uppercase px-1 py-0.2 rounded bg-blue-500/10 text-cyan-300 border border-blue-500/30">
                PRO
              </span>
            </div>
          </div>

          {/* Right Header Navigation & Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1 mr-2">
              <button
                onClick={() => onNavigate('home')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  currentView === 'home'
                    ? 'text-cyan-400 bg-blue-500/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('videos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  currentView === 'videos'
                    ? 'text-cyan-400 bg-blue-500/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Videos
              </button>
              <button
                onClick={() => onNavigate('pdfs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  currentView === 'pdfs'
                    ? 'text-cyan-400 bg-blue-500/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                PDFs
              </button>
              {isAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    currentView === 'admin'
                      ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                      : 'text-amber-400/80 hover:text-amber-300'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              )}
            </div>

            {/* Subscribe / Pass Button */}
            {!currentUser?.hasAllAccess && (
              <button
                onClick={onOpenSubscribe}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 fill-black text-black" />
                <span>All-Access (₹999)</span>
              </button>
            )}

            {/* User Avatar dropdown */}
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <div
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-blue-500/40 p-[1px] cursor-pointer hover:border-cyan-400 transition-colors shadow-sm bg-gradient-to-tr from-blue-700 to-cyan-500"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#0B0F19] flex items-center justify-center text-cyan-300 text-xs font-bold uppercase">
                      {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                    </div>
                  )}
                </div>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#090D16] border border-blue-500/20 shadow-2xl p-2 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
                      <span className="font-bold text-white block truncate">
                        {currentUser.displayName}
                      </span>
                      <span className="text-[11px] text-cyan-300/80 font-mono block truncate">
                        {currentUser.email}
                      </span>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-cyan-300 border border-blue-500/20">
                        {isMaster ? 'Master Admin' : isAdmin ? 'Admin' : currentUser.hasAllAccess ? 'All-Access Active' : 'Free Member'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate('profile');
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Student Dashboard</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          onNavigate('admin');
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition-colors text-left font-semibold"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span>Admin Console</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onOpenSubscribe();
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Subscription Passes</span>
                    </button>

                    <div className="border-t border-zinc-800/80 my-1" />

                    <button
                      onClick={() => {
                        onLogout();
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs tracking-wide transition-all cursor-pointer active:scale-95 shadow-md shadow-blue-600/20"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Persistent Bottom Navigation Bar on Mobile (matching Screenshot 2 & 5) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#05070D]/95 border-t border-blue-500/15 backdrop-blur-md px-1 py-1.5 flex items-center justify-around safe-bottom shadow-lg shadow-black">
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center py-0.5 px-2.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'home' || currentView === 'category-detail'
              ? 'text-cyan-400 font-semibold bg-blue-500/10'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <HomeIcon className={`w-4 h-4 mb-0.5 ${currentView === 'home' || currentView === 'category-detail' ? 'text-cyan-400' : 'text-zinc-400'}`} />
          <span className="text-[9px] tracking-tight">Home</span>
        </button>

        <button
          onClick={() => onNavigate('videos')}
          className={`flex flex-col items-center justify-center py-0.5 px-2.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'videos'
              ? 'text-cyan-400 font-semibold bg-blue-500/10'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <PlaySquare className={`w-4 h-4 mb-0.5 ${currentView === 'videos' ? 'text-cyan-400' : 'text-zinc-400'}`} />
          <span className="text-[9px] tracking-tight">Videos</span>
        </button>

        <button
          onClick={() => onNavigate('pdfs')}
          className={`flex flex-col items-center justify-center py-0.5 px-2.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'pdfs'
              ? 'text-cyan-400 font-semibold bg-blue-500/10'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileText className={`w-4 h-4 mb-0.5 ${currentView === 'pdfs' ? 'text-cyan-400' : 'text-zinc-400'}`} />
          <span className="text-[9px] tracking-tight">PDFs</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className={`flex flex-col items-center justify-center py-0.5 px-2.5 rounded-xl transition-all cursor-pointer ${
              currentView === 'admin'
                ? 'text-amber-400 font-semibold bg-amber-500/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className={`w-4 h-4 mb-0.5 ${currentView === 'admin' ? 'text-amber-400' : 'text-zinc-400'}`} />
            <span className="text-[9px] tracking-tight">Admin</span>
          </button>
        )}

        <button
          onClick={() => {
            if (currentUser) {
              onNavigate('profile');
            } else {
              onOpenAuth();
            }
          }}
          className={`flex flex-col items-center justify-center py-0.5 px-2.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'profile'
              ? 'text-cyan-400 font-semibold bg-blue-500/10'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <UserIcon className={`w-4 h-4 mb-0.5 ${currentView === 'profile' ? 'text-cyan-400' : 'text-zinc-400'}`} />
          <span className="text-[9px] tracking-tight">Profile</span>
        </button>
      </nav>
    </>
  );
};
