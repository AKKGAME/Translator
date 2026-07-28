import React from 'react';
import { SubtitleFileMeta } from '../types';
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
} from 'lucide-react';

interface HeaderProps {
  meta: SubtitleFileMeta | null;
  activeTab: 'subtitles' | 'video' | 'admin';
  setActiveTab: (tab: 'subtitles' | 'video' | 'admin') => void;
  onUploadClick: () => void;
  onExportClick: () => void;
  onTimeShiftClick: () => void;
  onDonateClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  meta,
  activeTab,
  setActiveTab,
  onUploadClick,
  onExportClick,
  onTimeShiftClick,
  onDonateClick,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* App Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
              <Languages className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                  AnimeGabar
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                AI-Powered Subtitle Translator into Myanmar (Burmese)
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <div className="hidden md:flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            {meta && (
              <>
                <button
                  onClick={() => setActiveTab('subtitles')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'subtitles'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>စာကြောင်း ({meta.totalItems})</span>
                </button>

                <button
                  onClick={() => setActiveTab('video')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'video'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
                  }`}
                >
                  <Film className="w-4 h-4" />
                  <span>ဗီဒီယို စမ်းကြည့်ရန်</span>
                </button>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={onDonateClick}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/30 transition shadow-sm"
              title="ကူညီထောက်ပံ့ရန် (Donate)"
            >
              <Heart className="w-3.5 h-3.5 fill-current text-rose-400" />
              <span className="xs:inline">လှူဒါန်းရန်</span>
            </button>

            {meta && (
              <>
                <button
                  onClick={onUploadClick}
                  className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span className="sm:inline">ဖိုင်အသစ်</span>
                </button>

                <button
                  onClick={onExportClick}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="xs:inline">ဒေါင်းလုဒ်</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Mobile View Bar) */}
        {meta && (
          <div className="flex md:hidden border-t border-slate-800 py-2 gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('subtitles')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'subtitles'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>စာကြောင်း ({meta.totalItems})</span>
            </button>

            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'video'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300'
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
