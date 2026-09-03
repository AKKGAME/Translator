import { AccessKeyItem, UsageConfig, UserAccessStatus } from '../types';

export const DEFAULT_USAGE_CONFIG: UsageConfig = {
  freeTierDailyLimit: 50, // 50 lines / day for free tier users
  requireAccessKey: false,
  allowCustomApiKey: true,
  adminDefaultGeminiKey: '',
  announcementNotice: '',
  accessKeys: [
    {
      id: 'demo-vip-1',
      code: 'AG-VIP-PREMIUM',
      label: 'VIP Unlimited Demo Key',
      maxLines: 0, // 0 = unlimited
      usedLines: 0,
      expiresAt: null, // lifetime
      createdAt: new Date().toISOString(),
      status: 'active',
      note: 'စနစ်စတင်ချိန် အစမ်းသုံးနိုင်သော VIP Key',
    },
  ],
};

const STORAGE_KEY_USAGE_CONFIG = 'ag_usage_config';
const STORAGE_KEY_USER_ACCESS_CODE = 'ag_user_access_code';
const STORAGE_KEY_DAILY_USAGE = 'ag_daily_free_usage';

/**
 * Get current date key YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Get current user's free usage for today
 */
export function getFreeUsageToday(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DAILY_USAGE);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed.date === getTodayDateString()) {
      return Number(parsed.count) || 0;
    }
  } catch (e) {
    // ignore
  }
  return 0;
}

/**
 * Increment user's free usage for today
 */
export function incrementFreeUsageToday(linesCount: number): number {
  if (typeof window === 'undefined' || linesCount <= 0) return 0;
  try {
    const today = getTodayDateString();
    const current = getFreeUsageToday();
    const newCount = current + linesCount;
    localStorage.setItem(
      STORAGE_KEY_DAILY_USAGE,
      JSON.stringify({ date: today, count: newCount })
    );
    return newCount;
  } catch (e) {
    return 0;
  }
}

/**
 * Get saved Access Code from LocalStorage
 */
export function getSavedAccessCode(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem(STORAGE_KEY_USER_ACCESS_CODE) || '').trim();
}

/**
 * Save Access Code to LocalStorage
 */
export function setSavedAccessCode(code: string) {
  if (typeof window === 'undefined') return;
  if (!code || !code.trim()) {
    localStorage.removeItem(STORAGE_KEY_USER_ACCESS_CODE);
  } else {
    localStorage.setItem(STORAGE_KEY_USER_ACCESS_CODE, code.trim().toUpperCase());
  }
}

/**
 * Get Usage Config from LocalStorage or Default
 */
export function getLocalUsageConfig(): UsageConfig {
  if (typeof window === 'undefined') return DEFAULT_USAGE_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USAGE_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.accessKeys)) {
        return { ...DEFAULT_USAGE_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_USAGE_CONFIG;
}

/**
 * Save Usage Config to LocalStorage
 */
export function saveLocalUsageConfig(config: UsageConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_USAGE_CONFIG, JSON.stringify(config));
  } catch (e) {
    // ignore
  }
}

/**
 * Generate a random formatted Access Key (e.g. AG-VIP-8842 or ANIME-7931)
 */
export function generateRandomAccessKey(prefix: string = 'AG-VIP'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix.toUpperCase()}-${randomPart}`;
}

/**
 * Validate an Access Key locally against the config
 */
export function validateAccessKeyLocally(
  code: string,
  config: UsageConfig = getLocalUsageConfig()
): { valid: boolean; keyItem?: AccessKeyItem; error?: string } {
  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) {
    return { valid: false, error: 'Access Key ထည့်သွင်းပေးပါ' };
  }

  const found = config.accessKeys.find(
    (k) => k.code.trim().toUpperCase() === normalized
  );

  if (!found) {
    return { valid: false, error: 'ထည့်သွင်းထားသော Access Key မတွေ့ရှိပါ သို့မဟုတ် မမှန်ကန်ပါ' };
  }

  if (found.status === 'revoked') {
    return { valid: false, error: 'ဤ Access Key ကို Admin မှ ပယ်ဖျက် (Revoke) ထားပါသည်' };
  }

  if (found.expiresAt) {
    const expDate = new Date(found.expiresAt).getTime();
    if (Date.now() > expDate) {
      return { valid: false, error: 'ဤ Access Key သည် သက်တမ်းကုန်ဆုံးသွားပါပြီ (Expired)' };
    }
  }

  if (found.maxLines > 0 && found.usedLines >= found.maxLines) {
    return {
      valid: false,
      error: `ဤ Key ၏ သတ်မှတ်စာကြောင်းရေ (${found.maxLines.toLocaleString()} ကြောင်း) အားလုံး ပြည့်သွားပါပြီ`,
    };
  }

  return { valid: true, keyItem: found };
}

/**
 * Determine overall User Access Status (Free vs VIP vs Custom Key)
 */
export function evaluateUserAccessStatus(
  customApiKey: string = '',
  accessCode: string = '',
  config: UsageConfig = getLocalUsageConfig()
): UserAccessStatus {
  const hasCustomKey = Boolean(customApiKey && customApiKey.trim().length > 10);
  if (hasCustomKey) {
    return {
      tier: 'custom_key',
      freeUsedToday: 0,
      freeDailyLimit: 999999,
      remainingFreeLines: 999999,
      canTranslate: true,
      message: 'ကိုယ်ပိုင် Google Gemini API Key ဖြင့် ကန့်သတ်ချက်မရှိ သုံးစွဲနေပါသည်',
    };
  }

  const codeToTest = (accessCode || getSavedAccessCode()).trim().toUpperCase();
  if (codeToTest) {
    const valResult = validateAccessKeyLocally(codeToTest, config);
    if (valResult.valid && valResult.keyItem) {
      const k = valResult.keyItem;
      const remaining = k.maxLines > 0 ? Math.max(0, k.maxLines - k.usedLines) : 999999;
      return {
        tier: 'vip',
        activeKey: k,
        freeUsedToday: 0,
        freeDailyLimit: k.maxLines,
        remainingFreeLines: remaining,
        canTranslate: remaining > 0,
        message: `VIP Key (${k.code}) ဖြင့် အသုံးပြုနေပါသည် (လက်ကျန်: ${k.maxLines > 0 ? remaining.toLocaleString() + ' ကြောင်း' : 'အကန့်အသတ်မရှိ'})`,
      };
    }
  }

  // Free tier
  const freeLimit = config.freeTierDailyLimit ?? 50;
  const usedToday = getFreeUsageToday();
  const remaining = Math.max(0, freeLimit - usedToday);

  if (config.requireAccessKey) {
    return {
      tier: 'free',
      freeUsedToday: usedToday,
      freeDailyLimit: 0,
      remainingFreeLines: 0,
      canTranslate: false,
      message: 'စနစ်ကို အသုံးပြုရန် VIP Access Key သို့မဟုတ် ကိုယ်ပိုင် Gemini API Key လိုအပ်ပါသည်',
    };
  }

  return {
    tier: 'free',
    freeUsedToday: usedToday,
    freeDailyLimit: freeLimit,
    remainingFreeLines: remaining,
    canTranslate: remaining > 0,
    message: `Free Tier: ယနေ့အတွက် လက်ကျန် ${remaining}/${freeLimit} ကြောင်း သုံးစွဲနိုင်ပါသည်`,
  };
}
