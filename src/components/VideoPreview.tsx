import React, { useState, useRef, useEffect } from 'react';
import { SubtitleItem, VideoConfig } from '../types';
import { msToTimeSRT } from '../utils/subtitleParser';
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
  ChevronRight,
  Sparkles,
  Clock,
  Plus,
  Minus,
  FastForward,
  Rewind,
  Target,
  Edit3,
  Check,
  Search,
} from 'lucide-react';

interface VideoPreviewProps {
  items: SubtitleItem[];
  videoConfig: VideoConfig;
  onUpdateVideoConfig: (newConfig: VideoConfig) => void;
  onSelectSubItem?: (item: SubtitleItem) => void;
  onUpdateItem?: (id: number, updatedFields: Partial<SubtitleItem>) => void;
  onTimeShiftClick?: () => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  items,
  videoConfig,
  onUpdateVideoConfig,
  onSelectSubItem,
  onUpdateItem,
  onTimeShiftClick,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [activeSub, setActiveSub] = useState<SubtitleItem | null>(null);
  const [customVideoFile, setCustomVideoFile] = useState<string | null>(null);

  const [hasVideoError, setHasVideoError] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [subSearch, setSubSearch] = useState('');

  // Time adjustment helpers
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
    const dur = Math.max(1000, item.endMs - item.startMs);
    const newEnd = Math.max(newStart + 500, newStart + dur);
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

  // Timeupdate handler
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

  const handleLoadedMetadata = () => {
    setHasVideoError(false);
    if (videoRef.current) {
      setDurationSec(videoRef.current.duration || 0);
    }
  };

