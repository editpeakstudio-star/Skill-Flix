import React from 'react';
import { 
  Search, 
  Check, 
  Lock, 
  Folder as FolderIcon, 
  Play, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Category, Folder, VideoLesson, UserProfile } from '../types';

interface HomeViewProps {
  categories: Category[];
  folders?: Folder[];
  videos: VideoLesson[];
  currentUser: UserProfile | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectCategory: (cat: Category) => void;
  onOpenSubscribe: (cat?: Category) => void;
  onNavigate: (view: string) => void;
  onSeedCategories?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  categories,
  folders = [],
  videos,
  currentUser,
  searchQuery,
  onSearchChange,
  onSelectCategory,
  onOpenSubscribe,
  onNavigate,
  onSeedCategories
}) => {
  const isAdmin = currentUser?.role === 'master_admin' || currentUser?.role === 'admin';
  const hasAllAccess = currentUser?.hasAllAccess;

  const isUnlocked = (cat: Category) => {
    if (hasAllAccess || isAdmin) return true;
    const catNameClean = cat.name.toLowerCase().trim();
    const catIdClean = cat.id.toLowerCase().trim();
    return !!(
      currentUser?.allowedCategories?.includes(cat.id) ||
      currentUser?.allowedCategories?.some(c => c.toLowerCase().trim() === catNameClean || c.toLowerCase().trim() === catIdClean)
    );
  };

  // Robust deduplication by canonical key
  const seenKeys = new Set<string>();
  const uniqueCategories = categories.filter(c => {
    const key = (c.slug || c.id || c.name).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  const filteredCategories = uniqueCategories
    .filter(c => (isAdmin ? true : c.isActive !== false))
    .filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="max-w-6xl mx-auto px-2.5 sm:px-5 py-2.5 space-y-3 pb-20 sm:pb-12 animate-in fade-in duration-150">
      
      {/* Top Search bar matching reference */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search category folders or masterclass titles..."
          className="w-full pl-8 pr-7 py-2 rounded-xl bg-[#0B0F19] border border-blue-500/15 focus:border-cyan-400 text-xs text-white placeholder-zinc-500 focus:outline-hidden transition-all shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white cursor-pointer px-1 py-0.5"
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Collections Header (matching Screenshot 2 & 5) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-300">
            CATEGORY COLLECTIONS ({filteredCategories.length})
          </h2>

          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
            >
              + Admin Manage
            </button>
          )}
        </div>

        {/* 2-column mobile, 3-column tablet, 4-column desktop grid (matching Screenshot 2 & 5) */}
        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {filteredCategories.map((cat) => {
              const unlocked = isUnlocked(cat);
              const count = videos.filter(v => v.categoryId === cat.id && (isAdmin || v.isPublished)).length;
              const subCount = folders.filter(f => f.categoryId === cat.id || f.parentId === cat.id).length;

              return (
                <div
                  key={cat.id}
                  onClick={() => onSelectCategory(cat)}
                  className="group relative flex flex-col bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl overflow-hidden shadow-md hover:shadow-black/60 transition-all duration-200 cursor-pointer active:scale-[0.98]"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video w-full overflow-hidden bg-[#05070D]">
                    {cat.thumbnailUrl ? (
                      <img
                        src={cat.thumbnailUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#070B14] to-[#0D1527] text-zinc-500">
                        <span className="text-xs text-zinc-500 font-medium">SkillFlix</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* Top badges (matching Screenshot 2 & 5) */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-zinc-300 border border-white/10 leading-none shadow-xs whitespace-nowrap">
                          {count} {count === 1 ? 'Video' : 'Videos'}
                        </span>
                        {cat.isActive === false && isAdmin && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/30 text-amber-300 border border-amber-500/40 leading-none">
                            Hidden
                          </span>
                        )}
                      </div>

                      {unlocked ? (
                        <div
                          className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border border-emerald-400/40 flex-shrink-0"
                          title="Unlocked"
                        >
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-400 text-black font-bold flex items-center gap-1 shadow-md leading-none whitespace-nowrap">
                          <Lock className="w-2.5 h-2.5 text-black stroke-[2.5]" />
                          <span>₹{cat.price || 499}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer (matching Screenshot 2 & 5) */}
                  <div className="p-3 bg-zinc-900/90 border-t border-white/5 flex items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 truncate">
                      {cat.name}
                    </h3>
                    {subCount > 0 && (
                      <span className="text-[10px] text-zinc-500 shrink-0 font-medium">
                        {subCount} {subCount === 1 ? 'folder' : 'folders'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-14 text-center rounded-2xl bg-[#0B0F19] border border-blue-500/10 p-6 max-w-md mx-auto">
            <FolderIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white mb-1">
              {searchQuery ? `No category found matching "${searchQuery}"` : 'Clean Database'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              {searchQuery
                ? 'Try a different search term.'
                : 'Upload courses in the Admin Panel or initialize the default suites.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              {onSeedCategories && (
                <button
                  type="button"
                  onClick={onSeedCategories}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
                  <span>Initialize 4 Editing Suites</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 cursor-pointer"
              >
                Go to Admin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
