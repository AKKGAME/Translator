import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SubtitleItem, VideoConfig } from '../types';
import { msToTimeSRT } from '../utils/subtitleParser';
import { BURMESE_PUNCTUATION_HELPERS, cleanSoundEffects } from '../utils/burmeseUtils';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Film,
  Maximize2,
  Type,
  Settings,
  Layers,
  Clock,
  FastForward,
  Rewind,
  Target,
  Search,
  Gauge,
  Keyboard,
  Wand2,
  Check,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Plus,
  Trash2,
  GitMerge,
} from 'lucide-react';

interface VideoPreviewProps {
  items: SubtitleItem[];
  videoConfig: VideoConfig;
  onUpdateVideoConfig: (newConfig: VideoConfig) => void;
  onSelectSubItem?: (item: SubtitleItem) => void;
  onUpdateItem?: (id: number, updatedFields: Partial<SubtitleItem>) => void;
  onAddItem?: (afterItemId?: number, startMsOverride?: number) => void;
  onDeleteItem?: (id: number) => void;
  onMergeItem?: (id: number) => void;
  onTimeShiftClick?: () => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  items,
  videoConfig,
  onUpdateVideoConfig,
  onSelectSubItem,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onMergeItem,
  onTimeShiftClick,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const subItemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [activeSub, setActiveSub] = useState<SubtitleItem | null>(null);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [subSearch, setSubSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  // Target field to edit: 'translated' (အသစ်/မြန်မာဘာသာ) or 'original' (မူရင်း/အင်္ဂလိပ်)
  const [editTarget, setEditTarget] = useState<'translated' | 'original'>('translated');
  const [customVideoFileName, setCustomVideoFileName] = useState<string | null>(null);

  // Sync playback speed with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Handle video time update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const currentMs = Math.round(videoRef.current.currentTime * 1000);
    setCurrentTimeMs(currentMs);

    // Find active subtitle
    const current = items.find(
      (item) => currentMs >= item.startMs && currentMs <= item.endMs
    );
    setActiveSub(current || null);
  };