  const handleVideoError = () => {
    setHasVideoError(true);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!videoRef.current || hasVideoError) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => setHasVideoError(true));
    }
    setIsPlaying(!isPlaying);
  };

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

  const skipSeconds = (secs: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(durationSec || 9999, videoRef.current.currentTime + secs));
    videoRef.current.currentTime = newTime;
    setCurrentTimeMs(Math.round(newTime * 1000));
  };

  const jumpToPrevSub = () => {
    if (!items.length) return;
    const prev = [...items].reverse().find((it) => it.startMs < currentTimeMs - 500);
    if (prev) {
      jumpToTime(prev.startMs);
    } else if (items[0]) {
      jumpToTime(items[0].startMs);
    }
  };

  const jumpToNextSub = () => {
    if (!items.length) return;
    const next = items.find((it) => it.startMs > currentTimeMs + 200);
    if (next) {
      jumpToTime(next.startMs);
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

  const jumpToTime = (startMs: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startMs / 1000;
    setCurrentTimeMs(startMs);
    if (!isPlaying && !hasVideoError) {
      videoRef.current.play().catch(() => setHasVideoError(true));
      setIsPlaying(true);
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
      setCustomVideoFile(url);
      setHasVideoError(false);
      onUpdateVideoConfig({ ...videoConfig, videoUrl: url, isCustomVideo: true });
    }
  };

  // Sample Videos with reliable fallback sources
  const sampleVideos = [
    {
      title: 'Big Buck Bunny (Sample 1)',
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    },
    {
      title: 'Sintel Trailer (Sample 2)',
      url: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    },
    {
      title: 'Google Cloud Sample',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Video Player & Subtitle Overlay */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 aspect-video group">
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
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-3 z-10">
                <Film className="w-10 h-10 text-amber-400 animate-bounce" />
                <div className="font-bold text-slate-100 text-sm">
                  ဗီဒီယို ဖိုင် ဖွင့်၍ မရပါ သို့မဟုတ် မူရင်း URL တိုက်ရိုက် မရရှိနိုင်ပါ
                </div>
                <p className="text-xs text-slate-400 max-w-md">
                  အောက်ပါ "Upload MP4/WebM" ခလုတ်မှ မိမိစက်ထဲရှိ Video ဖိုင်ကို ထည့်သွင်းကြည့်ရှုနိုင်သလို သို့မဟုတ် အခြား နမူနာ ဗီဒီယို URL ကို ရွေးချယ်နိုင်ပါသည်။
                </p>
                <label className="mt-2 inline-flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-xl cursor-pointer text-xs transition shadow-lg">
                  <Upload className="w-4 h-4" />
                  <span>မိမိ ဗီဒီယိုဖိုင် ထည့်သွင်းမည်</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={handleVideoFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Subtitle Overlay Rendering */}
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
                  className="px-4 py-2 rounded-xl backdrop-blur-sm max-w-2xl leading-relaxed shadow-lg border border-white/10"
                >
                  {/* Translated Myanmar Line */}
                  {(videoConfig.subtitleMode === 'translated' ||
                    videoConfig.subtitleMode === 'dual') && (
                    <div
                      style={{ color: videoConfig.textColor }}
                      className="font-bold tracking-wide drop-shadow-md"
                    >
                      {activeSub.translatedText || activeSub.originalText}
                    </div>
                  )}

                  {/* Dual Mode Original English Line */}
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

            {/* Play Overlay Control */}
            <div
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/90 text-slate-950 flex items-center justify-center shadow-xl transform scale-95 group-hover:scale-100 transition">
                {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
              </div>
            </div>
          </div>

          {/* Video Playback & Seek Scrubber Control Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
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
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none border border-slate-800"
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

            {/* Playback & Seek Buttons */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800/80">
              {/* Left: Skip & Play Controls */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={jumpToPrevSub}
                  className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition text-xs flex items-center space-x-1"
                  title="ယခင် စာတန်းထိုးသို့ သွားမည်"
                >
                  <Rewind className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xs:inline text-[11px]">ယခင် စာကြောင်း</span>
                </button>

                <button
                  onClick={() => skipSeconds(-5)}
                  className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition text-xs flex items-center space-x-1"
                  title="5 စက္ကန့် နောက်သို့ ကျော်မည်"
                >
                  <span className="text-[11px] font-bold text-slate-300">-5s</span>
                </button>

                <button
                  onClick={togglePlay}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-500/10"
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
                  onClick={() => skipSeconds(5)}
                  className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition text-xs flex items-center space-x-1"
                  title="5 စက္ကန့် ရှေ့သို့ ကျော်မည်"
                >
                  <span className="text-[11px] font-bold text-slate-300">+5s</span>
                </button>

                <button
                  onClick={jumpToNextSub}
                  className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition text-xs flex items-center space-x-1"
                  title="နောက် စာတန်းထိုးသို့ သွားမည်"
                >
                  <span className="hidden xs:inline text-[11px]">နောက် စာကြောင်း</span>
                  <FastForward className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>

              {/* Right: Audio Mute & Fullscreen */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={toggleMute}
                  className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition"
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
                  className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition"
                  title="မျက်နှာပြင်ပြည့် ကြည့်မည်"
                >
                  <Maximize2 className="w-4 h-4 text-slate-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Subtitle Overlay Display Config Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>စာတန်းထိုး ပြသမှု ပုံစံများ (Subtitle Display Settings)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="bottom">အောက်ခြေ (Bottom)</option>
                  <option value="top">အထက်ပိုင်း (Top)</option>
                  <option value="middle">အလယ် (Middle)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Time Adjustment Controls Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  ဗီဒီယို ကြည့်ရင်း အချိန် ချိန်ညှိရန် (Live Time Sync & Shift)
                </span>
              </div>
              {onTimeShiftClick && (
                <button
                  onClick={onTimeShiftClick}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-500/30 transition"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>အသေးစိတ် တိုး/လျှော့ စနစ်</span>
                </button>
              )}
            </div>

            {/* Quick Shift Presets Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-[11px] text-slate-400">စာတန်းထိုး အားလုံး အချိန် တိုး/လျှော့:</span>
              <div className="flex items-center space-x-1.5 flex-wrap">
                {[
                  { label: '-1s', ms: -1000 },
                  { label: '-500ms', ms: -500 },
                  { label: '-100ms', ms: -100 },
                  { label: '+100ms', ms: 100 },
                  { label: '+500ms', ms: 500 },
                  { label: '+1s', ms: 1000 },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={() => {
                      if (onUpdateItem) {
                        items.forEach((it) => {
                          onUpdateItem(it.id, {
                            startMs: Math.max(0, it.startMs + btn.ms),
                            endMs: Math.max(0, it.endMs + btn.ms),
                            startTime: msToTimeSRT(Math.max(0, it.startMs + btn.ms)),
                            endTime: msToTimeSRT(Math.max(0, it.endMs + btn.ms)),
                          });
                        });
                      }
                    }}
                    className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-[11px] font-mono transition"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Currently Active Subtitle Line Live Sync & Direct Editor */}
            {activeSub && onUpdateItem && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md text-xs font-mono font-bold">
                      #{activeSub.index}
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      လက်ရှိ စာကြောင်း တိုက်ရိုက် ပြင်ဆင်ရန် (Live Edit)
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 font-mono text-[11px] text-amber-300">
                    <span>{activeSub.startTime}</span>
                    <span>→</span>
                    <span>{activeSub.endTime}</span>
                  </div>
                </div>

                {/* Text Editing Field */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    မြန်မာဘာသာ ပြန်ဆိုချက် (Myanmar Text):
                  </label>
                  <input
                    type="text"
                    value={activeSub.translatedText || ''}
                    onChange={(e) =>
                      onUpdateItem(activeSub.id, { translatedText: e.target.value })
                    }
                    placeholder="မြန်မာစာတန်းထိုး ရေးသားပါ..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                  <div className="text-[10px] text-slate-400 mt-1 truncate">
                    မူရင်း: {activeSub.originalText}
                  </div>
                </div>

                {/* Live Timestamp Fine-Tuning Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-400 text-[10px]">စတင်ချိန်:</span>
                    <button
                      onClick={() => handleSetStartToNow(activeSub.id)}
                      className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-lg border border-emerald-500/30 transition flex items-center space-x-1"
                      title="လက်ရှိ ဗီဒီယိုနေရာကို စတင်ချိန်အဖြစ် သတ်မှတ်မည်"
                    >
                      <Target className="w-3 h-3" />
                      <span>စတင်ချိန် သတ်မှတ်</span>
                    </button>
                    <button
                      onClick={() => handleAdjustTime(activeSub.id, 'startMs', -100)}
                      className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 font-mono"
                    >
                      -100ms
                    </button>
                    <button
                      onClick={() => handleAdjustTime(activeSub.id, 'startMs', 100)}
                      className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 font-mono"
                    >
                      +100ms
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <span className="text-slate-400 text-[10px]">ပြီးဆုံးချိန်:</span>
                    <button
                      onClick={() => handleSetEndToNow(activeSub.id)}
                      className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-lg border border-amber-500/30 transition flex items-center space-x-1"
                      title="လက်ရှိ ဗီဒီယိုနေရာကို ပြီးဆုံးချိန်အဖြစ် သတ်မှတ်မည်"
                    >
                      <Target className="w-3 h-3" />
                      <span>ပြီးဆုံးချိန် သတ်မှတ်</span>
                    </button>
                    <button
                      onClick={() => handleAdjustTime(activeSub.id, 'endMs', -100)}
                      className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 font-mono"
                    >
                      -100ms
                    </button>
                    <button
                      onClick={() => handleAdjustTime(activeSub.id, 'endMs', 100)}
                      className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 font-mono"
                    >
                      +100ms
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Video Selector & Timeline Subtitles */}
        <div className="space-y-4">
          {/* Custom Video Source Loader */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Film className="w-4 h-4 text-emerald-400" />
              <span>ဗီဒီယို ဖိုင် ရွေးချယ်ရန် (Video Source)</span>
            </h3>

            <label className="flex items-center justify-center space-x-2 border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950 p-3 rounded-xl cursor-pointer text-xs text-slate-300 transition">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>မိမိ ဗီဒီယိုဖိုင် ထည့်မည် (Upload MP4/WebM)</span>
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={handleVideoFileUpload}
                className="hidden"
              />
            </label>

            <div className="pt-2 text-[11px] text-slate-400">
              <span className="block mb-1">သို့မဟုတ် နမူနာ ဗီဒီယိုများ ရွေးရန်:</span>
              <div className="space-y-1">
                {sampleVideos.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      onUpdateVideoConfig({
                        ...videoConfig,
                        videoUrl: sample.url,
                        isCustomVideo: false,
                      })
                    }
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                      videoConfig.videoUrl === sample.url
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {sample.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subtitle Jump List & Inline Quick Editor */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 max-h-[500px] flex flex-col">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200">
                  စာတန်းထိုး လိုင်းများ ({items.length})
                </h3>
                <span className="text-[10px] text-slate-400">နှိပ်လျှင် ဗီဒီယို သို့ ရောက်မည်</span>
              </div>

              {/* Filter Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="စာကြောင်း ရှာရန်..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {items
                .filter(
                  (item) =>
                    !subSearch ||
                    item.originalText.toLowerCase().includes(subSearch.toLowerCase()) ||
                    item.translatedText?.toLowerCase().includes(subSearch.toLowerCase()) ||
                    item.index.toString().includes(subSearch)
                )
                .map((item) => {
                  const isCurrent = activeSub?.id === item.id;
                  const isEditing = editingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border text-xs transition ${
                        isCurrent
                          ? 'bg-emerald-500/15 border-emerald-500/60 text-slate-100 shadow-md'
                          : 'bg-slate-950 border-slate-800/80 hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 mb-1.5">
                        <button
                          type="button"
                          onClick={() => jumpToTime(item.startMs)}
                          className="hover:text-emerald-400 font-bold flex items-center space-x-1"
                        >
                          <Play className="w-3 h-3 fill-current text-emerald-400" />
                          <span>#{item.index} ({item.startTime})</span>
                        </button>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(isEditing ? null : item.id)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-emerald-400"
                            title="စာသားနှင့် အချိန် ပြင်ရန်"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Main Subtitle Text */}
                      {isEditing && onUpdateItem ? (
                        <div className="space-y-2 pt-1 border-t border-slate-800">
                          <input
                            type="text"
                            value={item.translatedText || ''}
                            onChange={(e) =>
                              onUpdateItem(item.id, { translatedText: e.target.value })
                            }
                            placeholder="မြန်မာ စာတန်းထိုး..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
                          />
                          <div className="flex items-center justify-between text-[10px] text-slate-400 gap-1 flex-wrap">
                            <span>စတင်ချိန်:</span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleSetStartToNow(item.id)}
                                className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold"
                              >
                                Now
                              </button>
                              <button
                                onClick={() => handleAdjustTime(item.id, 'startMs', -100)}
                                className="px-1 py-0.5 bg-slate-800 rounded"
                              >
                                -100ms
                              </button>
                              <button
                                onClick={() => handleAdjustTime(item.id, 'startMs', 100)}
                                className="px-1 py-0.5 bg-slate-800 rounded"
                              >
                                +100ms
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 gap-1 flex-wrap">
                            <span>ပြီးဆုံးချိန်:</span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleSetEndToNow(item.id)}
                                className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold"
                              >
                                Now
                              </button>
                              <button
                                onClick={() => handleAdjustTime(item.id, 'endMs', -100)}
                                className="px-1 py-0.5 bg-slate-800 rounded"
                              >
                                -100ms
                              </button>
                              <button
                                onClick={() => handleAdjustTime(item.id, 'endMs', 100)}
                                className="px-1 py-0.5 bg-slate-800 rounded"
                              >
                                +100ms
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingId(null)}
                            className="w-full py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg text-[11px] flex items-center justify-center space-x-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>သိမ်းမည်</span>
                          </button>
                        </div>
                      ) : (
                        <div onClick={() => jumpToTime(item.startMs)} className="cursor-pointer space-y-0.5">
                          <div className="font-bold text-emerald-300">
                            {item.translatedText || item.originalText}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {item.originalText}
                          </div>
                        </div>
                      )}
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
