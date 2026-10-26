import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  Category, 
  Folder,
  VideoLesson, 
  PdfResource, 
  PaymentRequest, 
  PlatformSettings, 
  SalesRecord,
  AuditLog
} from './types';
import { 
  subscribeToAuth, 
  subscribeToCategories, 
  subscribeToFolders,
  subscribeToVideos, 
  subscribeToPdfs, 
  subscribeToUsers, 
  subscribeToPaymentRequests, 
  subscribeToSettings, 
  subscribeToSales, 
  subscribeToAuditLogs,
  DEFAULT_SETTINGS,
  logoutUser,
  getWhatsAppUrl
} from './services/firebase';
import { seedEditingSuites } from './services/seed';
import { ToastProvider, useToast } from './components/Toast';
import { Navbar } from './components/Navbar';
import { SubscribeModal } from './components/SubscribeModal';
import { AuthModal } from './components/AuthModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { PdfViewerModal } from './components/PdfViewerModal';
import { HomeView } from './views/HomeView';
import { CategoryDetailView } from './views/CategoryDetailView';
import { VideosView } from './views/VideosView';
import { PdfsView } from './views/PdfsView';
import { ProfileView } from './views/ProfileView';
import { AdminView } from './views/AdminView';
import { MessageCircle, Crown, Shield } from 'lucide-react';

