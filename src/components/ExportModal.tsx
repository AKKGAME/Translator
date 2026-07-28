import React, { useState } from 'react';
import { SubtitleItem, SubtitleFormat } from '../types';
import {
  generateSRT,
  generateVTT,
  generateTXT,
} from '../utils/subtitleParser';
import {
  Download,
  Copy,
  Check,
  FileText,
  X,
  Sparkles,
  Layers,
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
  const [exportFormat, setExportFormat] = useState<SubtitleFormat | 'txt'>('srt');
  const [contentMode, setContentMode] = useState<'translated' | 'dual' | 'original'>(
    'translated'
  );
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const baseName = originalFilename.replace(/\.[^/.]+$/, '');

  const getExportData = () => {
    if (exportFormat === 'srt') {
      return {
        content: generateSRT(items, contentMode, skipEmpty),
        filename: `${baseName}_myanmar_${contentMode}.srt`,
        mime: 'text/plain;charset=utf-8',
      };
    } else if (exportFormat === 'vtt') {
      return {
        content: generateVTT(items, contentMode, skipEmpty),
        filename: `${baseName}_myanmar_${contentMode}.vtt`,
        mime: 'text/vtt;charset=utf-8',
      };
    } else {
      return {
        content: generateTXT(items, contentMode, skipEmpty),
        filename: `${baseName}_script_${contentMode}.txt`,
        mime: 'text/plain;charset=utf-8',
      };
    }
  };

  const saveToServer = (filename: string, content: string) => {
    fetch('/api/save-subtitle-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: filename,
        content: content,
        format: exportFormat,
        contentMode: contentMode,
        subtitleCount: items.length,
      }),
    })
      .then((res) => {
        if (!res.ok) return;
      })
      .catch(() => {
        // Silently ignore on static hosting
      });
  };

  const handleDownload = () => {
    const { content, filename, mime } = getExportData();
    
    // Save to server storage in background for Admin history
    saveToServer(filename, content);

    // Add UTF-8 BOM for perfect Burmese rendering on Windows/VLC players
    const blob = new Blob(['\uFEFF' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const { content, filename } = getExportData();
    saveToServer(filename, content);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-slate-100">
              စာတန်းထိုး ဖိုင် ဒေါင်းလုဒ်လုပ်ရန် (Export Subtitles)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Mode Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            ၁။ ထုတ်ယူလိုသည့် စာတန်းထိုး အမျိုးအစား:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setContentMode('translated')}
              className={`p-3 rounded-xl border text-xs font-bold transition text-center ${
                contentMode === 'translated'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              မြန်မာစာတန်းထိုး သီးသန့်
            </button>
            <button
              onClick={() => setContentMode('dual')}
              className={`p-3 rounded-xl border text-xs font-bold transition text-center ${
                contentMode === 'dual'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              နှစ်ဘာသာ ပူးတွဲ (Dual)
            </button>
            <button
              onClick={() => setContentMode('original')}
              className={`p-3 rounded-xl border text-xs font-bold transition text-center ${
                contentMode === 'original'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              မူရင်း သီးသန့်
            </button>
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            ၂။ ဖိုင် အမျိုးအစား (File Format):
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setExportFormat('srt')}
              className={`p-3 rounded-xl border text-xs font-bold transition text-center ${
                exportFormat === 'srt'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              .SRT Format
            </button>
            <button
              onClick={() => setExportFormat('vtt')}
              className={`p-3 rounded-xl border text-xs font-bold transition text-center ${
                exportFormat === 'vtt'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              .VTT Format
            </button>
            <button
              onClick={() => setExportFormat('txt')}
              className={`p-3 rounded-xl border text-xs font-bold transition text-center ${
                exportFormat === 'txt'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              .TXT Plain Text
            </button>
          </div>
        </div>

        {/* Empty Line & Sound FX Filter Option */}
        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
          <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-200">
            <input
              type="checkbox"
              checked={skipEmpty}
              onChange={(e) => setSkipEmpty(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
            />
            <span className="text-emerald-300">မပြန်ရသေးသော / အသံဆူညံသံ (ဟောဟဲ...) စာကြောင်းလွတ်များကို ဖြတ်ထုတ်မည်</span>
          </label>
          <p className="text-[11px] text-slate-400 mt-1 pl-6">
            ဖွင့်ထားပါက စာသားမရှိသော စာကြောင်းများနှင့် အသံဆူညံသံများကို ဒေါင်းလုဒ်ဆွဲသည့် ဖိုင်ထဲမှ အလိုအလျောက် ပယ်ဖျက်ပေးပြီး စာတန်းထိုး နံပါတ်များကို အစဉ်လိုက် ပြန်လည် စီစဉ်ပေးပါမည်။
          </p>
        </div>

        {/* File Info Notice */}
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-slate-400 flex items-center justify-between">
          <span>ဖိုင်အမည် (Filename):</span>
          <span className="font-mono text-emerald-400 font-semibold">
            {getExportData().filename}
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center space-x-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'ကူးယူပြီးပါပြီ' : 'စာသား ကူးယူမည် (Copy)'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-extrabold transition flex items-center space-x-2 shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>ဖိုင် ဒေါင်းလုဒ်ဆွဲမည်</span>
          </button>
        </div>
      </div>
    </div>
  );
};
