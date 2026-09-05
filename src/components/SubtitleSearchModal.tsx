import React, { useState } from 'react';
import {
  Search,
  Download,
  Film,
  Languages,
  Link,
  Globe,
  Check,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
  FileText,
  Zap,
  Sliders,
} from 'lucide-react';
import { notify } from './AlertToastProvider';

interface SubtitleSearchResult {
  id: string;
  fileId: number | string;
  source: string;
  fileName: string;
  title: string;
  year?: number;
  season?: number;
  episode?: number;
  language: string;
  downloadCount: number;
  rating: number;
  hearingImpaired: boolean;
  format: string;
  release?: string;
  comments?: string;
}

interface SubtitleSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSubtitle: (content: string, fileName: string) => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

export const SubtitleSearchModal: React.FC<SubtitleSearchModalProps> = ({
  isOpen,
  onClose,
  onImportSubtitle,
  isAdmin,
  onOpenAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'url'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'episode'>('all');
  const [seasonNumber, setSeasonNumber] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SubtitleSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [requiresKey, setRequiresKey] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Download / Import state
  const [downloadingFileId, setDownloadingFileId] = useState<string | number | null>(null);
  const [importedFileId, setImportedFileId] = useState<string | number | null>(null);

  // Direct URL state
  const [directUrl, setDirectUrl] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Language options
  const languageOptions = [
    { code: 'en', label: 'English (အင်္ဂလိပ်)' },
    { code: 'ja', label: 'Japanese (ဂျပန်)' },
    { code: 'zh', label: 'Chinese (တရုတ်)' },
    { code: 'ko', label: 'Korean (ကိုရီးယား)' },
    { code: 'th', label: 'Thai (ထိုင်း)' },
    { code: 'all', label: 'All (အားလုံး)' },
  ];

  // Perform Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setRequiresKey(false);
    setHasSearched(true);
    setImportedFileId(null);

    try {
      const params = new URLSearchParams({
        query: searchQuery.trim(),
        languages: selectedLanguage === 'all' ? 'en,ja,zh,ko,th' : selectedLanguage,
        type: mediaType,
      });

      if (seasonNumber.trim()) params.append('season_number', seasonNumber.trim());
      if (episodeNumber.trim()) params.append('episode_number', episodeNumber.trim());

      const res = await fetch(`/api/subtitles/search?${params.toString()}`);
      const data = await res.json();

      if (data.requiresKey) {
        setRequiresKey(true);
      }
      if (data.results && Array.isArray(data.results)) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
      if (data.apiErrorMessage && data.results?.length === 0) {
        setSearchError(data.apiErrorMessage);
      }
    } catch (err: any) {
      console.error('Subtitle search error:', err);
      setSearchError(err.message || 'ရှာဖွေရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်');
    } finally {
      setIsSearching(false);
    }
  };

  // Download & Import to Studio
  const handleDownloadAndImport = async (result: SubtitleSearchResult) => {
    setDownloadingFileId(result.fileId);
    try {
      const res = await fetch('/api/subtitles/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: result.fileId,
          fileName: result.fileName,
          source: result.source,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.content) {
        throw new Error(data.error || 'စာတန်းထိုးဖိုင် ဆွဲယူ၍ မရနိုင်ပါ');
      }

      setImportedFileId(result.fileId);
      onImportSubtitle(data.content, data.fileName || result.fileName);
      notify.success(`"${data.fileName || result.fileName}" ကို Workspace ထဲသို့ ထည့်သွင်းပြီးပါပြီ`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      notify.error(err.message || 'ဖိုင်ဒေါင်းလုဒ်ဆွဲခြင်း မအောင်မြင်ပါ', 'Download Error');
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Direct URL Fetch & Import
  const handleFetchUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directUrl.trim()) return;

    setIsFetchingUrl(true);
    setUrlError(null);

    try {
      const res = await fetch('/api/subtitles/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: directUrl.trim(),
          preferredName: customFileName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.content) {
        throw new Error(data.error || 'ဖိုင်ဆွဲယူ၍ မရနိုင်ပါ');
      }

      onImportSubtitle(data.content, data.fileName);
      onClose();
    } catch (err: any) {
      setUrlError(err.message || 'ဖိုင်ဆွဲယူရာတွင် ချို့ယွင်းချက် ဖြစ်ပေါ်ခဲ့ပါသည်');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#0f131a] border border-[#232a3b] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2533] bg-[#131822]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                အွန်လိုင်းမှ စာတန်းထိုး ရှာဖွေတင်သွင်းရန် (Online Subtitles)
              </h3>
              <p className="text-xs text-slate-400">
                ရုပ်ရှင်/Anime အမည်ဖြင့် တိုက်ရိုက်ရှာပြီး ၁-Click ဖြင့် ထည့်သွင်းဘာသာပြန်ဆိုနိုင်ပါသည်
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1c2230] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#1f2533] bg-[#10141d] px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center space-x-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>ရုပ်ရှင် / Anime အမည်ဖြင့် ရှာရန်</span>
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex items-center space-x-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'url'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>တိုက်ရိုက် Link ဖြင့် ဆွဲယူမည် (Direct URL)</span>
          </button>
        </div>

        {/* Tab 1: Search Subtitles */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
            {/* Search Input Bar */}
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ဥပမာ: Solo Leveling, Demon Slayer, Oppenheimer, Naruto..."
                    className="w-full bg-[#141923] border border-[#262f42] rounded-lg pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 py-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    showFilters
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-[#141923] border-[#262f42] text-slate-400 hover:text-slate-200'
                  }`}
                  title="Filter options"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filters</span>
                </button>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ရှာနေသည်...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>ရှာဖွေမည်</span>
                    </>
                  )}
                </button>
              </div>

              {/* Language Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
                  <Languages className="w-3 h-3 text-slate-500" />
                  ဘာသာစကား:
                </span>
                {languageOptions.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setSelectedLanguage(opt.code)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      selectedLanguage === opt.code
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-[#141923] text-slate-400 hover:text-slate-200 border border-[#232938]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Additional Filters (Season, Episode, Type) */}
              {showFilters && (
                <div className="p-3 bg-[#131720] border border-[#202736] rounded-lg grid grid-cols-3 gap-2 text-xs animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">အမျိုးအစား</label>
                    <select
                      value={mediaType}
                      onChange={(e: any) => setMediaType(e.target.value)}
                      className="w-full bg-[#181e2b] border border-[#283244] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">အားလုံး (All)</option>
                      <option value="movie">ရုပ်ရှင် (Movie)</option>
                      <option value="episode">အပိုင်းတွဲ (Episode / Series)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Season #</label>
                    <input
                      type="number"
                      value={seasonNumber}
                      onChange={(e) => setSeasonNumber(e.target.value)}
                      placeholder="ဥပမာ: 1"
                      className="w-full bg-[#181e2b] border border-[#283244] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Episode #</label>
                    <input
                      type="number"
                      value={episodeNumber}
                      onChange={(e) => setEpisodeNumber(e.target.value)}
                      placeholder="ဥပမာ: 3"
                      className="w-full bg-[#181e2b] border border-[#283244] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </form>

            {/* Requires Key Warning & Guide */}
            {requiresKey && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-amber-300">
                    OpenSubtitles Free API Key လိုအပ်ပါသည်
                  </p>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    OpenSubtitles.com တွင် အခမဲ့ Register ပြုလုပ်ပြီး Consumer API Key ရယူနိုင်ပါသည်။
                    (သို့မဟုတ် ဘေးရှိ Direct URL Tab မှ စာတန်းထိုး Link ဖြင့် တိုက်ရိုက်ဆွဲယူနိုင်ပါသည်)
                  </p>
                  {isAdmin && onOpenAdmin && (
                    <button
                      onClick={onOpenAdmin}
                      className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-amber-300 hover:text-amber-100 underline"
                    >
                      Admin Panel တွင် API Key ထည့်သွင်းရန် နှိပ်ပါ
                    </button>
                  )}
                </div>
              </div>
            )}

            {searchError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                {searchError}
              </div>
            )}

            {/* Results List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[220px]">
              {isSearching ? (
                <div className="h-48 flex flex-col items-center justify-center space-y-2 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                  <p className="text-xs">အွန်လိုင်း စာတန်းထိုးများကို ရှာဖွေနေပါသည်...</p>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => {
                  const isDownloading = downloadingFileId === result.fileId;
                  const isImported = importedFileId === result.fileId;

                  return (
                    <div
                      key={result.id}
                      className="p-3 bg-[#131722] hover:bg-[#161c2b] border border-[#202838] hover:border-[#2f3b52] rounded-lg transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold text-slate-100 truncate max-w-[280px] sm:max-w-md">
                            {result.title}
                          </span>
                          {result.year && (
                            <span className="text-[10px] text-slate-400 bg-[#1c2230] px-1.5 py-0.5 rounded border border-[#252e40]">
                              {result.year}
                            </span>
                          )}
                          {result.season !== undefined && result.episode !== undefined && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              S{String(result.season).padStart(2, '0')}E{String(result.episode).padStart(2, '0')}
                            </span>
                          )}
                          <span className="text-[10px] uppercase font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                            {result.language}
                          </span>
                          <span className="text-[10px] uppercase font-mono text-slate-400 bg-[#19202c] px-1.5 py-0.5 rounded">
                            {result.format}
                          </span>
                          {result.hearingImpaired && (
                            <span className="text-[10px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                              HI
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 truncate font-mono">
                          {result.fileName}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                          {result.downloadCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Download className="w-2.5 h-2.5" />
                              {result.downloadCount.toLocaleString()} downloads
                            </span>
                          )}
                          {result.rating > 0 && (
                            <span>⭐ {result.rating.toFixed(1)}</span>
                          )}
                          {result.release && (
                            <span className="truncate max-w-[180px] text-slate-400">
                              Release: {result.release}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleDownloadAndImport(result)}
                        disabled={isDownloading || isImported}
                        className={`px-3 py-2 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                          isImported
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-60'
                        }`}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>ဆွဲယူနေသည်...</span>
                          </>
                        ) : isImported ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>တင်ပြီးပြီ</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>Import to Studio</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : hasSearched ? (
                <div className="h-48 flex flex-col items-center justify-center space-y-2 text-slate-500 text-xs">
                  <Film className="w-8 h-8 text-slate-600 mb-1" />
                  <p>ကိုက်ညီသော စာတန်းထိုး မတွေ့ရှိပါ</p>
                  <p className="text-[11px] text-slate-400">
                    အမည်စာလုံးပေါင်း ပြန်စစ်ပါ သို့မဟုတ် Direct URL Tab မှ တိုက်ရိုက် Link ထည့်သွင်းပါ
                  </p>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center space-y-2 text-slate-500 text-xs">
                  <Search className="w-8 h-8 text-slate-600 mb-1" />
                  <p>လိုချင်သော ရုပ်ရှင် သို့မဟုတ် Anime အမည်ကို ရိုက်ထည့်၍ ရှာဖွေပါ</p>
                  <p className="text-[11px] text-slate-400">
                    OpenSubtitles Database မှ တိုက်ရိုက်ဆွဲယူပြီး Studio သို့ ၁-Click ဖြင့် ထည့်သွင်းပေးပါမည်
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Direct URL Importer */}
        {activeTab === 'url' && (
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            <div className="p-3 bg-[#131722] border border-[#202738] rounded-lg text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" />
                အင်တာနက်ပေါ်ရှိ မည်သည့် စာတန်းထိုး Link မဆို တိုက်ရိုက် ဆွဲယူနိုင်ပါသည်
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Subscene, Kitsunekko (Anime), GitHub, Google Drive (direct download link) စသည့် နေရာများမှ
                .srt သို့မဟုတ် .vtt Link များကို အောက်တွင် ထည့်ပြီး Fetch ပြုလုပ်နိုင်ပါသည်။
              </p>
            </div>

            <form onSubmit={handleFetchUrl} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Subtitle Direct URL (အပြည့်အစုံ) *
                </label>
                <input
                  type="url"
                  value={directUrl}
                  onChange={(e) => setDirectUrl(e.target.value)}
                  placeholder="https://example.com/subtitles/Solo.Leveling.S01E01.srt"
                  required
                  className="w-full bg-[#141923] border border-[#262f42] rounded-lg px-3 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  ဖိုင်အမည် သတ်မှတ်ရန် (Optional)
                </label>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="ဥပမာ: Solo_Leveling_E01.srt"
                  className="w-full bg-[#141923] border border-[#262f42] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {urlError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                  {urlError}
                </div>
              )}

              <button
                type="submit"
                disabled={isFetchingUrl || !directUrl.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isFetchingUrl ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ဖိုင်ဆွဲယူနေပါသည်...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>ဖိုင်ဆွဲယူ၍ Studio သို့ ထည့်သွင်းမည် (Fetch & Import)</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-[#1f2533] text-[11px] text-slate-400 space-y-1.5">
              <p className="font-semibold text-slate-300">💡 အကြံပြုချက်များ:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>.srt, .vtt နှင့် .ass ဖိုင် format များကို တိုက်ရိုက် ဖတ်ရှုနိုင်ပါသည်။</li>
                <li>ZIP သို့မဟုတ် GZIP ဖြင့် ချုံ့ထားသော စာတန်းထိုးများကိုလည်း စနစ်မှ အလိုအလျောက် ဖြည်ပေးပါမည်။</li>
                <li>Server Proxy မှတဆင့် ဆွဲယူပေးသဖြင့် CORS Restriction များ မရှိဘဲ ဒေါင်းလုဒ်ဆွဲနိုင်ပါသည်။</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