function AppContent() {
  const { showToast } = useToast();

  // Core application data states
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [pdfs, setPdfs] = useState<PdfResource[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Navigation & UI state
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [subscribeCategoryTarget, setSubscribeCategoryTarget] = useState<Category | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<VideoLesson | null>(null);
  const [viewingPdf, setViewingPdf] = useState<PdfResource | null>(null);

  // Subscribe to real-time Firebase / persistence data
  useEffect(() => {
    const unsubAuth = subscribeToAuth((user) => {
      setCurrentUser(user);
      setCurrentView(user?.role === 'admin' || user?.role === 'master_admin' ? 'admin' : 'home');
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Public category listing is available before login.
  // Private content and account data remain restricted to signed-in users.
  useEffect(() => {
    const unsubCats = subscribeToCategories((cats) => setCategories(cats));

    if (!currentUser?.uid) {
      setFolders([]);
      setVideos([]);
      setPdfs([]);
      setUsers([]);
      setPaymentRequests([]);
      setSales([]);
      setAuditLogs([]);
      setSettings(DEFAULT_SETTINGS);

      return () => {
        unsubCats();
      };
    }

    const unsubFolders = subscribeToFolders((flds) => setFolders(flds));
    const unsubSettings = subscribeToSettings((s) => setSettings(s));
    const unsubSales = subscribeToSales((sl) => setSales(sl));
    const unsubAudit = subscribeToAuditLogs((logs) => setAuditLogs(logs));
    const unsubUsers = subscribeToUsers(setUsers);
    const unsubPayments = subscribeToPaymentRequests(setPaymentRequests);
    const canViewDrafts =
      currentUser.role === 'admin' || currentUser.role === 'master_admin';
    const unsubVideos = subscribeToVideos(setVideos, canViewDrafts);
    const unsubPdfs = subscribeToPdfs(setPdfs, canViewDrafts);

    return () => {
      unsubCats();
      unsubFolders();
      unsubSettings();
      unsubSales();
      unsubAudit();
      unsubUsers();
      unsubPayments();
      unsubVideos();
      unsubPdfs();
    };
  }, [currentUser?.uid]);

  const handleOpenSubscribe = (cat?: Category) => {
    setSubscribeCategoryTarget(cat || null);
    setIsSubscribeOpen(true);
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setCurrentView('category-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSeedDefaults = async () => {
    try {
      showToast('Seeding Alight Motion, CapCut, Premiere Pro, and After Effects suites...', 'info');
      await seedEditingSuites();
      showToast('Successfully initialized 4 course suites with structured subfolders and lessons!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to seed categories.', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      showToast('Logged out successfully', 'info');
    } catch (e: any) {
      showToast('Failed to log out', 'error');
    }
  };

  const hasAccessToCategory = (catId?: string): boolean => {
    if (!catId) return !!currentUser?.hasAllAccess;
    if (currentUser?.hasAllAccess || currentUser?.role === 'master_admin' || currentUser?.role === 'admin') return true;
    return !!currentUser?.allowedCategories?.includes(catId);
  };

  return (
    <div className="min-h-screen bg-[#05070D] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans']">
      
      {/* Top Navbar & Mobile Bottom Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSubscribe={() => handleOpenSubscribe()}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-24 sm:pb-12">
        {currentView === 'home' && (
          <HomeView
            categories={categories}
            folders={folders}
            videos={videos}
            currentUser={currentUser}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectCategory={handleSelectCategory}
            onOpenSubscribe={handleOpenSubscribe}
            onNavigate={setCurrentView}
            onSeedCategories={handleSeedDefaults}
          />
        )}

        {currentView === 'category-detail' && selectedCategory && (
          <CategoryDetailView
            category={categories.find(c => c.id === selectedCategory.id) || selectedCategory}
            folders={folders}
            videos={videos}
            pdfs={pdfs}
            currentUser={currentUser}
            onBack={() => setCurrentView('home')}
            onPlayVideo={(v) => setPlayingVideo(v)}
            onViewPdf={(p) => setViewingPdf(p)}
            onOpenSubscribe={handleOpenSubscribe}
          />
        )}

        {currentView === 'videos' && (
          <VideosView
            videos={videos}
            categories={categories}
            currentUser={currentUser}
            searchQuery={searchQuery}
            onPlayVideo={(v) => setPlayingVideo(v)}
            onOpenSubscribe={handleOpenSubscribe}
          />
        )}

        {currentView === 'pdfs' && (
          <PdfsView
            pdfs={pdfs}
            categories={categories}
            currentUser={currentUser}
            searchQuery={searchQuery}
            onViewPdf={(p) => setViewingPdf(p)}
            onOpenSubscribe={handleOpenSubscribe}
          />
        )}

        {currentView === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            categories={categories}
            videos={videos}
            paymentRequests={paymentRequests}
            onOpenSubscribe={() => handleOpenSubscribe()}
            onOpenAuth={() => setIsAuthOpen(true)}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'admin' && (
          <AdminView
            currentUser={currentUser}
            categories={categories}
            folders={folders}
            videos={videos}
            pdfs={pdfs}
            users={users}
            paymentRequests={paymentRequests}
            settings={settings}
            sales={sales}
            auditLogs={auditLogs}
            onNavigate={setCurrentView}
            onSeedDefaults={handleSeedDefaults}
          />
        )}
      </main>

      {/* Floating WhatsApp/Telegram Support Button (Dynamically formatted) */}
      {(settings.paymentPhone || settings.supportWhatsapp) ? (
        <a
          href={getWhatsAppUrl(settings.paymentPhone || settings.supportWhatsapp, 'Hi Skill-Flix Support, I need help with my course access and payment.')}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 font-bold text-xs transition-all hover:scale-105"
          title="WhatsApp Support"
        >
          <MessageCircle className="w-4 h-4 fill-white" />
          <span className="hidden md:inline">WhatsApp Help</span>
        </a>
      ) : settings.supportTelegram ? (
        <a
          href={settings.supportTelegram}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-xl shadow-sky-600/30 font-bold text-xs transition-all hover:scale-105"
          title="Telegram Support"
        >
          <MessageCircle className="w-4 h-4 fill-white" />
          <span className="hidden md:inline">Support Channel</span>
        </a>
      ) : null}

      {/* Modals */}
      <SubscribeModal
        isOpen={isSubscribeOpen}
        onClose={() => setIsSubscribeOpen(false)}
        currentUser={currentUser}
        selectedCategory={subscribeCategoryTarget}
        settings={settings}
        existingRequests={paymentRequests}
        onOpenAuth={() => {
          setIsSubscribeOpen(false);
          setIsAuthOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          setIsAuthOpen(false);
        }}
      />

      <VideoPlayerModal
        isOpen={!!playingVideo}
        onClose={() => setPlayingVideo(null)}
        video={playingVideo}
        allLessons={videos}
        onSelectVideo={(v) => setPlayingVideo(v)}
      />

      <PdfViewerModal
        isOpen={!!viewingPdf}
        onClose={() => setViewingPdf(null)}
        pdf={viewingPdf}
        hasAccess={viewingPdf ? hasAccessToCategory(viewingPdf.categoryId) : false}
        onOpenSubscribe={() => {
          setViewingPdf(null);
          handleOpenSubscribe(categories.find(c => c.id === viewingPdf?.categoryId));
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
