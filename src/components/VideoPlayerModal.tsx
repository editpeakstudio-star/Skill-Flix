import React, { useState } from 'react';
import { 
  X, 
  Play, 
  CheckCircle, 
  Clock, 
  ListOrdered, 
  Layers, 
  FileText, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { VideoLesson } from '../types';
import { markLessonCompleted, getWatchProgress } from '../services/firebase';
import { useToast } from './Toast';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoLesson | null;
  allLessons: VideoLesson[];
  onSelectVideo: (v: VideoLesson) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  video,
  allLessons,
  onSelectVideo
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'info' | 'episodes'>('info');
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>(getWatchProgress());

  if (!isOpen || !video) return null;

  const isCompleted = !!progressMap[video.id];

  const handleToggleComplete = () => {
    const newState = !isCompleted;
    markLessonCompleted(video.id, newState);
    setProgressMap(prev => ({ ...prev, [video.id]: newState }));
    showToast(newState ? 'Lesson marked as completed! 🎯' : 'Lesson marked as in-progress', 'info');
  };

  // Helper to parse video embed
  const getEmbedInfo = (url: string) => {
    if (!url) return { type: 'placeholder', src: '' };

    // YouTube URLs
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) {
      return {
        type: 'youtube',
        src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`
      };
    }

    // Vimeo URLs
    const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (vimeoMatch) {
      const hash = vimeoMatch[2];
      return {
        type: 'vimeo',
        src: `https://player.vimeo.com/video/${vimeoMatch[1]}${hash ? `?h=${hash}&autoplay=1` : '?autoplay=1'}`
      };
    }

    // Direct MP4 / WebM
    if (url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('.mp4?') || url.includes('.webm?')) {
      return {
        type: 'video',
        src: url
      };
    }

    // Generic embed / iframe
    return {
      type: 'iframe',
      src: url
    };
  };

  const embed = getEmbedInfo(video.videoUrl);

  // Filter lessons belonging to the same category
  const categoryLessons = allLessons
    .filter(l => l.categoryId === video.categoryId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-xl overflow-hidden">
      <div className="relative w-full max-w-5xl bg-[#070B14] border border-blue-500/20 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[92vh]">
        
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.08] bg-[#05070D]">
          <div className="flex items-center gap-2 truncate pr-4">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {video.episode || 'EP1'}
            </span>
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              {video.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleComplete}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-white/[0.08]'
              }`}
            >
              <CheckCircle className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{isCompleted ? 'Completed' : 'Mark Complete'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Area */}
        <div className="relative w-full aspect-video shrink-0 bg-black flex items-center justify-center overflow-hidden">
          {embed.type === 'youtube' && (
            <iframe
              src={embed.src}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}

          {embed.type === 'vimeo' && (
            <iframe
              src={embed.src}
              title={video.title}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          )}

          {embed.type === 'video' && (
            <video
              src={embed.src}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          )}

          {embed.type === 'iframe' && (
            <iframe
              src={embed.src}
              title={video.title}
              className="w-full h-full border-0"
              allowFullScreen
            />
          )}

          {embed.type === 'placeholder' && (
            <div className="text-center p-6">
              <Play className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No stream source provided for this lesson.</p>
            </div>
          )}
        </div>

        {/* Combined Lesson Overview and Episodes */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 bg-[#070B14]">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Lesson Overview</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {video.categoryName}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {video.duration || '15 min'}
              </span>
              {video.isFreePreview && (
                <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Free Preview
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
              {video.title}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {video.description || 'In this comprehensive masterclass tutorial, you will master step-by-step editing workflows, keyframing, masking, color grading, and export settings.'}
            </p>
          </div>

          <div className="border-t border-white/[0.08] pt-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">All Episodes</h3>
              </div>
              <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
                {categoryLessons.length} lessons
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Continue learning episode by episode.
            </p>

            <div className="space-y-2">
              {categoryLessons.map((les, index) => {
                const isCur = les.id === video.id;
                const done = !!progressMap[les.id];

                return (
                  <div
                    key={les.id}
                    onClick={() => onSelectVideo(les)}
                    className={`flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border cursor-pointer transition-all ${
                      isCur
                        ? 'bg-blue-600/15 border-blue-500/50 text-white'
                        : 'bg-[#05070D] border-white/[0.06] hover:border-white/[0.15] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`relative w-16 h-11 sm:w-20 sm:h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${
                        isCur ? 'ring-2 ring-blue-500' : 'bg-slate-800'
                      }`}>
                        {les.thumbnailUrl ? (
                          <img
                            src={les.thumbnailUrl}
                            alt={`${les.title} thumbnail`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Play className={`w-5 h-5 ${isCur ? 'text-blue-400' : 'text-slate-400'}`} />
                        )}
                        {done && (
                          <span className="absolute top-0.5 right-0.5 rounded-full bg-black/80 p-0.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className={`text-xs sm:text-sm font-bold block truncate ${isCur ? 'text-blue-300' : 'text-slate-200'}`}>
                          {les.episode || `EP${index + 1}`}: {les.title}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          {done ? 'Completed' : isCur ? 'Now playing' : (les.episode || `EP${index + 1}`)} · {les.duration || '15 min'}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 ${isCur ? 'text-blue-400' : 'text-slate-600'}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
