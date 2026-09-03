import React, { useState, useMemo } from 'react';
import { SubtitleItem } from '../types';
import { BURMESE_PUNCTUATION_HELPERS, cleanSoundEffects, stripSpeakerLabels } from '../utils/burmeseUtils';
import {
  Search,
  Sparkles,
  RefreshCw,
  Edit2,
  Check,
  Filter,
  Replace,
  Clock,
  AlertTriangle,
  FileText,
  ChevronRight,
  Settings,
  VolumeX,
  Plus,
  Trash2,
  GitMerge,
  Key,
  ExternalLink,
  UserX,
} from 'lucide-react';

interface SubtitleTableProps {
  items: SubtitleItem[];
  onUpdateItem: (id: number, updatedFields: Partial<SubtitleItem>) => void;
  onAddItem?: (afterItemId?: number, startMsOverride?: number) => void;
  onDeleteItem?: (id: number) => void;
  onMergeItem?: (id: number) => void;
  onTranslateItem: (id: number) => void;
  onTranslateAll: (onlyPendingOrError?: boolean) => void;
  onStopTranslation?: () => void;
  isTranslating: boolean;
  activeItemIndex?: number;
  onSelectSubItem?: (item: SubtitleItem) => void;
  onOpenSettings?: () => void;
  hasApiKey?: boolean;
}

