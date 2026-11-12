import React from 'react';
import { Lock, Play, Clock, X, Layers, LogIn, Sparkles } from 'lucide-react';
import { VideoLesson, Category } from '../types';

interface VideoDetailsModalProps {
  video: VideoLesson | null;
  category?: Category | null;
  isSignedIn: boolean;
  isUnlocked: boolean;
  onClose: () => void;
  onUnlock: () => void;
  onSignIn: () => void;
}

/**
 * Shows what a lesson is about without playing it. This is the surface a
 * visitor without access sees: title, episode, duration and description stay
 * public, playback does not.
 */
export const VideoDetailsModal: React.FC<VideoDetailsModalProps> = ({
  video,
  category,
  isSignedIn,
  isUnlocked,
  onClose,
  onUnlock,
  onSignIn
}) => {
  if (!video) return null;

  const price = category?.price || 299;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#0B0F19] border border-blue-500/25 rounded-2xl overflow-hidden my-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close lesson details"
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/70 text-zinc-300 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative aspect-video w-full bg-zinc-950">
          {video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-950/40 to-[#05070D] text-zinc-600">
              <Play className="w-9 h-9 text-cyan-400/40 mb-1" />
              <span className="text-[10px] font-mono text-zinc-500">Skill-Flix</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-950/90 text-amber-300 border border-amber-500/40">
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </span>
            {video.isFreePreview && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                <Sparkles className="w-3 h-3" />
                <span>Free Preview</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug">{video.title}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-zinc-400 font-medium">
              {video.episode && (
                <span className="inline-flex items-center gap-1">
                  <Layers className="w-3 h-3 text-cyan-400" />
                  {video.episode}
                </span>
              )}
              {video.duration && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  {video.duration}
                </span>
              )}
              {(video.categoryName || category?.name) && (
                <span className="truncate">{video.categoryName || category?.name}</span>
              )}
            </div>
          </div>

          {video.description && (
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">{video.description}</p>
          )}

          <div className="p-3 rounded-xl bg-[#05070D] border border-zinc-800">
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {isUnlocked
                ? 'You have access to this course.'
                : isSignedIn
                  ? 'Sign in done. Unlock this course to start watching the lesson.'
                  : 'Lesson details are public. Sign in and unlock this course to watch the video.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {!isSignedIn && (
              <button
                type="button"
                onClick={onSignIn}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In to Continue</span>
              </button>
            )}
            <button
              type="button"
              onClick={onUnlock}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Unlock Course (₹{price})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};