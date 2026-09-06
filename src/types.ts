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

export type TranslationStyle = 'conversational' | 'anime' | 'casual' | 'documentary' | 'literary';

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

export interface TelegramConfig {
  botToken: string;
  channelId: string;
  enabled: boolean;
  captionTemplate?: string;
  sendOnDownload: boolean;
}

export interface AccessKeyItem {
  id: string;
  code: string; // e.g. "AG-VIP-8892"
  label: string; // e.g. "User: Ko Aung (VIP)"
  maxLines: number; // total quota in lines (0 = unlimited)
  usedLines: number; // lines translated so far
  expiresAt: string | null; // ISO string or null for lifetime
  createdAt: string;
  status: 'active' | 'revoked' | 'expired';
  note?: string;
}

export interface GeminiKeyPoolItem {
  id: string;
  key: string; // API key string (or masked in client)
  label: string;
  status: 'active' | 'cooldown' | 'disabled' | 'error';
  cooldownUntil?: number | null;
  cooldownRemainingSeconds?: number;
  successCount: number;
  errorCount: number;
  usedLines?: number;
  todayUsedLines?: number;
  totalCalls?: number;
  lastUsedAt?: string | null;
  lastErrorMsg?: string | null;
  createdAt: string;
  currentRpm?: number;
  todayRequests?: number;
  remainingDaily?: number;
  estimatedRemainingLines?: number;
  lastLatencyMs?: number;
  rateLimitStatus?: string;
  verifiedModel?: string;
}

export interface UsageConfig {
  freeTierDailyLimit: number; // default e.g. 50 lines / day
  requireAccessKey: boolean; // if true, user MUST have a VIP key or their own Gemini API key
  allowCustomApiKey: boolean; // allow users to bypass limit by entering their own free Gemini API key
  adminDefaultGeminiKey?: string; // system-level gemini key provided by admin
  geminiKeyPool?: GeminiKeyPoolItem[]; // Multi-Key Pool
  loadBalancingStrategy?: 'round_robin' | 'least_used' | 'random';
  announcementNotice?: string; // optional banner for users
  contactTelegram?: string;
  accessKeys: AccessKeyItem[];
}

export interface UserAccessStatus {
  tier: 'free' | 'vip' | 'custom_key';
  activeKey?: AccessKeyItem;
  freeUsedToday: number;
  freeDailyLimit: number;
  remainingFreeLines: number;
  canTranslate: boolean;
  message?: string;
}

export interface StoryCharacter {
  name: string;
  roleOrGender?: string;
  myanmarPronoun?: string; // e.g. ငါ/မင်း, ကျွန်တော်/ခင်ဗျား, အစ်ကို/ညီ
  relationshipWithOthers?: string;
}

export interface StoryKeyTerm {
  term: string;
  suggestedTranslation: string;
}

export interface StoryContextAnalysis {
  summary: string; // Brief overview of the scene/dialogue context
  characters: StoryCharacter[];
  settingAndTone: string; // e.g. "School drama, playful banter between close friends"
  keyTerminology?: StoryKeyTerm[];
  subtitlingNotes?: string; // e.g. "Use intimate pronouns (ငါ/မင်း) for Hiro and Ken, polite (ရှင်/ကျွန်တော်) with teacher"
  analyzedLinesCount?: number;
  analyzedAt?: number;
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
  enableContextPreAnalysis: boolean; // Pre-read whole context before translating to avoid mistakes
  storyContext?: StoryContextAnalysis | null;
  customApiKey?: string;
  customApiKeys?: Array<{ id: string; key: string; label?: string; projectName?: string }>;
  accessCode?: string; // VIP Access Code
  donationConfig?: DonationConfig;
  telegramConfig?: TelegramConfig;
  usageConfig?: UsageConfig;
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