  // Auto-scroll list to active subtitle item during playback
  useEffect(() => {
    if (activeSub && autoScroll) {
      const activeElement = subItemRefs.current[activeSub.id];
      if (activeElement && listContainerRef.current) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [activeSub, autoScroll]);

  const handleLoadedMetadata = () => {
    setHasVideoError(false);
    if (videoRef.current) {
      setDurationSec(videoRef.current.duration || 0);
      videoRef.current.playbackRate = playbackSpeed;
    }
  };

  const handleVideoError = () => {
    setHasVideoError(true);
    setIsPlaying(false);
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current || hasVideoError) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => setHasVideoError(true));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, hasVideoError]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSec = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newSec;
      setCurrentTimeMs(Math.round(newSec * 1000));
    }
  };

  const skipSeconds = useCallback((secs: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(durationSec || 9999, videoRef.current.currentTime + secs));
    videoRef.current.currentTime = newTime;
    setCurrentTimeMs(Math.round(newTime * 1000));
  }, [durationSec]);

  const jumpToTime = useCallback((startMs: number, autoPlay: boolean = true) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startMs / 1000;
    setCurrentTimeMs(startMs);
    if (autoPlay && !isPlaying && !hasVideoError) {
      videoRef.current.play().catch(() => setHasVideoError(true));
      setIsPlaying(true);
    }
  }, [isPlaying, hasVideoError]);

  const jumpToPrevSub = useCallback(() => {
    if (!items.length) return;
    const prev = [...items].reverse().find((it) => it.startMs < currentTimeMs - 500);
    if (prev) {
      jumpToTime(prev.startMs);
    } else if (items[0]) {
      jumpToTime(items[0].startMs);
    }
  }, [items, currentTimeMs, jumpToTime]);

  const jumpToNextSub = useCallback(() => {
    if (!items.length) return;
    const next = items.find((it) => it.startMs > currentTimeMs + 200);
    if (next) {
      jumpToTime(next.startMs);
    }
  }, [items, currentTimeMs, jumpToTime]);

  // Adjust Start / End time of a subtitle item
  const handleAdjustTime = (itemId: number, field: 'startMs' | 'endMs', msDelta: number) => {
    if (!onUpdateItem) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (field === 'startMs') {
      const newStart = Math.max(0, item.startMs + msDelta);
      const newEnd = Math.max(newStart, item.endMs);
      onUpdateItem(itemId, {
        startMs: newStart,
        endMs: newEnd,
        startTime: msToTimeSRT(newStart),
        endTime: msToTimeSRT(newEnd),
      });
    } else {
      const newEnd = Math.max(item.startMs, item.endMs + msDelta);
      onUpdateItem(itemId, {
        endMs: newEnd,
        endTime: msToTimeSRT(newEnd),
      });
    }
  };

  const handleSetStartToNow = (itemId: number) => {
    if (!onUpdateItem) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newStart = Math.max(0, currentTimeMs);
    const dur = Math.max(800, item.endMs - item.startMs);
    const newEnd = Math.max(newStart + 300, newStart + dur);
    onUpdateItem(itemId, {
      startMs: newStart,
      endMs: newEnd,
      startTime: msToTimeSRT(newStart),
      endTime: msToTimeSRT(newEnd),
    });
  };

  const handleSetEndToNow = (itemId: number) => {
    if (!onUpdateItem) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newEnd = Math.max(item.startMs + 200, currentTimeMs);
    onUpdateItem(itemId, {
      endMs: newEnd,
      endTime: msToTimeSRT(newEnd),
    });
  };

  // Insert Burmese punctuation directly (respects editTarget: original or translated)
  const handleInsertSymbol = (itemId: number, symbol: string) => {
    if (!onUpdateItem) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    if (editTarget === 'original') {
      const currentText = item.originalText || '';
      onUpdateItem(itemId, { originalText: currentText + symbol });
    } else {
      const currentText = item.translatedText || '';
      onUpdateItem(itemId, { translatedText: currentText + symbol });
    }
  };

  // Clean sound effects for a single item (respects editTarget)
  const handleCleanItemSound = (itemId: number) => {
    if (!onUpdateItem) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    if (editTarget === 'original') {
      if (!item.originalText) return;
      const cleaned = cleanSoundEffects(item.originalText);
      onUpdateItem(itemId, { originalText: cleaned });
    } else {
      if (!item.translatedText) return;
      const cleaned = cleanSoundEffects(item.translatedText);
      onUpdateItem(itemId, { translatedText: cleaned });
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current && videoRef.current.parentElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.parentElement.requestFullscreen().catch(() => {});
      }
    }
  };

  const formatSecToTime = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setCustomVideoFileName(file.name);
      setHasVideoError(false);
      onUpdateVideoConfig({ ...videoConfig, videoUrl: url, isCustomVideo: true });
    }
  };

  // Global Keyboard Shortcuts for player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input/textarea
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        if (e.ctrlKey && e.key === 'Enter') {
          // Ctrl+Enter advances to next sub
          e.preventDefault();
          jumpToNextSub();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipSeconds(-3);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipSeconds(3);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        jumpToPrevSub();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        jumpToNextSub();
      } else if (e.altKey && e.code === 'BracketLeft' && activeSub) {
        e.preventDefault();
        handleSetStartToNow(activeSub.id);
      } else if (e.altKey && e.code === 'BracketRight' && activeSub) {
        e.preventDefault();
        handleSetEndToNow(activeSub.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipSeconds, jumpToPrevSub, jumpToNextSub, activeSub]);

  // Filtered subtitle items for search
  const filteredItems = items.filter(
    (item) =>
      !subSearch ||
      item.originalText.toLowerCase().includes(subSearch.toLowerCase()) ||
      item.translatedText?.toLowerCase().includes(subSearch.toLowerCase()) ||
      item.index.toString().includes(subSearch)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header & Keyboard Shortcut Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0e1219] border border-[#212734] rounded-lg p-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <span>ဗီဒီယို ကြည့်ရင်း တိုက်ရိုက် စာတန်းထိုး ပြင်ဆင်ရန် (Video Live Subtitle Editor)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ဗီဒီယို ကြည့်ရင်း စာတန်းထိုးများကို တစ်ခါတည်း တိုက်ရိုက် ရေးသား/ပြင်ဆင်နိုင်ပါသည်။
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#161c28] hover:bg-[#1e2636] text-slate-300 text-xs font-semibold rounded-md border border-[#262f40] transition"
            title="ကီးဘုတ် ဖြတ်လမ်းနည်းများ ကြည့်မည်"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-400" />
            <span>Shortcuts</span>
          </button>

          {onTimeShiftClick && (
            <button
              onClick={onTimeShiftClick}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold rounded-md border border-amber-500/30 transition"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>အချိန် အဆိုင်း ချိန်မည်</span>
            </button>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Help Drawer */}
      {showKeyboardHelp && (
        <div className="bg-[#0e1219] border border-amber-500/40 rounded-lg p-4 text-xs text-slate-300 space-y-3">
          <div className="flex items-center justify-between font-bold text-amber-300 border-b border-[#212734] pb-2">
            <span className="flex items-center space-x-2">
              <Keyboard className="w-4 h-4" />
              <span>အမြန် ကီးဘုတ် ဖြတ်လမ်းများ (Keyboard Shortcuts)</span>
            </span>
            <button
              onClick={() => setShowKeyboardHelp(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px] font-mono">
            <div className="bg-[#07090e] p-2 rounded border border-[#212734]">
              <span className="text-emerald-400 font-bold">Spacebar:</span> ဖွင့်မည် / ရပ်မည် (Play/Pause)
            </div>
            <div className="bg-[#07090e] p-2 rounded border border-[#212734]">
              <span className="text-emerald-400 font-bold">← / → (Arrows):</span> 3 စက္ကန့် နောက်သို့/ရှေ့သို့
            </div>
            <div className="bg-[#07090e] p-2 rounded border border-[#212734]">
              <span className="text-emerald-400 font-bold">↑ / ↓ (Arrows):</span> ယခင် / နောက် စာကြောင်းသို့ သွားမည်
            </div>
            <div className="bg-[#07090e] p-2 rounded border border-[#212734]">
              <span className="text-emerald-400 font-bold">Ctrl + Enter:</span> စာသား ရေးပြီးပါက နောက်လိုင်းသို့ သွားမည်
            </div>
            <div className="bg-[#07090e] p-2 rounded border border-[#212734]">
              <span className="text-emerald-400 font-bold">Alt + [ :</span> စတင်ချိန်ကို လက်ရှိ ဗီဒီယိုနေရာ သတ်မှတ်မည်
            </div>
            <div className="bg-[#07090e] p-2 rounded border border-[#212734]">
              <span className="text-emerald-400 font-bold">Alt + ] :</span> ပြီးဆုံးချိန်ကို လက်ရှိ ဗီဒီယိုနေရာ သတ်မှတ်မည်
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Video Player Left (2 Cols) | Editable Subtitle List Right (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Video Player & Controls & Live Subtitle Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Video Box */}
          <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl border border-[#212734] aspect-video group">
            <video
              ref={videoRef}
              src={videoConfig.videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onError={handleVideoError}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full object-contain"
            />

            {/* Video Error Fallback Notice */}
            {hasVideoError && (
              <div className="absolute inset-0 bg-[#07090e]/95 flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-3 z-10">
                <Film className="w-10 h-10 text-amber-400" />
                <div className="font-bold text-slate-100 text-sm">
                  ဗီဒီယို ဖိုင် ဖွင့်၍ မရပါ သို့မဟုတ် မူရင်း URL တိုက်ရိုက် မရရှိနိုင်ပါ
                </div>
                <p className="text-xs text-slate-400 max-w-md">
                  အောက်ပါ "မိမိ ဗီဒီယိုဖိုင် ထည့်သွင်းမည်" ခလုတ်မှ မိမိစက်ထဲရှိ MKV, MP4, WebM စသည့် Video ဖိုင်များကို ရွေးချယ် ထည့်သွင်း ကြည့်ရှုနိုင်ပါသည်။
                </p>
                <label className="mt-2 inline-flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-md cursor-pointer text-xs transition shadow-lg">
                  <Upload className="w-4 h-4" />
                  <span>မိမိ ဗီဒီယိုဖိုင် (MKV/MP4/WebM) ထည့်သွင်းမည်</span>
                  <input
                    type="file"
                    accept="video/*,.mkv,.mp4,.webm,.mov,.avi,video/x-matroska,video/mkv,video/mp4,video/webm"
                    onChange={handleVideoFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Subtitle Overlay Rendering on Video */}
            {activeSub && (
              <div
                className={`absolute left-0 right-0 px-6 py-3 flex flex-col items-center justify-center text-center transition-all ${
                  videoConfig.textPosition === 'bottom'
                    ? 'bottom-8'
                    : videoConfig.textPosition === 'top'
                    ? 'top-8'
                    : 'top-1/2 -translate-y-1/2'
                }`}
              >
                <div
                  style={{
                    backgroundColor: videoConfig.bgColor,
                    fontSize: `${videoConfig.fontSize}px`,
                  }}
                  className="px-5 py-2.5 rounded-md backdrop-blur-md max-w-2xl leading-relaxed shadow-2xl border border-white/10 transition-all transform scale-100"
                >
                  {/* Myanmar Translated Subtitle */}
                  {(videoConfig.subtitleMode === 'translated' ||
                    videoConfig.subtitleMode === 'dual') && (
                    <div
                      style={{ color: videoConfig.textColor }}
                      className="font-bold tracking-wide drop-shadow-md"
                    >
                      {activeSub.translatedText || activeSub.originalText}
                    </div>
                  )}

                  {/* Dual Mode Original English Subtitle */}
                  {(videoConfig.subtitleMode === 'original' ||
                    videoConfig.subtitleMode === 'dual') && (
                    <div
                      style={{ color: videoConfig.highlightColor }}
                      className="text-[0.85em] opacity-90 mt-0.5 font-sans"
                    >
                      {activeSub.originalText}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Play Overlay Touch/Click Control */}
            <div
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/90 text-slate-950 flex items-center justify-center shadow-xl transform scale-95 group-hover:scale-100 transition">
                {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
              </div>
            </div>
          </div>

          {/* Subtitle Timeline Visual Wave/Track Bar */}
          {durationSec > 0 && items.length > 0 && (
            <div className="bg-[#0e1219] border border-[#212734] rounded-md p-2 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
                <span>Timeline Preview ({items.length} Subtitles)</span>
                <span>{formatSecToTime(currentTimeMs / 1000)}</span>
              </div>
              <div className="relative h-4 bg-[#07090e] rounded overflow-hidden border border-[#212734] flex items-center">
                {items.map((it) => {
                  const leftPercent = Math.min(100, Math.max(0, ((it.startMs / 1000) / durationSec) * 100));
                  const widthPercent = Math.min(100 - leftPercent, Math.max(0.5, (((it.endMs - it.startMs) / 1000) / durationSec) * 100));
                  const isActive = activeSub?.id === it.id;

                  return (
                    <div
                      key={it.id}
                      onClick={() => jumpToTime(it.startMs)}
                      title={`#${it.index}: ${it.translatedText || it.originalText}`}
                      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                      className={`absolute top-0.5 bottom-0.5 rounded-xs cursor-pointer transition ${
                        isActive
                          ? 'bg-amber-400 z-10 ring-2 ring-amber-300'
                          : it.translatedText
                          ? 'bg-emerald-500/70 hover:bg-emerald-400'
                          : 'bg-slate-700/60 hover:bg-slate-500'
                      }`}
                    />
                  );
                })}
                {/* Current Playhead Marker */}
                <div
                  style={{ left: `${Math.min(100, Math.max(0, ((currentTimeMs / 1000) / durationSec) * 100))}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 shadow-md"
                />
              </div>
            </div>
          )}

          {/* Player Scrubber & Control Bar */}
          <div className="bg-[#0e1219] border border-[#212734] rounded-lg p-4 shadow-sm space-y-3">
            {/* Timeline Range Scrubber */}
            <div className="space-y-1">
              <div className="relative flex items-center">
                <input
                  type="range"
                  min={0}
                  max={durationSec || 100}
                  step={0.1}
                  value={currentTimeMs / 1000}
                  onChange={handleSeek}
                  className="w-full h-2 bg-[#07090e] rounded appearance-none cursor-pointer accent-emerald-500 focus:outline-none border border-[#212734]"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">
                    {formatSecToTime(currentTimeMs / 1000)}
                  </span>
                </div>
                <div>
                  <span>/ {formatSecToTime(durationSec)}</span>
                </div>
              </div>
            </div>

            {/* Playback Controls & Speed Selector */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[#212734]">
              {/* Left: Skip & Play Controls */}
              <div className="flex items-center space-x-1.5 flex-wrap">
                <button
                  onClick={jumpToPrevSub}
                  className="p-2 bg-[#12161f] hover:bg-[#1a202c] text-slate-300 rounded-md border border-[#262f40] transition text-xs flex items-center space-x-1"
                  title="ယခင် စာတန်းထိုးသို့ သွားမည် (Up Arrow)"
                >
                  <Rewind className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xs:inline text-[11px]">ယခင်</span>
                </button>

                <button
                  onClick={() => skipSeconds(-3)}
                  className="p-2 bg-[#12161f] hover:bg-[#1a202c] text-slate-300 rounded-md border border-[#262f40] transition text-xs flex items-center space-x-1"
                  title="3 စက္ကန့် နောက်သို့ ကျော်မည် (Left Arrow)"
                >
                  <span className="text-[11px] font-bold text-slate-300">-3s</span>
                </button>

                <button
                  onClick={togglePlay}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md transition text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-500/10"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>ရပ်မည်</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>ဖွင့်မည်</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => skipSeconds(3)}
                  className="p-2 bg-[#12161f] hover:bg-[#1a202c] text-slate-300 rounded-md border border-[#262f40] transition text-xs flex items-center space-x-1"
                  title="3 စက္ကန့် ရှေ့သို့ ကျော်မည် (Right Arrow)"
                >
                  <span className="text-[11px] font-bold text-slate-300">+3s</span>
                </button>

                <button
                  onClick={jumpToNextSub}
                  className="p-2 bg-[#12161f] hover:bg-[#1a202c] text-slate-300 rounded-md border border-[#262f40] transition text-xs flex items-center space-x-1"
                  title="နောက် စာတန်းထိုးသို့ သွားမည် (Down Arrow)"
                >
                  <span className="hidden xs:inline text-[11px]">နောက်</span>
                  <FastForward className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>

              {/* Middle: Speed Selector */}
              <div className="flex items-center space-x-1 bg-[#07090e] p-1 rounded-md border border-[#212734] text-[11px]">
                <Gauge className="w-3.5 h-3.5 text-emerald-400 ml-1" />
                {[0.5, 0.75, 1.0, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-0.5 rounded font-mono font-bold transition ${
                      playbackSpeed === spd
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Right: Audio Mute & Fullscreen */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={toggleMute}
                  className="p-2 bg-[#12161f] hover:bg-[#1a202c] text-slate-300 rounded-md border border-[#262f40] transition"
                  title={isMuted ? 'အသံဖွင့်မည်' : 'အသံပိတ်မည်'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-slate-300" />
                  )}
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-[#12161f] hover:bg-[#1a202c] text-slate-300 rounded-md border border-[#262f40] transition"
                  title="မျက်နှာပြင်ပြည့် ကြည့်မည်"
                >
                  <Maximize2 className="w-4 h-4 text-slate-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Prominent Live Subtitle Quick Editor & Sync Card */}
          <div className="bg-[#0e1219] border border-emerald-500/30 rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between border-b border-[#212734] pb-2.5 gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-100 flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>လက်ရှိ ပြောဆိုနေသော စာကြောင်း တိုက်ရိုက် ပြင်ရန် (Live Editor)</span>
                </span>
              </div>

              {activeSub && (
                <span className="bg-emerald-500/10 text-emerald-400 font-mono text-xs px-2.5 py-0.5 rounded font-bold border border-emerald-500/20">
                  #{activeSub.index} ({activeSub.startTime} → {activeSub.endTime})
                </span>
              )}
            </div>

            {/* Target Field Selector Switcher */}
            <div className="flex items-center space-x-2 bg-[#07090e] p-1.5 rounded-md border border-[#212734] text-xs">
              <span className="text-[11px] text-slate-400 font-semibold px-1 whitespace-nowrap">
                ပြင်ဆင်လိုသည့် စာသား:
              </span>
              <button
                type="button"
                onClick={() => setEditTarget('translated')}
                className={`flex-1 py-1.5 px-3 rounded font-bold text-xs transition flex items-center justify-center space-x-1.5 ${
                  editTarget === 'translated'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-[#12161f]'
                }`}
              >
                <span>✨ ဘာသာပြန် စာသား (Translated)</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTarget('original')}
                className={`flex-1 py-1.5 px-3 rounded font-bold text-xs transition flex items-center justify-center space-x-1.5 ${
                  editTarget === 'original'
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-[#12161f]'
                }`}
              >
                <span>📝 မူရင်း စာသား (Original)</span>
              </button>
            </div>

            {activeSub ? (
              <div className="space-y-3">
                {/* Secondary Reference Box (Shows the non-active target text) */}
                <div className="bg-[#07090e] p-2.5 rounded-md border border-[#212734] text-xs text-slate-300 flex items-center justify-between">
                  <div className="flex-1 mr-2">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">
                      {editTarget === 'translated' ? 'မူရင်း စာသား (Original Source):' : 'မြန်မာ ဘာသာပြန် (Translated):'}
                    </span>
                    <span className="font-sans text-slate-200 font-medium">
                      {editTarget === 'translated'
                        ? (activeSub.originalText || '—')
                        : (activeSub.translatedText || '(ဘာသာပြန် မရှိသေးပါ)')}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCleanItemSound(activeSub.id)}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-[#12161f] hover:bg-[#1a202c] text-rose-300 text-[10px] rounded border border-[#262f40] transition whitespace-nowrap"
                    title="ဟောဟဲ/အသံဆူညံသံများ ဖျက်မည်"
                  >
                    <Wand2 className="w-3 h-3 text-rose-400" />
                    <span>အသံသံဖျက်</span>
                  </button>
                </div>

                {/* Primary Direct Editable Input Area */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-[11px] font-bold block ${editTarget === 'original' ? 'text-sky-400' : 'text-emerald-400'}`}>
                      {editTarget === 'original'
                        ? '📝 မူရင်း စာသား ပြင်ဆင်ရန် (Original Text Edit):'
                        : '✨ မြန်မာဘာသာ ပြန်ဆိုချက် ပြင်ဆင်ရန် (Translated Text Edit):'}
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {editTarget === 'original' ? 'Editing Original' : 'Editing Translated'}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={editTarget === 'original' ? (activeSub.originalText || '') : (activeSub.translatedText || '')}
                    onChange={(e) => {
                      if (!onUpdateItem) return;
                      if (editTarget === 'original') {
                        onUpdateItem(activeSub.id, { originalText: e.target.value });
                      } else {
                        onUpdateItem(activeSub.id, { translatedText: e.target.value });
                      }
                    }}
                    placeholder={
                      editTarget === 'original'
                        ? 'မူရင်း အင်္ဂလိပ် စာတန်းထိုး ပြင်ဆင်ပါ...'
                        : 'မြန်မာ စာတန်းထိုး ရေးသားပါ...'
                    }
                    className={`w-full bg-[#07090e] border rounded-md p-3 text-sm font-semibold focus:outline-none focus:ring-1 shadow-inner transition ${
                      editTarget === 'original'
                        ? 'border-sky-500/60 text-sky-200 focus:border-sky-400 focus:ring-sky-400/50'
                        : 'border-emerald-500/60 text-emerald-300 focus:border-emerald-400 focus:ring-emerald-400/50'
                    }`}
                  />
                </div>

                {/* Quick Burmese Symbol Insertion Chips */}
                <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
                  <span className="text-[10px] text-slate-400 whitespace-nowrap mr-1">
                    သင်္ကေတ ထည့်ရန်:
                  </span>
                  {BURMESE_PUNCTUATION_HELPERS.map((helper, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleInsertSymbol(activeSub.id, helper.symbol)}
                      className="px-2 py-0.5 bg-[#07090e] hover:bg-[#161c28] text-slate-200 border border-[#212734] rounded font-mono text-[11px] whitespace-nowrap transition"
                      title={helper.description}
                    >
                      {helper.symbol}
                    </button>
                  ))}
                </div>

                {/* Instant Timestamp Adjusters */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#212734] text-[11px]">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className="text-slate-400 text-[10px]">စတင်ချိန်:</span>
                    <button
                      onClick={() => handleSetStartToNow(activeSub.id)}
                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold rounded border border-emerald-500/30 transition flex items-center space-x-1 text-[11px]"
                      title="လက်ရှိ ဗီဒီယိုနေရာကို စတင်ချိန်အဖြစ် သတ်မှတ်မည် (Alt+[)"
                    >
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                      <span>စတင်ချိန် သတ်မှတ်</span>
                    </button>
                    <button
                      onClick={() => handleAdjustTime(activeSub.id, 'startMs', -100)}
                      className="px-1.5 py-0.5 bg-[#07090e] hover:bg-[#161c28] text-slate-300 rounded border border-[#212734] font-mono"
                    >
                      -100ms
                    </button>
                    <button
                      onClick={() => handleAdjustTime(activeSub.id, 'startMs', 100)}
                      className="px-1.5 py-0.5 bg-[#07090e] hover:bg-[#161c28] text-slate-300 rounded border border-[#212734] font-mono"
                    >
                      +100ms
                    </button>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className="text-slate-400 text-[10px]">ပြီးဆုံးချိန်:</span>
                    <button
                      onClick={() => handleSetEndToNow(activeSub.id)}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold rounded border border-amber-500/30 transition flex items-center space-x-1 text-[11px]"
                      title="လက်ရှိ ဗီဒီယိုနေရာကို ပြီးဆုံးချိန်အဖြစ် သတ်မှတ်မည် (Alt+])"
                    >
                      <Target className="w-3.5 h-3.5 text-amber-400" />
                      <span>ပြီးဆုံးချိန် သတ်မှတ်</span>
                    </button>
                    <button
                      onClick={() => handleAdjustTime(activeSub.id, 'endMs', -100)}
                      className="px-1.5 py-0.5 bg-[#07090e] hover:bg-[#161c28] text-slate-300 rounded border border-[#212734] font-mono"
                    >
                      -100ms
                    </button>
                    <button
                      onClick={() => handleAdjustTime(activeSub.id, 'endMs', 100)}
                      className="px-1.5 py-0.5 bg-[#07090e] hover:bg-[#161c28] text-slate-300 rounded border border-[#212734] font-mono"
                    >
                      +100ms
                    </button>
                  </div>
                </div>

                {/* Add / Merge / Delete Quick Action Row for activeSub */}
                <div className="flex items-center space-x-1.5 pt-2 border-t border-[#212734]">
                  {onAddItem && (
                    <button
                      type="button"
                      onClick={() => onAddItem(activeSub.id)}
                      className="flex-1 py-1 px-2 bg-[#07090e] hover:bg-emerald-500/10 text-emerald-400 border border-[#212734] hover:border-emerald-500/30 rounded text-[11px] font-bold transition flex items-center justify-center space-x-1"
                      title="ဒီစာကြောင်းနောက်တွင် စာကြောင်းအသစ်ထည့်မည်"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+ အသစ်ထည့်</span>
                    </button>
                  )}

                  {onMergeItem && (
                    <button
                      type="button"
                      onClick={() => onMergeItem(activeSub.id)}
                      className="flex-1 py-1 px-2 bg-[#07090e] hover:bg-sky-500/10 text-sky-400 border border-[#212734] hover:border-sky-500/30 rounded text-[11px] font-bold transition flex items-center justify-center space-x-1"
                      title="နောက်စာကြောင်းနှင့် ပေါင်းမည်"
                    >
                      <GitMerge className="w-3.5 h-3.5 text-sky-400" />
                      <span>🔗 ပေါင်းမည်</span>
                    </button>
                  )}

                  {onDeleteItem && (
                    <button
                      type="button"
                      onClick={() => onDeleteItem(activeSub.id)}
                      className="py-1 px-2.5 bg-[#07090e] hover:bg-rose-500/10 text-rose-400 border border-[#212734] hover:border-rose-500/30 rounded text-[11px] font-bold transition flex items-center justify-center space-x-1"
                      title="ဒီစာကြောင်း ဖျက်မည်"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>ဖျက်မည်</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#07090e] p-4 rounded-md border border-[#212734] text-center text-xs text-slate-400 space-y-2">
                <p className="text-slate-300 font-medium">
                  လက်ရှိ ဗီဒီယိုနေရာတွင် စာတန်းထိုး မရှိသေးပါ
                </p>
                {onAddItem && (
                  <button
                    type="button"
                    onClick={() => onAddItem(undefined, currentTimeMs)}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 rounded-md text-xs transition inline-flex items-center space-x-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>လက်ရှိ ဗီဒီယိုနေရာ၌ စာကြောင်းအသစ်ထည့်မည်</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Subtitle Overlay Config Options Drawer */}
          <div className="bg-[#0e1219] border border-[#212734] rounded-lg p-4 shadow-sm space-y-3">
            <button
              onClick={() => setShowAdvancedControls(!showAdvancedControls)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-200"
            >
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>စာတန်းထိုး ပြသမှု ဒီဇိုင်း ဆက်တင်များ (Overlay Customization)</span>
              </div>
              {showAdvancedControls ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showAdvancedControls && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2 border-t border-[#212734]">
                {/* Display Mode */}
                <div>
                  <label className="block text-slate-400 mb-1">ပြသမည့် မုဒ် (Mode):</label>
                  <select
                    value={videoConfig.subtitleMode}
                    onChange={(e) =>
                      onUpdateVideoConfig({
                        ...videoConfig,
                        subtitleMode: e.target.value as any,
                      })
                    }
                    className="w-full bg-[#07090e] border border-[#212734] rounded-md p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="translated">မြန်မာဘာသာ သီးသန့် (Myanmar Only)</option>
                    <option value="dual">နှစ်ဘာသာ ပူးတွဲ (Dual English + Myanmar)</option>
                    <option value="original">မူရင်း သီးသန့် (Original Only)</option>
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-slate-400 mb-1">
                    စာလုံး အရွယ်အစား: {videoConfig.fontSize}px
                  </label>
                  <input
                    type="range"
                    min={14}
                    max={36}
                    value={videoConfig.fontSize}
                    onChange={(e) =>
                      onUpdateVideoConfig({
                        ...videoConfig,
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="w-full accent-emerald-500 mt-2"
                  />
                </div>

                {/* Text Position */}
                <div>
                  <label className="block text-slate-400 mb-1">နေရာ (Position):</label>
                  <select
                    value={videoConfig.textPosition}
                    onChange={(e) =>
                      onUpdateVideoConfig({
                        ...videoConfig,
                        textPosition: e.target.value as any,
                      })
                    }
                    className="w-full bg-[#07090e] border border-[#212734] rounded-md p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="bottom">အောက်ခြေ (Bottom)</option>
                    <option value="top">အထက်ပိုင်း (Top)</option>
                    <option value="middle">အလယ် (Middle)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Video Selector & Direct Editable Subtitle List */}
        <div className="space-y-4">
          {/* Custom Video Source Loader */}
          <div className="bg-[#0e1219] border border-[#212734] rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Film className="w-4 h-4 text-emerald-400" />
                <span>ဗီဒီယို ဖိုင် ရွေးချယ်ရန် (Video Source)</span>
              </h3>
              {customVideoFileName && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold border border-emerald-500/20 uppercase">
                  {customVideoFileName.split('.').pop() || 'VIDEO'}
                </span>
              )}
            </div>

            {customVideoFileName ? (
              <div className="bg-[#07090e] p-2.5 rounded-md border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 truncate mr-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-200 font-medium truncate text-[11px] font-mono">
                      {customVideoFileName}
                    </span>
                  </div>
                  <label className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer underline whitespace-nowrap">
                    လဲမည်
                    <input
                      type="file"
                      accept="video/*,.mkv,.mp4,.webm,.mov,.avi,video/x-matroska,video/mkv,video/mp4,video/webm"
                      onChange={handleVideoFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex items-center justify-center space-x-2 border border-dashed border-[#262f40] hover:border-emerald-500/60 bg-[#07090e] p-3 rounded-md cursor-pointer text-xs text-slate-300 transition">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>မိမိ ဗီဒီယိုဖိုင် ထည့်မည် (MKV / MP4 / WebM)</span>
                <input
                  type="file"
                  accept="video/*,.mkv,.mp4,.webm,.mov,.avi,video/x-matroska,video/mkv,video/mp4,video/webm"
                  onChange={handleVideoFileUpload}
                  className="hidden"
                />
              </label>
            )}

            <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 bg-[#07090e]/60 px-2.5 py-1.5 rounded border border-[#212734]">
              <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span>MKV, MP4, WebM, MOV ဗီဒီယိုဖိုင်များ တိုက်ရိုက် ကြည့်ရှု အသုံးပြုနိုင်ပါသည်</span>
            </div>
          </div>

          {/* Subtitle List with Direct Inline Editable Textboxes */}
          <div className="bg-[#0e1219] border border-[#212734] rounded-lg p-4 shadow-sm space-y-3 flex flex-col h-[640px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200">
                  စာတန်းထိုးများ ({filteredItems.length}/{items.length})
                </h3>
                <label className="flex items-center space-x-1 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded bg-[#07090e] border-[#212734] text-emerald-500 focus:ring-0"
                  />
                  <span>အလိုအလျောက် ရွှေ့မည်</span>
                </label>
              </div>

              {/* Mode Toggle for List Inputs */}
              <div className="grid grid-cols-2 gap-1.5 bg-[#07090e] p-1 rounded-md border border-[#212734] text-[11px]">
                <button
                  type="button"
                  onClick={() => setEditTarget('translated')}
                  className={`py-1 rounded font-bold transition text-center ${
                    editTarget === 'translated'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ✨ ဘာသာပြန် ပြင်မည်
                </button>
                <button
                  type="button"
                  onClick={() => setEditTarget('original')}
                  className={`py-1 rounded font-bold transition text-center ${
                    editTarget === 'original'
                      ? 'bg-sky-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📝 မူရင်း ပြင်မည်
                </button>
              </div>

              {/* Filter Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="စာကြောင်း ရှာရန်..."
                  className="w-full bg-[#07090e] border border-[#212734] rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Scrollable Subtitles Container */}
            <div
              ref={listContainerRef}
              className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-800/60"
            >
              {filteredItems.map((item) => {
                const isCurrent = activeSub?.id === item.id;
                const isExpanded = expandedItemId === item.id;

                return (
                  <div
                    key={item.id}
                    ref={(el) => { subItemRefs.current[item.id] = el; }}
                    className={`pt-3 first:pt-0 rounded-md p-2.5 transition border ${
                      isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-[#07090e] border-[#212734] hover:border-[#2f394d]'
                    }`}
                  >
                    {/* Item Top Metadata & Play Jump & Actions */}
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => jumpToTime(item.startMs)}
                          className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold rounded flex items-center space-x-1 transition"
                          title="ဒီနေရာသို့ ဗီဒီယို သွားမည်"
                        >
                          <Play className="w-2.5 h-2.5 fill-current text-emerald-400" />
                          <span>#{item.index}</span>
                        </button>
                        <span className="text-slate-300">{item.startTime} → {item.endTime}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        {isCurrent && (
                          <span className="flex items-center space-x-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 mr-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            <span>LIVE</span>
                          </span>
                        )}

                        {onAddItem && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddItem(item.id);
                            }}
                            className="p-1 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded transition"
                            title="ဒီနောက်တွင် စာကြောင်းအသစ်ထည့်မည်"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onMergeItem && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMergeItem(item.id);
                            }}
                            className="p-1 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 rounded transition"
                            title="နောက်တစ်ကြောင်းနှင့် ပေါင်းမည်"
                          >
                            <GitMerge className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onDeleteItem && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteItem(item.id);
                            }}
                            className="p-1 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded transition"
                            title="ဒီစာကြောင်း ဖျက်မည်"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reference Line depending on Edit Target */}
                    <div className="text-[11px] text-slate-400 mb-1 font-sans line-clamp-2 bg-[#12161f] p-1.5 rounded border border-[#212734]">
                      <span className="text-[9px] uppercase font-mono text-slate-500 block">
                        {editTarget === 'translated' ? 'Original Source:' : 'Translated Text:'}
                      </span>
                      <span>
                        {editTarget === 'translated'
                          ? (item.originalText || '—')
                          : (item.translatedText || '(ဘာသာပြန် မရှိသေးပါ)')}
                      </span>
                    </div>

                    {/* Direct Editable Text Input (Switches based on editTarget) */}
                    <div className="space-y-1.5 mt-1">
                      <div className="relative">
                        <input
                          type="text"
                          value={editTarget === 'original' ? (item.originalText || '') : (item.translatedText || '')}
                          onChange={(e) => {
                            if (!onUpdateItem) return;
                            if (editTarget === 'original') {
                              onUpdateItem(item.id, { originalText: e.target.value });
                            } else {
                              onUpdateItem(item.id, { translatedText: e.target.value });
                            }
                          }}
                          onFocus={() => {
                            if (onSelectSubItem) onSelectSubItem(item);
                          }}
                          placeholder={
                            editTarget === 'original'
                              ? 'မူရင်း စာတန်းထိုး တိုက်ရိုက် ပြင်ရန်...'
                              : 'မြန်မာ စာတန်းထိုး တိုက်ရိုက် ရေးရန်...'
                          }
                          className={`w-full bg-[#12161f] border rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none transition ${
                            isCurrent
                              ? editTarget === 'original'
                                ? 'border-sky-500 text-sky-200 focus:ring-1 focus:ring-sky-400'
                                : 'border-emerald-500 text-emerald-300 focus:ring-1 focus:ring-emerald-400'
                              : editTarget === 'original'
                              ? 'border-[#212734] text-slate-200 focus:border-sky-500'
                              : 'border-[#212734] text-slate-200 focus:border-emerald-500'
                          }`}
                        />
                      </div>

                      {/* Quick Nudge & Time Buttons Bar */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleSetStartToNow(item.id)}
                            className="px-1.5 py-0.5 bg-[#12161f] hover:bg-[#1a202c] text-emerald-400 rounded border border-[#212734] font-sans"
                            title="စတင်ချိန်ကို လက်ရှိ ဗီဒီယိုနေရာ သတ်မှတ်မည်"
                          >
                            Set Start
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustTime(item.id, 'startMs', -100)}
                            className="px-1 py-0.5 bg-[#12161f] hover:bg-[#1a202c] text-slate-300 rounded border border-[#212734] font-mono"
                          >
                            -100
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustTime(item.id, 'startMs', 100)}
                            className="px-1 py-0.5 bg-[#12161f] hover:bg-[#1a202c] text-slate-300 rounded border border-[#212734] font-mono"
                          >
                            +100
                          </button>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleSetEndToNow(item.id)}
                            className="px-1.5 py-0.5 bg-[#12161f] hover:bg-[#1a202c] text-amber-400 rounded border border-[#212734] font-sans"
                            title="ပြီးဆုံးချိန်ကို လက်ရှိ ဗီဒီယိုနေရာ သတ်မှတ်မည်"
                          >
                            Set End
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertSymbol(item.id, '။')}
                            className="px-1.5 py-0.5 bg-[#12161f] hover:bg-[#1a202c] text-slate-200 rounded border border-[#212734] font-mono"
                          >
                            ။
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsertSymbol(item.id, '၊')}
                            className="px-1.5 py-0.5 bg-[#12161f] hover:bg-[#1a202c] text-slate-200 rounded border border-[#212734] font-mono"
                          >
                            ၊
                          </button>
                        </div>
                      </div>
                    </div>
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
