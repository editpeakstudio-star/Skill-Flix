import React, { useState } from 'react';
import { Play, Lock, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { VideoLesson, Category, UserProfile } from '../types';

interface VideosViewProps {
  videos: VideoLesson[];
  categories: Category[];
  currentUser: UserProfile | null;
  searchQuery: string;
  onPlayVideo: (video: VideoLesson) => void;
  onOpenSubscribe: (cat?: Category) => void;
}

export const VideosView: React.FC<VideosViewProps> = ({
  videos,
  categories,
  currentUser,
  searchQuery,
  onPlayVideo,
  onOpenSubscribe
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string>('all');

  const isAdmin = currentUser?.role === 'master_admin' || currentUser?.role === 'admin';
  const hasAllAccess = currentUser?.hasAllAccess;

  const isUnlocked = (catId: string) => {
    if (hasAllAccess || isAdmin) return true;
    return !!currentUser?.allowedCategories?.includes(catId);
  };

  const filteredVideos = videos.filter(v => {
    if (!isAdmin && !v.isPublished) return false;
    if (selectedCatId !== 'all' && v.categoryId !== selectedCatId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        v.title.toLowerCase().includes(q) ||
        v.categoryName.toLowerCase().includes(q) ||
        v.episode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Masterclass Video Library
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Explore complete editing tutorials, effect breakdowns, and production techniques.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCatId('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
            selectedCatId === 'all'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-[#090D18] text-slate-400 hover:text-white border border-white/[0.08]'
          }`}
        >
          All Categories ({videos.filter(v => isAdmin || v.isPublished).length})
        </button>

        {categories.map((cat) => {
          const count = videos.filter(v => v.categoryId === cat.id && (isAdmin || v.isPublished)).length;
          const isSelected = selectedCatId === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-[#090D18] text-slate-400 hover:text-white border border-white/[0.08]'
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Videos Grid */}
      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredVideos.map((video) => {
            const unlocked = isUnlocked(video.categoryId) || video.isFreePreview;
            const categoryObj = categories.find(c => c.id === video.categoryId);

            return (
              <div
                key={video.id}
                onClick={() => {
                  if (unlocked) {
                    onPlayVideo(video);
                  } else {
                    onOpenSubscribe(categoryObj);
                  }
                }}
                className="group rounded-2xl bg-[#090D18] border border-white/[0.08] hover:border-blue-500/40 overflow-hidden shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Episode badge */}
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-600/90 text-white shadow">
                    {video.episode || 'EP1'}
                  </span>

                  {/* Duration */}
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-black/80 text-slate-200 backdrop-blur-sm">
                    {video.duration || '15:00'}
                  </span>

                  {/* Free preview pill */}
                  {video.isFreePreview && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/80 text-white shadow">
                      Free Preview
                    </span>
                  )}

                  {/* Lock overlay if locked */}
                  {!unlocked && (
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center">
                      <div className="w-9 h-9 rounded-full bg-black/80 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-1">
                        <Lock className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-amber-300">
                        Locked • Tap to Unlock
                      </span>
                    </div>
                  )}

                  {/* Play icon hover */}
                  {unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">
                      <span>{video.categoryName}</span>
                      {!video.isPublished && (
                        <span className="text-amber-400 font-semibold">[Draft]</span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                      {video.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                      {video.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      {video.duration || '15 min'}
                    </span>
                    <span className="text-blue-400 font-semibold flex items-center gap-1">
                      {unlocked ? 'Watch Lesson' : 'Unlock Pass'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-[#090D18] border border-white/[0.08] text-center max-w-md mx-auto">
          <Play className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-white">No video lessons found</h4>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery
              ? `No videos match "${searchQuery}".`
              : 'Add videos in Admin Console to populate this library.'}
          </p>
        </div>
      )}
    </div>
  );
};
