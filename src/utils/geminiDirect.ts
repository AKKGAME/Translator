/**
 * Client-side direct Gemini API caller for Static Web Hosting (e.g., Hostinger public_html)
 * and direct browser usage with Free / Paid Gemini API keys.
 */

import { StoryContextAnalysis } from '../types';

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
  honorificStyle?: string;
  speakerNameHandling?: 'omit' | 'keep_english' | 'transliterate' | 'translate_context';
  properNounsMode?: 'keep_english' | 'myanmar_phonetic';
  storyContext?: StoryContextAnalysis | null;
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

    let speakerRule = '3. Keep speaker names in English or transliterate naturally.';
    if (settings.speakerNameHandling === 'omit') {
      speakerRule = '3. STRICTLY OMIT AND REMOVE all speaker names/labels/prefixes in parentheses or before colons (e.g. "[JOHN]: Hello" -> "မင်္ဂလာပါ", "ANNOUNCER: Welcome" -> "ကြိုဆိုပါတယ်", "(MARY) Good morning" -> "မင်္ဂလာနံနက်ခင်းပါ"). Output ONLY the spoken dialogue line without any character name.';
    } else if (settings.speakerNameHandling === 'keep_english') {
      speakerRule = '3. Keep speaker names and prefixes in original English letters (e.g. "JOHN: မင်္ဂလာပါ", "NARRATOR: ...").';
    } else if (settings.speakerNameHandling === 'transliterate') {
      speakerRule = '3. Transliterate speaker names to natural Myanmar phonetics (e.g. "JOHN: Hello" -> "ဂျွန်: မင်္ဂလာပါ").';
    }

    let properNounsRule = '4. Transliterate character names and place names into natural Myanmar phonetic script (e.g. John -> ဂျွန်, London -> လန်ဒန်).';
    if (settings.properNounsMode === 'keep_english') {
      properNounsRule = '4. Keep English character names and place names in original English alphabet (e.g. John -> John, Harry Potter -> Harry Potter).';
    }

    let promptText = `You are a master film & video subtitle translator into natural spoken Myanmar (Burmese).
Translate the following subtitle items into natural spoken Myanmar dialogue:
${JSON.stringify(chunk)}

CRITICAL RULES:
1. Translate into natural spoken Myanmar (မြန်မာစကားပြော) as used in movie subtitling. Avoid stiff written particles (သည်, ပါသည်).
2. Omit panting/sighing sounds (e.g. "pant", "sigh", "ဟောဟဲ"). Output empty string "" if the line is purely noise.
${speakerRule}
${properNounsRule}
5. Return ONLY a valid JSON object with format: { "translations": [ { "id": 1, "translatedText": "..." } ] }`;

    if (settings.style) {
      promptText += `\nStyle Guideline: ${settings.style}`;
    }
    if (settings.customPromptNote) {
      promptText += `\nAdditional Custom Instruction: ${settings.customPromptNote}`;
    }
    if (settings.storyContext) {
      const sc = settings.storyContext;
      promptText += `\n\nCRITICAL PRE-ANALYZED STORY CONTEXT & PRONOUN RULES:
- Plot Summary: ${sc.summary}
- Setting & Tone: ${sc.settingAndTone}
- Character Pronoun Continuity:
${sc.characters?.map((c) => `  * ${c.name} (${c.roleOrGender || 'Character'}): Pronoun "${c.myanmarPronoun}" [${c.relationshipWithOthers || ''}]`).join('\n')}
- Translation Directives: ${sc.subtitlingNotes || ''}
${sc.keyTerminology && sc.keyTerminology.length > 0 ? `- Terminology: ${sc.keyTerminology.map((k) => `${k.term} -> ${k.suggestedTranslation}`).join(', ')}` : ''}
MANDATE: Adhere strictly to these pronouns and relationships to ensure zero errors.`;
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

/**
 * Deep pre-reading comprehension of script dialogues before translation
 */
export async function analyzeStoryContextDirectlyViaGemini(
  items: SubtitleItemInput[],
  apiKey: string,
  settings: TranslationSettingsInput
): Promise<StoryContextAnalysis> {
  const effectiveKey =
    apiKey?.trim() ||
    localStorage.getItem('user_gemini_api_key') ||
    localStorage.getItem('admin_default_gemini_api_key') ||
    '';

  if (!effectiveKey) {
    throw new Error('Gemini API Key ထည့်သွင်းပေးရန် လိုအပ်ပါသည်');
  }

  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  // Sample items if dialogue is large
  let sampled = items;
  if (items.length > 160) {
    const head = items.slice(0, 90);
    const midStart = Math.floor(items.length / 2) - 25;
    const mid = items.slice(midStart, midStart + 45);
    const tail = items.slice(-25);
    sampled = [...head, ...mid, ...tail];
  }

  const scriptText = sampled.map((s, idx) => `[Line ${idx + 1}] ${s.text}`).join('\n');

  const promptText = `You are a veteran film script supervisor, dramaturg, and expert English-to-Myanmar (Burmese) subtitle translation director.
Read and deeply analyze the following dialogue script from the video before translating, to ensure 100% natural and consistent Myanmar honorifics, pronouns (ငါ/မင်း, ကျွန်တော်/ခင်ဗျား, ရှင်/ကျွန်တော်, အစ်ကို/ညီ), and correct story context:

${scriptText}

${settings.customPromptNote ? `Special notes: ${settings.customPromptNote}` : ''}

Respond with a JSON object containing:
1. "summary": Concise plot overview of what is happening in this scene/episode (in natural Myanmar Burmese).
2. "settingAndTone": The physical/social setting and emotional mood (in Burmese).
3. "characters": Array of identified characters/speakers:
   - "name": character name
   - "roleOrGender": approximate role/gender in Burmese
   - "myanmarPronoun": EXACT Myanmar pronouns to use consistently for them (e.g. "ငါ/မင်း", "ကျွန်တော်/ခင်ဗျား", "ရှင်/ကျွန်တော်", "အစ်ကို/ညီ")
   - "relationshipWithOthers": relationship with other characters
4. "subtitlingNotes": Key guidance to prevent subtitling mistakes for this specific story (in Burmese).
5. "keyTerminology": Array of specific story terms or names detected with "term" and "suggestedTranslation".`;

  let lastErrorMsg = '';

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(effectiveKey)}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        let clean = rawText.trim();
        if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');

        const parsed: StoryContextAnalysis = JSON.parse(clean);
        parsed.analyzedLinesCount = sampled.length;
        parsed.analyzedAt = Date.now();
        return parsed;
      } else {
        const err = await res.json().catch(() => ({}));
        lastErrorMsg = err.error?.message || `HTTP ${res.status}`;
      }
    } catch (e: any) {
      lastErrorMsg = e.message || '';
    }
  }

  throw new Error(`ဇာတ်လမ်း သုံးသပ်မှု မအောင်မြင်ပါ: ${lastErrorMsg || 'API စစ်ဆေးပါ'}`);
}

