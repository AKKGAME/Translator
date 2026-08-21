import React, { useState } from 'react';
import { TranslationSettings, TranslationStyle, SpeakerNameHandling, ProperNounsMode } from '../types';
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
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Globe,
  Tag,
} from 'lucide-react';
import { testGeminiApiKey } from '../utils/geminiDirect';

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
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleStyleChange = (style: TranslationStyle) => {
    onUpdateSettings({ ...settings, style });
  };

  const handleTestApiKey = async () => {
    const keyToTest = settings.customApiKey?.trim();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'ကျေးဇူးပြု၍ Gemini API Key အရင် ထည့်သွင်းပေးပါ',
      });
      return;
    }

    setIsTestingKey(true);
    setTestResult(null);

    try {
      // First try server verification endpoint
      const res = await fetch('/api/verify-gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setTestResult({
          success: true,
          message: data.message || 'Gemini API Key မှန်ကန်စွာ ချိတ်ဆက်ပြီးပါပြီ!',
        });
      } else {
        // Fallback to direct client-side test
        const directRes = await testGeminiApiKey(keyToTest);
        if (directRes.success) {
          setTestResult({
            success: true,
            message: directRes.message || 'Gemini API Key မှန်ကန်စွာ ချိတ်ဆက်ပြီးပါပြီ!',
          });
        } else {
          setTestResult({
            success: false,
            message: directRes.error || 'API Key မှားယွင်းနေပါသည်',
          });
        }
      }
    } catch (err: any) {
      // Direct client test fallback
      const directRes = await testGeminiApiKey(keyToTest);
      if (directRes.success) {
        setTestResult({
          success: true,
          message: directRes.message || 'Gemini API Key မှန်ကန်စွာ ချိတ်ဆက်ပြီးပါပြီ!',
        });
      } else {
        setTestResult({
          success: false,
          message: directRes.error || err.message || 'API Key စစ်ဆေး၍ မရပါ',
        });
      }
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleConfirmAI = () => {
    onClose();
    onConfirmAndTranslate();
  };

  const handleConfirmManual = () => {
    onClose();
  };

  const hasApiKey = Boolean(settings.customApiKey && settings.customApiKey.trim().length > 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>ဘာသာပြန် ဆက်တင်များ (Translation Settings)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                AI ဖြင့် အလိုအလျောက် ဘာသာပြန်မည် သို့မဟုတ် ကိုယ်တိုင် ပြင်ဆင်မည်ကို ရွေးချယ်ပါ
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

        {/* 2 Main Method Selector Tabs */}
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
            {/* 1. Gemini API Key Input (Prominent & First) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <label className="text-xs font-bold text-slate-100">
                    မိမိ၏ Gemini API Key (အခမဲ့ ရယူနိုင်ပါသည်)
                  </label>
                </div>
                {hasApiKey ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30 flex items-center space-x-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Key ထည့်သွင်းထားပြီး</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span>Key လိုအပ်ပါသည်</span>
                  </span>
                )}
              </div>

              <div className="relative flex items-center">
                <input
                  type={showAccessCode ? 'text' : 'password'}
                  value={settings.customApiKey || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateSettings({ ...settings, customApiKey: val });
                    setTestResult(null);
                  }}
                  placeholder="AIzaSy... (Google AI Studio Gemini API Key ထည့်ပါ)"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-3 pr-20 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none"
                />
                <div className="absolute right-2 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowAccessCode(!showAccessCode)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition"
                    title={showAccessCode ? 'ကွယ်မည်' : 'ကြည့်မည်'}
                  >
                    {showAccessCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestApiKey}
                    disabled={isTestingKey || !settings.customApiKey?.trim()}
                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold transition disabled:opacity-40 disabled:pointer-events-none flex items-center space-x-1"
                  >
                    {isTestingKey ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                        <span>စစ်ဆေးနေ...</span>
                      </>
                    ) : (
                      <span>စစ်ဆေးမည်</span>
                    )}
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 border ${
                    testResult.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 pt-1 gap-2 border-t border-slate-800/80">
                <span>Google AI Studio တွင် အခမဲ့ (Free API Key) ရယူနိုင်ပါသည်:</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-bold underline whitespace-nowrap"
                >
                  <span>API Key ရယူရန် (aistudio.google.com)</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </div>
            </div>

            {/* 2. Speaker Name Handling (ဘယ်သူပြောလဲ အမည်ဖြုတ်မလား/ထားမလား) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <span>ပြောသူအမည်များ ကိုင်တွယ်ပုံ (Speaker Names in Subtitles):</span>
                </label>
                <span className="text-[10px] text-slate-400">ဥပမာ - [JOHN]: Hello / ANNOUNCER: Welcome</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'omit',
                    label: 'အမည် ဖြုတ်မည် (Remove)',
                    desc: 'ပြောသူအမည်ကို ဖယ်ရှားပြီး စကားပြောသီးသန့်သာ ပြန်မည်',
                    example: '[JOHN]: Hello -> မင်္ဂလာပါ',
                    badge: 'အကြံပြုချက်',
                  },
                  {
                    id: 'transliterate',
                    label: 'မြန်မာသံထွက် (Phonetic)',
                    desc: 'ပြောသူအမည်ကို မြန်မာစာလုံးဖြင့် ပြောင်းမည်',
                    example: 'JOHN: Hello -> ဂျွန်: မင်္ဂလာပါ',
                  },
                  {
                    id: 'keep_english',
                    label: 'အင်္ဂလိပ် မူရင်း (Keep Eng)',
                    desc: 'ပြောသူအမည်ကို အင်္ဂလိပ်စာလုံးအတိုင်း မူရင်းထားမည်',
                    example: 'JOHN: Hello -> JOHN: မင်္ဂလာပါ',
                  },
                ].map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        speakerNameHandling: sp.id as SpeakerNameHandling,
                      })
                    }
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      (settings.speakerNameHandling || 'omit') === sp.id
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-200 font-bold shadow-sm'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{sp.label}</span>
                        {sp.badge && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-semibold">
                            {sp.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{sp.desc}</p>
                    </div>
                    <div className="mt-2 text-[10px] text-indigo-300/80 bg-slate-950/80 px-2 py-1 rounded font-mono border border-slate-800">
                      {sp.example}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Proper Nouns / Character Names Mode (လူအမည် / နေရာအမည် မြန်မာလိုလား Eng လား) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-teal-500/30 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-teal-300 flex items-center space-x-1.5">
                  <Globe className="w-4 h-4 text-teal-400" />
                  <span>လူအမည် / နေရာအမည်များ (Character & Place Names):</span>
                </label>
                <span className="text-[10px] text-slate-400">ဇာတ်ကောင်အမည်နှင့် မြို့/နေရာအမည်များ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    id: 'myanmar_phonetic',
                    label: 'မြန်မာအသံထွက်ဖြင့် ပြန်မည် (Myanmar Phonetics)',
                    desc: 'နာမည်များကို သဘာဝကျသော မြန်မာအသံထွက်ဖြင့် ပြောင်းလဲရေးသားမည်',
                    example: 'Harry Potter -> ဟယ်ရီပေါ်တာ၊ Tokyo -> တိုကျို',
                  },
                  {
                    id: 'keep_english',
                    label: 'အင်္ဂလိပ် မူရင်းအတိုင်း ထားမည် (Keep English Names)',
                    desc: 'လူအမည်နှင့် နေရာအမည်များကို English စာလုံး မူရင်းအတိုင်း ဆက်ထားမည်',
                    example: 'Harry Potter -> Harry Potter၊ Tokyo -> Tokyo',
                  },
                ].map((pn) => (
                  <button
                    key={pn.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        properNounsMode: pn.id as ProperNounsMode,
                      })
                    }
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      (settings.properNounsMode || 'myanmar_phonetic') === pn.id
                        ? 'bg-teal-500/15 border-teal-500 text-teal-200 font-bold shadow-sm'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{pn.label}</span>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{pn.desc}</p>
                    </div>
                    <div className="mt-2 text-[10px] text-teal-300/80 bg-slate-950/80 px-2 py-1 rounded font-mono border border-slate-800">
                      {pn.example}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Genre / Style Selection */}
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

            {/* 5. Tone & Speaker Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  စကားပြော အသုံးအနှုန်း (Tone)
                </label>
                <select
                  value={settings.tone || 'neutral'}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, tone: e.target.value as any })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="neutral">သဘာဝကျသော မြန်မာစကားပြော (Spoken)</option>
                  <option value="polite">ယဉ်ကျေးသော စကားပြော (Polite Spoken)</option>
                  <option value="dramatic">ရုပ်ရှင်ဆန်သော ဒရာမာဟန် (Cinematic Dramatic)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  နာမ်စား သုံးစွဲမှု (Honorifics / Pronouns)
                </label>
                <select
                  value={settings.honorificStyle || 'polite'}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, honorificStyle: e.target.value as any })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="polite">ယဉ်ကျေးသော (ကျွန်တော်/ကျွန်မ/သင်/ပါသည်)</option>
                  <option value="intimate">ရင်းနှီးသော (မောင်/မ၊ အစ်ကို/ညီမ၊ ငါ/နင်)</option>
                  <option value="neutral">ကြားနေ (သူ/မိမိ)</option>
                </select>
              </div>
            </div>

            {/* 6. Custom AI Prompt Instructions */}
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
            ပိတ်မည်
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
