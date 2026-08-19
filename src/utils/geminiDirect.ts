/**
 * Client-side direct Gemini API caller for Static Web Hosting (e.g., Hostinger public_html)
 * and direct browser usage with Free / Paid Gemini API keys.
 */

interface SubtitleItemInput {
  id: number;
  text: string;
}

interface TranslationSettingsInput {
  model?: string;
  customApiKey?: string;
  translationStyle?: string;
  customPromptNote?: string;
  style?: string;
  tone?: string;
  honorificLevel?: string;
}

/**
 * Validates whether a Gemini API key is functional
 */
export async function testGeminiApiKey(apiKey: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const keyToTest = apiKey?.trim();
  if (!keyToTest) {
    return { success: false, error: 'API Key မထည့်သွင်းရသေးပါ' };
  }

  const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  for (const model of modelsToTest) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(keyToTest)}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, reply with 1 word: OK' }] }],
        }),
      });

      if (res.ok) {
        return { success: true, message: `API Key မှန်ကန်စွာ အလုပ်လုပ်ပါသည် (${model})` };
      }

      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${res.status}`;

      if (res.status === 400 && errMsg.includes('API_KEY_INVALID')) {
        return { success: false, error: 'ထည့်သွင်းထားသော Gemini API Key မှားယွင်းနေပါသည်' };
      }
      if (res.status === 429 || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        return { success: false, error: 'API Key အသုံးပြုမှု ပမာဏ (Quota / Rate Limit) ပြည့်နေပါသည်' };
      }
    } catch (err: any) {
      console.warn(`Test key with model ${model} failed:`, err);
    }
  }

  return { success: false, error: 'Gemini API သို့ ချိတ်ဆက်၍ မရပါ (Key သို့မဟုတ် Network စစ်ဆေးပါ)' };
}

export async function translateDirectlyViaGemini(
  items: SubtitleItemInput[],
  apiKey: string,
  settings: TranslationSettingsInput,
  onProgress?: (progress: number) => void
): Promise<Array<{ id: number; translatedText: string }>> {
  // Check key: custom user key OR admin default key from localStorage
  const effectiveKey =
    apiKey?.trim() ||
    localStorage.getItem('user_gemini_api_key') ||
    localStorage.getItem('admin_default_gemini_api_key') ||
    '';

  if (!effectiveKey) {
    throw new Error(
      'Gemini API Key ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။ (Google AI Studio မှ အခမဲ့ ရယူနိုင်ပါသည်)'
    );
  }

  // Supported models to fallback if one model is rate-limited or unavailable
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  // Batch size 25 items per request to reduce request count and stay within TPM/RPM limits
  const CHUNK_SIZE = 25;
  const results: Array<{ id: number; translatedText: string }> = [];

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    let promptText = `You are a master film & video subtitle translator into natural spoken Myanmar (Burmese).
Translate the following subtitle items into natural spoken Myanmar dialogue:
${JSON.stringify(chunk)}

CRITICAL RULES:
1. Translate into natural spoken Myanmar (မြန်မာစကားပြော) as used in movie subtitling. Avoid stiff written particles (သည်, ပါသည်).
2. Omit panting/sighing sounds (e.g. "pant", "sigh", "ဟောဟဲ"). Output empty string "" if the line is purely noise.
3. Keep speaker names in English or transliterate naturally.
4. Return ONLY a valid JSON object with format: { "translations": [ { "id": 1, "translatedText": "..." } ] }`;

    if (settings.style) {
      promptText += `\nStyle Guideline: ${settings.style}`;
    }
    if (settings.customPromptNote) {
      promptText += `\nAdditional Custom Instruction: ${settings.customPromptNote}`;
    }

    let success = false;
    let attempt = 0;
    const maxAttempts = 6;
    let lastErrorMsg = '';

    while (!success && attempt < maxAttempts) {
      attempt++;
      const currentModel = modelsToTry[(attempt - 1) % modelsToTry.length];

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          currentModel
        )}:generateContent?key=${encodeURIComponent(effectiveKey)}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.25,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (res.status === 429) {
          // Free Tier Rate limit backoff
          const waitMs = Math.min(25000, attempt * 5000);
          console.warn(`[Gemini Free Tier] Rate limit (429) hit on model ${currentModel}. Waiting ${waitMs / 1000}s...`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }

        if (!res.ok) {
          const errObj = await res.json().catch(() => ({}));
          const errMsg = errObj.error?.message || `HTTP ${res.status}`;
          lastErrorMsg = errMsg;
          if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            const waitMs = Math.min(25000, attempt * 5000);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
          // If model not found or bad request on this model, continue to next model
          console.warn(`[Gemini Direct] Model ${currentModel} returned ${errMsg}. Trying next model...`);
          continue;
        }

        const data = await res.json();
        const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        let cleanJson = textOut.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleanJson);
        const translatedList: Array<{ id: number; translatedText: string }> =
          parsed.translations || [];

        results.push(...translatedList);
        success = true;

        if (onProgress) {
          const currentCount = Math.min(items.length, i + CHUNK_SIZE);
          onProgress(Math.round((currentCount / items.length) * 100));
        }
      } catch (err: any) {
        lastErrorMsg = err.message || '';
        if (attempt >= maxAttempts) {
          throw new Error(
            `Gemini API Error: ${err.message || lastErrorMsg || 'ခေတ္တစောင့်ပြီး ပြန်လည်ကြိုးစားပေးပါ'}`
          );
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    if (!success) {
      throw new Error(`Gemini API ဘာသာပြန်ခြင်း မအောင်မြင်ပါ: ${lastErrorMsg || 'API Key စစ်ဆေးပေးပါ'}`);
    }

    // Pacing delay (2.5s) between requests for Free Tier API keys (15 RPM limit)
    if (i + CHUNK_SIZE < items.length) {
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  return results;
}
