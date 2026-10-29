import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume1,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Loader2,
  AlertTriangle
} from 'lucide-react';

/**
 * Premium custom controls for the lesson player.
 *
 * - 'video'   : direct MP4 / WebM, driven by the native HTMLMediaElement API.
 * - 'youtube' : driven by the official YouTube IFrame Player API.
 * - 'vimeo'   : driven by the official Vimeo Player SDK.
 *
 * Provider branding / restrictions are not touched: for YouTube and Vimeo the
 * official embed is used as-is and our control bar is docked BELOW the frame
 * (it never covers the provider's player). Only features the provider actually
 * supports are shown. If a provider API fails to load, the original plain
 * embed is shown instead so the lesson still plays.
 */

export type PlayerKind = 'video' | 'youtube' | 'vimeo';

interface CustomVideoPlayerProps {
  kind: PlayerKind;
  /** direct file URL for 'video'; provider video id for 'youtube' / 'vimeo' */
  src: string;
  /** optional Vimeo privacy hash */
  vimeoHash?: string;
  title: string;
  /** plain embed URL used if a provider API cannot be loaded */
  fallbackSrc?: string;
}

interface Controller {
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setRate: (r: number) => Promise<boolean>;
}

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

const formatTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/* ------------------------------------------------------------------ */
/* Provider SDK loaders (official scripts, loaded once)                */
/* ------------------------------------------------------------------ */

let ytPromise: Promise<any> | null = null;
const loadYouTubeApi = (): Promise<any> => {
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve, reject) => {
    const prev = w.onYouTubeIframeAPIReady;
    const timer = window.setTimeout(() => {
      ytPromise = null;
      reject(new Error('YouTube API timeout'));
    }, 10000);
    w.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timer);
      if (typeof prev === 'function') prev();
      resolve(w.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      window.clearTimeout(timer);
      ytPromise = null;
      reject(new Error('YouTube API failed to load'));
    };
    document.head.appendChild(s);
  });
  return ytPromise;
};

let vimeoPromise: Promise<any> | null = null;
const loadVimeoApi = (): Promise<any> => {
  const w = window as any;
  if (w.Vimeo && w.Vimeo.Player) return Promise.resolve(w.Vimeo);
  if (vimeoPromise) return vimeoPromise;
  vimeoPromise = new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      vimeoPromise = null;
      reject(new Error('Vimeo SDK timeout'));
    }, 10000);
    const s = document.createElement('script');
    s.src = 'https://player.vimeo.com/api/player.js';
    s.async = true;
    s.onload = () => {
      window.clearTimeout(timer);
      if (w.Vimeo && w.Vimeo.Player) resolve(w.Vimeo);
      else {
        vimeoPromise = null;
        reject(new Error('Vimeo SDK missing'));
      }
    };
    s.onerror = () => {
      window.clearTimeout(timer);
      vimeoPromise = null;
      reject(new Error('Vimeo SDK failed to load'));
    };
    document.head.appendChild(s);
  });
  return vimeoPromise;
};

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
/* ------------------------------------------------------------------ */

interface SliderProps {
  value: number;
  max: number;
  buffered?: number;
  step?: number;
  ariaLabel: string;
  valueText?: string;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  onScrubStart?: () => void;
  className?: string;
}