export const SubtitleTable: React.FC<SubtitleTableProps> = ({
  items,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onMergeItem,
  onTranslateItem,
  onTranslateAll,
  onStopTranslation,
  isTranslating,
  activeItemIndex,
  onSelectSubItem,
  onOpenSettings,
  hasApiKey = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'error'>('all');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Find & Replace State
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.originalText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.translatedText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.index.toString().includes(searchTerm) ||
        item.startTime.includes(searchTerm);

      if (!matchesSearch) return false;

      if (statusFilter === 'pending') return item.status === 'pending' || !item.translatedText;
      if (statusFilter === 'completed') return Boolean(item.translatedText);
      if (statusFilter === 'error') return item.status === 'error';
      return true;
    });
  }, [items, searchTerm, statusFilter]);

  const handleApplyFindReplace = () => {
    if (!findText) return;
    items.forEach((item) => {
      if (item.translatedText && item.translatedText.includes(findText)) {
        const newTranslated = item.translatedText.replaceAll(findText, replaceText);
        onUpdateItem(item.id, { translatedText: newTranslated });
      }
    });
    setFindText('');
    setReplaceText('');
    setShowFindReplace(false);
  };

  const handleCleanSoundEffectsAll = () => {
    items.forEach((item) => {
      let updated = false;
      const updates: Partial<SubtitleItem> = {};

      if (item.translatedText) {
        const cleanedTrans = cleanSoundEffects(item.translatedText);
        if (cleanedTrans !== item.translatedText) {
          updates.translatedText = cleanedTrans;
          updated = true;
        }
      }

      if (updated) {
        onUpdateItem(item.id, updates);
      }
    });
  };

  const handleCleanSpeakerLabelsAll = () => {
    items.forEach((item) => {
      let updated = false;
      const updates: Partial<SubtitleItem> = {};

      if (item.translatedText) {
        const cleanedTrans = stripSpeakerLabels(item.translatedText);
        if (cleanedTrans !== item.translatedText) {
          updates.translatedText = cleanedTrans;
          updated = true;
        }
      }

      if (item.originalText) {
        const cleanedOrig = stripSpeakerLabels(item.originalText);
        if (cleanedOrig !== item.originalText) {
          updates.originalText = cleanedOrig;
          updated = true;
        }
      }

      if (updated) {
        onUpdateItem(item.id, updates);
      }
    });
  };

  const handleInsertSymbol = (id: number, symbol: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      const updated = (item.translatedText || '') + symbol;
      onUpdateItem(id, { translatedText: updated });
    }
  };

  const completedCount = items.filter((i) => Boolean(i.translatedText)).length;
  const progressPercent = Math.round((completedCount / (items.length || 1)) * 100);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-3.5">
      {/* Search & Action Bar */}
      <div className="bg-[#0e1219] border border-[#212734] rounded-lg p-3 sm:p-4 shadow-xs flex flex-col gap-3">
        {/* Top Row: Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="စာတန်းထိုး ရှာဖွေရန် (Search)..."
              className="w-full bg-[#090c10] border border-[#212734] rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pb-0.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'all'
                  ? 'bg-[#1a202c] text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141a24]'
              }`}
            >
              အားလုံး ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-[#1a202c] text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141a24]'
              }`}
            >
              မပြန်ရသေး ({items.length - completedCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-[#1a202c] text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141a24]'
              }`}
            >
              ပြီးစီး ({completedCount})
            </button>
          </div>
        </div>

        {/* Bottom Row: Quick Tools & Translation Triggers */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1b2028]">
          <div className="flex flex-wrap items-center gap-1.5">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                  hasApiKey
                    ? 'bg-[#141a24] hover:bg-[#1a2230] text-slate-300 border-[#262c3a]'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                }`}
                title="Gemini API Key နှင့် ဆက်တင်များ"
              >
                <Key className={`w-3.5 h-3.5 ${hasApiKey ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span>{hasApiKey ? 'API Key / ဆက်တင်' : 'API Key ထည့်ရန်'}</span>
              </button>
            )}

            <button
              onClick={() => setShowFindReplace(!showFindReplace)}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#141a24] hover:bg-[#1a2230] text-slate-300 text-xs rounded-md border border-[#262c3a] transition-colors"
            >
              <Replace className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">ရှာပြီးအစားထိုး</span>
              <span className="sm:hidden">အစားထိုး</span>
            </button>

            <button
              onClick={handleCleanSpeakerLabelsAll}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#141a24] hover:bg-[#1a2230] text-slate-300 text-xs rounded-md border border-[#262c3a] transition-colors"
              title="စာကြောင်းရှေ့ရှိ ပြောသူအမည် ရှင်းလင်းရန်"
            >
              <UserX className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">ပြောသူအမည် ဖျက်မည်</span>
              <span className="sm:hidden">ပြောသူ</span>
            </button>

            <button
              onClick={handleCleanSoundEffectsAll}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#141a24] hover:bg-[#1a2230] text-slate-300 text-xs rounded-md border border-[#262c3a] transition-colors"
              title="ဟောဟဲ သို့မဟုတ် ဆူညံသံများ ရှင်းလင်းရန်"
            >
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">အသံဆူညံသံ ဖျက်မည်</span>
              <span className="sm:hidden">အသံ</span>
            </button>

            {onAddItem && (
              <button
                onClick={() => onAddItem()}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-md transition-colors"
                title="စာတန်းထိုး အသစ်ထည့်မည်"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>အသစ်ထည့်</span>
              </button>
            )}
          </div>

          {/* Translation Start / Stop Buttons */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            {isTranslating ? (
              <button
                onClick={onStopTranslation}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-md transition-colors shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>ဘာသာပြန်ခြင်း ရပ်မည်</span>
              </button>
            ) : (
              <>
                {completedCount > 0 && completedCount < items.length && (
                  <button
                    onClick={() => onTranslateAll(true)}
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs rounded-md transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ကျန်သည်များ ({items.length - completedCount})</span>
                  </button>
                )}

                <button
                  onClick={() => onTranslateAll(false)}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-md transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{completedCount > 0 ? 'အားလုံး ပြန်လည်ဘာသာပြန်မည်' : 'AI ဘာသာပြန် စတင်မည်'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Missing API Key Helper Banner */}
      {!hasApiKey && onOpenSettings && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2.5 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <b>Gemini API Key မထည့်သွင်းရသေးပါ။</b> AI ဘာသာပြန်ရန် မိမိ၏ Free API Key ကို ထည့်သွင်းပေးပါ (Google AI Studio မှ အခမဲ့ ရယူနိုင်ပါသည်)။
            </span>
          </div>
          <button
            onClick={onOpenSettings}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition whitespace-nowrap shadow-xs flex items-center space-x-1 shrink-0"
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Key ထည့်မည်</span>
          </button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-[#0e1219] border border-[#212734] rounded-md p-2.5 sm:p-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>ဘာသာပြန် ပြီးစီးမှု အခြေအနေ (Progress)</span>
          <span className="font-semibold text-emerald-400">
            {completedCount} / {items.length} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-[#090c10] h-1.5 rounded overflow-hidden border border-[#212734]">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Find & Replace Drawer */}
      {showFindReplace && (
        <div className="bg-[#0e1219] border border-emerald-500/30 rounded-md p-3 shadow-sm flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="ရှာမည့် မြန်မာစာသား..."
            className="w-full sm:flex-1 bg-[#090c10] border border-[#212734] rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="အစားထိုးမည့် စာသား..."
            className="w-full sm:flex-1 bg-[#090c10] border border-[#212734] rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleApplyFindReplace}
            className="w-full sm:w-auto px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded hover:bg-emerald-400 transition"
          >
            အစားထိုးမည်
          </button>
        </div>
      )}

      {/* MOBILE VIEW (< md): Responsive Card Stream */}
      <div className="block md:hidden space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="bg-[#0e1219] border border-[#212734] rounded-md p-8 text-center text-slate-500 text-xs">
            ရှာဖွေတွေ့ရှိသည့် စာတန်းထိုး မရှိပါ
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive = activeItemIndex === item.index;
            return (
              <div
                key={item.id}
                onClick={() => onSelectSubItem && onSelectSubItem(item)}
                className={`bg-[#0e1219] border rounded-md p-3 transition-colors ${
                  isActive ? 'border-emerald-500 bg-[#121922]' : 'border-[#212734]'
                }`}
              >
                {/* Header: Index, Timecode, Status */}
                <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#1b2028]">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#141a24] text-slate-300 font-mono text-[11px] font-bold border border-[#262c3a]">
                      #{item.index}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {item.startTime} → {item.endTime}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {item.status === 'translating' && (
                      <span className="text-emerald-400 text-[10px] font-medium flex items-center space-x-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>ပြန်နေသည်...</span>
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-rose-400 text-[10px] font-medium flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>အမှား</span>
                      </span>
                    )}
                    {item.status === 'completed' && item.translatedText && (
                      <span className="text-emerald-400 text-[10px] flex items-center space-x-0.5">
                        <Check className="w-3 h-3" />
                        <span>ပြီး</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Original Text */}
                <div className="mb-2">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 mb-0.5">မူရင်း (Original):</div>
                  <textarea
                    value={item.originalText}
                    onChange={(e) => onUpdateItem(item.id, { originalText: e.target.value })}
                    rows={2}
                    className="w-full bg-[#090c10] border border-[#1b2028] rounded p-2 text-xs text-slate-300 resize-y focus:outline-none focus:border-slate-600"
                  />
                </div>

                {/* Burmese Translated Text */}
                <div className="mb-2">
                  <div className="text-[10px] uppercase font-semibold text-emerald-400/80 mb-0.5">မြန်မာ (Myanmar):</div>
                  <textarea
                    value={item.translatedText}
                    onChange={(e) => onUpdateItem(item.id, { translatedText: e.target.value })}
                    placeholder="မြန်မာ ဘာသာပြန် စာသား ထည့်သွင်းပါ..."
                    rows={2}
                    className={`w-full border rounded p-2 text-xs focus:outline-none resize-y transition-colors font-sans ${
                      item.translatedText
                        ? 'bg-[#090c10] border-[#212734] text-emerald-300 focus:border-emerald-500'
                        : 'bg-[#090c10]/60 border-amber-500/30 text-amber-200/90 focus:border-amber-500'
                    }`}
                  />
                </div>

                {/* Burmese Punctuation Helpers for Mobile (Touch-friendly) */}
                <div className="flex items-center space-x-1 overflow-x-auto pb-1 mb-2 no-scrollbar">
                  <span className="text-[10px] text-slate-500 shrink-0 mr-1">ပုဒ်ဖြတ်:</span>
                  {BURMESE_PUNCTUATION_HELPERS.map((helper) => (
                    <button
                      key={helper.symbol}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInsertSymbol(item.id, helper.symbol);
                      }}
                      title={helper.description}
                      className="px-2 py-1 bg-[#141a24] active:bg-emerald-600 active:text-white text-emerald-400 text-xs rounded border border-[#262c3a] shrink-0"
                    >
                      {helper.symbol}
                    </button>
                  ))}
                </div>

                {/* Card Action Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1b2028] text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTranslateItem(item.id);
                    }}
                    disabled={item.status === 'translating'}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#141a24] text-emerald-400 border border-emerald-500/30 font-medium"
                  >
                    <RefreshCw className={`w-3 h-3 ${item.status === 'translating' ? 'animate-spin' : ''}`} />
                    <span>AI ပြန်မည်</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    {onAddItem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddItem(item.id);
                        }}
                        className="p-1.5 rounded bg-[#141a24] text-slate-300 border border-[#212734]"
                        title="အသစ်ထည့်မည်"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    )}

                    {onMergeItem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMergeItem(item.id);
                        }}
                        className="p-1.5 rounded bg-[#141a24] text-slate-300 border border-[#212734]"
                        title="ပေါင်းမည်"
                      >
                        <GitMerge className="w-3.5 h-3.5 text-sky-400" />
                      </button>
                    )}

                    {onDeleteItem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id);
                        }}
                        className="p-1.5 rounded bg-[#141a24] text-slate-300 border border-[#212734]"
                        title="ဖျက်မည်"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP VIEW (>= md): Classic Structured Table */}
      <div className="hidden md:block bg-[#0e1219] border border-[#212734] rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#090c10] border-b border-[#212734] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-14 text-center">#</th>
                <th className="py-2.5 px-3 w-40">အချိန် (Timecode)</th>
                <th className="py-2.5 px-3 w-1/2">မူရင်း စာတန်းထိုး (Original)</th>
                <th className="py-2.5 px-3 w-1/2">မြန်မာ ဘာသာပြန် (Myanmar Subtitle)</th>
                <th className="py-2.5 px-3 w-24 text-center">လုပ်ဆောင်ချက်</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2028] text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    ရှာဖွေတွေ့ရှိသည့် စာတန်းထိုး မရှိပါ
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isActive = activeItemIndex === item.index;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectSubItem && onSelectSubItem(item)}
                      className={`group transition-colors hover:bg-[#121720] cursor-pointer ${
                        isActive ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500' : ''
                      }`}
                    >
                      {/* Index */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-semibold">
                        {item.index}
                      </td>

                      {/* Timestamps */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{item.startTime}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 pl-4">
                          → {item.endTime}
                        </div>
                      </td>

                      {/* Original English */}
                      <td className="py-2.5 px-3 text-slate-300 leading-relaxed font-normal">
                        <textarea
                          value={item.originalText}
                          onChange={(e) =>
                            onUpdateItem(item.id, { originalText: e.target.value })
                          }
                          rows={2}
                          className="w-full bg-transparent hover:bg-[#090c10] focus:bg-[#090c10] border border-transparent focus:border-[#212734] rounded p-1.5 focus:outline-none text-xs text-slate-300 resize-y transition-colors"
                        />
                      </td>

                      {/* Translated Burmese */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            {item.status === 'translating' && (
                              <span className="flex items-center space-x-1 text-emerald-400 font-medium animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>ဘာသာပြန်နေပါသည်...</span>
                              </span>
                            )}
                            {item.status === 'error' && (
                              <span className="flex items-center space-x-1 text-rose-400 font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                <span>အမှားဖြစ်ခဲ့သည် - {item.errorMessage || 'ခေတ္တစောင့်ပြီး ပြန်လည်ကြိုးစားပါ'}</span>
                              </span>
                            )}
                            {item.status === 'completed' && item.translatedText && (
                              <span className="flex items-center space-x-1 text-emerald-400 text-[10px]">
                                <Check className="w-3 h-3" />
                                <span>ဘာသာပြန်ပြီး</span>
                              </span>
                            )}
                          </div>

                          <textarea
                            value={item.translatedText}
                            onChange={(e) =>
                              onUpdateItem(item.id, { translatedText: e.target.value })
                            }
                            placeholder="မြန်မာ ဘာသာပြန် စာသား..."
                            rows={2}
                            className={`w-full border rounded p-1.5 text-xs focus:outline-none resize-y transition-colors font-sans ${
                              item.translatedText
                                ? 'bg-[#090c10] border-[#212734] text-emerald-300 focus:border-emerald-500'
                                : 'bg-[#090c10]/60 border-amber-500/30 text-amber-200/90 focus:border-amber-500'
                            }`}
                          />

                          {/* Quick Burmese Punctuation Helper Buttons */}
                          <div className="flex items-center space-x-1 flex-wrap pt-0.5">
                            <span className="text-[10px] text-slate-500 mr-1">ပုဒ်ဖြတ်:</span>
                            {BURMESE_PUNCTUATION_HELPERS.map((helper) => (
                              <button
                                key={helper.symbol}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInsertSymbol(item.id, helper.symbol);
                                }}
                                title={helper.description}
                                className="px-1.5 py-0.5 bg-[#141a24] hover:bg-[#1a2230] text-emerald-400 text-[10px] rounded border border-[#212734] transition-colors"
                              >
                                {helper.symbol}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Actions: Add / Merge / Delete / Translate */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {onAddItem && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddItem(item.id);
                              }}
                              title="ဒီနောက်တွင် စာကြောင်းအသစ်ထည့်မည်"
                              className="p-1 rounded bg-[#090c10] hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400 transition-colors border border-[#212734]"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                          )}

                          {onMergeItem && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMergeItem(item.id);
                              }}
                              title="နောက်တစ်ကြောင်းနှင့် ပေါင်းမည်"
                              className="p-1 rounded bg-[#090c10] hover:bg-sky-500/20 hover:text-sky-400 text-slate-400 transition-colors border border-[#212734]"
                            >
                              <GitMerge className="w-3.5 h-3.5 text-sky-400" />
                            </button>
                          )}

                          {onDeleteItem && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteItem(item.id);
                              }}
                              title="ဒီစာကြောင်း ဖျက်မည်"
                              className="p-1 rounded bg-[#090c10] hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors border border-[#212734]"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTranslateItem(item.id);
                            }}
                            disabled={item.status === 'translating'}
                            title="ဒီတစ်ကြောင်းတည်း AI ပြန်ပြန်မည်"
                            className="p-1 rounded bg-[#090c10] hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400 transition-colors border border-[#212734]"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                item.status === 'translating' ? 'animate-spin text-emerald-400' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
