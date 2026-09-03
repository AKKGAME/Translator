import React from 'react';
import { SubtitleFileMeta, UserAccessStatus } from '../types';
import {
  Languages,
  Upload,
  Download,
  Settings,
  Film,
  Sparkles,
  FileText,
  Clock,
  HelpCircle,
  Square,
  Heart,
  ShieldAlert,
  Key,
  KeyRound,
  Crown,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface HeaderProps {
  meta: SubtitleFileMeta | null;
  activeTab: 'subtitles' | 'video' | 'admin';
  setActiveTab: (tab: 'subtitles' | 'video' | 'admin') => void;
  onUploadClick: () => void;
  onExportClick: () => void;
  onTimeShiftClick: () => void;
  onDonateClick: () => void;
  hasApiKey?: boolean;
  onSettingsClick?: () => void;
  accessStatus?: UserAccessStatus;
  onOpenAccessModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  meta,
  activeTab,
  setActiveTab,
  onUploadClick,
  onExportClick,
  onTimeShiftClick,
  onDonateClick,
  hasApiKey = false,
  onSettingsClick,
  accessStatus,
  onOpenAccessModal,
}) => {
  return (
    <header className="bg-[#0c0e12] border-b border-[#1b2028] sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 sm:h-16 gap-2">
          {/* App Branding */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-[#121920] border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <Languages className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight truncate">
                  AnimeGabar
                </h1>
                <span className="hidden xs:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  AI PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block truncate">
                မြန်မာ ဗီဒီယိုစာတန်းထိုး Subtitle AI Translator
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <div className="hidden md:flex bg-[#12161f] p-1 rounded-md border border-[#212734]">
            {meta && (
              <>
                <button
                  onClick={() => setActiveTab('subtitles')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    activeTab === 'subtitles'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-[#1a202c]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>စာတန်းထိုး ({meta.totalItems})</span>
                </button>

                <button
                  onClick={() => setActiveTab('video')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    activeTab === 'video'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-[#1a202c]'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>ဗီဒီယို စမ်းသပ်မည်</span>
                </button>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
            {/* Access Key / Quota Status Button */}
            {onOpenAccessModal && (
              <button
                onClick={onOpenAccessModal}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors shadow-xs ${
                  accessStatus?.tier === 'vip'
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : accessStatus?.tier === 'custom_key'
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : accessStatus?.freeDailyLimit === 0
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
                    : 'bg-[#141a24] hover:bg-[#1b2330] text-indigo-300 border-indigo-500/30'
                }`}
                title={accessStatus?.message || 'Access Key & Usage Status'}
              >
                {accessStatus?.tier === 'vip' ? (
                  <>
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="hidden sm:inline">
                      VIP ({accessStatus.activeKey?.maxLines && accessStatus.activeKey.maxLines > 0 ? `${accessStatus.remainingFreeLines.toLocaleString()} ကြောင်း` : 'Unlimited'})
                    </span>
                    <span className="sm:hidden">VIP</span>
                  </>
                ) : accessStatus?.tier === 'custom_key' ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="hidden sm:inline">Custom Key</span>
                    <span className="sm:hidden">Key</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="hidden sm:inline">
                      {accessStatus?.freeDailyLimit === 0
                        ? 'VIP Key လိုအပ်'
                        : `Free (${accessStatus?.remainingFreeLines ?? 50})`}
                    </span>
                    <span className="sm:hidden">
                      {accessStatus?.freeDailyLimit === 0 ? 'VIP' : `${accessStatus?.remainingFreeLines ?? 50}L`}
                    </span>
                  </>
                )}
              </button>
            )}

            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#131720] hover:bg-[#1a202c] text-slate-300 border border-[#212734] transition-colors shadow-xs"
                title="ဘာသာပြန် ဆက်တင်များ (Settings)"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden sm:inline">ဆက်တင်</span>
              </button>
            )}

            <button
              onClick={onDonateClick}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium text-xs border border-rose-500/30 transition-colors shadow-xs"
              title="ကူညီထောက်ပံ့ရန် (Donate)"
            >
              <Heart className="w-3.5 h-3.5 fill-current text-rose-400 shrink-0" />
              <span className="hidden xs:inline">လှူဒါန်းရန်</span>
            </button>

            {meta && (
              <>
                <button
                  onClick={onUploadClick}
                  className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-md bg-[#131720] hover:bg-[#1a202c] text-slate-200 text-xs font-medium border border-[#212734] transition-colors"
                  title="ဖိုင်အသစ် တင်မည်"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="hidden md:inline">ဖိုင်အသစ်</span>
                </button>

                <button
                  onClick={onExportClick}
                  className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs"
                  title="စာတန်းထိုး ဒေါင်းလုဒ်ဆွဲမည်"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>ဒေါင်းလုဒ်</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Mobile View Bar) */}
        {meta && (
          <div className="flex md:hidden border-t border-[#1b2028] py-2 gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('subtitles')}
              className={`flex items-center justify-center flex-1 space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === 'subtitles'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-[#12161f] text-slate-300 border border-[#212734]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>စာကြောင်း ({meta.totalItems})</span>
            </button>

            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center justify-center flex-1 space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === 'video'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-[#12161f] text-slate-300 border border-[#212734]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>ဗီဒီယို စမ်းရန်</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
