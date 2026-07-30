import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// File Storage Paths & Helper Functions
const DATA_DIR = path.join(process.cwd(), 'data');
const SAVED_SUBS_DIR = path.join(DATA_DIR, 'saved_subtitles');
const DONATION_CONFIG_FILE = path.join(DATA_DIR, 'donation_config.json');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin_config.json');
const SAVED_SUBS_MANIFEST_FILE = path.join(DATA_DIR, 'saved_subtitles_manifest.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(SAVED_SUBS_DIR)) {
  fs.mkdirSync(SAVED_SUBS_DIR, { recursive: true });
}

const DEFAULT_DONATION = {
  kpayPhone: '09770033353',
  kpayName: 'Aung Kyaw Khant',
  wavePhone: '09668888555',
  waveName: 'Aung Kyaw Khant',
  note: 'Server ဖိုးနှင့် AI ဘာသာပြန်စရိတ် ကူညီထောက်ပံ့ပေးသော စိတ်ကောင်းစေတနာရှင်များအားလုံးကို အထူးပင် ကျေးဇူးတင်ရှိပါသည်။',
};

const DEFAULT_ADMIN = {
  password: process.env.ADMIN_PASSWORD || 'admin123',
};

function getDonationConfig() {
  try {
    if (fs.existsSync(DONATION_CONFIG_FILE)) {
      const data = fs.readFileSync(DONATION_CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_DONATION, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading donation_config.json:', err);
  }
  return DEFAULT_DONATION;
}

function saveDonationConfig(config: any) {
  fs.writeFileSync(DONATION_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function getAdminConfig() {
  try {
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      const data = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_ADMIN, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading admin_config.json:', err);
  }
  return DEFAULT_ADMIN;
}

function saveAdminConfig(config: any) {
  fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function getSavedSubsManifest(): any[] {
  try {
    if (fs.existsSync(SAVED_SUBS_MANIFEST_FILE)) {
      const data = fs.readFileSync(SAVED_SUBS_MANIFEST_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading saved_subtitles_manifest.json:', err);
  }
  return [];
}

function saveSubsManifest(manifest: any[]) {
  fs.writeFileSync(SAVED_SUBS_MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
}

function checkAdminAuth(req: express.Request): boolean {
  const adminPass = getAdminConfig().password;
  const provided = (req.headers['x-admin-password'] as string) || req.body?.adminPassword || req.query?.adminPassword;
  return Boolean(provided && provided === adminPass);
}

// Public Donation Config API
app.get('/api/donation-config', (req, res) => {
  res.json(getDonationConfig());
});

// Admin Authentication APIs
app.post('/api/admin/verify-login', (req, res) => {
  const { password } = req.body;
  const adminPass = getAdminConfig().password;
  if (password === adminPass) {
    return res.json({ success: true, message: 'Admin login successful' });
  }
  return res.status(401).json({ success: false, error: 'Admin စကားဝှက် မှားယွင်းနေပါသည်' });
});

app.post('/api/admin/update-donation-config', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { donationConfig } = req.body;
  if (!donationConfig) {
    return res.status(400).json({ error: 'donationConfig object is required' });
  }
  saveDonationConfig(donationConfig);
  res.json({ success: true, donationConfig });
});

app.post('/api/admin/update-password', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'စကားဝှက်အသစ်သည် အနည်းဆုံး ၄ လုံးရှိရပါမည်' });
  }
  saveAdminConfig({ password: newPassword.trim() });
  res.json({ success: true, message: 'Admin စကားဝှက် ပြောင်းလဲပြီးပါပြီ' });
});

// Public Subtitle File Saving API (Called when user translates/exports subtitle)
app.post('/api/save-subtitle-file', (req, res) => {
  try {
    const { fileName, content, format, contentMode, subtitleCount } = req.body;
    if (!content || !fileName) {
      return res.status(400).json({ error: 'fileName and content are required' });
    }

    const id = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);
    const safeBaseName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const diskFileName = `${id}_${safeBaseName}`;
    const filePath = path.join(SAVED_SUBS_DIR, diskFileName);

    // Save actual text file content (with UTF-8)
    fs.writeFileSync(filePath, content, 'utf-8');

    const manifest = getSavedSubsManifest();
    const itemMeta = {
      id,
      diskFileName,
      fileName,
      format: format || 'srt',
      contentMode: contentMode || 'translated',
      subtitleCount: subtitleCount || 0,
      savedAt: new Date().toISOString(),
      sizeBytes: Buffer.byteLength(content, 'utf-8'),
    };

    manifest.unshift(itemMeta); // newest first
    saveSubsManifest(manifest);

    res.json({ success: true, file: itemMeta });
  } catch (error: any) {
    console.error('Error saving subtitle file on server:', error);
    res.status(500).json({ error: 'Failed to save subtitle file on server' });
  }
});

// Admin Saved Subtitles Management APIs
app.get('/api/admin/saved-subtitles', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const manifest = getSavedSubsManifest();
  res.json({ files: manifest });
});

app.get('/api/admin/saved-subtitles/download/:id', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { id } = req.params;
  const manifest = getSavedSubsManifest();
  const fileMeta = manifest.find((f: any) => f.id === id);

  if (!fileMeta) {
    return res.status(404).json({ error: 'Saved file not found' });
  }

  const filePath = path.join(SAVED_SUBS_DIR, fileMeta.diskFileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File missing from server storage' });
  }

  if (req.query.view === 'text') {
    const textContent = fs.readFileSync(filePath, 'utf-8');
    return res.json({ meta: fileMeta, content: textContent });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.fileName)}"`);
  fs.createReadStream(filePath).pipe(res);
});

