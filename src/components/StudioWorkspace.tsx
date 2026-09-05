import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  SubtitleItem,
  VideoConfig,
  TranslationSettings,
} from '../types';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Settings,
  Search,
  Plus,
  Trash2,
  GitMerge,
  Timer,
  Type,
  Wrench,
  Sliders,
  Languages,
  ChevronDown,
  Upload,
  Clock,
  ArrowRightToLine,
  ArrowLeftToLine,
  ChevronUp,
  Replace,
  FileText,
  RotateCcw,
  ListOrdered,
  Code2,
  FileUp,
  Gauge,
  Film,
  Check,
  Compass,
  BookOpen,
  RefreshCw,
  X,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { AnimeSceneCanvas } from './AnimeSceneCanvas';
import { msToTimeSRT } from '../utils/subtitleParser';
import { showConfirm, notify } from './AlertToastProvider';
import { StudioContextMenu, ContextMenuState } from './StudioContextMenu';

interface StudioWorkspaceProps {
  items: SubtitleItem[];
  videoConfig: VideoConfig;
  onUpdateVideoConfig: (cfg: VideoConfig) => void;
  translationSettings: TranslationSettings;
  onUpdateTranslationSettings: (settings: TranslationSettings) => void;
  displayMode: 'bilingual' | 'main' | 'second';
  currentTimeMs: number;
  durationSec: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  activeItem: SubtitleItem | null;
  onSelectSubItem: (item: SubtitleItem) => void;
  onUpdateItem: (id: number, fields: Partial<SubtitleItem>) => void;
  onAddItem: (afterItemId?: number, startMsOverride?: number) => void;
  onDeleteItem: (id: number) => void;
  onMergeItem: (id: number) => void;
  onSplitItem?: (id: number) => void;
  onTranslateSingleItem?: (item: SubtitleItem) => void;
  onOpenTimeShift: () => void;
  onUploadVideo: (file: File) => void;
  customVideoUrl: string | null;
  customVideoFileName: string | null;
  onUploadSubtitle?: (file: File) => void;
  onOpenOnlineSubtitles?: () => void;
  onClearTranslations?: () => void;
  onClearAllItems?: () => void;
  onReindexItems?: () => void;
  onStripTags?: () => void;
  onBatchReplace?: (searchTerm: string, replaceTerm: string, targetField: 'both' | 'original' | 'translated', matchCase: boolean) => void;
  onNewSubtitle?: () => void;
  onAnalyzeStoryContext?: () => Promise<void>;
  isAnalyzingContext?: boolean;
  contextAnalysisStep?: 'idle' | 'reading' | 'done';
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  items,
  videoConfig,
  onUpdateVideoConfig,
  translationSettings,
  onUpdateTranslationSettings,
  displayMode,
  currentTimeMs,
  durationSec,
  isPlaying,
  onTogglePlay,
  onSeek,
  activeItem,
  onSelectSubItem,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onMergeItem,
  onSplitItem,
  onTranslateSingleItem,
  onOpenTimeShift,
  onUploadVideo,
  customVideoUrl,
  customVideoFileName,
  onUploadSubtitle,
  onOpenOnlineSubtitles,
  onClearTranslations,
  onClearAllItems,
  onReindexItems,
  onStripTags,
  onBatchReplace,
  onNewSubtitle,
  onAnalyzeStoryContext,
  isAnalyzingContext = false,
  contextAnalysisStep = 'idle',
}) => {
  const [activeBottomTab, setActiveBottomTab] = useState<'style' | 'utils' | 'options'>('style');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [subSearch, setSubSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [hoverScrubMs, setHoverScrubMs] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Story Context Drawer State
  const [isStoryContextOpen, setIsStoryContextOpen] = useState(false);

  // Find & Replace state
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [findTerm, setFindTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [replaceTarget, setReplaceTarget] = useState<'both' | 'original' | 'translated'>('both');
  const [matchCase, setMatchCase] = useState(false);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
  });

  // Sync custom video element with isPlaying
  useEffect(() => {
    const video = videoElementRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Sync custom video element time with currentTimeMs when seeking
  useEffect(() => {
    const video = videoElementRef.current;
    if (!video) return;
    const targetSec = currentTimeMs / 1000;
    if (Math.abs(video.currentTime - targetSec) > 0.3) {
      video.currentTime = targetSec;
    }
  }, [currentTimeMs]);

  // Sync playback rate
  useEffect(() => {
    const video = videoElementRef.current;
    if (video) {
      video.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Sync volume & mute
  useEffect(() => {
    const video = videoElementRef.current;
    if (!video) return;
    video.muted = isMuted;
    video.volume = volume;
  }, [isMuted, volume]);

  // Auto-scroll list when active subtitle changes
  useEffect(() => {
    if (activeItem && autoScroll) {
      const activeEl = rowRefs.current[activeItem.id];
      if (activeEl && listContainerRef.current) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [activeItem, autoScroll]);

  // Format MM:SS or HH:MM:SS
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    }
  };

  // Helper to calculate duration in seconds (formatted as e.g. 2.878)
  const getItemDurationSec = (item: SubtitleItem) => {
    const durMs = Math.max(0, item.endMs - item.startMs);
    return (durMs / 1000).toFixed(3);
  };

  // Nudge timing (+100ms, -100ms)
  const handleNudgeTime = (item: SubtitleItem, field: 'start' | 'end', deltaMs: number) => {
    if (field === 'start') {
      const newStart = Math.max(0, item.startMs + deltaMs);
      if (newStart < item.endMs) {
        onUpdateItem(item.id, {
          startMs: newStart,
          startTime: msToTimeSRT(newStart),
        });
      }
    } else {
      const newEnd = Math.max(item.startMs + 100, item.endMs + deltaMs);
      onUpdateItem(item.id, {
        endMs: newEnd,
        endTime: msToTimeSRT(newEnd),
      });
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.srt') || file.name.endsWith('.vtt') || file.name.endsWith('.txt')) {
      onUploadSubtitle?.(file);
    } else if (file.type.startsWith('video/')) {
      onUploadVideo(file);
    }
  };

  // Find matches count
  const findMatchesCount = useMemo(() => {
    if (!findTerm.trim()) return 0;
    let count = 0;
    const flags = matchCase ? 'g' : 'gi';
    try {
      const regex = new RegExp(findTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      for (const it of items) {
        if (replaceTarget === 'both' || replaceTarget === 'original') {
          const m = it.originalText.match(regex);
          if (m) count += m.length;
        }
        if (replaceTarget === 'both' || replaceTarget === 'translated') {
          if (it.translatedText) {
            const m = it.translatedText.match(regex);
            if (m) count += m.length;
          }
        }
      }
    } catch {}
    return count;
  }, [findTerm, matchCase, replaceTarget, items]);

  // Execute Replace All
  const handleExecuteReplace = () => {
    if (!findTerm.trim()) return;
    onBatchReplace?.(findTerm, replaceTerm, replaceTarget, matchCase);
  };

  // Filtered items by search query
  const filteredItems = items.filter((it) => {
    if (!subSearch) return true;
    const q = subSearch.toLowerCase();
    return (
      (it.translatedText && it.translatedText.toLowerCase().includes(q)) ||
      (it.originalText && it.originalText.toLowerCase().includes(q)) ||
      String(it.index).includes(q)
    );
  });

  // Video scrubber click/drag
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetMs = Math.round(pct * (durationSec || 1437) * 1000);
    onSeek(targetMs);
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverScrubMs(Math.round(pct * (durationSec || 1437) * 1000));
  };

  // Video progress percent
  const progressPct = Math.min(
    100,
    Math.max(0, (currentTimeMs / ((durationSec || 1437) * 1000)) * 100)
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#0c0d14] select-none">
      {/* LEFT COLUMN: Video Player + Controls + Bottom Tabs */}
      <div className="w-full lg:w-[48%] xl:w-[46%] flex flex-col border-r border-[#1c1d2c] bg-[#0f101a] overflow-y-auto">
        {/* 16:9 Video Canvas Frame */}
        <div
          ref={videoContainerRef}
          className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group"
        >
          {customVideoUrl ? (
            <video
              ref={videoElementRef}
              src={customVideoUrl}
              className="w-full h-full object-contain"
              playsInline
              onTimeUpdate={() => {
                if (videoElementRef.current && isPlaying) {
                  onSeek(Math.round(videoElementRef.current.currentTime * 1000));
                }
              }}
              onEnded={() => onTogglePlay()}
            />
          ) : (
            <AnimeSceneCanvas
              isPlaying={isPlaying}
              currentTimeMs={currentTimeMs}
            />
          )}

          {/* Centered Translucent Circular Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className={`absolute inset-0 flex items-center justify-center cursor-pointer transition ${
              isPlaying ? 'opacity-0 group-hover:opacity-80' : 'opacity-90'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-2xl transition transform group-hover:scale-110 active:scale-95">
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </div>
          </button>

          {/* Real-Time Subtitle Overlay on Video */}
          {activeItem && (
            <div
              className={`absolute left-4 right-4 text-center pointer-events-none transition-all z-20 ${
                videoConfig.textPosition === 'top'
                  ? 'top-4'
                  : videoConfig.textPosition === 'middle'
                  ? 'top-1/2 -translate-y-1/2'
                  : 'bottom-9'
              }`}
            >
              <div
                style={{
                  backgroundColor: videoConfig.bgColor,
                  color: videoConfig.textColor,
                  fontSize: `${videoConfig.fontSize}px`,
                }}
                className="inline-block px-4 py-1.5 rounded max-w-[95%] leading-relaxed font-sans shadow-lg"
              >
                {/* Mode: Bilingual */}
                {displayMode === 'bilingual' && (
                  <div className="space-y-0.5">
                    {activeItem.originalText && (
                      <div
                        style={{ color: videoConfig.highlightColor }}
                        className="text-[0.85em] opacity-90 font-sans"
                      >
                        {activeItem.originalText}
                      </div>
                    )}
                    <div className="font-semibold">
                      {activeItem.translatedText || activeItem.originalText}
                    </div>
                  </div>
                )}

                {/* Mode: Main (Burmese / Target) */}
                {displayMode === 'main' && (
                  <div className="font-semibold">
                    {activeItem.translatedText || activeItem.originalText}
                  </div>
                )}

                {/* Mode: Second (Original) */}
                {displayMode === 'second' && (
                  <div style={{ color: videoConfig.highlightColor }} className="font-medium">
                    {activeItem.originalText}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Video Progress Scrubber Bar */}
          <div
            onClick={handleScrubberClick}
            onMouseMove={handleScrubberMouseMove}
            onMouseLeave={() => setHoverScrubMs(null)}
            className="absolute bottom-9 left-0 right-0 h-2 hover:h-3 bg-black/50 cursor-pointer z-30 transition-all group/scrub"
          >
            {/* Background track */}
            <div className="w-full h-full bg-white/20 relative">
              {/* Active progress */}
              <div
                style={{ width: `${progressPct}%` }}
                className="h-full bg-rose-500 relative"
              >
                {/* Knob */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover/scrub:scale-100 transition-transform" />
              </div>

              {/* Hover Tooltip */}
              {hoverScrubMs !== null && (
                <div
                  style={{
                    left: `${(hoverScrubMs / ((durationSec || 1437) * 1000)) * 100}%`,
                  }}
                  className="absolute bottom-3 -translate-x-1/2 bg-black/90 text-white font-mono text-[10px] px-1.5 py-0.5 rounded shadow pointer-events-none"
                >
                  {formatTime(hoverScrubMs / 1000)}
                </div>
              )}
            </div>
          </div>

          {/* Video Control Bar Overlay at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-9 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 flex items-center justify-between text-white text-xs opacity-90 hover:opacity-100 transition z-20">
            {/* Play/Pause & Volume & Time */}
            <div className="flex items-center space-x-2.5">
              <button
                onClick={onTogglePlay}
                className="hover:text-purple-400 transition"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </button>

              <div className="flex items-center space-x-1 group/vol">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="hover:text-purple-400 transition"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    setIsMuted(v === 0);
                  }}
                  className="w-14 h-1 accent-purple-500 bg-white/30 rounded cursor-pointer hidden group-hover/vol:inline-block"
                />
              </div>

              <span className="font-mono text-[11px] text-slate-200">
                {formatTime(currentTimeMs / 1000)} / {formatTime(durationSec || 1437)}
              </span>

              {customVideoFileName && (
                <span className="hidden sm:inline-block text-[10px] text-purple-300 truncate max-w-[120px] opacity-80">
                  {customVideoFileName}
                </span>
              )}
            </div>

            {/* Right Video Controls: Speed, Settings, Fullscreen */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {/* Playback Speed Selector */}
              <div className="flex items-center space-x-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10 text-[11px]">
                <Gauge className="w-3 h-3 text-purple-400" />
                <select
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(Number(e.target.value))}
                  className="bg-transparent text-[10px] text-slate-200 focus:outline-none cursor-pointer"
                  title="Playback Speed"
                >
                  <option value={0.5} className="bg-[#12131d]">0.5x</option>
                  <option value={0.75} className="bg-[#12131d]">0.75x</option>
                  <option value={1} className="bg-[#12131d]">1.0x</option>
                  <option value={1.25} className="bg-[#12131d]">1.25x</option>
                  <option value={1.5} className="bg-[#12131d]">1.5x</option>
                  <option value={2} className="bg-[#12131d]">2.0x</option>
                </select>
              </div>

              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className={`p-1 transition ${
                  isDrawerOpen ? 'text-purple-400' : 'hover:text-purple-400 text-slate-300'
                }`}
                title="Drawer Controls"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1 hover:text-purple-400 transition text-slate-300"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Tab Bar: [Style] [Utils] [Options] */}
        <div className="bg-[#12131d] border-b border-[#212336] px-3 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                setActiveBottomTab('style');
                setIsDrawerOpen(true);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                activeBottomTab === 'style' && isDrawerOpen
                  ? 'bg-[#6d28d9] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1c2a]'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Style</span>
            </button>

            <button
              onClick={() => {
                setActiveBottomTab('utils');
                setIsDrawerOpen(true);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                activeBottomTab === 'utils' && isDrawerOpen
                  ? 'bg-[#6d28d9] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1c2a]'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Utils</span>
            </button>

            <button
              onClick={() => {
                setActiveBottomTab('options');
                setIsDrawerOpen(true);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                activeBottomTab === 'options' && isDrawerOpen
                  ? 'bg-[#6d28d9] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1c2a]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Options</span>
            </button>
          </div>

          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="p-1 text-slate-500 hover:text-slate-300 transition"
          >
            <ChevronDown
              className={`w-4 h-4 transform transition ${isDrawerOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Drawer Contents */}
        {isDrawerOpen && (
          <div className="bg-[#10111a] border-b border-[#1f2133] p-3 animate-in fade-in duration-150">
            {activeBottomTab === 'style' && (
              <div className="space-y-3 text-xs">
                {/* Font Size & Position */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Font Size: {videoConfig.fontSize}px</label>
                    <input
                      type="range"
                      min={14}
                      max={36}
                      value={videoConfig.fontSize}
                      onChange={(e) =>
                        onUpdateVideoConfig({ ...videoConfig, fontSize: Number(e.target.value) })
                      }
                      className="w-full accent-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Position</label>
                    <select
                      value={videoConfig.textPosition}
                      onChange={(e) =>
                        onUpdateVideoConfig({
                          ...videoConfig,
                          textPosition: e.target.value as 'top' | 'middle' | 'bottom',
                        })
                      }
                      className="w-full bg-[#0d0e17] border border-[#24273c] rounded p-1.5 text-xs text-slate-200"
                    >
                      <option value="bottom">Bottom (အောက်)</option>
                      <option value="middle">Middle (အလယ်)</option>
                      <option value="top">Top (အပေါ်)</option>
                    </select>
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#1d1f30]">
                  <div>
                    <label className="block text-slate-400 mb-1">Text Color</label>
                    <input
                      type="color"
                      value={videoConfig.textColor}
                      onChange={(e) =>
                        onUpdateVideoConfig({ ...videoConfig, textColor: e.target.value })
                      }
                      className="w-full h-7 rounded bg-transparent cursor-pointer border border-[#24273c]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Highlight</label>
                    <input
                      type="color"
                      value={videoConfig.highlightColor}
                      onChange={(e) =>
                        onUpdateVideoConfig({ ...videoConfig, highlightColor: e.target.value })
                      }
                      className="w-full h-7 rounded bg-transparent cursor-pointer border border-[#24273c]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Box Color</label>
                    <input
                      type="color"
                      value="#000000"
                      onChange={(e) =>
                        onUpdateVideoConfig({
                          ...videoConfig,
                          bgColor: `${e.target.value}d9`,
                        })
                      }
                      className="w-full h-7 rounded bg-transparent cursor-pointer border border-[#24273c]"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeBottomTab === 'utils' && (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={onOpenTimeShift}
                    className="p-2 bg-[#181926] hover:bg-[#202235] border border-[#25283c] rounded text-left flex items-center space-x-2 text-slate-200 transition"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Time Offset ချိန်ညှိ</span>
                  </button>

                  <label className="p-2 bg-[#181926] hover:bg-[#202235] border border-[#25283c] rounded cursor-pointer flex items-center space-x-2 text-slate-200 transition">
                    <Upload className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="truncate">ဗီဒီယို တင်မည်</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadVideo(f);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  <label className="p-2 bg-[#181926] hover:bg-[#202235] border border-[#25283c] rounded cursor-pointer flex items-center space-x-2 text-slate-200 transition">
                    <FileUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">စာတန်းဖိုင် တင်မည်</span>
                    <input
                      type="file"
                      accept=".srt,.vtt,.txt"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadSubtitle?.(f);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  {onOpenOnlineSubtitles && (
                    <button
                      onClick={onOpenOnlineSubtitles}
                      className="p-2 bg-[#181926] hover:bg-[#202235] border border-emerald-500/30 rounded text-left flex items-center space-x-2 text-emerald-300 hover:text-emerald-200 transition"
                      title="အွန်လိုင်းမှ စာတန်းထိုး ရှာဖွေတင်သွင်းရန်"
                    >
                      <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">အွန်လိုင်းမှ ရှာမည်</span>
                    </button>
                  )}

                  <button
                    onClick={onReindexItems}
                    className="p-2 bg-[#181926] hover:bg-[#202235] border border-[#25283c] rounded text-left flex items-center space-x-2 text-slate-200 transition"
                    title="စာတန်းနံပါတ်များ ၁ မှစ၍ အစဉ်လိုက် ပြန်တပ်မည်"
                  >
                    <ListOrdered className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">နံပါတ် ပြန်စီမည်</span>
                  </button>

                  <button
                    onClick={onStripTags}
                    className="p-2 bg-[#181926] hover:bg-[#202235] border border-[#25283c] rounded text-left flex items-center space-x-2 text-slate-200 transition"
                    title="HTML formatting tags (<i/b/font>) များကို ရှင်းထုတ်မည်"
                  >
                    <Code2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">Tags ရှင်းမည်</span>
                  </button>

                  <button
                    onClick={async () => {
                      const confirmed = await showConfirm({
                        title: 'ဘာသာပြန်များ ရှင်းလင်းရန်',
                        message: 'ဘာသာပြန်ဆိုထားသော စာကြောင်းများအားလုံးကို ရှင်းလင်းရန် သေချာပါသလား?',
                        confirmText: 'ရှင်းလင်းမည်',
                        type: 'warning',
                      });
                      if (confirmed) {
                        onClearTranslations?.();
                        notify.info('ဘာသာပြန်ဆိုထားသော စာကြောင်းများကို ရှင်းလင်းပြီးပါပြီ');
                      }
                    }}
                    className="p-2 bg-[#181926] hover:bg-[#202235] border border-[#25283c] rounded text-left flex items-center space-x-2 text-slate-200 transition hover:text-amber-300"
                    title="မြန်မာဘာသာပြန်များကိုသာ ရှင်းထုတ်မည်"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">ဘာသာပြန် ရှင်းမည်</span>
                  </button>

                  <button
                    onClick={async () => {
                      const confirmed = await showConfirm({
                        title: 'စာတန်းအားလုံး ဖျက်မည်',
                        message: 'စာတန်းထိုးအားလုံးကို ဖျက်ပစ်ပြီး အသစ်စတင်ရန် သေချာပါသလား?',
                        confirmText: 'အကုန်ဖျက်မည်',
                        type: 'danger',
                      });
                      if (confirmed) {
                        onClearAllItems?.();
                        notify.info('စာတန်းထိုးအားလုံးကို ရှင်းလင်းပြီးပါပြီ');
                      }
                    }}
                    className="p-2 bg-[#181926] hover:bg-[#202235] border border-[#25283c] rounded text-left flex items-center space-x-2 text-slate-200 transition hover:text-rose-300"
                    title="စာတန်းအားလုံး ရှင်းထုတ်မည်"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">စာတန်းအားလုံး ဖျက်မည်</span>
                  </button>

                  <button
                    onClick={() => onAddItem()}
                    className="p-2 bg-[#181926] hover:bg-[#202235] border border-[#25283c] rounded text-left flex items-center space-x-2 text-slate-200 transition hover:text-emerald-300"
                    title="စာတန်းအသစ်တစ်ခု ထည့်မည်"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">စာတန်းအသစ် ထည့်မည်</span>
                  </button>
                </div>
              </div>
            )}

            {activeBottomTab === 'options' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Translation Style</label>
                    <select
                      value={translationSettings.style}
                      onChange={(e) =>
                        onUpdateTranslationSettings({
                          ...translationSettings,
                          style: e.target.value as any,
                        })
                      }
                      className="w-full bg-[#0d0e17] border border-[#24273c] rounded p-1.5 text-xs text-slate-200"
                    >
                      <option value="conversational">သဘာဝကျ စကားပြော (Natural)</option>
                      <option value="dramatic">ဇာတ်ကောင် စိတ်ခံစားမှု (Anime)</option>
                      <option value="formal">ရုံးသုံး/ယဉ်ကျေး (Formal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Batch Size</label>
                    <select
                      value={translationSettings.batchSize}
                      onChange={(e) =>
                        onUpdateTranslationSettings({
                          ...translationSettings,
                          batchSize: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#0d0e17] border border-[#24273c] rounded p-1.5 text-xs text-slate-200"
                    >
                      <option value={15}>15 ကြောင်းစီ</option>
                      <option value={25}>25 ကြောင်းစီ (Standard)</option>
                      <option value={40}>40 ကြောင်းစီ (Fast)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Subtitle Editor Table */}
      <div
        className="flex-1 flex flex-col bg-[#07080d] overflow-hidden relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Overlay visualizer */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-40 bg-purple-950/80 border-2 border-dashed border-purple-400 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 pointer-events-none animate-in fade-in duration-100">
            <Upload className="w-10 h-10 text-purple-300 animate-bounce" />
            <p className="text-sm font-bold">ဖိုင်ကို ဤနေရာတွင် လွှတ်ချပါ (Drop File Here)</p>
            <p className="text-xs text-purple-300 font-mono">.srt, .vtt, .txt သို့မဟုတ် Video</p>
          </div>
        )}

        {/* Top Search & Action Bar */}
        <div className="bg-[#0f1019] border-b border-[#1c1e2d] px-3 py-1.5 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center space-x-2 flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="ရှာဖွေရန် (Burmese or English)..."
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 text-[11px] text-slate-400">
            {/* Story Context Pre-read Toggle Button */}
            <button
              onClick={() => setIsStoryContextOpen(!isStoryContextOpen)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1.5 transition ${
                isStoryContextOpen
                  ? 'bg-purple-600 text-white shadow-xs'
                  : translationSettings.storyContext
                  ? 'bg-purple-950/70 text-purple-200 border border-purple-800/60 hover:bg-purple-900/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1c2a]'
              }`}
              title="ဇာတ်လမ်း & ဇာတ်ကောင် သုံးသပ်ချက် (Story Context)"
            >
              <Compass className={`w-3.5 h-3.5 ${isAnalyzingContext || contextAnalysisStep === 'reading' ? 'animate-spin text-amber-300' : 'text-purple-400'}`} />
              <span className="hidden sm:inline">Story Context</span>
              {translationSettings.storyContext && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              )}
            </button>

            {/* Find & Replace Toggle */}
            <button
              onClick={() => setIsFindReplaceOpen(!isFindReplaceOpen)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1 transition ${
                isFindReplaceOpen
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1c2a]'
              }`}
              title="ရှာပြီး အစားထိုးမည် (Find & Replace)"
            >
              <Replace className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Find & Replace</span>
            </button>

            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="accent-purple-500 rounded"
              />
              <span className="hidden sm:inline">Auto-scroll</span>
            </label>

            <span className="font-mono bg-[#141624] px-1.5 py-0.5 rounded border border-[#23273c]">
              {filteredItems.length} lines
            </span>
          </div>
        </div>

        {/* Inline Find & Replace Panel */}
        {isFindReplaceOpen && (
          <div className="bg-[#12131e] border-b border-purple-500/30 p-2.5 text-xs text-slate-300 space-y-2 animate-in slide-in-from-top-1 duration-150">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[140px]">
                <input
                  type="text"
                  placeholder="ရှာမည့်စာလုံး (Find)..."
                  value={findTerm}
                  onChange={(e) => setFindTerm(e.target.value)}
                  className="w-full bg-[#090a10] border border-[#25283c] focus:border-purple-500 rounded px-2 py-1 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              <div className="flex-1 min-w-[140px]">
                <input
                  type="text"
                  placeholder="အစားထိုးမည့်စာလုံး (Replace with)..."
                  value={replaceTerm}
                  onChange={(e) => setReplaceTerm(e.target.value)}
                  className="w-full bg-[#090a10] border border-[#25283c] focus:border-purple-500 rounded px-2 py-1 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              <select
                value={replaceTarget}
                onChange={(e) => setReplaceTarget(e.target.value as any)}
                className="bg-[#090a10] border border-[#25283c] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="both">All (Eng + MM)</option>
                <option value="translated">မြန်မာဘာသာပြန်သာ</option>
                <option value="original">အင်္ဂလိပ် မူရင်းသာ</option>
              </select>

              <label className="flex items-center space-x-1 cursor-pointer text-slate-400">
                <input
                  type="checkbox"
                  checked={matchCase}
                  onChange={(e) => setMatchCase(e.target.checked)}
                  className="accent-purple-500 rounded"
                />
                <span>Aa</span>
              </label>

              <button
                onClick={handleExecuteReplace}
                disabled={!findTerm.trim() || findMatchesCount === 0}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition disabled:opacity-40 disabled:pointer-events-none flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Replace All</span>
              </button>
            </div>

            {findTerm.trim() && (
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  ကိုက်ညီမှု: <strong className="text-purple-300">{findMatchesCount}</strong> ကြိမ် တွေ့ရှိသည်
                </span>
                <span className="text-[10px] text-slate-500">
                  Replace All နှိပ်ပါက စာကြောင်းအားလုံးတွင် အလိုအလျောက် အစားထိုးပါမည်
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Real-time Script Comprehension Banner */}
        {(isAnalyzingContext || contextAnalysisStep === 'reading') && (
          <div className="bg-purple-950/80 border-b border-purple-500/40 p-2.5 px-4 text-xs flex items-center justify-between text-purple-200 animate-pulse backdrop-blur-xs">
            <div className="flex items-center space-x-2.5">
              <Compass className="w-4 h-4 text-amber-300 animate-spin" />
              <div>
                <span className="font-bold text-amber-300">အဆင့် (၁/၂) - စာသားများကို သေချာဖတ်ရှု လေ့လာနေပါသည်: </span>
                <span>ဘာသာမပြန်မီ ဇာတ်လမ်းနောက်ခံ၊ ဇာတ်ကောင် ဆက်ဆံရေးနှင့် Pronoun များကို အရင်နားလည်အောင် ဖတ်ရှုနေပါသည်...</span>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-purple-900/60 px-2 py-0.5 rounded border border-purple-700/50">
              Pre-Reading Context...
            </span>
          </div>
        )}

        {/* Story Context Details Panel (Collapsible / On-demand) */}
        {isStoryContextOpen && (
          <div className="bg-[#0e101c] border-b border-purple-500/30 p-3 text-xs text-slate-200 space-y-2.5 animate-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#1f233a]">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-slate-100">
                  ဇာတ်လမ်း & ဇာတ်ကောင် အချက်အလက် (Pre-read Story Knowledge)
                </span>
                {translationSettings.storyContext && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold">
                    လေ့လာသိရှိပြီး
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {onAnalyzeStoryContext && (
                  <button
                    onClick={() => onAnalyzeStoryContext()}
                    disabled={isAnalyzingContext}
                    className="px-2 py-0.5 bg-purple-600/80 hover:bg-purple-600 text-white rounded text-[11px] font-medium flex items-center space-x-1 transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isAnalyzingContext ? 'animate-spin' : ''}`} />
                    <span>{isAnalyzingContext ? 'ဖတ်ရှုနေသည်...' : 'ပြန်လည်ဖတ်ရှုမည်'}</span>
                  </button>
                )}
                <button
                  onClick={() => setIsStoryContextOpen(false)}
                  className="p-1 hover:bg-[#1f233a] rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title="ပိတ်မည်"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {translationSettings.storyContext ? (
              <div className="space-y-2 text-[11px]">
                <div>
                  <span className="text-slate-400 font-semibold">ဇာတ်လမ်းအကျဉ်း: </span>
                  <span className="text-slate-200 leading-relaxed">
                    {translationSettings.storyContext.summary}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-slate-400 font-semibold mr-1">Setting / Mood:</span>
                  <span className="bg-purple-950/70 border border-purple-800/60 px-2 py-0.5 rounded text-purple-300 text-[10px] font-mono">
                    {translationSettings.storyContext.settingAndTone}
                  </span>
                </div>

                {translationSettings.storyContext.characters && translationSettings.storyContext.characters.length > 0 && (
                  <div className="pt-1">
                    <span className="text-slate-400 font-semibold block mb-1">
                      ဇာတ်ကောင်များနှင့် သတ်မှတ် Pronoun စည်းမျဉ်းများ:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                      {translationSettings.storyContext.characters.map((c, idx) => (
                        <div
                          key={idx}
                          className="bg-[#070912] border border-[#23273e] p-1.5 px-2 rounded text-[10px] flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-100">{c.name}</span>
                            <span className="text-slate-500 font-mono text-[9px]">{c.roleOrGender || 'role'}</span>
                          </div>
                          <div className="mt-1 text-slate-300">
                            Pronoun: <strong className="text-amber-300 font-bold">"{c.myanmarPronoun}"</strong>
                          </div>
                          {c.relationshipWithOthers && (
                            <div className="text-[9px] text-slate-400 truncate mt-0.5">
                              {c.relationshipWithOthers}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {translationSettings.storyContext.subtitlingNotes && (
                  <div className="text-[10px] text-purple-300/90 bg-purple-950/30 p-1.5 px-2 rounded border border-purple-900/30">
                    💡 <b>Subtitling Directives:</b> {translationSettings.storyContext.subtitlingNotes}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-2 text-center text-slate-400 space-y-1.5">
                <p className="text-xs">ဇာတ်လမ်း သုံးသပ်ချက် အချက်အလက် မရှိသေးပါ</p>
                <p className="text-[10px] text-slate-500">
                  ဘာသာပြန်စတင်ချိန်တွင် အလိုအလျောက် သုံးသပ်မည်ဖြစ်ပြီး၊ အောက်ပါခလုတ်ဖြင့်လည်း အခုချက်ချင်း စမ်းသပ်ဖတ်ရှုနိုင်ပါသည်
                </p>
                {onAnalyzeStoryContext && (
                  <button
                    onClick={() => onAnalyzeStoryContext()}
                    disabled={isAnalyzingContext || items.length === 0}
                    className="mt-1 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                  >
                    {isAnalyzingContext ? 'ဖတ်ရှုသုံးသပ်နေပါသည်...' : 'ဇာတ်လမ်း အခုချက်ချင်း ဖတ်ရှုမည် (Pre-read Now)'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Scrollable Subtitle Rows OR Empty State */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#131522] border border-[#24283d] flex items-center justify-center text-purple-400 shadow-xl">
              <Film className="w-8 h-8 opacity-80" />
            </div>

            <div className="max-w-md space-y-1">
              <h3 className="text-base font-bold text-slate-200">
                စာတန်းထိုးဖိုင် မရှိသေးပါ (No Subtitles Loaded)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                SRT သို့မဟုတ် VTT ဖိုင်ကို ဤနေရာသို့ ဆွဲထည့်ပါ သို့မဟုတ် အောက်ပါခလုတ်များဖြင့် စတင်ပါ
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <label className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 shadow-md">
                <FileUp className="w-4 h-4" />
                <span>စာတန်းဖိုင် တင်မည် (.srt, .vtt)</span>
                <input
                  type="file"
                  accept=".srt,.vtt,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadSubtitle?.(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>

              <label className="px-3.5 py-2 bg-[#171926] hover:bg-[#202235] border border-[#282c44] text-slate-200 rounded-md text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 shadow-sm">
                <Upload className="w-4 h-4 text-purple-400" />
                <span>ဗီဒီယို တင်မည် (.mp4, .mkv)</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadVideo(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => onNewSubtitle?.()}
                className="px-3.5 py-2 bg-[#171926] hover:bg-[#202235] border border-[#282c44] text-slate-200 rounded-md text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>စာတန်းအသစ် စတင်ဖန်တီးမည်</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            ref={listContainerRef}
            className="flex-1 overflow-y-auto divide-y divide-[#171926] bg-[#07080d]"
          >
            {filteredItems.map((item) => {
              const isActive = activeItem?.id === item.id;
              const durationSec = Math.max(0.1, (item.endMs - item.startMs) / 1000);
              const durationSecStr = durationSec.toFixed(3);
              const textContent = item.translatedText || item.originalText || '';
              const cps = (textContent.length / durationSec).toFixed(1);
              const isCpsFast = Number(cps) > 21;

            return (
              <div
                key={item.id}
                ref={(el) => {
                  rowRefs.current[item.id] = el;
                }}
                onClick={() => {
                  onSelectSubItem(item);
                  onSeek(item.startMs);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    isOpen: true,
                    x: e.clientX,
                    y: e.clientY,
                    targetItem: item,
                    targetTimeMs: item.startMs,
                  });
                }}
                className={`flex items-stretch transition border-l-4 cursor-pointer group ${
                  isActive
                    ? 'bg-[#151726] border-purple-500 shadow-md ring-1 ring-purple-500/20'
                    : 'bg-[#07080d] hover:bg-[#0e1018] border-transparent'
                }`}
              >
                {/* Column 1: Action Group Icons (Delete, Merge, Add, Single AI Translate) */}
                <div
                  className="w-10 bg-[#0a0b12] border-r border-[#191b2b] flex flex-col items-center justify-around py-1 shrink-0 text-slate-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                    title="စာကြောင်း ဖျက်မည်"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onMergeItem(item.id)}
                    className="p-1 hover:text-sky-400 hover:bg-sky-500/10 rounded transition"
                    title="နောက်စာကြောင်းနှင့် ပေါင်းမည်"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onAddItem(item.id)}
                    className="p-1 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition"
                    title="အောက်တွင် စာကြောင်းအသစ်ထည့်မည်"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {/* Single Line AI Translate button */}
                  <button
                    onClick={() => onTranslateSingleItem?.(item)}
                    className="p-1 hover:text-rose-300 hover:bg-rose-500/20 rounded transition text-rose-400"
                    title="ဤတစ်ကြောင်း ဘာသာပြန်မည်"
                  >
                    <Languages className="w-3 h-3" />
                  </button>
                </div>

                {/* Column 2: Timestamp Badge (Purple/dark container matching screenshot) */}
                <div
                  className={`w-32 sm:w-36 px-2 py-2 shrink-0 flex flex-col justify-between font-mono text-[10px] sm:text-[11px] border-r transition relative ${
                    isActive
                      ? 'bg-[#3b1d70] text-purple-200 border-purple-600/40'
                      : 'bg-[#11121d] text-slate-400 border-[#1d1f30]'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(item.startMs);
                  }}
                >
                  {/* Start time with quick +/- 100ms nudges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-slate-300">
                      <span className="text-purple-300 font-bold">⬆</span>
                      <span>{item.startTime}</span>
                    </div>
                    <div
                      className="opacity-0 group-hover:opacity-100 flex items-center space-x-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleNudgeTime(item, 'start', -100)}
                        className="hover:text-white p-0.5 text-[8px] bg-black/40 rounded"
                        title="-100ms"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleNudgeTime(item, 'start', 100)}
                        className="hover:text-white p-0.5 text-[8px] bg-black/40 rounded"
                        title="+100ms"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* End time with quick +/- 100ms nudges */}
                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex items-center space-x-1 text-slate-300">
                      <span className="text-purple-300 font-bold">⬇</span>
                      <span>{item.endTime}</span>
                    </div>
                    <div
                      className="opacity-0 group-hover:opacity-100 flex items-center space-x-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleNudgeTime(item, 'end', -100)}
                        className="hover:text-white p-0.5 text-[8px] bg-black/40 rounded"
                        title="-100ms"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleNudgeTime(item, 'end', 100)}
                        className="hover:text-white p-0.5 text-[8px] bg-black/40 rounded"
                        title="+100ms"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Duration & CPS */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-0.5 border-t border-white/10">
                    <div className="flex items-center space-x-1">
                      <Timer className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{durationSecStr}s</span>
                    </div>

                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        isCpsFast
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400'
                      }`}
                      title={isCpsFast ? 'စာဖတ်နှုန်း မြန်လွန်းပါသည် (High CPS)' : 'CPS (Characters per second)'}
                    >
                      {cps} CPS
                    </span>
                  </div>
                </div>

                {/* Column 3: Subtitle Text Content Area */}
                <div
                  className="flex-1 p-2.5 flex flex-col justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Bilingual Mode: displays both original and translation */}
                  {displayMode === 'bilingual' ? (
                    <div className="space-y-1">
                      <div className="text-[11px] text-slate-400 font-sans select-text">
                        {item.originalText}
                      </div>
                      <textarea
                        rows={1}
                        value={item.translatedText || ''}
                        onChange={(e) => onUpdateItem(item.id, { translatedText: e.target.value })}
                        placeholder="မြန်မာဘာသာပြန်..."
                        className={`w-full bg-transparent text-sm font-sans font-medium text-slate-100 focus:outline-none focus:ring-1 rounded p-1 transition resize-none ${
                          isActive ? 'focus:ring-purple-400' : 'focus:ring-slate-600'
                        }`}
                      />
                    </div>
                  ) : displayMode === 'second' ? (
                    /* Second Mode: Edits original English */
                    <textarea
                      rows={1}
                      value={item.originalText || ''}
                      onChange={(e) => onUpdateItem(item.id, { originalText: e.target.value })}
                      placeholder="Original text..."
                      className={`w-full bg-transparent text-sm font-sans font-medium text-slate-200 focus:outline-none focus:ring-1 rounded p-1 transition resize-none ${
                        isActive ? 'focus:ring-purple-400 text-purple-200' : 'focus:ring-slate-600'
                      }`}
                    />
                  ) : (
                    /* Main Mode: Edits Myanmar translated text */
                    <textarea
                      rows={1}
                      value={item.translatedText || ''}
                      onChange={(e) => onUpdateItem(item.id, { translatedText: e.target.value })}
                      placeholder="မြန်မာဘာသာ ရေးသားပါ..."
                      className={`w-full bg-transparent text-sm font-sans font-medium text-slate-100 focus:outline-none focus:ring-1 rounded p-1 transition resize-none ${
                        isActive ? 'focus:ring-purple-400' : 'focus:ring-slate-600'
                      }`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

      {/* Right Click Context Menu */}
      <StudioContextMenu
        menuState={contextMenu}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        onPlayFromHere={(ms) => onSeek(ms)}
        onSetStartTimeToPlayhead={(id) => {
          onUpdateItem(id, {
            startMs: currentTimeMs,
            startTime: msToTimeSRT(currentTimeMs),
          });
        }}
        onSetEndTimeToPlayhead={(id) => {
          onUpdateItem(id, {
            endMs: currentTimeMs,
            endTime: msToTimeSRT(currentTimeMs),
          });
        }}
        onSplitAtPlayhead={onSplitItem}
        onAddSubtitleAtTime={(timeMs) => onAddItem(undefined, timeMs)}
        onTranslateSingle={onTranslateSingleItem}
        onMergeWithNext={onMergeItem}
        onDeleteItem={onDeleteItem}
      />
    </div>
  );
};
