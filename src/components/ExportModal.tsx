import React, { useState } from 'react';
import { SubtitleItem, SubtitleFormat } from '../types';
import {
  generateSRT,
  generateVTT,
  generateTXT,
} from '../utils/subtitleParser';
import {
  sendDocumentToTelegramDirect,
} from '../utils/telegramDirect';
import { notify } from './AlertToastProvider';
import {
  Download,
  Copy,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  FileCheck,
  Loader2,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SubtitleItem[];
  originalFilename: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  items,
  originalFilename,
}) => {
  const totalCount = items.length;
  const translatedCount = items.filter((it) => !!it.translatedText?.trim()).length;
  const originalCount = items.filter((it) => !!it.originalText?.trim()).length;

  const [exportFormat, setExportFormat] = useState<SubtitleFormat | 'txt'>('srt');
  const [contentMode, setContentMode] = useState<'translated' | 'dual' | 'original'>(() => {
    return translatedCount > 0 ? 'translated' : 'original';
  });
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [fallbackToOriginal, setFallbackToOriginal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [serverDownloadUrl, setServerDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const rawBase = originalFilename?.trim() || 'subtitles.srt';
  const baseName = rawBase.replace(/\.[^/.]+$/, '') || 'subtitles';

  const getExportData = () => {
    let content = '';
    let ext = 'srt';
    let mime = 'text/plain;charset=utf-8';

    if (exportFormat === 'srt') {
      content = generateSRT(items, contentMode, skipEmpty, fallbackToOriginal);
      ext = 'srt';
      mime = 'text/plain;charset=utf-8';
    } else if (exportFormat === 'vtt') {
      content = generateVTT(items, contentMode, skipEmpty, fallbackToOriginal);
      ext = 'vtt';
      mime = 'text/vtt;charset=utf-8';
    } else {
      content = generateTXT(items, contentMode, skipEmpty, fallbackToOriginal);
      ext = 'txt';
      mime = 'text/plain;charset=utf-8';
    }

    const filename = `${baseName}_myanmar_${contentMode}.${ext}`;
    return { content, filename, mime };
  };

  const saveToServer = async (filename: string, content: string, count: number) => {
    try {
      const res = await fetch('/api/save-subtitle-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: filename,
          content: content,
          format: exportFormat,
          contentMode: contentMode,
          subtitleCount: count,
          sendTelegram: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.file?.id) {
          const directUrl = data.downloadUrl || `/api/download-saved-sub/${data.file.id}`;
          setServerDownloadUrl(directUrl);
          return directUrl;
        }
      }
    } catch (e) {
      console.warn('Could not save to server storage:', e);
    }
    return null;
  };

  const syncToTelegramIfEnabled = (filename: string, content: string, count: number) => {
    try {
      let isEnabled = true;
      let captionTpl = '🎬 <b>ဘာသာပြန် စာတန်းထိုးဖိုင်:</b> <code>{fileName}</code>\n📝 <b>အမျိုးအစား:</b> {contentMode} ({format})\n📊 <b>စာကြောင်းရေ:</b> {subtitleCount} ကြောင်း\n✨ <b>Translated with:</b> AnimeGabar AI Subtitle Translator';
      
      const local = localStorage.getItem('telegram_config');
      if (local) {
        try {
          const config = JSON.parse(local);
          if (config) {
            if (config.enabled === false || config.sendOnDownload === false) {
              isEnabled = false;
            }
            if (config.captionTemplate) {
              captionTpl = config.captionTemplate;
            }
          }
        } catch (e) {}
      }

      if (isEnabled) {
        const caption = captionTpl
          .replace(/{fileName}/g, filename)
          .replace(/{subtitleCount}/g, String(count))
          .replace(/{format}/g, exportFormat.toUpperCase())
          .replace(/{contentMode}/g, contentMode)
          .replace(/{savedAt}/g, new Date().toLocaleString('my-MM'));

        sendDocumentToTelegramDirect({
          fileName: filename,
          content: content,
          caption: caption,
        }).catch((err) => {
          console.warn('Telegram direct sync note:', err);
        });
      }
    } catch (e) {
      // Silently ignore
    }
  };

  const handleDownload = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      const { content, filename, mime } = getExportData();

      if (!content || content.trim().length === 0) {
        setExportError(
          contentMode === 'translated' && translatedCount === 0
            ? 'မြန်မာဘာသာပြန်ထားသော စာကြောင်း မရှိသေးပါ ("မူရင်း သီးသန့်" ကို ရွေးချယ်ပါ သို့မဟုတ် ဘာသာပြန်ဆိုပြီးမှ ထုတ်ယူပါ)'
            : 'ထုတ်ယူရန် စာတန်းထိုးစာသား မတွေ့ရှိပါ'
        );
        setIsExporting(false);
        return;
      }

      // Estimate line count from content
      const lineCount = (content.match(/-->/g) || []).length || items.length;

      // 1. Save to server storage in background and get direct download URL
      const directUrl = await saveToServer(filename, content, lineCount);

      // 2. Direct Telegram sync fallback
      syncToTelegramIfEnabled(filename, content, lineCount);

      // 3. Browser download with UTF-8 BOM
      try {
        const blob = new Blob(['\uFEFF' + content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // DO NOT revoke immediately - Chrome cancels downloads if revoked before saving!
        setTimeout(() => {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }, 60000);
      } catch (dlErr: any) {
        console.warn('Browser blob download warning:', dlErr);
      }

      setExportSuccess('အောင်မြင်စွာ ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ');
    } catch (err: any) {
      setExportError(err?.message || 'Export ပြုလုပ်ရာတွင် အမှားအယွင်း ဖြစ်ပွားခဲ့ပါသည်');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = () => {
    const { content, filename } = getExportData();
    if (!content || content.trim().length === 0) {
      setExportError('ကူးယူရန် စာတန်းထိုးစာသား မရှိသေးပါ');
      return;
    }
    saveToServer(filename, content, items.length);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setExportSuccess('စာတန်းထိုး အချက်အလက်များကို Clipboard သို့ ကူးယူပြီးပါပြီ');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0e1219] border border-[#212734] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#212734] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>စာတန်းထိုး ဖိုင် ဒေါင်းလုဒ်လုပ်ရန် (Export)</span>
              </h3>
              <p className="text-xs text-slate-400">
                SRT, VTT သို့မဟုတ် TXT Format ဖြင့် ကွန်ပျူတာ/ဖုန်းထဲသို့ ဒေါင်းလုဒ်ဆွဲပါ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-[#1a202c] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Translation Status Notice */}
        {translatedCount === 0 && contentMode === 'translated' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1.5 flex-1">
              <p className="font-semibold">မြန်မာဘာသာပြန်ထားသော စာကြောင်း မရှိသေးပါ (၀ / {totalCount} ကြောင်း)</p>
              <p className="text-amber-300/80 text-[11px]">
                မူရင်းစာတန်းထိုးများကို ထုတ်ယူလိုပါက အောက်ပါခလုတ်ကို နှိပ်ပါ -
              </p>
              <button
                type="button"
                onClick={() => setContentMode('original')}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-[11px] font-bold text-amber-200 transition"
              >
                👉 "မူရင်း သီးသန့် (Original)" သို့ ပြောင်းမည်
              </button>
            </div>
          </div>
        )}

        {/* Success / Error Messages */}
        {exportSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-300 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold">{exportSuccess}</p>
              {serverDownloadUrl && (
                <div className="pt-1">
                  <a
                    href={serverDownloadUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-emerald-400 underline hover:text-emerald-300"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>ဒေါင်းလုဒ်မကျပါက ဤနေရာကို နှိပ်၍ တိုက်ရိုက်ဒေါင်းလုဒ်ဆွဲပါ</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {exportError && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-300 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <p className="font-semibold">{exportError}</p>
          </div>
        )}

        {/* 1. Content Mode Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              ၁။ ထုတ်ယူလိုသည့် စာတန်းထိုး အမျိုးအစား:
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              ဘာသာပြန်ပြီး: {translatedCount} / {totalCount} ကြောင်း
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setContentMode('translated')}
              className={`p-2.5 rounded-lg border text-xs font-bold transition text-center ${
                contentMode === 'translated'
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-sm'
                  : 'bg-[#07090e] border-[#212734] text-slate-400 hover:bg-[#12161f]'
              }`}
            >
              မြန်မာစာတန်းထိုး သီးသန့်
              <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                ({translatedCount} ကြောင်း)
              </span>
            </button>
            <button
              onClick={() => setContentMode('dual')}
              className={`p-2.5 rounded-lg border text-xs font-bold transition text-center ${
                contentMode === 'dual'
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-sm'
                  : 'bg-[#07090e] border-[#212734] text-slate-400 hover:bg-[#12161f]'
              }`}
            >
              နှစ်ဘာသာ ပူးတွဲ (Dual)
              <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                (မြန်မာ + မူရင်း)
              </span>
            </button>
            <button
              onClick={() => setContentMode('original')}
              className={`p-2.5 rounded-lg border text-xs font-bold transition text-center ${
                contentMode === 'original'
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-sm'
                  : 'bg-[#07090e] border-[#212734] text-slate-400 hover:bg-[#12161f]'
              }`}
            >
              မူရင်း သီးသန့်
              <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                ({originalCount} ကြောင်း)
              </span>
            </button>
          </div>
        </div>

        {/* 2. Format Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            ၂။ ဖိုင် အမျိုးအစား (File Format):
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setExportFormat('srt')}
              className={`p-2 rounded-lg border text-xs font-bold transition text-center ${
                exportFormat === 'srt'
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-sm'
                  : 'bg-[#07090e] border-[#212734] text-slate-400 hover:bg-[#12161f]'
              }`}
            >
              .SRT Format
            </button>
            <button
              onClick={() => setExportFormat('vtt')}
              className={`p-2 rounded-lg border text-xs font-bold transition text-center ${
                exportFormat === 'vtt'
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-sm'
                  : 'bg-[#07090e] border-[#212734] text-slate-400 hover:bg-[#12161f]'
              }`}
            >
              .VTT Format
            </button>
            <button
              onClick={() => setExportFormat('txt')}
              className={`p-2 rounded-lg border text-xs font-bold transition text-center ${
                exportFormat === 'txt'
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 shadow-sm'
                  : 'bg-[#07090e] border-[#212734] text-slate-400 hover:bg-[#12161f]'
              }`}
            >
              .TXT Plain Text
            </button>
          </div>
        </div>

        {/* 3. Empty Line & Noise Filter Options */}
        <div className="bg-[#07090e] border border-[#212734] p-3 rounded-lg space-y-2.5">
          <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-200">
            <input
              type="checkbox"
              checked={skipEmpty}
              onChange={(e) => setSkipEmpty(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-500 bg-[#12161f] border-[#212734] cursor-pointer"
            />
            <span className="text-emerald-300">မပြန်ရသေးသော / အသံဆူညံသံ (ဟောဟဲ...) စာကြောင်းလွတ်များကို ဖြတ်ထုတ်မည်</span>
          </label>

          {contentMode === 'translated' && translatedCount < totalCount && (
            <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-200 pt-1 border-t border-[#212734]">
              <input
                type="checkbox"
                checked={fallbackToOriginal}
                onChange={(e) => setFallbackToOriginal(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 bg-[#12161f] border-[#212734] cursor-pointer"
              />
              <span className="text-slate-300">
                မပြန်ရသေးသော စာကြောင်းများတွင် မူရင်းစာသားကို အစားထိုးထည့်သွင်းမည် (အချိန်ကိုက်မလွဲစေရန်)
              </span>
            </label>
          )}

          <p className="text-[11px] text-slate-400 pl-6">
            ဖွင့်ထားပါက စာတန်းထိုး နံပါတ်များကို အစဉ်လိုက် ပြန်လည် စီစဉ်ပေးပြီး Windows / VLC Player များတွင် မြန်မာစာ မှန်ကန်စွာ ပေါ်စေရန် UTF-8 BOM ဖြင့် အလိုအလျောက် သိမ်းဆည်းပေးပါမည်။
          </p>
        </div>

        {/* File Info Notice */}
        <div className="bg-[#07090e] border border-[#212734] p-3 rounded-lg text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <FileCheck className="w-4 h-4 text-slate-400" />
            <span>ဖိုင်အမည် (Filename):</span>
          </span>
          <span className="font-mono text-emerald-400 font-semibold truncate max-w-[240px]">
            {getExportData().filename}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#212734]">
          <div>
            {serverDownloadUrl && (
              <a
                href={serverDownloadUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-[#12161f] hover:bg-[#1a202c] border border-emerald-500/30 text-emerald-400 text-xs rounded font-medium transition"
                title="Browser မှ Download မဖြစ်ပါက တိုက်ရိုက်ဆွဲရန်"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>တိုက်ရိုက်လင့်ခ်</span>
              </a>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-lg bg-[#12161f] hover:bg-[#1a202c] border border-[#212734] text-slate-200 text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'ကူးပြီးပြီ' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition flex items-center space-x-1.5 shadow-md"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>သိမ်းဆည်းနေပါသည်...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>ဖိုင် ဒေါင်းလုဒ်ဆွဲမည်</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
