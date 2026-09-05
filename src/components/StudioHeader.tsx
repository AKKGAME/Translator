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
  User,
  Crown,
  Coins,
  Globe,
} from 'lucide-react';
import { checkUserPlanStatus } from '../lib/firebase';

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
  contextAnalysisStep?: 'idle' | 'reading' | 'done';
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
  onOpenOnlineSubtitles?: () => void;
  hasSubtitles: boolean;
  user?: any;
  profile?: any;
  onOpenUserProfile?: () => void;
  onGoogleSignIn?: () => void;
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
  contextAnalysisStep = 'idle',
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
  onOpenOnlineSubtitles,
  hasSubtitles,
  user,
  profile,
  onOpenUserProfile,
  onGoogleSignIn,
}) => {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const [brandClicks, setBrandClicks] = useState(0);
  const brandTimeoutRef = useRef<any>(null);

  // Discreet Admin activation via 3 clicks on brand logo
  const handleBrandClick = () => {
    setBrandClicks((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        if (brandTimeoutRef.current) clearTimeout(brandTimeoutRef.current);
        onOpenAdmin();
        return 0;
      }
      return next;
    });

    if (brandTimeoutRef.current) clearTimeout(brandTimeoutRef.current);
    brandTimeoutRef.current = setTimeout(() => {
      setBrandClicks(0);
    }, 1000);
  };

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
        {/* Brand Logo (Discreet 3-click trigger to Admin) */}
        <button
          type="button"
          onClick={handleBrandClick}
          className="flex items-center space-x-2 mr-1 px-2 py-1 rounded-lg hover:bg-[#1a1d2e] transition text-left cursor-pointer group"
          title="AnimeGabar Subtitle Studio"
        >
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-purple-700 via-indigo-600 to-violet-500 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
            <Film className="w-3.5 h-3.5 text-purple-100" />
          </div>
          <span className="font-bold text-xs text-slate-100 hidden md:inline tracking-tight">
            Anime<span className="text-purple-400">Gabar</span>
          </span>
        </button>

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

                {onOpenOnlineSubtitles && (
                  <button
                    onClick={() => {
                      setCreateMenuOpen(false);
                      onOpenOnlineSubtitles();
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-[#25283d] flex items-center space-x-2.5 transition"
                  >
                    <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        <span>Search Online Subtitles</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-mono font-bold">NEW</span>
                      </div>
                      <div className="text-[10px] text-slate-400">အွန်လိုင်းမှ စာတန်းထိုး ရှာဖွေတင်သွင်းရန်</div>
                    </div>
                  </button>
                )}

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
            <div className={`px-3 py-1 rounded border text-xs font-bold flex items-center space-x-1.5 shadow-sm ${
              contextAnalysisStep === 'reading'
                ? 'bg-purple-950/90 border-purple-600/70 text-purple-200'
                : 'bg-rose-950/80 border-rose-700/60 text-rose-300'
            }`}>
              <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${
                contextAnalysisStep === 'reading' ? 'border-purple-300' : 'border-rose-300'
              }`} />
              <span>
                {contextAnalysisStep === 'reading'
                  ? 'Reading Context...'
                  : translationProgress && translationProgress.total > 0
                  ? `(${translationProgress.current}/${translationProgress.total})`
                  : 'Translating...'}
              </span>
            </div>
            {onCancelTranslate && (
              <button
                onClick={onCancelTranslate}
                className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-[11px] font-bold transition shadow-sm cursor-pointer"
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
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#25283a] rounded transition cursor-pointer"
            title="ဘာသာပြန် ဆက်တင်များ"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenDonate}
            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition cursor-pointer"
            title="ကူညီလှူဒါန်းရန်"
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Admin button is hidden from regular users, only visible when logged in as admin */}
          {(user?.email === 'aungkyawkhant.apple@gmail.com' || profile?.role === 'admin') && (
            <button
              onClick={onOpenAdmin}
              className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-[#25283a] rounded transition cursor-pointer"
              title="Admin Control (Shortcut: Ctrl+Shift+A)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-500/80" />
            </button>
          )}
        </div>

        {/* User Account / Credits Button (Business Model Entry) */}
        <div className="border-l border-[#26293d] pl-1.5 flex items-center">
          {user && profile ? (
            <button
              onClick={onOpenUserProfile}
              className="flex items-center space-x-1.5 bg-[#131728] hover:bg-[#1a1f36] border border-[#2b304c] hover:border-purple-500/50 p-1 pr-2 rounded-lg text-xs transition cursor-pointer"
              title="အကောင့်နှင့် ခရက်ဒစ် စီမံခန့်ခွဲရန်"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={profile.displayName || 'User'}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full border border-purple-400/50 object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 text-[10px] font-bold flex items-center justify-center">
                  {profile.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="flex items-center space-x-1">
                <span className="font-medium text-slate-200 text-[11px] max-w-[80px] truncate hidden sm:inline">
                  {profile.displayName?.split(' ')[0] || 'User'}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold flex items-center space-x-0.5 ${
                  profile.role === 'admin' || profile.isVip || profile.tier === 'unlimited'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-purple-950/70 text-purple-300 border border-purple-700/50'
                }`}>
                  {profile.isVip ? (
                    <>
                      <Crown className="w-2.5 h-2.5 text-amber-400 mr-0.5" />
                      <span>VIP</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-2.5 h-2.5 text-purple-300 mr-0.5" />
                      <span>{profile.credits?.toLocaleString() || 0}</span>
                    </>
                  )}
                </span>
                {(() => {
                  const plan = checkUserPlanStatus(profile);
                  if (plan.hasActivePlan && profile.role !== 'admin') {
                    return (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-semibold hidden md:inline">
                        {plan.daysRemaining}d left
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
            </button>
          ) : (
            <button
              onClick={onGoogleSignIn || onOpenUserProfile}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800 hover:to-indigo-800 border border-purple-500/40 text-white px-2.5 py-1 rounded-lg text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              title="Google အကောင့်ဖြင့် ဝင်ရောက်ပြီး 300 Free Credits ရယူပါ"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="hidden sm:inline">Sign In</span>
              <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                +300 Free
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
