import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  Clipboard,
  Check,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface FileUploaderProps {
  onFileLoaded: (content: string, filename: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (file: File) => {
    const filename = file.name;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onFileLoaded(content, filename);
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;
    const isVtt = pastedText.trim().startsWith('WEBVTT');
    const name = isVtt ? 'pasted_subtitle.vtt' : 'pasted_subtitle.srt';
    onFileLoaded(pastedText, name);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini AI Subtitle Translator for Myanmar (Burmese)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          SRT / VTT ဗီဒီယိုစာတန်းထိုး ဖိုင်များ ထည့်သွင်းပါ
        </h2>
        <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
          အင်္ဂလိပ် သို့မဟုတ် အခြားဘာသာစကားဖြင့်ရှိသော စာတန်းထိုးများကို AI ဖြင့် အလိုအလျောက် သို့မဟုတ် မိမိကိုယ်တိုင် တိုက်ရိုက် ဘာသာပြန်ဆို ပြင်ဆင်နိုင်ပါသည်
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 inline-flex space-x-1">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'upload'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>ဖိုင် တင်မည် (Upload SRT/VTT)</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'paste'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>စာသား ကူးထည့်မည် (Paste Text)</span>
          </button>
        </div>
      </div>

      {/* Upload Box */}
      {activeTab === 'upload' && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
              : 'border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.vtt,text/plain"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700 text-emerald-400 shadow-inner">
            <Upload className="w-8 h-8" />
          </div>
          <p className="text-slate-200 text-sm font-medium mb-1">
            ဒီနေရာတွင် .srt သို့မဟုတ် .vtt စာတန်းထိုးဖိုင်ကို ဆွဲထည့်ပါ
          </p>
          <p className="text-slate-400 text-xs mb-4">
            သို့မဟုတ် ကွန်ပျူတာထဲမှ ရွေးချယ်ရန် နှိပ်ပါ (SRT & WebVTT Format များရရှိနိုင်ပါသည်)
          </p>
          <div className="inline-flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supported: .srt, .vtt (UTF-8 format)</span>
          </div>
        </div>
      )}

      {/* Paste Area */}
      {activeTab === 'paste' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            SRT သို့မဟုတ် VTT စာသားများကို ကူးထည့်ပါ (Paste Raw Content):
          </label>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`1\n00:00:01,000 --> 00:00:04,000\nHello, world!\n\n2\n00:00:05,000 --> 00:00:08,000\nWelcome to subtitle translation.`}
            rows={8}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 transition"
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={handlePasteSubmit}
              disabled={!pastedText.trim()}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition disabled:opacity-40"
            >
              <FileCheck className="w-4 h-4" />
              <span>စာတန်းထိုး စတင်ဆန်းစစ်မည် (Process Subtitles)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
