export interface SubtitleItem {
  id: number;
  index: number;
  startTime: string; // "00:01:20,500" or "00:01:20.500"
  endTime: string;
  startMs: number;
  endMs: number;
  originalText: string;
  translatedText: string;
  status: 'pending' | 'translating' | 'completed' | 'error';
  errorMessage?: string;
}

export type SubtitleFormat = 'srt' | 'vtt';

export type TranslationStyle = 'conversational' | 'literary' | 'casual';

export type ToneStyle = 'neutral' | 'polite' | 'dramatic';

export type SpeakerNameHandling = 'keep_english' | 'transliterate' | 'translate_context' | 'omit';

export type ProperNounsMode = 'keep_english' | 'myanmar_phonetic';

export type SoundEffectsHandling = 'translate' | 'keep' | 'remove';

export type HonorificStyle = 'polite' | 'intimate' | 'neutral';

export type SubtitleConciseness = 'concise' | 'full';

export interface GlossaryItem {
  id: string;
  original: string;
  target: string;
}

export interface DonationConfig {
  kpayPhone: string;
  kpayName: string;
  wavePhone: string;
  waveName: string;
  note: string;
}

export interface TranslationSettings {
  style: TranslationStyle;
  tone: ToneStyle;
  glossary: GlossaryItem[];
  batchSize: number; // default e.g. 25
  preserveTags: boolean; // e.g. <i>, <b>
  useBurmeseDigits: boolean; // 123 -> ၁၂၃
  speakerNameHandling: SpeakerNameHandling;
  properNounsMode: ProperNounsMode;
  soundEffectsHandling: SoundEffectsHandling;
  honorificStyle: HonorificStyle;
  conciseness: SubtitleConciseness;
  customPromptNote: string;
  customApiKey?: string;
  donationConfig?: DonationConfig;
}

export interface SubtitleFileMeta {
  fileName: string;
  format: SubtitleFormat;
  totalItems: number;
  durationMs: number;
}

export interface VideoConfig {
  videoUrl: string;
  isCustomVideo: boolean;
  subtitleMode: 'translated' | 'dual' | 'original';
  fontSize: number; // in px e.g. 20
  textPosition: 'bottom' | 'top' | 'middle';
  bgColor: string; // e.g. 'rgba(0,0,0,0.75)'
  textColor: string; // e.g. '#FFFFFF'
  highlightColor: string; // e.g. '#FACC15'
}

export interface TranslationBatchPayload {
  items: Array<{
    id: number;
    index: number;
    text: string;
  }>;
  apiKey?: string;
  settings: {
    style: TranslationStyle;
    tone: ToneStyle;
    glossary: Array<{ original: string; target: string }>;
    preserveTags: boolean;
    useBurmeseDigits: boolean;
    speakerNameHandling?: SpeakerNameHandling;
    properNounsMode?: ProperNounsMode;
    soundEffectsHandling?: SoundEffectsHandling;
    honorificStyle?: HonorificStyle;
    conciseness?: SubtitleConciseness;
    customPromptNote?: string;
  };
}

export interface TranslationBatchResponse {
  translations: Array<{
    id: number;
    translatedText: string;
  }>;
}
