import React, { useState, useMemo } from 'react';
import { SubtitleItem } from '../types';
import { BURMESE_PUNCTUATION_HELPERS, cleanSoundEffects } from '../utils/burmeseUtils';
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
} from 'lucide-react';

interface SubtitleTableProps {
  items: SubtitleItem[];
  onUpdateItem: (id: number, updatedFields: Partial<SubtitleItem>) => void;
  onTranslateItem: (id: number) => void;
  onTranslateAll: (onlyPendingOrError?: boolean) => void;
  onStopTranslation?: () => void;
  isTranslating: boolean;
  activeItemIndex?: number;
  onSelectSubItem?: (item: SubtitleItem) => void;
  onOpenSettings?: () => void;
}

export const SubtitleTable: React.FC<SubtitleTableProps> = ({
  items,
  onUpdateItem,
  onTranslateItem,
  onTranslateAll,
  onStopTranslation,
  isTranslating,
  activeItemIndex,
  onSelectSubItem,
  onOpenSettings,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Search & Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="စာတန်းထိုး ရှာဖွေရန် (Search)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            အားလုံး ({items.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'pending'
                ? 'bg-slate-800 text-amber-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            မပြန်ရသေးသော ({items.length - completedCount})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === 'completed'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ပြီးစီးပြီး ({completedCount})
          </button>
        </div>

        {/* Quick Tools */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition"
              title="ဘာသာပြန် ဆက်တင်များ ပြင်ဆင်ရန်"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span>ဆက်တင်</span>
            </button>
          )}

          <button
            onClick={() => setShowFindReplace(!showFindReplace)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition"
          >
            <Replace className="w-3.5 h-3.5 text-emerald-400" />
            <span>ရှာပြီး အစားထိုးမည်</span>
          </button>

          <button
            onClick={handleCleanSoundEffectsAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition"
            title="ဟောဟဲ... သို့မဟုတ် အသံဆူညံသံများကို အလိုအလျောက် ရှင်းလင်းရန်"
          >
            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            <span>အသံဆူညံသံ ဖျက်မည်</span>
          </button>

          {isTranslating ? (
            <button
              onClick={onStopTranslation}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl transition shadow-sm"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>ဘာသာပြန်ခြင်း ရပ်မည်</span>
            </button>
          ) : (
            <>
              {completedCount > 0 && completedCount < items.length && (
                <button
                  onClick={() => onTranslateAll(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl transition shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>မပြီးသေးသည်များသာ ဘာသာပြန်မည် ({items.length - completedCount})</span>
                </button>
              )}

              <button
                onClick={() => onTranslateAll(false)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md shadow-emerald-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>{completedCount > 0 ? 'အားလုံး ပြန်လည်ဘာသာပြန်မည်' : 'AI အားလုံး ဘာသာပြန်မည်'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center space-x-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>ဘာသာပြန် ပြီးစီးမှု တိုးတက်မှု (Translation Progress)</span>
            <span className="font-semibold text-emerald-400">
              {completedCount} / {items.length} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Find & Replace Drawer */}
      {showFindReplace && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="ရှာမည့် မြန်မာစာသား..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="အစားထိုးမည့် စာသား..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleApplyFindReplace}
            className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition"
          >
            အစားထိုးမည်
          </button>
        </div>
      )}

      {/* Subtitle List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-16 text-center">#</th>
                <th className="py-3 px-4 w-44">အချိန် (Timecode)</th>
                <th className="py-3 px-4 w-1/2">မူရင်း စာတန်းထိုး (Original)</th>
                <th className="py-3 px-4 w-1/2">မြန်မာ ဘာသာပြန် (Myanmar Subtitle)</th>
                <th className="py-3 px-4 w-20 text-center">ပြင်ဆင်ရန်</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
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
                      className={`group transition hover:bg-slate-800/40 cursor-pointer ${
                        isActive ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' : ''
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-medium">
                        {item.index}
                      </td>

                      {/* Timestamps */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{item.startTime}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 pl-4">
                          -&gt; {item.endTime}
                        </div>
                      </td>

                      {/* Original English */}
                      <td className="py-3.5 px-4 text-slate-300 leading-relaxed font-normal">
                        <textarea
                          value={item.originalText}
                          onChange={(e) =>
                            onUpdateItem(item.id, { originalText: e.target.value })
                          }
                          rows={2}
                          className="w-full bg-transparent hover:bg-slate-950/60 focus:bg-slate-950 border border-transparent focus:border-slate-700 rounded-lg p-1.5 focus:outline-none text-xs text-slate-300 resize-y transition"
                        />
                      </td>

                      {/* Translated Burmese */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] mb-1">
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
                              <span className="flex items-center space-x-1 text-emerald-400/80 text-[10px]">
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
                            className={`w-full border rounded-lg p-2 text-xs focus:outline-none resize-y transition font-sans ${
                              item.translatedText
                                ? 'bg-slate-950 border-slate-800 text-emerald-300 focus:border-emerald-500'
                                : 'bg-slate-950/40 border-amber-500/30 text-amber-200/80 focus:border-amber-500'
                            }`}
                          />

                          {/* Quick Burmese Punctuation Helper Buttons */}
                          <div className="flex items-center space-x-1 flex-wrap pt-0.5">
                            <span className="text-[10px] text-slate-500 mr-1">မြန်မာ ပုဒ်ဖြတ်:</span>
                            {BURMESE_PUNCTUATION_HELPERS.map((helper) => (
                              <button
                                key={helper.symbol}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInsertSymbol(item.id, helper.symbol);
                                }}
                                title={helper.description}
                                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] rounded border border-slate-700 transition"
                              >
                                {helper.symbol}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Single Translate/Retry Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTranslateItem(item.id);
                          }}
                          disabled={item.status === 'translating'}
                          title="ဒီတစ်ကြောင်းတည်း AI ပြန်ပြန်မည်"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400 transition border border-slate-700/80"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              item.status === 'translating' ? 'animate-spin text-emerald-400' : ''
                            }`}
                          />
                        </button>
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
