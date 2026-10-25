import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Play, 
  FileText, 
  Lock, 
  CheckCircle, 
  Clock, 
  Crown, 
  Download, 
  Sparkles,
  ExternalLink,
  Folder as FolderIcon, 
  ChevronRight,
  FolderOpen,
  Search,
  X,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { Category, Folder, VideoLesson, PdfResource, UserProfile } from '../types';

interface CategoryDetailViewProps {
  category: Category;
  folders: Folder[];
  videos: VideoLesson[];
  pdfs: PdfResource[];
  currentUser: UserProfile | null;
  onBack: () => void;
  onPlayVideo: (video: VideoLesson) => void;
  onViewPdf: (pdf: PdfResource) => void;
  onOpenSubscribe: (cat?: Category) => void;
}

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({
  category,
  folders,
  videos,
  pdfs,
  currentUser,
  onBack,
  onPlayVideo,
  onViewPdf,
  onOpenSubscribe
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'master_admin' || currentUser?.role === 'admin';
  const hasAllAccess = currentUser?.hasAllAccess;
  const isCategoryUnlocked = hasAllAccess || isAdmin || (currentUser?.allowedCategories?.includes(category.id));

  // Subfolders belonging directly to this category or having it as parentId
  const categoryFolders = useMemo(() => {
    return folders
      .filter(f => f.categoryId === category.id || f.parentId === category.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [folders, category.id]);

  // Current active subfolder if selected
  const activeSubfolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return categoryFolders.find(f => f.id === selectedFolderId) || null;
  }, [categoryFolders, selectedFolderId]);

  // Total videos in this category (only published for students, all for admin)
  const totalCategoryVideos = useMemo(() => {
    return videos.filter(v => v.categoryId === category.id && (isAdmin || v.isPublished)).length;
  }, [videos, category.id, isAdmin]);

  // Total PDFs in this category
  const totalCategoryPdfs = useMemo(() => {
    return pdfs.filter(p => p.categoryId === category.id && (isAdmin || p.isPublished)).length;
  }, [pdfs, category.id, isAdmin]);

  // Filtered videos based on category, selected subfolder, publish state, and search query
  const displayedVideos = useMemo(() => {
    return videos.filter(v => {
      // Must belong to this category
      if (v.categoryId !== category.id) return false;
      // Publish state check
      if (!isAdmin && !v.isPublished) return false;
      // Subfolder filter if selected
      if (selectedFolderId && v.folderId !== selectedFolderId) return false;
      // Search query filtering within category
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = v.title.toLowerCase().includes(q);
        const matchesDesc = (v.description || '').toLowerCase().includes(q);
        const matchesEpisode = (v.episode || '').toLowerCase().includes(q);
        const matchesFolder = (v.folderName || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesEpisode && !matchesFolder) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [videos, category.id, isAdmin, selectedFolderId, searchQuery]);

  // Filtered PDFs based on category and search query
  const displayedPdfs = useMemo(() => {
    return pdfs.filter(p => {
      if (p.categoryId !== category.id) return false;
      if (!isAdmin && !p.isPublished) return false;
      if (selectedFolderId && p.folderId && p.folderId !== selectedFolderId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = (p.description || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [pdfs, category.id, isAdmin, selectedFolderId, searchQuery]);

  const handleVideoClick = (video: VideoLesson) => {
    const canWatch = isCategoryUnlocked || video.isFreePreview;
    if (canWatch) {
      onPlayVideo(video);
    } else {
      onOpenSubscribe(category);
    }
  };

  const handlePdfClick = (pdf: PdfResource) => {
    if (isCategoryUnlocked) {
      onViewPdf(pdf);
    } else {
      onOpenSubscribe(category);
    }
  };

  return (
    <div className="space-y-5 pb-32 sm:pb-24 animate-in fade-in duration-200">
      
      {/* ======================================================== */}
      {/* 1. TOP HEADER & BREADCRUMB NAVIGATION                     */}
      {/* ======================================================== */}
      <div className="space-y-3">
        {/* Back Button and Breadcrumb Trail */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090D18] hover:bg-[#0D1424] text-xs font-semibold text-zinc-300 hover:text-white border border-blue-500/20 transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>Back to Categories</span>
          </button>

          {/* Breadcrumb path */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 overflow-x-auto py-1 scrollbar-none">
            <button
              type="button"
              onClick={onBack}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className={`transition-colors whitespace-nowrap cursor-pointer ${
                !selectedFolderId ? 'text-cyan-400 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {category.name}
            </button>
            {activeSubfolder && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <span className="text-cyan-400 font-bold whitespace-nowrap">
                  {activeSubfolder.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Category Details Banner */}
        <div className="relative rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#090D18] to-[#05070D] border border-blue-500/25 p-4 sm:p-5 shadow-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Category Identity & Icon */}
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-blue-500/30 shadow-md">
                {category.thumbnailUrl ? (
                  <img
                    src={category.thumbnailUrl}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-600/20 text-cyan-400">
                    <FolderIcon className="w-7 h-7" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <FolderIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                    <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight truncate">
                      {activeSubfolder ? activeSubfolder.name : category.name}
                    </h1>
                  </div>

                  {/* Access Status Badge */}
                  {isCategoryUnlocked ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>Full Access Unlocked</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-950/80 text-amber-400 border border-amber-500/30">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-300 line-clamp-1 max-w-2xl">
                  {activeSubfolder?.description || category.description || `Complete masterclass video series and learning materials for ${category.name}.`}
                </p>

                {/* Video and PDF Count Metrics */}
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-2 font-medium">
                  <span className="text-cyan-300 font-semibold">
                    {totalCategoryVideos} {totalCategoryVideos === 1 ? 'Video' : 'Videos'}
                  </span>
                  <span>•</span>
                  <span>{totalCategoryPdfs} {totalCategoryPdfs === 1 ? 'PDF Guide' : 'PDF Guides'}</span>
                  {categoryFolders.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{categoryFolders.length} {categoryFolders.length === 1 ? 'Subfolder' : 'Subfolders'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Unlock Button if Locked */}
            {!isCategoryUnlocked && (
              <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-center">
                <button
                  type="button"
                  onClick={() => onOpenSubscribe(category)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unlock Course (₹{category.price || 299})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Field with Dynamic Placeholder */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search within ${activeSubfolder ? activeSubfolder.name : category.name}...`}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#090D18] border border-blue-500/20 focus:border-cyan-400 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Subfolder Chips / Module Filter (if subfolders exist) */}
        {categoryFolders.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFolderId === null
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-[#090D18] text-zinc-400 hover:text-white border border-blue-500/20'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Lessons ({totalCategoryVideos})</span>
            </button>

            {categoryFolders.map((fld) => {
              const fldVideosCount = videos.filter(v => v.folderId === fld.id && (isAdmin || v.isPublished)).length;
              const isSelected = selectedFolderId === fld.id;

              return (
                <button
                  key={fld.id}
                  type="button"
                  onClick={() => setSelectedFolderId(fld.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-[#090D18] text-zinc-400 hover:text-white border border-blue-500/20'
                  }`}
                >
                  <FolderIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-cyan-400'}`} />
                  <span>{fld.name} ({fldVideosCount})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. VIDEO LESSONS (MATCHING REFERENCE 2-COLUMN GRID)      */}
      {/* ======================================================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
            <span>Video Lessons ({displayedVideos.length})</span>
          </h2>
          {searchQuery && (
            <span className="text-[11px] text-zinc-400">
              Matching "{searchQuery}"
            </span>
          )}
        </div>

        {displayedVideos.length > 0 ? (
          /* Clean 2-column mobile grid, scaling to 3 and 4 columns on desktop */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {displayedVideos.map((video) => {
              const canWatch = isCategoryUnlocked || video.isFreePreview;

              return (
                <div
                  key={video.id}
                  onClick={() => handleVideoClick(video)}
                  className="group rounded-2xl bg-[#090D18] border border-blue-500/15 hover:border-cyan-400/40 transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-lg cursor-pointer hover:-translate-y-0.5"
                >
                  {/* 16:9 Thumbnail Area */}
                  <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to category thumbnail if video thumbnail fails to load
                          (e.target as HTMLImageElement).src = category.thumbnailUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-950/40 to-[#05070D] text-zinc-600">
                        <Play className="w-8 h-8 text-cyan-400/40 mb-1" />
                        <span className="text-[10px] font-mono text-zinc-500">Skill-Flix</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                    {/* Top Row Badges: Small VIDEO badge & Free Preview */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none z-10">
                      <span className="px-1.5 py-0.5 rounded text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider bg-blue-600 text-white backdrop-blur-xs shadow-xs leading-none">
                        VIDEO
                      </span>

                      {video.isFreePreview && (
                        <span className="px-1.5 py-0.5 rounded text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500 text-white shadow-xs leading-none">
                          FREE
                        </span>
                      )}
                    </div>

                    {/* Bottom Right Duration Badge */}
                    <div className="absolute bottom-2 right-2 pointer-events-none z-10">
                      <span className="px-1.5 py-0.5 rounded text-[8.5px] sm:text-[9px] font-mono font-semibold bg-black/85 text-zinc-200 backdrop-blur-xs leading-none border border-white/10 shadow-xs">
                        {video.duration || '15:00'}
                      </span>
                    </div>

                    {/* Locked Overlay if student doesn't have access */}
                    {!canWatch && (
                      <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center z-20">
                        <div className="w-8 h-8 rounded-full bg-black/80 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-1 shadow-md">
                          <Lock className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-[10px] font-bold text-amber-300 leading-tight">
                          Locked • Tap to Unlock
                        </span>
                      </div>
                    )}

                    {/* Play Hover Overlay if unlocked */}
                    {canWatch && (
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20">
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Details Body */}
                  <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Category / Subfolder Label */}
                      <span className="text-[9.5px] sm:text-[10px] font-bold text-cyan-400 uppercase tracking-wider block truncate mb-1">
                        {video.folderName || category.name}
                      </span>

                      {/* Video Title */}
                      <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                        {video.title}
                      </h3>
                    </div>

                    {/* Footer Action and Episode Tag */}
                    <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500 font-mono font-medium">
                        {video.episode || 'EP1'}
                      </span>
                      <span className="text-cyan-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        {canWatch ? 'Play Lesson' : 'Unlock'} →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state for videos */
          <div className="py-12 px-4 rounded-2xl bg-[#090D18] border border-blue-500/15 text-center max-w-md mx-auto">
            <Play className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white mb-1">
              {searchQuery ? 'No matching lessons found' : 'No video lessons in this category'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {searchQuery
                ? `No video matches "${searchQuery}". Try a different keyword.`
                : 'Lessons can be added directly or organized into subfolders in the Admin Panel.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 3. LEARNING MATERIALS & PDF RESOURCES SECTION            */}
      {/* ======================================================== */}
      {displayedPdfs.length > 0 && (
        <section className="space-y-3 pt-4 border-t border-blue-500/15">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-400" />
              <span>Learning Materials & PDFs ({displayedPdfs.length})</span>
            </h2>
            <span className="text-[11px] text-zinc-400">Downloadable Notes & Guides</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedPdfs.map((pdf) => (
              <div
                key={pdf.id}
                onClick={() => handlePdfClick(pdf)}
                className="group p-3.5 rounded-2xl bg-[#090D18] border border-blue-500/15 hover:border-red-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-red-300 transition-colors line-clamp-1">
                      {pdf.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
                      {pdf.description || 'Comprehensive formulas, presets, and study blueprints.'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {pdf.pageCount || 1} Pages • {pdf.fileSize || 'PDF'}
                  </span>
                  <span className={`text-[11px] font-bold flex items-center gap-1 ${
                    isCategoryUnlocked ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {isCategoryUnlocked ? 'Open PDF →' : '🔒 Locked'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Floating Category Subscribe Banner if student is locked */}
      {!isCategoryUnlocked && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 via-[#0B0F19] to-amber-950/20 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">
                Unlock Complete {category.name} Curriculum
              </h4>
              <p className="text-[11px] text-zinc-400">
                Get full instant access to all {totalCategoryVideos} video lessons, subfolders, and PDF resources.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenSubscribe(category)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-xs shadow-md hover:from-amber-500 hover:to-yellow-600 transition-all cursor-pointer whitespace-nowrap"
          >
            Unlock Now • ₹{category.price || 299}
          </button>
        </div>
      )}
    </div>
  );
};
