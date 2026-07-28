import React, { useState, useMemo } from 'react';
import { SubtitleItem, SubtitleFormat } from '../types';
import { msToTimeSRT, msToTimeVTT } from '../utils/subtitleParser';
import {
  Clock,
  Plus,
  Minus,
  X,
  Check,
  Zap,
  Sliders,
  ArrowRight,
  RotateCcw,
  Gauge,
  ListFilter,
} from 'lucide-react';

interface TimeOffsetModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SubtitleItem[];
  format?: SubtitleFormat;
  onApplyShift: (updatedItems: SubtitleItem[]) => void;
}

export const TimeOffsetModal: React.FC<TimeOffsetModalProps> = ({
  isOpen,
  onClose,
  items,
  format = 'srt',
  onApplyShift,
}) => {
  // Mode: offset (fixed ms shift) or speed (stretch ratio)
  const [activeTab, setActiveTab] = useState<'offset' | 'speed'>('offset');

  // Scope: all | range | fromCursor
  const [scope, setScope] = useState<'all' | 'range' | 'fromCursor'>('all');
  const [fromIndex, setFromIndex] = useState<number>(1);
  const [toIndex, setToIndex] = useState<number>(items.length || 1);

  // Time Offset State
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [milliseconds, setMilliseconds] = useState<number>(0);

  // Speed Stretch State (Multiplier factor e.g. 1.0427)
  const [speedRatio, setSpeedRatio] = useState<number>(1.0);

  if (!isOpen) return null;

  const totalItemsCount = items.length;
  const maxIdx = Math.max(1, totalItemsCount);

  // Format Helper
  const formatTime = (ms: number) =>
    format === 'vtt' ? msToTimeVTT(ms) : msToTimeSRT(ms);

  // Calculate total offset in ms
  const totalOffsetMs =
    (minutes * 60000 + seconds * 1000 + milliseconds) *
    (direction === 'forward' ? 1 : -1);

  // Quick Preset Adders
  const addQuickOffset = (msChange: number) => {
    const currentAbsMs = minutes * 60000 + seconds * 1000 + milliseconds;
    let newAbsMs = currentAbsMs;

    if (direction === 'forward') {
      newAbsMs += msChange;
    } else {
      newAbsMs -= msChange;
    }

    if (newAbsMs < 0) {
      setDirection('backward');
      newAbsMs = Math.abs(newAbsMs);
    } else {
      setDirection(direction === 'backward' && currentAbsMs - msChange < 0 ? 'forward' : direction);
      if (currentAbsMs - msChange < 0) {
        setDirection('forward');
        newAbsMs = Math.abs(currentAbsMs - msChange);
      }
    }

    const newMins = Math.floor(newAbsMs / 60000);
    const newSecs = Math.floor((newAbsMs % 60000) / 1000);
    const newMs = Math.floor(newAbsMs % 1000);

    setMinutes(newMins);
    setSeconds(newSecs);
    setMilliseconds(newMs);
  };

  const handleReset = () => {
    setMinutes(0);
    setSeconds(0);
    setMilliseconds(0);
    setDirection('forward');
    setSpeedRatio(1.0);
  };

  // Calculate transformed preview items
  const calculateShiftedItems = (): SubtitleItem[] => {
    if (totalItemsCount === 0) return [];

    let start = 1;
    let end = totalItemsCount;

    if (scope === 'range') {
      start = Math.max(1, Math.min(fromIndex, totalItemsCount));
      end = Math.max(start, Math.min(toIndex, totalItemsCount));
    } else if (scope === 'fromCursor') {
      start = Math.max(1, Math.min(fromIndex, totalItemsCount));
      end = totalItemsCount;
    }

    // Anchor time for speed stretching (start of the selected range)
    const anchorMs = items[start - 1] ? items[start - 1].startMs : 0;

    return items.map((item, idx) => {
      const itemNum = idx + 1;
      if (itemNum < start || itemNum > end) {
        return item;
      }

      let newStartMs = item.startMs;
      let newEndMs = item.endMs;

      if (activeTab === 'offset') {
        newStartMs = Math.max(0, item.startMs + totalOffsetMs);
        newEndMs = Math.max(0, item.endMs + totalOffsetMs);
      } else {
        // Speed Stretch: Scale relative to anchor
        const durationStart = item.startMs - anchorMs;
        const durationEnd = item.endMs - anchorMs;

        newStartMs = Math.max(0, Math.round(anchorMs + durationStart * speedRatio));
        newEndMs = Math.max(0, Math.round(anchorMs + durationEnd * speedRatio));
      }

      return {
        ...item,
        startMs: newStartMs,
        endMs: newEndMs,
        startTime: formatTime(newStartMs),
        endTime: formatTime(newEndMs),
      };
    });
  };

  const previewItems = calculateShiftedItems();

  // Get sample items for live preview display (first 2 and last 2 affected items)
  const getPreviewSamples = () => {
    let start = 1;
    let end = totalItemsCount;

    if (scope === 'range') {
      start = Math.max(1, Math.min(fromIndex, totalItemsCount));
      end = Math.max(start, Math.min(toIndex, totalItemsCount));
    } else if (scope === 'fromCursor') {
      start = Math.max(1, Math.min(fromIndex, totalItemsCount));
      end = totalItemsCount;
    }

    const affectedIndices: number[] = [];
    for (let i = start - 1; i < end; i++) {
      if (i >= 0 && i < totalItemsCount) {
        affectedIndices.push(i);
      }
    }

    if (affectedIndices.length === 0) return [];

    let selectedIndices: number[] = [];
    if (affectedIndices.length <= 4) {
      selectedIndices = affectedIndices;
    } else {
      selectedIndices = [
        affectedIndices[0],
        affectedIndices[1],
        affectedIndices[affectedIndices.length - 2],
        affectedIndices[affectedIndices.length - 1],
      ];
    }

    return selectedIndices.map((i) => ({
      orig: items[i],
      updated: previewItems[i],
    }));
  };

  const samplePairs = getPreviewSamples();

  const handleApply = () => {
    onApplyShift(previewItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                အချိန် ချိန်ညှိမှု (Subtitles Time Shift & Sync)
              </h3>
              <p className="text-[11px] text-slate-400">
                စာတန်းထိုး အချိန်များကို တိုး/လျှော့ ပြင်ဆင်ပါ သို့မဟုတ် Speed FPS Drift ညှိပါ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Scope Selection (ပြောင်းလဲမည့် စာကြောင်း အတိုင်းအတာ) */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <ListFilter className="w-3.5 h-3.5 text-emerald-400" />
              <span>ချိန်ညှိမည့် စာကြောင်း အပိုင်းအခြား (Scope)</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              စုစုပေါင်း: {totalItemsCount} ကြောင်း
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setScope('all')}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                scope === 'all'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              စာကြောင်း အားလုံး
            </button>

            <button
              onClick={() => setScope('range')}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                scope === 'range'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              သတ်မှတ် အပိုင်းအခြား
            </button>

            <button
              onClick={() => setScope('fromCursor')}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                scope === 'fromCursor'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              #X မှ အဆုံးအထိ
            </button>
          </div>

          {/* Scope Inputs */}
          {scope === 'range' && (
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-xs text-slate-400">စာကြောင်း #</span>
              <input
                type="number"
                min={1}
                max={maxIdx}
                value={fromIndex}
                onChange={(e) => setFromIndex(Math.max(1, Number(e.target.value)))}
                className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400">မှ #</span>
              <input
                type="number"
                min={fromIndex}
                max={maxIdx}
                value={toIndex}
                onChange={(e) => setToIndex(Math.min(maxIdx, Number(e.target.value)))}
                className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400">အထိ</span>
            </div>
          )}

          {scope === 'fromCursor' && (
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-xs text-slate-400">စာကြောင်း #</span>
              <input
                type="number"
                min={1}
                max={maxIdx}
                value={fromIndex}
                onChange={(e) => setFromIndex(Math.max(1, Number(e.target.value)))}
                className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400">မှစ၍ နောက်ဆုံး စာကြောင်းအထိ</span>
            </div>
          )}
        </div>

        {/* 2. Adjustment Mode Tabs (Offset Shift vs Speed Stretch) */}
        <div>
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-3">
            <button
              onClick={() => setActiveTab('offset')}
              className={`flex-1 flex items-center justify-center space-x-2 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'offset'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>စက္ကန့်/မီလီစက္ကန့် တိုး/လျှော့ (Time Shift)</span>
            </button>
            <button
              onClick={() => setActiveTab('speed')}
              className={`flex-1 flex items-center justify-center space-x-2 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'speed'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>အရှိန်နှုန်း/Framerate Stretch (FPS Sync)</span>
            </button>
          </div>

          {/* TAB 1: TIME OFFSET SHIFT */}
          {activeTab === 'offset' && (
            <div className="space-y-3.5">
              {/* Direction Switch */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setDirection('forward')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition ${
                    direction === 'forward'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>ရှေ့သို့ တိုးမည် (+Time / အသံထက် နောက်ကျလျှင်)</span>
                </button>
                <button
                  onClick={() => setDirection('backward')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition ${
                    direction === 'backward'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                  <span>နောက်သို့ လျှော့မည် (-Time / အသံထက် စောလျှင်)</span>
                </button>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  အမြန် ချိန်ညှိချက်ခလုတ်များ (Quick Presets):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '+100ms', val: 100 },
                    { label: '+500ms', val: 500 },
                    { label: '+1s', val: 1000 },
                    { label: '+2s', val: 2000 },
                    { label: '+5s', val: 5000 },
                    { label: '+10s', val: 10000 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => addQuickOffset(p.val)}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition"
                    >
                      {p.label}
                    </button>
                  ))}
                  {[
                    { label: '-100ms', val: -100 },
                    { label: '-500ms', val: -500 },
                    { label: '-1s', val: -1000 },
                    { label: '-2s', val: -2000 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => addQuickOffset(p.val)}
                      className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition"
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    onClick={handleReset}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1 rounded-lg text-xs transition flex items-center space-x-1"
                    title="ပြန်စမည်"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>0</span>
                  </button>
                </div>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">မိနစ် (Mins):</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">စက္ကန့် (Secs):</label>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={seconds}
                    onChange={(e) => setSeconds(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    မီလီစက္ကန့် (ms):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    step={50}
                    value={milliseconds}
                    onChange={(e) => setMilliseconds(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPEED & FRAMERATE STRETCH */}
          {activeTab === 'speed' && (
            <div className="space-y-3.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400">
                ရုပ်ရှင်တလျှောက် စာတန်းထိုးက အချိန်ကြာလာသည်နှင့်အမျှ တဖြည်းဖြည်း မညီတော့ဘဲ အသံထက်
                စော သို့မဟုတ် နောက်ကျသွားပါက FPS Framerate Speed Ratio ပြင်ပေးပါ:
              </p>

              {/* Speed Presets */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSpeedRatio(25.0 / 23.976)}
                  className={`p-2 rounded-lg border text-left transition text-xs ${
                    Math.abs(speedRatio - 25.0 / 23.976) < 0.001
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-semibold">23.976 FPS ➔ 25 FPS</div>
                  <div className="text-[10px] text-slate-400">+4.27% Speeding Up</div>
                </button>

                <button
                  onClick={() => setSpeedRatio(23.976 / 25.0)}
                  className={`p-2 rounded-lg border text-left transition text-xs ${
                    Math.abs(speedRatio - 23.976 / 25.0) < 0.001
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-semibold">25 FPS ➔ 23.976 FPS</div>
                  <div className="text-[10px] text-slate-400">-4.10% Slowing Down</div>
                </button>

                <button
                  onClick={() => setSpeedRatio(25.0 / 24.0)}
                  className={`p-2 rounded-lg border text-left transition text-xs ${
                    Math.abs(speedRatio - 25.0 / 24.0) < 0.001
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-semibold">24 FPS ➔ 25 FPS</div>
                  <div className="text-[10px] text-slate-400">+4.17% Speeding Up</div>
                </button>

                <button
                  onClick={() => setSpeedRatio(1.0)}
                  className={`p-2 rounded-lg border text-left transition text-xs ${
                    speedRatio === 1.0
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-semibold">Normal 1.000x</div>
                  <div className="text-[10px] text-slate-400">မူလအတိုင်း ထားမည်</div>
                </button>
              </div>

              {/* Custom Multiplier slider & input */}
              <div className="pt-2">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-400">Custom Speed Multiplier:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {(speedRatio * 100).toFixed(2)}% ({speedRatio.toFixed(4)}x)
                  </span>
                </div>
                <input
                  type="range"
                  min={0.9}
                  max={1.1}
                  step={0.001}
                  value={speedRatio}
                  onChange={(e) => setSpeedRatio(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Realtime Live Comparison Preview */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-300 flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>စမ်းသပ် ကြည့်ရှုမှု (Live Preview):</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              Shift: {totalOffsetMs >= 0 ? `+${totalOffsetMs}ms` : `${totalOffsetMs}ms`}
            </span>
          </div>

          {samplePairs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">
              ရွေးချယ်ထားသော အတိုင်းအတာထဲတွင် စာကြောင်းမရှိပါ
            </p>
          ) : (
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {samplePairs.map(({ orig, updated }) => (
                <div
                  key={orig.id}
                  className="bg-slate-900 border border-slate-800/80 rounded-lg p-2 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">
                      #{orig.id}
                    </span>
                    <span className="text-slate-400 line-through text-[11px]">
                      {orig.startTime} ➔ {orig.endTime}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                    <ArrowRight className="w-3 h-3 text-slate-400 hidden sm:inline" />
                    <span>
                      {updated.startTime} ➔ {updated.endTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Action Buttons */}
        <div className="flex justify-end space-x-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            မလုပ်တော့ပါ
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
          >
            <Check className="w-4 h-4" />
            <span>ချိန်ညှိချက် အတည်ပြုမည်</span>
          </button>
        </div>
      </div>
    </div>
  );
};