app.delete('/api/admin/saved-subtitles/:id', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { id } = req.params;
  let manifest = getSavedSubsManifest();
  const fileMeta = manifest.find((f: any) => f.id === id);

  if (fileMeta) {
    const filePath = path.join(SAVED_SUBS_DIR, fileMeta.diskFileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to unlink file:', err);
      }
    }
  }

  manifest = manifest.filter((f: any) => f.id !== id);
  saveSubsManifest(manifest);

  res.json({ success: true, message: 'File deleted successfully' });
});

// Initialize Gemini Client
function getGeminiClient(apiKeyOverride?: string): GoogleGenAI {
  const keyToUse = (apiKeyOverride && apiKeyOverride.trim()) || process.env.GEMINI_API_KEY;
  if (!keyToUse) {
    throw new Error('Gemini API Key မရှိပါ။ ဆက်တင်များ (Settings) တွင် မိမိ၏ Gemini API Key ထည့်သွင်းပေးပါ သို့မဟုတ် စနစ်၏ Key ကို အသုံးပြုပါ။');
  }
  return new GoogleGenAI({
    apiKey: keyToUse.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Batch Translate Subtitles API Endpoint
app.post('/api/translate-subtitles', async (req, res) => {
  try {
    const { items, settings, apiKey: reqApiKey } = req.body;
    const customApiKey = reqApiKey || (req.headers['x-api-key'] as string);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const style = settings?.style || 'conversational';
    const tone = settings?.tone || 'neutral';
    const glossary = settings?.glossary || [];
    const preserveTags = settings?.preserveTags !== false;
    const useBurmeseDigits = Boolean(settings?.useBurmeseDigits);
    const speakerNameHandling = settings?.speakerNameHandling || 'keep_english';
    const properNounsMode = settings?.properNounsMode || 'myanmar_phonetic';
    const soundEffectsHandling = settings?.soundEffectsHandling || 'translate';
    const honorificStyle = settings?.honorificStyle || 'polite';
    const conciseness = settings?.conciseness || 'concise';
    const customPromptNote = settings?.customPromptNote || '';

    let glossaryPrompt = '';
    if (glossary.length > 0) {
      glossaryPrompt = `
Glossary & Term Rules (MANDATORY):
${glossary.map((g: any) => `- "${g.original}" -> "${g.target}"`).join('\n')}
`;
    }

    let styleInstruction = '';
    if (style === 'conversational') {
      styleInstruction = 'Translate using natural, fluent spoken Burmese (စကားပြောစတိုင်) suitable for video subtitles and movie dialogues.';
    } else if (style === 'literary') {
      styleInstruction = 'Translate using formal, elegant written Burmese (စာတွေ့စတိုင်) suitable for documentaries, news, and academic tutorials.';
    } else if (style === 'casual') {
      styleInstruction = 'Translate using casual, friendly spoken Burmese (ပေါ့ပေါ့ပါးပါး စတိုင်) suitable for vlogs, comedy, and gaming videos.';
    }

    let toneInstruction = '';
    if (tone === 'polite') {
      toneInstruction = 'Use polite and respectful Myanmar honorifics and speech endings (e.g., ပါသည်, ပါတယ်, ခင်ဗျာ, ရှင်).';
    } else if (tone === 'dramatic') {
      toneInstruction = 'Emphasize dramatic emotion and cinematic expression suitable for action and drama films.';
    }

    // Speaker Name Rule
    let speakerInstruction = '';
    if (speakerNameHandling === 'omit') {
      speakerInstruction = 'STRICTLY OMIT and REMOVE all speaker names, character labels, or speaker prefixes in parentheses/brackets or before colons (e.g., "(JUICE) Oh dear!" -> "ဒုက္ခပဲ!", "(ဂျူအိ) ဒုက္ခပဲ!" -> "ဒုက္ခပဲ!", "JOHN: Hello" -> "မင်္ဂလာပါ"). Output ONLY the clean spoken dialogue line without any character name or speaker tag.';
    } else if (speakerNameHandling === 'keep_english') {
      speakerInstruction = 'Keep speaker names and prefixes in original English letters (e.g. "JOHN:" stays "JOHN:", "ANNOUNCER:" stays "ANNOUNCER:").';
    } else if (speakerNameHandling === 'transliterate') {
      speakerInstruction = 'Transliterate speaker names to Myanmar phonetics (e.g. "JOHN:" -> "ဂျွန်:", "MARY:" -> "မာရီ:").';
    } else if (speakerNameHandling === 'translate_context') {
      speakerInstruction = 'Translate speaker titles and labels into natural Myanmar context (e.g. "CAPTAIN:" -> "ကပ္ပတိန်:", "DOCTOR:" -> "ဒေါက်တာ:").';
    }

    // Proper Nouns Rule
    let properNounsInstruction = '';
    if (properNounsMode === 'keep_english') {
      properNounsInstruction = 'Keep English character names and place names in English script (e.g. John, London, New York).';
    } else {
      properNounsInstruction = 'Transliterate English character names and place names into natural Myanmar phonetic script (e.g. John -> ဂျွန်, London -> လန်ဒန်).';
    }

    // Sound Effects Rule
    let soundInstruction = '';
    if (soundEffectsHandling === 'translate') {
      soundInstruction = 'Translate non-verbal sound descriptions in brackets or parentheses into Myanmar (e.g., [Music] -> [တေးဂီတ], [Laughter] -> [ရယ်မောသံ], (sighs) -> (သက်ပြင်းချသံ)).';
    } else if (soundEffectsHandling === 'keep') {
      soundInstruction = 'Keep non-verbal audio descriptions in brackets in original English (e.g., [Music], [Laughter]).';
    } else if (soundEffectsHandling === 'remove') {
      soundInstruction = 'Omit non-verbal sound descriptions in brackets like [Music] or [Laughter] completely.';
    }

    // Honorifics Rule
    let honorificInstruction = '';
    if (honorificStyle === 'polite') {
      honorificInstruction = 'Use polite, respectful pronouns and endings (e.g., မင်း/ကျွန်တော်/ခင်ဗျား/ရှင်/ပါသည်).';
    } else if (honorificStyle === 'intimate') {
      honorificInstruction = 'Use intimate or cinematic movie-dialogue pronouns (e.g., နင်/ငါ/မင်း/ကွာ).';
    } else {
      honorificInstruction = 'Use neutral objective pronouns (e.g., သူ/မိမိ).';
    }

    // Conciseness Rule
    const concisenessInstruction = conciseness === 'concise'
      ? 'Keep subtitle lines short, punchy, and easy to read quickly on screen.'
      : 'Provide full, comprehensive translation preserving all details.';

    const digitsInstruction = useBurmeseDigits
      ? 'Convert Western numerals (0-9) in translated text to Myanmar digits (၀-၉).'
      : 'Keep numbers as standard digits unless natural language numbers sound better.';

    const systemInstruction = `
You are a master professional film & video subtitle translator specializing in English to Myanmar (Burmese / မြန်မာဘာသာ) translation for cinema, TV shows, and video subtitles.

CRITICAL NATURAL TRANSLATION PRINCIPLES:
1. HIGHLY NATURAL & CINEMATIC: Translate into natural, fluent, spoken Myanmar (မြန်မာစကားပြော) as used in professional movie subtitling. Strictly avoid stiff, robotic, or direct word-for-word bookish translations (do NOT use unnatural formal written particles like "သည်", "ပါသည်", "ကျွန်ုပ်" unless specifically instructed).
2. IDIOMS & COLLOQUIALISMS: Never translate English idioms, slang, or phrasal verbs literally (e.g. "piece of cake" -> "လွယ်လွယ်လေးပါ", "cut it out" -> "တော်လိုက်တော့", "on it" -> "ငါကြည့်လုပ်လိုက်မယ်", "what's up" -> "ဘာထူးလဲ/ဘာဖြစ်လို့လဲ"). Translate their actual intended meaning in natural Myanmar speech.
3. CONTEXT & DIALOGUE FLOW: Ensure pronoun references (ငါ/နင်, ကျွန်တော်/မင်း, မောင်/မ, အစ်ကို) and tone remain continuous and natural across dialogue lines.
4. LINE BREAK PRESERVATION: If an input subtitle text contains line breaks (\\n), maintain the multi-line subtitle layout in the translated Burmese output so it renders cleanly on screen.
5. SUBTITLE PUNCTUATION: Avoid trailing formal Burmese full stops (။) at the end of spoken dialogue subtitle lines to keep screen subtitles clean. Preserve trailing ellipsis (...) or dashes (-) for trailing or interrupted speech.
6. ${styleInstruction}
7. ${toneInstruction}
8. ${speakerInstruction}
9. ${properNounsInstruction}
10. ${soundInstruction}
11. ${honorificInstruction}
12. ${concisenessInstruction}
13. ${digitsInstruction}
14. ${preserveTags ? 'Preserve formatting HTML tags like <i>, </i>, <b>, </b>, <font> exactly around translated text without breaking tags.' : 'Strip HTML formatting tags if unnecessary.'}
15. Return a JSON object containing a "translations" array. Each array element MUST be an object with "id" (number matching input item id) and "translatedText" (string).
16. Do NOT combine, merge, or skip any item IDs. Return an entry for EVERY input item provided in the request payload.
17. SOUND NOISE & PANTING REMOVAL: Automatically OMIT panting sounds (e.g. "pant", "panting", "ဟောဟဲ...", "ဟောဟဲ"), sighs, groans, or non-verbal audio noise expressions from the translation output. If a line consists purely of panting or non-verbal sound noises, output an empty string "" for "translatedText".
${glossaryPrompt}
${customPromptNote ? `Additional User Guidelines: ${customPromptNote}` : ''}
`;

    const promptText = `Please translate the following subtitle items into Myanmar (Burmese):
${JSON.stringify(items.map((i: any) => ({ id: i.id, text: i.text })))}`;

    const ai = getGeminiClient(customApiKey);

    let responseText = '';
    let success = false;
    let lastError: any = null;

    // Supported model fallback order for Free and Paid Gemini keys
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-flash-latest',
    ];

    let pass = 0;
    const maxPasses = 3;

    while (pass < maxPasses && !success) {
      pass++;
      for (const modelName of modelsToTry) {
        if (success) break;
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: promptText,
            config: {
              systemInstruction,
              temperature: 0.25,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  translations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.INTEGER },
                        translatedText: { type: Type.STRING },
                      },
                      required: ['id', 'translatedText'],
                    },
                  },
                },
                required: ['translations'],
              },
            },
          });

          responseText = response.text || '{}';
          if (responseText && responseText !== '{}') {
            success = true;
            break;
          }
        } catch (err: any) {
          lastError = err;
          const isRateLimit =
            err?.status === 'RESOURCE_EXHAUSTED' ||
            err?.code === 429 ||
            (err?.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED')));

          if (isRateLimit) {
            console.warn(`[${modelName}] Rate limit / quota hit. Trying next fallback model...`);
            continue;
          } else {
            console.warn(`[${modelName}] Error encountered: ${err?.message || err}. Trying next model...`);
            continue;
          }
        }
      }

      if (!success && pass < maxPasses) {
        console.warn(`All models rate-limited on pass ${pass}/${maxPasses}. Waiting 2.5s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }

    if (!success) {
      const isRateLimit =
        lastError?.status === 'RESOURCE_EXHAUSTED' ||
        lastError?.code === 429 ||
        (lastError?.message && (lastError.message.includes('429') || lastError.message.includes('quota') || lastError.message.includes('RESOURCE_EXHAUSTED')));

      if (isRateLimit) {
        return res.status(429).json({
          error: 'Gemini API Rate Limit hit. Retrying automatically...',
          isRateLimit: true,
        });
      }

      throw lastError || new Error('API Request failed. Please try again in a few moments.');
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsedData: any = { translations: [] };
    try {
      parsedData = JSON.parse(cleanJson);
    } catch (pErr) {
      console.error('Failed to parse JSON response from Gemini:', responseText);
      throw new Error('Gemini API returned invalid JSON structure.');
    }

    res.json({
      translations: parsedData.translations || [],
    });
  } catch (error: any) {
    console.error('Error translating subtitles:', error);
    res.status(500).json({
      error: error.message || 'Failed to translate subtitles with Gemini API',
    });
  }
});

// Vite Middleware for dev & static serve for prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;
