import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Languages,
  Clipboard,
  Check,
  AlertCircle,
  FileCheck,
  PlayCircle,
  Film,
  Globe,
} from 'lucide-react';

interface FileUploaderProps {
  onFileLoaded: (content: string, filename: string) => void;
  onOpenOnlineSubtitles?: () => void;
}

const SAMPLE_ANIME_SRT = `1
00:00:01,200 --> 00:00:03,800
It was a journey that lasted ten years.

2
00:00:04,100 --> 00:00:07,400
The era of peace has finally arrived, Frieren.

3
00:00:08,000 --> 00:00:11,500
To you elves, ten years might feel like a brief moment.

4
00:00:12,100 --> 00:00:15,600
I only spent ten years traveling with him.

5
00:00:16,200 --> 00:00:19,800
Why didn't I try to get to know him better?

6
00:00:20,500 --> 00:00:23,900
Humans have such fleeting lives compared to elves.

7
00:00:24,500 --> 00:00:27,900
Let us embark on a new journey to the northern lands.

8
00:00:28,500 --> 00:00:32,000
Until we meet again, my cherished friends.`;

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileLoaded,
  onOpenOnlineSubtitles,
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

  const handleLoadSample = () => {
    onFileLoaded(SAMPLE_ANIME_SRT, 'frieren_episode_01_demo.srt');
  };

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 px-3 sm:px-6">
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md text-xs font-semibold border border-emerald-500/20 mb-3">
          <Languages className="w-3.5 h-3.5" />
          <span>Professional Subtitle Translator for Myanmar (Burmese)</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-100 tracking-tight font-serif">
          SRT / VTT ဗီဒီယိုစာတန်းထိုး ဖိုင်များ ထည့်သွင်းပါ
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-lg mx-auto leading-relaxed">
          အင်္ဂလိပ် သို့မဟုတ် အခြားဘာသာဖြင့်ရှိသော စာတန်းထိုးများကို AI ဖြင့် အလိုအလျောက် သို့မဟုတ် မိမိကိုယ်တိုင် တိုက်ရိုက် ဘာသာပြန်ဆိုနိုင်ပါသည်
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-4 sm:mb-6">
        <div className="bg-[#12161f] p-1 rounded-md border border-[#212734] inline-flex space-x-1">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded text-xs font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-slate-100 hover:bg-[#1a202c]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>ဖိုင် တင်မည် (Upload)</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded text-xs font-medium transition-colors ${
              activeTab === 'paste'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 hover:text-slate-100 hover:bg-[#1a202c]'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>စာသား ကူးထည့်မည် (Paste)</span>
          </button>
          {onOpenOnlineSubtitles && (
            <button
              onClick={onOpenOnlineSubtitles}
              className="flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>အွန်လိုင်းမှ ရှာမည် (Search Online)</span>
            </button>
          )}
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
          className={`border border-dashed rounded-lg p-6 sm:p-10 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-[#262c3a] hover:border-slate-500 bg-[#0e1219] hover:bg-[#121720]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.vtt,text/plain"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#141a24] rounded-md flex items-center justify-center mx-auto mb-3 border border-[#262c3a] text-emerald-400">
            <Upload className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <p className="text-slate-200 text-xs sm:text-sm font-semibold mb-1">
            ဒီနေရာတွင် .srt သို့မဟုတ် .vtt စာတန်းထိုးဖိုင်ကို ဆွဲထည့်ပါ
          </p>
          <p className="text-slate-400 text-[11px] sm:text-xs mb-4">
            သို့မဟုတ် ဖုန်း/ကွန်ပျူတာထဲမှ ရွေးချယ်ရန် နှိပ်ပါ (SRT & WebVTT Format)
          </p>
          <div className="inline-flex items-center space-x-2 text-[11px] text-slate-400 bg-[#141a24] px-3 py-1.5 rounded-md border border-[#212734]">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>ထောက်ပံ့သော ဖိုင်အမျိုးအစား: .srt, .vtt (UTF-8)</span>
          </div>
        </div>
      )}

      {/* Paste Area */}
      {activeTab === 'paste' && (
        <div className="bg-[#0e1219] border border-[#212734] rounded-lg p-4 sm:p-5">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            SRT သို့မဟုတ် VTT စာသားများကို ကူးထည့်ပါ (Paste Raw Content):
          </label>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`1\n00:00:01,000 --> 00:00:04,000\nHello, world!\n\n2\n00:00:05,000 --> 00:00:08,000\nWelcome to subtitle translation.`}
            rows={8}
            className="w-full bg-[#090c10] border border-[#212734] rounded-md p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={handlePasteSubmit}
              disabled={!pastedText.trim()}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-40"
            >
              <FileCheck className="w-4 h-4" />
              <span>စာတန်းထိုး စတင်ဆန်းစစ်မည် (Process Subtitles)</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Demo Subtitle Loader - Great for Mobile Users */}
      <div className="mt-4 pt-4 border-t border-[#1b2028] flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2 text-xs text-slate-400 text-center sm:text-left">
          <Film className="w-4 h-4 text-amber-400 shrink-0" />
          <span>ဖိုင်အဆင်သင့်မရှိသေးပါက Anime နမူနာဖိုင်ဖြင့် ချက်ချင်း စမ်းသပ်နိုင်ပါသည်:</span>
        </div>
        <button
          onClick={handleLoadSample}
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#141a24] hover:bg-[#1a2230] text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-semibold transition-colors"
        >
          <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>နမူနာ Anime ဖိုင် ဖွင့်မည် (Load Demo)</span>
        </button>
      </div>
    </div>
  );
};
