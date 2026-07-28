import React, { useState } from 'react';
import { TranslationSettings, TranslationStyle } from '../types';
import {
  Settings,
  Sparkles,
  X,
  Check,
  Languages,
  Film,
  Key,
  MessageSquare,
  BookOpen,
  Volume2,
} from 'lucide-react';

interface TranslationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TranslationSettings;
  onUpdateSettings: (newSettings: TranslationSettings) => void;
  onConfirmAndTranslate: () => void;
}

export const TranslationSettingsModal: React.FC<TranslationSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onConfirmAndTranslate,
}) => {
  const [translationMode, setTranslationMode] = useState<'ai' | 'manual'>('ai');
  const [showAccessCode, setShowAccessCode] = useState(false);

  if (!isOpen) return null;

  const handleStyleChange = (style: TranslationStyle) => {
    onUpdateSettings({ ...settings, style });
  };

  const handleConfirmAI = () => {
    onClose();
    onConfirmAndTranslate();
  };

  const handleConfirmManual = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                ဘာသာပြန် နည်းလမ်းနှင့် ဆက်တင်များ (Translation Options)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                AI ဖြင့် အလိုအလျောက် ဘာသာပြန်မည် သို့မဟုတ် ကိုယ်တိုင် တိုက်ရိုက် ပြင်ဆင်မည်ကို ရွေးချယ်ပါ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Translation Method Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTranslationMode('ai')}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-xs font-bold transition ${
              translationMode === 'ai'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI ဖြင့် အလိုအလျောက် ဘာသာပြန်မည်</span>
          </button>

          <button
            type="button"
            onClick={() => setTranslationMode('manual')}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-xs font-bold transition ${
              translationMode === 'manual'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>ကိုယ်တိုင် ဘာသာပြန်မည် (Manual Edit)</span>
          </button>
        </div>

        {/* Mode 1: AI Translation Settings */}
        {translationMode === 'ai' && (
          <div className="space-y-4">
            {/* 1. Genre / Style Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Film className="w-4 h-4 text-emerald-400" />
                <span>ဇာတ်လမ်း ပုံစံ / အမျိုးအစား (Genre / Style):</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'movie_dialogue', label: 'ရုပ်ရှင်/ဒရာမာ (Cinematic Movie)', desc: 'သဘာဝကျသော ပြောစကား' },
                  { id: 'anime_sub', label: 'အနိမေ / အာရှဒရာမာ (Anime/Kdrama)', desc: 'ခံစားချက်ပါသော စကားပြော' },
                  { id: 'documentary', label: 'သတင်း/မှတ်တမ်းတင် (Documentary)', desc: 'တိကျသော တရားဝင် စာသား' },
                  { id: 'casual', label: 'ပေါ့ပေါ့ပါးပါး (Casual Dialogue)', desc: 'နေ့စဉ် သုံးစကား' },
                  { id: 'literary', label: 'စာပေဟန် (Formal Literature)', desc: 'ယဉ်ကျေး စာပေဟန်' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleStyleChange(st.id as TranslationStyle)}
                    className={`p-3 rounded-xl border text-left transition ${
                      settings.style === st.id
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                        : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="text-xs">{st.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Tone & Speaker Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  စကားပြော အသုံးအနှုန်း (Tone)
                </label>
                <select
                  value={settings.tone || 'natural'}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, tone: e.target.value as any })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="natural">သဘာဝကျသော မြန်မာစကားပြော (Spoken)</option>
                  <option value="polite">ယဉ်ကျေးသော စကားပြော (Polite Spoken)</option>
                  <option value="formal">တရားဝင် စာပေဟန် (Formal Written)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  နာမ်စား သုံးစွဲမှု (Honorifics / Pronouns)
                </label>
                <select
                  value={settings.honorificLevel || 'standard'}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, honorificLevel: e.target.value as any })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="standard">ပုံမှန် (ငါ/နင်၊ ကျွန်တော်/မင်း)</option>
                  <option value="polite">ယဉ်ကျေးသော (ကျွန်တော်/ကျွန်မ/သင်)</option>
                  <option value="intimate">ရင်းနှီးသော (မောင်/မ၊ အစ်ကို/ညီမ)</option>
                </select>
              </div>
            </div>

            {/* 3. Custom AI Prompt Instructions */}
            <div>
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5 mb-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>ထပ်ဆောင်း ညွှန်ကြားချက် (Custom AI Instructions - Optional):</span>
              </label>
              <input
                type="text"
                value={settings.customPromptNote || ''}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, customPromptNote: e.target.value })
                }
                placeholder="ဥပမာ - စာကြောင်းတိုတို သုံးပါ၊ 'OK' ကို 'အိုကေ' ဟုပြန်ပါ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 4. Gemini API Key (Optional) */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>မိမိပိုင် Gemini API Key ထည့်သွင်းရန် (Optional):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAccessCode(!showAccessCode)}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  {showAccessCode ? 'ကွယ်မည်' : 'ကြည့်မည်'}
                </button>
              </div>
              <input
                type={showAccessCode ? 'text' : 'password'}
                value={settings.customApiKey || ''}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, customApiKey: e.target.value })
                }
                placeholder="AI Studio Gemini Key ထည့်ပါ (မထည့်ပါက Server Key သုံးမည်)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Mode 2: Manual Translation Information */}
        {translationMode === 'manual' && (
          <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-3 text-indigo-400">
              <Languages className="w-6 h-6" />
              <h4 className="text-sm font-bold text-slate-100">
                ကိုယ်တိုင် ဘာသာပြန်စနစ် (Manual Subtitle Editor)
              </h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              AI မသုံးဘဲ စာတန်းထိုးများကို မိမိကိုယ်တိုင် တိုက်ရိုက် ရေးသား/ဘာသာပြန်ဆိုနိုင်ပါသည်။ အောက်ပါ လုပ်ဆောင်ချက်များကို အသုံးပြုနိုင်ပါသည်:
            </p>

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><b>စာတန်းထိုး ဇယား (Editor Table)</b> တွင် စာကြောင်း တစ်ကြောင်းချင်းစီ၏ မြန်မာဘာသာပြန်ကို တိုက်ရိုက် ရေးသားနိုင်ပါသည်။</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><b>Video Player</b> စာမျက်နှာတွင် ဗီဒီယို ကြည့်ရင်း လက်ရှိ စာကြောင်း၏ စာသားနှင့် စတင်ချိန်/ပြီးဆုံးချိန် အချိန်များကို တိုက်ရိုက် ပြင်ဆင်နိုင်ပါသည်။</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>နောက်ပိုင်းတွင် AI ဖြင့် ပြန်လည် ဘာသာပြန်လိုပါကလည်း <b>"AI ဘာသာပြန်မည်"</b> ခလုတ်ကို နှိပ်၍ အချိန်မရွေး ပြန်လည် အသုံးပြုနိုင်ပါသည်။</span>
              </li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            မလုပ်ဆောင်သေးပါ
          </button>

          {translationMode === 'ai' ? (
            <button
              type="button"
              onClick={handleConfirmAI}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>အတည်ပြုပြီး AI ဘာသာပြန်မည်</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmManual}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
            >
              <Languages className="w-4 h-4" />
              <span>ကိုယ်တိုင် ဘာသာပြန်ရန် ဇယားသို့ သွားမည်</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
