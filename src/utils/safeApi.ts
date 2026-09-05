/**
 * Safe API response parsing helper
 * Prevents "Unexpected token 'A', 'A server e'... is not valid JSON" crashes
 * when a hosting platform (like Vercel / Nginx) returns HTML or plain text error pages.
 */

export interface SafeApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

export async function safeParseJson<T = any>(
  res: Response,
  defaultErrorMsg = 'ဆာဗာ တုံ့ပြန်မှု မမှန်ကန်ပါ'
): Promise<SafeApiResponse<T>> {
  let text = '';
  try {
    text = await res.text();
  } catch {
    return {
      ok: false,
      status: res.status,
      data: {} as T,
      error: 'ကွန်ရက် သို့မဟုတ် ဆာဗာ ချိတ်ဆက်မှု မအောင်မြင်ပါ',
    };
  }

  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        ok: res.ok,
        status: res.status,
        data: parsed as T,
        error: res.ok ? undefined : (parsed && parsed.error) || `ဆာဗာ အမှားအယွင်း ဖြစ်ပေါ်နေပါသည် (${res.status})`,
      };
    } catch {
      // fallback below
    }
  }

  // Server returned HTML or plain-text error (e.g. Vercel 500 "A server error has occurred")
  let friendlyError = defaultErrorMsg;
  if (res.status === 404) {
    friendlyError = 'API လမ်းကြောင်း ရှာမတွေ့ပါ (404 Not Found)';
  } else if (res.status === 401) {
    friendlyError = 'စကားဝှက် မှားယွင်းနေပါသည် (Unauthorized)';
  } else if (res.status === 403) {
    friendlyError = 'အသုံးပြုခွင့် ကန့်သတ်ချက် ပြည့်သွားပါပြီ (Forbidden)';
  } else if (res.status === 429) {
    friendlyError = 'တောင်းဆိုမှု အကြိမ်ရေများလွန်းနေပါသည် (ခေတ္တစောင့်ပြီး ပြန်လည်ကြိုးစားပါ)';
  } else if (res.status >= 500) {
    friendlyError = `ဆာဗာ ချို့ယွင်းချက် ဖြစ်ပေါ်နေပါသည် (Server Error ${res.status})`;
  } else if (trimmed.length > 0 && trimmed.length < 120 && !trimmed.startsWith('<')) {
    friendlyError = trimmed;
  }

  return {
    ok: false,
    status: res.status,
    data: {} as T,
    error: friendlyError,
  };
}