const Slider: React.FC<SliderProps> = ({
  value,
  max,
  buffered = 0,
  step = 1,
  ariaLabel,
  valueText,
  onChange,
  onCommit,
  onScrubStart,
  className = ''
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;

  const calc = (clientX: number) => {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return 0;
    return clamp((clientX - r.left) / r.width, 0, 1) * max;
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      aria-valuetext={valueText}
      className={`group/slider relative flex h-7 sm:h-6 w-full items-center touch-none cursor-pointer outline-none ${className}`}
      onPointerDown={(e) => {
        if (max <= 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        setIsDragging(true);
        onScrubStart?.();
        onChange(calc(e.clientX));
      }}
      onPointerMove={(e) => {
        if (dragging.current) onChange(calc(e.clientX));
      }}
      onPointerUp={(e) => {
        if (!dragging.current) return;
        dragging.current = false;
        setIsDragging(false);
        onCommit?.(calc(e.clientX));
      }}
      onPointerCancel={() => {
        if (!dragging.current) return;
        dragging.current = false;
        setIsDragging(false);
        onCommit?.(value);
      }}
      onKeyDown={(e) => {
        let next: number | null = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = clamp(value + step, 0, max);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = clamp(value - step, 0, max);
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = max;
        if (next === null) return;
        e.preventDefault();
        e.stopPropagation();
        onChange(next);
        onCommit?.(next);
      }}
    >
      <div
        className={`relative w-full rounded-full bg-white/20 transition-[height] duration-200 ${
          isDragging ? 'h-1.5' : 'h-1 group-hover/slider:h-1.5 group-focus-visible/slider:h-1.5'
        }`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/25"
          style={{ width: `${clamp(buffered, 0, 1) * 100}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
          style={{ width: `${pct}%` }}
        />
        <div
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_4px_rgba(59,130,246,0.25)] transition-transform duration-200 [@media(hover:none)]:scale-100 ${
            isDragging
              ? 'scale-125'
              : 'scale-0 group-hover/slider:scale-100 group-focus-visible/slider:scale-100'
          }`}
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
> = ({ label, className = '', children, ...rest }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`grid h-11 w-11 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full text-white/90 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${className}`}
    {...rest}
  >
    {children}
  </button>
);

/* ------------------------------------------------------------------ */
/* Player                                                              */
/* ------------------------------------------------------------------ */

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  kind,
  src,
  vimeoHash,
  title,
  fallbackSrc
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ctlRef = useRef<Controller | null>(null);
  const activityTimer = useRef<number | undefined>(undefined);
  const pointerType = useRef('mouse');
  const scrubbingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(kind !== 'video');
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedFrac, setBufferedFrac] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [rates, setRates] = useState<number[]>(SPEEDS);
  const [rateNote, setRateNote] = useState('');
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState('');
  const [apiFailed, setApiFailed] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activity, setActivity] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const overlay = kind === 'video'; // embeds get a docked bar (never covers provider UI)

  // iOS ignores programmatic volume; hide the slider there (mute still works)
  const volumeSettable = useMemo(() => {
    try {
      const a = new Audio();
      a.volume = 0.5;
      return a.volume === 0.5;
    } catch {
      return true;
    }
  }, []);

  const fsSupported = useMemo(() => {
    const d = document as any;
    return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
  }, []);
  const showFsButton = fsSupported || kind === 'video';

  /* ---------------- activity / auto-hide (native video only) ------- */
  const showControls = useCallback(() => {
    setActivity(true);
    window.clearTimeout(activityTimer.current);
    activityTimer.current = window.setTimeout(() => setActivity(false), 2800);
  }, []);

  useEffect(() => {
    showControls();
    return () => window.clearTimeout(activityTimer.current);
  }, [showControls]);

  /* ---------------- fullscreen state ------------------------------- */
  useEffect(() => {
    const onChange = () => {
      const d = document as any;
      const el = d.fullscreenElement || d.webkitFullscreenElement;
      setIsFullscreen(!!el && el === containerRef.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  /* ---------------- close speed menu on outside press -------------- */
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [menuOpen]);

  /* ---------------- native <video> controller ---------------------- */
  useEffect(() => {
    if (kind !== 'video') return;
    const v = videoRef.current;
    if (!v) return;
    ctlRef.current = {
      play: () => {
        v.play().catch(() => {});
      },
      pause: () => v.pause(),
      seek: (t) => {
        v.currentTime = t;
      },
      setVolume: (x) => {
        v.volume = x;
        if (x > 0 && v.muted) v.muted = false;
      },
      setMuted: (m) => {
        v.muted = m;
      },
      setRate: async (r) => {
        v.playbackRate = r;
        return true;
      }
    };
    return () => {
      ctlRef.current = null;
    };
  }, [kind, src]);

  const syncBuffered = () => {
    const v = videoRef.current;
    if (!v || !v.duration || !Number.isFinite(v.duration)) return;
    const t = v.currentTime;
    let end = 0;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= t + 0.5 && v.buffered.end(i) >= end) end = v.buffered.end(i);
    }
    setBufferedFrac(end / v.duration);
  };

  /* ---------------- YouTube controller (official IFrame API) ------- */
  useEffect(() => {
    if (kind !== 'youtube') return;
    let cancelled = false;
    let player: any = null;
    let poll: number | undefined;
    const host = hostRef.current;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !host) return;
        const mount = document.createElement('div');
        host.appendChild(mount);
        player = new YT.Player(mount, {
          videoId: src,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            fs: 0,
            iv_load_policy: 3,
            disablekb: 1,
            origin: window.location.origin
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              ctlRef.current = {
                play: () => player.playVideo(),
                pause: () => player.pauseVideo(),
                seek: (t) => player.seekTo(t, true),
                setVolume: (x) => {
                  player.setVolume(Math.round(x * 100));
                  if (x > 0 && player.isMuted()) player.unMute();
                },
                setMuted: (m) => (m ? player.mute() : player.unMute()),
                setRate: async (r) => {
                  player.setPlaybackRate(r);
                  return true;
                }
              };
              const reported: number[] = player.getAvailablePlaybackRates
                ? player.getAvailablePlaybackRates()
                : [1];
              const usable = SPEEDS.filter((s) => reported.includes(s));
              setRates(usable.length ? usable : [1]);
              setDuration(player.getDuration() || 0);
              setVolume((player.getVolume() ?? 100) / 100);
              setMuted(!!player.isMuted());
              setBuffering(false);
              player.playVideo();
              poll = window.setInterval(() => {
                try {
                  if (!scrubbingRef.current) setCurrent(player.getCurrentTime() || 0);
                  const d = player.getDuration() || 0;
                  if (d) setDuration(d);
                  setBufferedFrac(player.getVideoLoadedFraction() || 0);
                  setVolume((player.getVolume() ?? 100) / 100);
                  setMuted(!!player.isMuted());
                } catch {
                  /* player may be mid-teardown */
                }
              }, 250);
            },
            onStateChange: (e: any) => {
              if (cancelled) return;
              const s = e.data;
              if (s === 1) {
                setPlaying(true);
                setBuffering(false);
                setEnded(false);
                const d = player.getDuration() || 0;
                if (d) setDuration(d);
              } else if (s === 2) {
                setPlaying(false);
              } else if (s === 3) {
                setBuffering(true);
              } else if (s === 0) {
                setPlaying(false);
                setEnded(true);
                setBuffering(false);
              }
            },
            onPlaybackRateChange: (e: any) => {
              if (!cancelled) setRate(e.data);
            },
            onError: () => {
              if (!cancelled) setError('This video could not be played.');
            }
          }
        });
      })
      .catch(() => {
        if (!cancelled) setApiFailed(true);
      });

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      if (host) host.innerHTML = '';
      ctlRef.current = null;
    };
  }, [kind, src]);

  /* ---------------- Vimeo controller (official Player SDK) --------- */
  useEffect(() => {
    if (kind !== 'vimeo') return;
    let cancelled = false;
    let player: any = null;
    const host = hostRef.current;

    loadVimeoApi()
      .then((Vimeo) => {
        if (cancelled || !host) return;
        const iframe = document.createElement('iframe');
        const params = new URLSearchParams({
          autoplay: '1',
          controls: '0',
          playsinline: '1',
          title: '0',
          byline: '0',
          portrait: '0'
        });
        if (vimeoHash) params.set('h', vimeoHash);
        iframe.src = `https://player.vimeo.com/video/${src}?${params.toString()}`;
        iframe.title = title;
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.style.cssText = 'width:100%;height:100%;border:0';
        host.appendChild(iframe);

        player = new Vimeo.Player(iframe);
        ctlRef.current = {
          play: () => {
            player.play().catch(() => {});
          },
          pause: () => {
            player.pause().catch(() => {});
          },
          seek: (t) => {
            player.setCurrentTime(t).catch(() => {});
          },
          setVolume: (x) => {
            player.setVolume(x).catch(() => {});
            if (x > 0) player.setMuted(false).catch(() => {});
          },
          setMuted: (m) => {
            player.setMuted(m).catch(() => {});
          },
          setRate: async (r) => {
            try {
              await player.setPlaybackRate(r);
              return true;
            } catch {
              return false;
            }
          }
        };

        player.on('loaded', () => {
          if (cancelled) return;
          setBuffering(false);
          player.getDuration().then((d: number) => !cancelled && setDuration(d)).catch(() => {});
          player.getVolume().then((v: number) => !cancelled && setVolume(v)).catch(() => {});
          player.getMuted().then((m: boolean) => !cancelled && setMuted(m)).catch(() => {});
        });
        player.on('play', () => {
          setPlaying(true);
          setEnded(false);
          setBuffering(false);
        });
        player.on('pause', () => setPlaying(false));
        player.on('ended', () => {
          setPlaying(false);
          setEnded(true);
        });
        player.on('timeupdate', (d: any) => {
          if (!scrubbingRef.current) setCurrent(d.seconds || 0);
          if (d.duration) setDuration(d.duration);
        });
        player.on('progress', (d: any) => setBufferedFrac(d.percent || 0));
        player.on('bufferstart', () => setBuffering(true));
        player.on('bufferend', () => setBuffering(false));
        player.on('volumechange', (d: any) => {
          setVolume(d.volume);
          player.getMuted().then((m: boolean) => !cancelled && setMuted(m)).catch(() => {});
        });
        player.on('playbackratechange', (d: any) => setRate(d.playbackRate));
        player.on('error', () => {
          if (!cancelled) setError('This video could not be played.');
        });
      })
      .catch(() => {
        if (!cancelled) setApiFailed(true);
      });

    return () => {
      cancelled = true;
      try {
        const p = player?.destroy();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        /* ignore */
      }
      if (host) host.innerHTML = '';
      ctlRef.current = null;
    };
  }, [kind, src, vimeoHash, title]);

  /* ---------------- actions ---------------------------------------- */
  const effectiveDuration = Number.isFinite(duration) ? duration : 0;

  const togglePlay = () => {
    const c = ctlRef.current;
    if (!c) return;
    if (ended) {
      c.seek(0);
      setCurrent(0);
      setEnded(false);
      c.play();
      return;
    }
    if (playing) c.pause();
    else c.play();
  };

  const seekTo = (t: number) => {
    const c = ctlRef.current;
    if (!c) return;
    const target = clamp(t, 0, effectiveDuration || t);
    c.seek(target);
    setCurrent(target);
    setEnded(false);
  };

  const seekBy = (delta: number) => seekTo(current + delta);

  const toggleMute = () => {
    const c = ctlRef.current;
    if (!c) return;
    if (muted || volume === 0) {
      if (volume === 0) {
        c.setVolume(0.5);
        setVolume(0.5);
      }
      c.setMuted(false);
      setMuted(false);
    } else {
      c.setMuted(true);
      setMuted(true);
    }
  };

  const changeVolume = (raw: number) => {
    const c = ctlRef.current;
    if (!c) return;
    const v = raw < 0.03 ? 0 : raw; // snap to silent at the far-left edge
    c.setVolume(v);
    setVolume(v);
    setMuted(false);
    if (v === 0) c.setMuted(true);
  };

  const chooseRate = async (r: number) => {
    const c = ctlRef.current;
    if (!c) return;
    const ok = await c.setRate(r);
    if (ok) {
      setRate(r);
      setRateNote('');
      setMenuOpen(false);
    } else {
      setRateNote('Speed change is not supported for this video');
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current as any;
    const d = document as any;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      (d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
      return;
    }
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (kind === 'video' && (videoRef.current as any)?.webkitEnterFullscreen)
      (videoRef.current as any).webkitEnterFullscreen();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const onControl = !!(e.target as HTMLElement).closest('button, [role="slider"]');
    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        if (onControl && e.key === ' ') return; // let focused button handle space
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        if (onControl && (e.target as HTMLElement).getAttribute('role') === 'slider') return;
        e.preventDefault();
        seekBy(-5);
        break;
      case 'ArrowRight':
        if (onControl && (e.target as HTMLElement).getAttribute('role') === 'slider') return;
        e.preventDefault();
        seekBy(5);
        break;
      case 'ArrowUp':
        if (onControl && (e.target as HTMLElement).getAttribute('role') === 'slider') return;
        if (!volumeSettable) return;
        e.preventDefault();
        changeVolume(clamp(volume + 0.1, 0, 1));
        break;
      case 'ArrowDown':
        if (onControl && (e.target as HTMLElement).getAttribute('role') === 'slider') return;
        if (!volumeSettable) return;
        e.preventDefault();
        changeVolume(clamp(volume - 0.1, 0, 1));
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
      case 'F':
        if (!showFsButton) return;
        e.preventDefault();
        toggleFullscreen();
        break;
      default:
        return;
    }
    showControls();
  };

  /* ---------------- fallback: plain provider embed ----------------- */
  if (apiFailed && fallbackSrc) {
    return (
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={fallbackSrc}
          title={title}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  /* ---------------- derived view state ----------------------------- */
  const shownTime = scrubTime ?? current;
  const controlsVisible = !overlay || !playing || activity || menuOpen || scrubTime !== null || ended;
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const speedChoices = rates;

  const controlBar = (
    <div
      className={
        overlay
          ? `absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 transition-all duration-300 ${
              controlsVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
            }`
          : 'relative z-20 border-t border-white/[0.06] bg-gradient-to-b from-[#0B1220] to-[#05070D]'
      }
      onPointerDown={() => overlay && showControls()}
    >
      <div className="px-3 pt-1 sm:px-4">
        <Slider
          ariaLabel="Seek"
          value={shownTime}
          max={effectiveDuration}
          buffered={bufferedFrac}
          step={5}
          valueText={`${formatTime(shownTime)} of ${formatTime(effectiveDuration)}`}
          onScrubStart={() => {
            scrubbingRef.current = true;
          }}
          onChange={(t) => {
            scrubbingRef.current = true;
            setScrubTime(t);
          }}
          onCommit={(t) => {
            scrubbingRef.current = false;
            setScrubTime(null);
            seekTo(t);
          }}
        />
      </div>

      <div className="flex items-center gap-0.5 px-2 pb-2 sm:gap-1.5 sm:px-3">
        <IconButton
          label={ended ? 'Replay' : playing ? 'Pause' : 'Play'}
          onClick={togglePlay}
          className="bg-white/10 hover:bg-white/20"
        >
          {ended ? (
            <RotateCcw className="h-5 w-5" />
          ) : playing ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current" />
          )}
        </IconButton>

        <div className="group/vol flex items-center">
          <IconButton label={muted || volume === 0 ? 'Unmute' : 'Mute'} onClick={toggleMute}>
            <VolIcon className="h-5 w-5" />
          </IconButton>
          {volumeSettable && (
            <div className="hidden w-0 overflow-hidden transition-all duration-300 group-hover/vol:w-24 group-focus-within/vol:w-24 sm:block">
              <div className="w-24 px-2">
                <Slider
                  ariaLabel="Volume"
                  value={muted ? 0 : volume}
                  max={1}
                  step={0.05}
                  valueText={`${Math.round((muted ? 0 : volume) * 100)}%`}
                  onChange={changeVolume}
                />
              </div>
            </div>
          )}
        </div>

        <span className="ml-1 select-none text-[11px] font-medium tabular-nums text-white/80 sm:ml-2 sm:text-xs">
          {formatTime(shownTime)}
          <span className="px-1 text-white/40">/</span>
          {formatTime(effectiveDuration)}
        </span>

        <div className="flex-1" />

        {speedChoices.length > 1 && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Playback speed"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => {
                setMenuOpen((o) => !o);
                setRateNote('');
              }}
              className={`h-11 min-w-[44px] rounded-full px-2.5 text-xs font-bold tabular-nums transition-all duration-200 hover:bg-white/10 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:h-9 ${
                menuOpen ? 'bg-white/15 text-white' : 'text-white/90'
              }`}
            >
              {rate}x
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="svp-pop absolute bottom-full right-0 z-30 mb-2 flex flex-col items-stretch gap-1 rounded-2xl border border-white/10 bg-[#0B1220]/95 p-1 shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-center gap-1">
                  {speedChoices.map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="menuitemradio"
                      aria-checked={r === rate}
                      onClick={() => chooseRate(r)}
                      className={`h-10 min-w-[46px] rounded-xl px-2 text-xs font-bold tabular-nums transition-colors sm:h-9 ${
                        r === rate
                          ? 'bg-blue-500 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
                {rateNote && (
                  <p className="px-2 pb-1 text-[10px] leading-tight text-amber-300">{rateNote}</p>
                )}
              </div>
            )}
          </div>
        )}

        {showFsButton && (
          <IconButton
            label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </IconButton>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="group"
      aria-label={`${title} video player`}
      onKeyDown={onKeyDown}
      onPointerMove={() => overlay && showControls()}
      className={`relative flex w-full select-none flex-col bg-black outline-none ${
        isFullscreen ? 'h-full' : ''
      }`}
    >
      <style>{`
        @keyframes svp-pop { from { opacity: 0; transform: translateY(6px) scale(.96); } to { opacity: 1; transform: none; } }
        .svp-pop { animation: svp-pop .18s ease-out; transform-origin: bottom right; }
        @keyframes svp-ping { 0% { transform: scale(1); opacity: .5; } 100% { transform: scale(1.5); opacity: 0; } }
      `}</style>

      <div
        className={`relative overflow-hidden bg-black ${
          isFullscreen ? 'min-h-0 flex-1' : 'aspect-video w-full'
        }`}
      >
        {kind === 'video' ? (
          <>
            <video
              ref={videoRef}
              src={src}
              title={title}
              autoPlay
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
              onTimeUpdate={(e) => {
                if (!scrubbingRef.current) setCurrent(e.currentTarget.currentTime);
                syncBuffered();
              }}
              onProgress={syncBuffered}
              onPlay={() => {
                setPlaying(true);
                setEnded(false);
              }}
              onPause={() => setPlaying(false)}
              onPlaying={() => setBuffering(false)}
              onWaiting={() => setBuffering(true)}
              onCanPlay={() => setBuffering(false)}
              onVolumeChange={(e) => {
                setVolume(e.currentTarget.volume);
                setMuted(e.currentTarget.muted);
              }}
              onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
              onEnded={() => {
                setPlaying(false);
                setEnded(true);
              }}
              onError={() => setError('This video could not be loaded.')}
            />

            {/* tap / click layer: click toggles play, double-click toggles fullscreen */}
            <div
              className="absolute inset-0 z-10"
              onPointerDown={(e) => {
                pointerType.current = e.pointerType;
              }}
              onClick={() => {
                if (pointerType.current === 'touch' && !activity && playing) {
                  showControls();
                  return;
                }
                togglePlay();
                showControls();
              }}
              onDoubleClick={() => showFsButton && toggleFullscreen()}
            />

            {/* big centre button while paused */}
            <div
              className={`pointer-events-none absolute inset-0 z-10 grid place-items-center transition-all duration-300 ${
                !playing && !buffering && !error ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
              }`}
            >
              <span className="relative grid h-16 w-16 place-items-center rounded-full border border-white/20 bg-black/50 text-white shadow-2xl backdrop-blur-md sm:h-20 sm:w-20">
                <span
                  className="absolute inset-0 rounded-full border border-blue-400/50"
                  style={{ animation: 'svp-ping 1.8s ease-out infinite' }}
                />
                {ended ? (
                  <RotateCcw className="h-7 w-7 sm:h-8 sm:w-8" />
                ) : (
                  <Play className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" />
                )}
              </span>
            </div>
          </>
        ) : (
          <div
            ref={hostRef}
            className="absolute inset-0 [&>div]:h-full [&>div]:w-full [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
          />
        )}

        {buffering && !error && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <Loader2 className="h-10 w-10 animate-spin text-white/90 drop-shadow-lg" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-black/80 p-6 text-center">
            <div>
              <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-amber-400" />
              <p className="text-sm font-semibold text-white">{error}</p>
              <p className="mt-1 text-xs text-slate-400">Check the video link or try another lesson.</p>
            </div>
          </div>
        )}

        {overlay && controlBar}
      </div>

      {!overlay && controlBar}
    </div>
  );
};
