/**
 * Client-side direct Gemini API caller for Static Web Hosting (e.g., Hostinger public_html)
 * when backend Node server is not available.
 */

interface SubtitleItemInput {
  id: number;
  text: string;
}

interface TranslationSettingsInput {
  model?: string;
  customApiKey?: string;
  translationStyle?: string;
  customPrompt?: string;
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
      'Gemini API Key ထည့်သွင်းပေးပါ။'
    );
  }

  const selectedModel = settings.model || 'gemini-2.5-flash';
  const CHUNK_SIZE = 25; // Batch 25 subtitles per request
  const results: Array<{ id: number; translatedText: string }> = [];

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    let promptText = `You are a master film & video subtitle translator into natural spoken Myanmar (Burmese).
Translate the following subtitle items into natural spoken Myanmar dialogue:
${JSON.stringify(chunk)}

CRITICAL RULES:
1. Translate into natural spoken Myanmar (မြန်မာစကားပြော) as used in movie subtitling. Avoid stiff written particles (သည်, ပါသည်).
2. Omit panting/sighing sounds (e.g. "pant", "sigh", "ဟောဟဲ"). Output empty string "" if the line is purely noise.
3. Return ONLY a valid JSON object with format: { "translations": [ { "id": 1, "translatedText": "..." } ] }`;

    if (settings.translationStyle && settings.translationStyle !== 'standard') {
      promptText += `\nStyle Guideline: Maintain a ${settings.translationStyle} style.`;
    }
    if (settings.customPrompt) {
      promptText += `\nAdditional Custom Instruction: ${settings.customPrompt}`;
    }

    let success = false;
    let attempt = 0;
    const maxAttempts = 3;

    while (!success && attempt < maxAttempts) {
      attempt++;
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          selectedModel
        )}:generateContent?key=${encodeURIComponent(effectiveKey)}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        });

        if (res.status === 429) {
          const waitMs = attempt * 3000;
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }

        if (!res.ok) {
          const errObj = await res.json().catch(() => ({}));
          throw new Error(errObj.error?.message || `Gemini API Error ${res.status}`);
        }

        const data = await res.json();
        const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(textOut);
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
          throw new Error(`Gemini API Error: ${err.message || 'ခေါ်ယူ၍ မရပါ'}`);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  return results;
}
