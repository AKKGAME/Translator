import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Cloud,
  Undo2,
  Redo2,
  Keyboard,
  ArrowLeftRight,
  ChevronDown,
  Upload,
  Film,
  FileText,
  Settings,
  ShieldAlert,
  Heart,
  Play,
  RotateCcw,
} from 'lucide-react';

export type DisplayMode = 'bilingual' | 'main' | 'second';

interface StudioHeaderProps {
  displayMode: DisplayMode;
  onSelectDisplayMode: (mode: DisplayMode) => void;
  targetLanguage: string;
  onSelectTargetLanguage: (lang: string) => void;
  onStartTranslate: () => void;
  onCancelTranslate?: () => void;
  isTranslating: boolean;
  translationProgress?: { current: number; total: number };
  onExportClick: () => void;
  onUploadSubtitleClick: () => void;
  onUploadVideoClick: () => void;
  onNewSubtitleClick: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenDonate: () => void;
  hasSubtitles: boolean;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  displayMode,
  onSelectDisplayMode,
  targetLanguage,
  onSelectTargetLanguage,
  onStartTranslate,
  onCancelTranslate,
  isTranslating,
  translationProgress,
  onExportClick,
  onUploadSubtitleClick,
  onUploadVideoClick,
  onNewSubtitleClick,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onOpenShortcuts,
  onOpenSettings,
  onOpenAdmin,
  onOpenDonate,
  hasSubtitles,
}) => {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  // Close create dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwapDisplay = () => {
    if (displayMode === 'main') {
      onSelectDisplayMode('second');
    } else if (displayMode === 'second') {
      onSelectDisplayMode('main');
    } else {
      onSelectDisplayMode('main');
    }
  };

  return (
    <header className="bg-[#12131c] border-b border-[#202234] text-slate-200 h-13 px-3 sm:px-4 flex items-center justify-between select-none z-30 relative shadow-md">
      {/* Left Action Controls */}
      <div className="flex items-center space-x-2 sm:space-x-2.5">
        {/* Create Button with Dropdown */}
        <div className="relative" ref={createMenuRef}>
          <button
            onClick={() => setCreateMenuOpen(!createMenuOpen)}
            className="flex items-center space-x-1.5 bg-[#6d28d9] hover:bg-[#7c3aed] text-white px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition active:scale-95"
            title="ဖိုင်အသစ် / ဖိုင်တင်ရန် ရွေးချယ်ပါ"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
          </button>

          {createMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-56 bg-[#181a27] border border-[#2b2e46] rounded-md shadow-2xl py-1 z-50 text-xs divide-y divide-[#24273b] animate-in fade-in zoom-in-95 duration-100">
              <div className="py-1">
                <button
                  onClick={() => {
                    setCreateMenuOpen(false);
                    onUploadSubtitleClick();
                  }}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-[#25283d] flex items-center space-x-2.5 transition"
                >
                  <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Upload Subtitle File</div>
                    <div className="text-[10px] text-slate-400">SRT သို့မဟုတ် VTT တင်ရန်</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setCreateMenuOpen(false);
                    onUploadVideoClick();
                  }}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-[#25283d] flex items-center space-x-2.5 transition"
                >
                  <Film className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Upload Video File</div>
                    <div className="text-[10px] text-slate-400">MP4, MKV, WebM ဗီဒီယိုတင်ရန်</div>
                  </div>
                </button>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setCreateMenuOpen(false);
                    onNewSubtitleClick();
                  }}
                  className="w-full text-left px-3 py-2 text-slate-300 hover:bg-[#25283d] flex items-center space-x-2.5 transition"
                >
                  <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold">New Blank Subtitle</div>
                    <div className="text-[10px] text-slate-400">အသစ် စတင်ဖန်တီးမည်</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={onExportClick}
          disabled={!hasSubtitles}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition shadow-sm ${
            hasSubtitles
              ? 'bg-[#25283a] hover:bg-[#2f334a] text-slate-200 border border-[#373b54]'
              : 'bg-[#181a27] text-slate-500 border border-[#242738] cursor-not-allowed'
          }`}
          title="စာတန်းထိုး ဒေါင်းလုဒ်ဆွဲမည် (Export)"
        >
          <Cloud className="w-3.5 h-3.5 text-slate-300" />
          <span>Export</span>
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-[#26293d] mx-0.5" />

        {/* Undo / Redo / Keyboard Icons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition ${
              canUndo
                ? 'text-slate-300 hover:bg-[#25283a] hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="ပြန်ပြင်မည် (Undo: Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition ${
              canRedo
                ? 'text-slate-300 hover:bg-[#25283a] hover:text-white'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="ရှေ့သို့ပြန်သွားမည် (Redo: Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenShortcuts}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#25283a] rounded transition"
            title="ကီးဘုတ် ဖြတ်လမ်းများ (Keyboard Shortcuts)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Controls Matching Screenshot */}
      <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto no-scrollbar py-1">
        {/* Display Selector: Bilingual | Main | Second */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <span className="hidden md:inline text-[11px] font-medium text-slate-400">Display:</span>
          <div className="flex items-center bg-[#0d0e15] p-0.5 rounded border border-[#26283c]">
            <button
              onClick={() => onSelectDisplayMode('bilingual')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                displayMode === 'bilingual'
                  ? 'bg-[#6d28d9] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bilingual
            </button>
            <button
              onClick={() => onSelectDisplayMode('main')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                displayMode === 'main'
                  ? 'bg-[#dc2626] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Main
            </button>
            <button
              onClick={() => onSelectDisplayMode('second')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                displayMode === 'second'
                  ? 'bg-[#2563eb] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Second
            </button>
          </div>

          {/* Swap icon */}
          <button
            onClick={handleSwapDisplay}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#25283a] rounded transition"
            title="ဘာသာစကား အမြင် ပြောင်းပြန်လှန်မည်"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Translate Dropdown */}
        <div className="flex items-center space-x-1.5 text-xs">
          <span className="hidden lg:inline text-[11px] text-slate-400">Translate:</span>
          <select
            value={targetLanguage}
            onChange={(e) => onSelectTargetLanguage(e.target.value)}
            className="bg-[#0d0e15] border border-[#26283c] hover:border-[#3b3e5c] text-slate-200 rounded px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="Myanmar (Burmese)">Myanmar (မြန်မာ)</option>
            <option value="English">English</option>
            <option value="Japanese">Japanese (日本語)</option>
            <option value="Korean">Korean (한국어)</option>
            <option value="Thai">Thai (ไทย)</option>
            <option value="Chinese">Chinese (中文)</option>
          </select>
        </div>

        {/* Start Translation Button (Pink/Salmon button matching screenshot) */}
        {isTranslating ? (
          <div className="flex items-center space-x-1">
            <div className="px-3 py-1 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300 text-xs font-bold flex items-center space-x-1.5 shadow-sm">
              <div className="w-3 h-3 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
              <span>
                {translationProgress && translationProgress.total > 0
                  ? `(${translationProgress.current}/${translationProgress.total})`
                  : 'Translating...'}
              </span>
            </div>
            {onCancelTranslate && (
              <button
                onClick={onCancelTranslate}
                className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-[11px] font-bold transition shadow-sm"
                title="ရပ်တန့်မည် (Cancel)"
              >
                Stop
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onStartTranslate}
            className="px-3 sm:px-3.5 py-1 rounded text-xs font-bold transition flex items-center space-x-1.5 shadow-sm active:scale-95 bg-[#e11d48] hover:bg-[#f43f5e] text-white"
            title="ဘာသာပြန် စတင်မည် (AI Translate)"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Start</span>
          </button>
        )}

        {/* Auxiliary Quick Nav (Settings, Shortcuts, Admin, Donate) */}
        <div className="flex items-center space-x-1 border-l border-[#26293d] pl-1.5">
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#25283a] rounded transition"
            title="ဘာသာပြန် ဆက်တင်များ"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenDonate}
            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition"
            title="ကူညီလှူဒါန်းရန်"
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={onOpenAdmin}
            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-[#25283a] rounded transition"
            title="AnimeGabar Admin"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
