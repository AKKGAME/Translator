import React, { useState } from 'react';
import { TranslationSettings, TranslationStyle, SpeakerNameHandling, ProperNounsMode } from '../types';
import {
  Settings,
  Play,
  X,
  Languages,
  Film,
  MessageSquare,
  BookOpen,
  Volume2,
  UserCheck,
  Globe,
  Tag,
  Plus,
  Trash2,
  Compass,
  CheckCircle2,
  RefreshCw,
  Users,
} from 'lucide-react';

interface TranslationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TranslationSettings;
  onUpdateSettings: (newSettings: TranslationSettings) => void;
  onConfirmAndTranslate: () => void;
  onAnalyzeContext?: () => Promise<void>;
  isAnalyzingContext?: boolean;
}

export const TranslationSettingsModal: React.FC<TranslationSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onConfirmAndTranslate,
  onAnalyzeContext,
  isAnalyzingContext = false,
}) => {
  const [translationMode, setTranslationMode] = useState<'ai' | 'manual'>('ai');

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
      <div className="bg-[#0e1219] border border-[#212734] rounded-lg max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#212734] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-md border border-purple-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>ဘာသာပြန် ဆက်တင်များ (Translation Settings)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                AI ဖြင့် အလိုအလျောက် ဘာသာပြန်စတိုင်နှင့် အသုံးအနှုန်း စည်းမျဉ်းများကို သတ်မှတ်ပါ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#1a202c] rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2 Main Method Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-[#07090e] p-1 rounded-md border border-[#212734]">
          <button
            type="button"
            onClick={() => setTranslationMode('ai')}
            className={`flex items-center justify-center space-x-2 py-2 px-3 rounded text-xs font-bold transition ${
              translationMode === 'ai'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>အလိုအလျောက် ဘာသာပြန်မည်</span>
          </button>

          <button
            type="button"
            onClick={() => setTranslationMode('manual')}
            className={`flex items-center justify-center space-x-2 py-2 px-3 rounded text-xs font-bold transition ${
              translationMode === 'manual'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>ကိုယ်တိုင် ဘာသာပြန်မည် (Manual Edit)</span>
          </button>
        </div>

        {/* Mode 1: AI Translation Settings */}
        {translationMode === 'ai' && (
          <div className="space-y-3.5">
            {/* 1. Deep Pre-reading Story Comprehension (ဘာသာမပြန်မီ ဇာတ်လမ်းနှင့် ဇာတ်ကောင် အရင်ဖတ်ရှု နားလည်စေခြင်း) */}
            <div className="bg-[#0b0e18] p-4 rounded-md border border-purple-500/40 space-y-3 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-purple-500/20 text-purple-300 rounded">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-200 block">
                      ဇာတ်လမ်းနှင့် ဇာတ်ကောင် ကြိုတင်ဖတ်ရှု သုံးသပ်ခြင်း (Pre-read Story Context)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ဘာသာမပြန်မီ AI အား ဇာတ်လမ်း၊ ဇာတ်ကောင် ဆက်ဆံရေးနှင့် Pronoun များကို အရင်နားလည်စေပြီးမှ ဘာသာပြန်စေမည်
                    </span>
                  </div>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.enableContextPreAnalysis !== false}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        enableContextPreAnalysis: e.target.checked,
                      })
                    }
                    className="accent-purple-500 w-4 h-4 rounded"
                  />
                  <span className="text-xs font-semibold text-purple-300">ဖွင့်ထားမည်</span>
                </label>
              </div>

              {settings.enableContextPreAnalysis !== false && (
                <div className="bg-[#070910] p-3 rounded border border-[#23273e] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-300">
                      {settings.storyContext ? (
                        <span className="flex items-center text-emerald-400 font-semibold space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ဇာတ်လမ်းကို ဖတ်ရှု သုံးသပ်ထားပြီးပါပြီ ({settings.storyContext.characters?.length || 0} characters)</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          ဘာသာပြန်စတင်ချိန်တွင် အလိုအလျောက် ဖတ်ရှုမည် (သို့မဟုတ် အခုချက်ချင်း ဖတ်ရှုနိုင်သည်)
                        </span>
                      )}
                    </div>

                    {onAnalyzeContext && (
                      <button
                        type="button"
                        onClick={onAnalyzeContext}
                        disabled={isAnalyzingContext}
                        className="px-2.5 py-1 bg-purple-600/80 hover:bg-purple-600 text-white rounded text-[11px] font-bold transition flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isAnalyzingContext ? 'animate-spin' : ''}`} />
                        <span>{isAnalyzingContext ? 'ဖတ်ရှုသုံးသပ်နေပါသည်...' : settings.storyContext ? 'ပြန်လည်ဖတ်ရှုမည်' : 'အခုချက်ချင်း ဖတ်ရှုမည်'}</span>
                      </button>
                    )}
                  </div>

                  {settings.storyContext && (
                    <div className="space-y-2 pt-1 border-t border-[#1e2236] text-[11px]">
                      <div>
                        <span className="text-slate-400 font-semibold">ဇာတ်လမ်းအကျဉ်း: </span>
                        <span className="text-slate-200">{settings.storyContext.summary}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className="bg-purple-950/70 border border-purple-800/60 px-2 py-0.5 rounded text-purple-300 font-mono">
                          Mood: {settings.storyContext.settingAndTone}
                        </span>
                        {settings.storyContext.characters?.map((c, idx) => (
                          <span
                            key={idx}
                            className="bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 rounded text-indigo-200 font-medium"
                          >
                            👤 {c.name}: <b className="text-amber-300">"{c.myanmarPronoun}"</b> ({c.roleOrGender || 'role'})
                          </span>
                        ))}
                      </div>
                      {settings.storyContext.subtitlingNotes && (
                        <div className="text-[10px] text-slate-400 italic">
                          💡 ညွှန်ကြားချက်: {settings.storyContext.subtitlingNotes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Speaker Name Handling (ဘယ်သူပြောလဲ အမည်ဖြုတ်မလား/ထားမလား) */}
            <div className="bg-[#07090e] p-4 rounded-md border border-indigo-500/30 space-y-2.5 shadow-sm">
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
                    className={`p-3 rounded-md border text-left transition flex flex-col justify-between ${
                      (settings.speakerNameHandling || 'omit') === sp.id
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-200 font-bold shadow-sm'
                        : 'bg-[#12161f] border-[#212734] text-slate-300 hover:bg-[#1a202c]'
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
                    <div className="mt-2 text-[10px] text-indigo-300/80 bg-[#07090e] px-2 py-1 rounded font-mono border border-[#212734]">
                      {sp.example}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Proper Nouns / Character Names Mode (လူအမည် / နေရာအမည် မြန်မာလိုလား Eng လား) */}
            <div className="bg-[#07090e] p-4 rounded-md border border-teal-500/30 space-y-2.5 shadow-sm">
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
                    className={`p-3 rounded-md border text-left transition flex flex-col justify-between ${
                      (settings.properNounsMode || 'myanmar_phonetic') === pn.id
                        ? 'bg-teal-500/15 border-teal-500 text-teal-200 font-bold shadow-sm'
                        : 'bg-[#12161f] border-[#212734] text-slate-300 hover:bg-[#1a202c]'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{pn.label}</span>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{pn.desc}</p>
                    </div>
                    <div className="mt-2 text-[10px] text-teal-300/80 bg-[#07090e] px-2 py-1 rounded font-mono border border-[#212734]">
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
                    className={`p-2.5 rounded-md border text-left transition ${
                      settings.style === st.id
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                        : 'bg-[#07090e] border-[#212734] text-slate-300 hover:bg-[#12161f]'
                    }`}
                  >
                    <div className="text-xs">{st.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Tone & Speaker Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#07090e] p-3.5 rounded-md border border-[#212734]">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  စကားပြော အသုံးအနှုန်း (Tone)
                </label>
                <select
                  value={settings.tone || 'neutral'}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, tone: e.target.value as any })
                  }
                  className="w-full bg-[#12161f] border border-[#212734] rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
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
                  className="w-full bg-[#12161f] border border-[#212734] rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-[#07090e] border border-[#212734] rounded-md p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Mode 2: Manual Translation Information */}
        {translationMode === 'manual' && (
          <div className="bg-[#07090e] border border-[#212734] rounded-md p-4 space-y-3.5">
            <div className="flex items-center space-x-3 text-indigo-400">
              <Languages className="w-5 h-5" />
              <h4 className="text-sm font-bold text-slate-100">
                ကိုယ်တိုင် ဘာသာပြန်စနစ် (Manual Subtitle Editor)
              </h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              AI မသုံးဘဲ စာတန်းထိုးများကို မိမိကိုယ်တိုင် တိုက်ရိုက် ရေးသား/ဘာသာပြန်ဆိုနိုင်ပါသည်။ အောက်ပါ လုပ်ဆောင်ချက်များကို အသုံးပြုနိုင်ပါသည်:
            </p>

            <ul className="space-y-2 text-xs text-slate-300">
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
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-[#212734]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-[#12161f] hover:bg-[#1a202c] border border-[#212734] text-slate-300 text-xs font-semibold transition"
          >
            ပိတ်မည်
          </button>

          {translationMode === 'ai' ? (
            <button
              type="button"
              onClick={handleConfirmAI}
              className="w-full sm:w-auto px-5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>အတည်ပြုပြီး ဘာသာပြန်မည်</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmManual}
              className="w-full sm:w-auto px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm"
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
