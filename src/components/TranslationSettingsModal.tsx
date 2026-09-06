import React, { useState } from 'react';
import {
  TranslationSettings,
  TranslationStyle,
  SpeakerNameHandling,
  ProperNounsMode,
  SoundEffectsHandling,
  HonorificStyle,
  ToneStyle,
  SubtitleConciseness,
} from '../types';
import {
  Settings,
  Play,
  X,
  Film,
  MessageSquare,
  VolumeX,
  UserCheck,
  Globe,
  Sliders,
  Compass,
  CheckCircle2,
  RefreshCw,
  Sparkles,
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

interface StylePreset {
  id: string;
  name: string;
  icon: string;
  desc: string;
  settings: Partial<TranslationSettings>;
}

const PRESETS: StylePreset[] = [
  {
    id: 'cinema',
    name: 'ရုပ်ရှင် & ဇာတ်လမ်းတွဲ',
    icon: '🎬',
    desc: 'သဘာဝကျသော ပြောစကား၊ ပြောသူအမည်နှင့် ဆူညံသံများ ဖြုတ်မည်',
    settings: {
      style: 'conversational',
      speakerNameHandling: 'omit',
      properNounsMode: 'myanmar_phonetic',
      soundEffectsHandling: 'remove',
      honorificStyle: 'intimate',
      tone: 'neutral',
      conciseness: 'concise',
    },
  },
  {
    id: 'anime',
    name: 'အနိမေ & အာရှဒရာမာ',
    icon: '🌸',
    desc: 'ခံစားချက်ပါသော စကားပြော၊ ဇာတ်ကောင်စရိုက် ပေါ်လွင်စေမည်',
    settings: {
      style: 'anime',
      speakerNameHandling: 'omit',
      properNounsMode: 'myanmar_phonetic',
      soundEffectsHandling: 'remove',
      honorificStyle: 'intimate',
      tone: 'dramatic',
      conciseness: 'concise',
    },
  },
  {
    id: 'vlog',
    name: 'ဗလော့ဂ် & နေ့စဉ်သုံး',
    icon: '🎙️',
    desc: 'ပေါ့ပေါ့ပါးပါး စကားပြော၊ YouTube/ဟာသ ဗီဒီယိုများအတွက်',
    settings: {
      style: 'casual',
      speakerNameHandling: 'omit',
      properNounsMode: 'myanmar_phonetic',
      soundEffectsHandling: 'remove',
      honorificStyle: 'polite',
      tone: 'neutral',
      conciseness: 'concise',
    },
  },
  {
    id: 'docu',
    name: 'သတင်း & မှတ်တမ်းတင်',
    icon: '📚',
    desc: 'တိကျသော စာသား၊ ယဉ်ကျေးပြီး အချက်အလက်မှန်ကန်စေမည်',
    settings: {
      style: 'documentary',
      speakerNameHandling: 'keep_english',
      properNounsMode: 'keep_english',
      soundEffectsHandling: 'remove',
      honorificStyle: 'polite',
      tone: 'polite',
      conciseness: 'full',
    },
  },
  {
    id: 'classic',
    name: 'ဂန္ထဝင် စာပေဟန်',
    icon: '🏛️',
    desc: 'ရှေးခေတ်ဒရာမာနှင့် ဂန္ထဝင်စာပေဟန် ယဉ်ကျေးစကားလုံးများ',
    settings: {
      style: 'literary',
      speakerNameHandling: 'transliterate',
      properNounsMode: 'myanmar_phonetic',
      soundEffectsHandling: 'remove',
      honorificStyle: 'polite',
      tone: 'polite',
      conciseness: 'full',
    },
  },
];

export const TranslationSettingsModal: React.FC<TranslationSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onConfirmAndTranslate,
  onAnalyzeContext,
  isAnalyzingContext = false,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: StylePreset) => {
    onUpdateSettings({
      ...settings,
      ...preset.settings,
    });
  };

  const handleConfirmAI = () => {
    onClose();
    onConfirmAndTranslate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b0f17] border border-[#1f2636] rounded-xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2636] pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>ဘာသာပြန် စနစ်နှင့် စည်းမျဉ်း ဆက်တင်များ</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                မြန်မာဘာသာပြန်စတိုင်၊ စကားပြောဟန်နှင့် အသံဆူညံသံ စစ်ထုတ်မှုများကို စိတ်ကြိုက် သတ်မှတ်ပါ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#161c28] rounded-lg transition"
            title="ပိတ်မည်"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Quick Presets Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>အမြန်သုံး စတိုင်ရွေးချယ်မှုများ (1-Click Presets):</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESETS.map((p) => {
              const isSelected =
                settings.style === p.settings.style &&
                settings.speakerNameHandling === p.settings.speakerNameHandling;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200 font-bold shadow-sm ring-1 ring-purple-500/30'
                      : 'bg-[#121622] border-[#222a3d] text-slate-300 hover:bg-[#181e2e] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span className="text-base">{p.icon}</span>
                    <span className="text-xs font-semibold text-slate-100">{p.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Deep Pre-reading Story Comprehension */}
        <div className="bg-[#0e1322] p-4 rounded-xl border border-purple-500/30 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-purple-200 block">
                  ဇာတ်လမ်းနှင့် ဇာတ်ကောင် ကြိုတင်ဖတ်ရှု သုံးသပ်ခြင်း (Pre-read Story Context)
                </span>
                <span className="text-[11px] text-slate-400">
                  ဘာသာမပြန်မီ ဇာတ်ကောင် ဆက်ဆံရေးနှင့် Pronoun (ငါ/မင်း၊ ကျွန်တော်/ခင်ဗျား) များကို ဦးစွာ သုံးသပ်စေမည်
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
            <div className="bg-[#090c14] p-3 rounded-lg border border-[#1f2638] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-[11px]">
                  {settings.storyContext ? (
                    <span className="flex items-center text-emerald-400 font-semibold space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ဇာတ်လမ်းကို ဖတ်ရှုပြီးပါပြီ ({settings.storyContext.characters?.length || 0} characters)</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      ဘာသာပြန်စတင်ချိန်တွင် အလိုအလျောက် ဖတ်ရှုမည် (သို့မဟုတ် ယခု ဖတ်ရှုနိုင်သည်)
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
                    <span>{isAnalyzingContext ? 'ဖတ်ရှုနေပါသည်...' : settings.storyContext ? 'ပြန်လည်ဖတ်ရှုမည်' : 'အခုချက်ချင်း ဖတ်ရှုမည်'}</span>
                  </button>
                )}
              </div>

              {settings.storyContext && (
                <div className="space-y-1.5 pt-2 border-t border-[#181e2e] text-[11px]">
                  <div>
                    <span className="text-slate-400 font-semibold">ဇာတ်လမ်းအကျဉ်း: </span>
                    <span className="text-slate-200">{settings.storyContext.summary}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="bg-purple-950/80 border border-purple-800/60 px-2 py-0.5 rounded text-purple-300 font-mono">
                      {settings.storyContext.settingAndTone}
                    </span>
                    {settings.storyContext.characters?.map((c, idx) => (
                      <span
                        key={idx}
                        className="bg-indigo-950/80 border border-indigo-800/60 px-2 py-0.5 rounded text-indigo-200"
                      >
                        👤 {c.name}: <b className="text-amber-300">"{c.myanmarPronoun}"</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Genre / Style Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
            <Film className="w-4 h-4 text-emerald-400" />
            <span>ဇာတ်လမ်း ပုံစံ / ဘာသာပြန်စတိုင် (Genre & Style):</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'conversational', label: 'ရုပ်ရှင်/ဒရာမာ (Movie)', desc: 'သဘာဝကျသော ပြောစကားဟန်' },
              { id: 'anime', label: 'အနိမေ / ဒရာမာ (Anime/Kdrama)', desc: 'ခံစားချက်ပါသော စကားပြော' },
              { id: 'casual', label: 'ပေါ့ပေါ့ပါးပါး (Casual Vlog)', desc: 'နေ့စဉ်သုံး စကားပြော' },
              { id: 'documentary', label: 'သတင်း/မှတ်တမ်းတင် (Documentary)', desc: 'တိကျသော တရားဝင် စာသား' },
              { id: 'literary', label: 'စာပေဟန် (Formal Literature)', desc: 'ဂန္ထဝင် ယဉ်ကျေးစာပေဟန်' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, style: st.id as TranslationStyle })}
                className={`p-2.5 rounded-lg border text-left transition ${
                  (settings.style || 'conversational') === st.id
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                    : 'bg-[#121622] border-[#222a3d] text-slate-300 hover:bg-[#181e2e]'
                }`}
              >
                <div className="text-xs">{st.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{st.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Speaker Names & Audio Noise Filtering */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Speaker Names */}
          <div className="bg-[#0e1322] p-3.5 rounded-xl border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <span>ပြောသူအမည် (Speaker Names)</span>
              </label>
            </div>
            <select
              value={settings.speakerNameHandling || 'omit'}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  speakerNameHandling: e.target.value as SpeakerNameHandling,
                })
              }
              className="w-full bg-[#080b12] border border-[#222a3d] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="omit">အမည် ဖြုတ်မည် (Remove) - အကြံပြုချက်</option>
              <option value="transliterate">မြန်မာအသံထွက် (JOHN &rarr; ဂျွန်:)</option>
              <option value="keep_english">အင်္ဂလိပ် မူရင်းအတိုင်း ထားမည် (JOHN:)</option>
              <option value="translate_context">ရာထူး/အဆင့် မြန်မာပြန်မည် (CAPTAIN &rarr; ကပ္ပတိန်:)</option>
            </select>
            <p className="text-[10px] text-slate-400 leading-snug">
              ပြောသူအမည်ကို ဖြုတ်ထားပါက စာတန်းထိုး ရှင်းလင်းပြီး မျက်နှာပြင်ပေါ်တွင် ဖတ်ရပိုမို သက်သောင့်သက်သာ ဖြစ်စေပါသည်
            </p>
          </div>

          {/* Sound Effects & Audio Noise */}
          <div className="bg-[#0e1322] p-3.5 rounded-xl border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-rose-300 flex items-center space-x-1.5">
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span>အသံဆူညံဖော်ပြချက် (Sound Noise)</span>
              </label>
            </div>
            <select
              value={settings.soundEffectsHandling || 'remove'}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  soundEffectsHandling: e.target.value as SoundEffectsHandling,
                })
              }
              className="w-full bg-[#080b12] border border-[#222a3d] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="remove">အသံဆူညံသံများ ဖြုတ်မည် (Remove) - အကြံပြုချက်</option>
              <option value="translate">မြန်မာလို ဘာသာပြန်မည် ([Music] &rarr; [တေးဂီတ])</option>
              <option value="keep">အင်္ဂလိပ် မူရင်းအတိုင်း ထားမည် ([Music])</option>
            </select>
            <p className="text-[10px] text-slate-400 leading-snug">
              (pant), (sighs), [cheering], &quot;ဟောဟဲ&quot; စသော အသံဖော်ပြချက်များကို စစ်ထုတ်ဖယ်ရှားပေးပါသည်
            </p>
          </div>
        </div>

        {/* 5. Character Names & Tone Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Proper Nouns */}
          <div className="bg-[#0e1322] p-3.5 rounded-xl border border-teal-500/30 space-y-2">
            <label className="text-xs font-bold text-teal-300 flex items-center space-x-1.5">
              <Globe className="w-4 h-4 text-teal-400" />
              <span>ဇာတ်ကောင်နှင့် နေရာအမည်များ</span>
            </label>
            <select
              value={settings.properNounsMode || 'myanmar_phonetic'}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  properNounsMode: e.target.value as ProperNounsMode,
                })
              }
              className="w-full bg-[#080b12] border border-[#222a3d] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="myanmar_phonetic">မြန်မာအသံထွက်ဖြင့် ပြန်မည် (Harry &rarr; ဟယ်ရီ)</option>
              <option value="keep_english">အင်္ဂလိပ် မူရင်းအတိုင်း ထားမည် (Harry &rarr; Harry)</option>
            </select>
          </div>

          {/* Tone & Honorifics */}
          <div className="bg-[#0e1322] p-3.5 rounded-xl border border-sky-500/30 space-y-2">
            <label className="text-xs font-bold text-sky-300 flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>စကားပြောဟန်နှင့် နာမ်စား (Tone & Pronouns)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={settings.tone || 'neutral'}
                onChange={(e) => onUpdateSettings({ ...settings, tone: e.target.value as ToneStyle })}
                className="w-full bg-[#080b12] border border-[#222a3d] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="neutral">သဘာဝ စကားပြော</option>
                <option value="polite">ယဉ်ကျေးသော စကားပြော</option>
                <option value="dramatic">ဒရာမာ အလေးထားဟန်</option>
              </select>

              <select
                value={settings.honorificStyle || 'polite'}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, honorificStyle: e.target.value as HonorificStyle })
                }
                className="w-full bg-[#080b12] border border-[#222a3d] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="intimate">ရင်းနှီးသော (ငါ/မင်း/နင်)</option>
                <option value="polite">ယဉ်ကျေးသော (ကျွန်တော်/ရှင်)</option>
                <option value="neutral">ကြားနေ (သူ/မိမိ)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 6. Custom AI Instructions */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span>ထပ်ဆောင်း ညွှန်ကြားချက် (Custom AI Instructions - Optional):</span>
          </label>
          <input
            type="text"
            value={settings.customPromptNote || ''}
            onChange={(e) => onUpdateSettings({ ...settings, customPromptNote: e.target.value })}
            placeholder="ဥပမာ - စာကြောင်းတိုတို သုံးပါ၊ 'OK' ကို 'ဟုတ်ကဲ့' ဟု ပြန်ပေးပါ..."
            className="w-full bg-[#080b12] border border-[#222a3d] rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* 7. Advanced Options Accordion */}
        <div className="border-t border-[#1f2636] pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center space-x-1 transition"
          >
            <span>{showAdvanced ? '▼' : '▶'} အဆင့်မြင့် ချိန်ညှိမှုများ (Batch Size & Formatting)</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#080b12] p-3.5 rounded-xl border border-[#1f2636]">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  တစ်ကြိမ်ပို့ စာကြောင်းရေ (Batch Size)
                </label>
                <select
                  value={settings.batchSize || 25}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, batchSize: Number(e.target.value) })
                  }
                  className="w-full bg-[#121622] border border-[#222a3d] rounded-lg p-2 text-xs text-slate-200"
                >
                  <option value={15}>15 ကြောင်း (ပိုမိုတိကျစေသည်)</option>
                  <option value={25}>25 ကြောင်း (စံနှုန်းအကြံပြုချက်)</option>
                  <option value={35}>35 ကြောင်း (ပိုမိုမြန်ဆန်သည်)</option>
                  <option value={50}>50 ကြောင်း (အမြန်ဆုံး)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  စာကြောင်း အရှည်အကျဉ်း (Conciseness)
                </label>
                <select
                  value={settings.conciseness || 'concise'}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, conciseness: e.target.value as SubtitleConciseness })
                  }
                  className="w-full bg-[#121622] border border-[#222a3d] rounded-lg p-2 text-xs text-slate-200"
                >
                  <option value="concise">တိုတိုနှင့် ဖတ်လွယ်ခြင်း (Concise)</option>
                  <option value="full">အပြည့်အစုံ ဘာသာပြန်ခြင်း (Full)</option>
                </select>
              </div>

              <div className="flex flex-col justify-center space-y-2 pt-2">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.useBurmeseDigits)}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, useBurmeseDigits: e.target.checked })
                    }
                    className="accent-purple-500 rounded"
                  />
                  <span>မြန်မာဂဏန်း ပြောင်းမည် (၁, ၂, ၃)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.preserveTags !== false}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, preserveTags: e.target.checked })
                    }
                    className="accent-purple-500 rounded"
                  />
                  <span>Formatting Tags (&lt;i&gt;, &lt;b&gt;) ထိန်းမည်</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-[#1f2636]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#141926] hover:bg-[#1a2234] border border-[#222a3d] text-slate-300 text-xs font-semibold transition"
          >
            ပိတ်မည်
          </button>

          <button
            type="button"
            onClick={handleConfirmAI}
            className="w-full sm:w-auto px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition flex items-center justify-center space-x-2 shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>အတည်ပြုပြီး ဘာသာပြန်မည်</span>
          </button>
        </div>
      </div>
    </div>
  );
};
