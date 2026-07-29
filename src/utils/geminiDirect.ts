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

export async function translateDirectlyViaGemini(
  items: SubtitleItemInput[],
  apiKey: string,
  settings: TranslationSettingsInput,
  onProgress?: (progress: number) => void
): Promise<Array<{ id: number; translatedText: string }>> {
  // Check key: custom user key OR admin default key from localStorage
  const effectiveKey =
    apiKey ||
    localStorage.getItem('admin_default_gemini_api_key') ||
    '';

  if (!effectiveKey) {
    throw new Error(
      'Gemini API Key ထည့်သွင်းပေးပါ။ (Google AI Studio မှ အခမဲ့ ရယူနိုင်ပါသည်။)'
    );
  }

  // Supported models to fallback if one model is rate-limited or unavailable
  const modelsToTry = [
    settings.model || 'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash-lite',
  ];

  // Batch size 30 items per request to reduce request count and stay within TPM/RPM limits
  const CHUNK_SIZE = 30;
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
          const waitMs = Math.min(30000, attempt * 6000);
          console.warn(`[Gemini Free Tier] Rate limit (429) hit on model ${currentModel}. Waiting ${waitMs / 1000}s...`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }

        if (!res.ok) {
          const errObj = await res.json().catch(() => ({}));
          const errMsg = errObj.error?.message || `HTTP ${res.status}`;
          if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            const waitMs = Math.min(30000, attempt * 6000);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
          throw new Error(errMsg);
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
        if (attempt >= maxAttempts) {
          throw new Error(
            `Gemini Free API Key Rate Limit: ${err.message || 'ခေတ္တစောင့်ပြီး ပြန်လည်ကြိုးစားပေးပါ'}`
          );
        }
        await new Promise((r) => setTimeout(r, 4000));
      }
    }

    // Pacing delay (3.5s) between requests for Free Tier API keys (15 RPM limit)
    if (i + CHUNK_SIZE < items.length) {
      await new Promise((r) => setTimeout(r, 3500));
    }
  }

  return results;
}
