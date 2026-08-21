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

// File Storage Paths & Helper Functions with Serverless / Vercel read-only compatibility
let DATA_DIR = path.join(process.cwd(), 'data');
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  DATA_DIR = path.join('/tmp', 'data');
}
const SAVED_SUBS_DIR = path.join(DATA_DIR, 'saved_subtitles');
const DONATION_CONFIG_FILE = path.join(DATA_DIR, 'donation_config.json');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin_config.json');
const TELEGRAM_CONFIG_FILE = path.join(DATA_DIR, 'telegram_config.json');
const SAVED_SUBS_MANIFEST_FILE = path.join(DATA_DIR, 'saved_subtitles_manifest.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SAVED_SUBS_DIR)) {
    fs.mkdirSync(SAVED_SUBS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Storage directory initialization note:', err);
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

const DEFAULT_TELEGRAM = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '8086264754:AAE1BrjRniygo4S0MpftlXjfVIW0HhZxRDQ',
  channelId: process.env.TELEGRAM_CHANNEL_ID || '-1003174988160',
  enabled: true,
  captionTemplate: '🎬 <b>ဘာသာပြန် စာတန်းထိုးဖိုင်:</b> <code>{fileName}</code>\n📝 <b>အမျိုးအစား:</b> {contentMode} ({format})\n📊 <b>စာကြောင်းရေ:</b> {subtitleCount} ကြောင်း\n⏱ <b>သိမ်းဆည်းချိန်:</b> {savedAt}\n✨ <b>Translated with:</b> AnimeGabar AI Subtitle Translator',
  sendOnDownload: true,
};

// In-memory fallbacks for serverless stateless execution
let inMemoryDonation = { ...DEFAULT_DONATION };
let inMemoryTelegram = { ...DEFAULT_TELEGRAM };
let inMemoryAdmin = { ...DEFAULT_ADMIN };
let inMemoryManifest: any[] = [];

function getDonationConfig() {
  try {
    if (fs.existsSync(DONATION_CONFIG_FILE)) {
      const data = fs.readFileSync(DONATION_CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_DONATION, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading donation_config.json:', err);
  }
  return inMemoryDonation;
}

function saveDonationConfig(config: any) {
  inMemoryDonation = { ...DEFAULT_DONATION, ...config };
  try {
    fs.writeFileSync(DONATION_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write donation config to disk:', err);
  }
}

function getTelegramConfig() {
  try {
    if (fs.existsSync(TELEGRAM_CONFIG_FILE)) {
      const data = fs.readFileSync(TELEGRAM_CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_TELEGRAM, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading telegram_config.json:', err);
  }
  return inMemoryTelegram;
}

function saveTelegramConfig(config: any) {
  inMemoryTelegram = { ...DEFAULT_TELEGRAM, ...config };
  try {
    fs.writeFileSync(TELEGRAM_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write telegram config to disk:', err);
  }
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
  return inMemoryAdmin;
}

function saveAdminConfig(config: any) {
  inMemoryAdmin = { ...DEFAULT_ADMIN, ...config };
  try {
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write admin config to disk:', err);
  }
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
  return inMemoryManifest;
}

function saveSubsManifest(manifest: any[]) {
  inMemoryManifest = manifest;
  try {
    fs.writeFileSync(SAVED_SUBS_MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write manifest to disk:', err);
  }
}

function checkAdminAuth(req: express.Request): boolean {
  const adminPass = getAdminConfig().password;
  const provided = (req.headers['x-admin-password'] as string) || req.body?.adminPassword || req.query?.adminPassword;
  return Boolean(provided && provided === adminPass);
}

// Telegram Helper Function: Send Subtitle Document to Telegram Channel/Chat
async function sendDocumentToTelegram(options: {
  botToken: string;
  channelId: string;
  fileName: string;
  content: string;
  caption?: string;
}) {
  const { botToken, channelId, fileName, content, caption } = options;
  if (!botToken || !channelId) {
    throw new Error('Telegram Bot Token သို့မဟုတ် Channel ID မရှိပါ');
  }

  const cleanToken = botToken.trim();
  const cleanChatId = channelId.trim();

  // Create form data using native FormData and Blob
  const formData = new FormData();
  formData.append('chat_id', cleanChatId);

  // Subtitle document with UTF-8 BOM for flawless Burmese font rendering
  const fileBlob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
  formData.append('document', fileBlob, fileName);

  if (caption) {
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
  }

  const telegramUrl = `https://api.telegram.org/bot${cleanToken}/sendDocument`;
  const response = await fetch(telegramUrl, {
    method: 'POST',
    body: formData,
  });

  const data: any = await response.json();
  if (!response.ok || !data.ok) {
    const errorDesc = data?.description || 'Telegram Bot API error';
    throw new Error(errorDesc);
  }

  return data;
}

// Public Donation Config API
app.get('/api/donation-config', (req, res) => {
  res.json(getDonationConfig());
});

// Public Telegram Config Status API
app.get('/api/telegram-config', (req, res) => {
  const config = getTelegramConfig();
  const isConfigured = Boolean(config.botToken && config.channelId);
  res.json({
    isConfigured,
    channelId: config.channelId ? config.channelId.replace(/(?<=.{3}).(?=.{3})/g, '*') : '',
    rawChannelId: config.channelId || '',
    enabled: Boolean(config.enabled),
    sendOnDownload: Boolean(config.sendOnDownload),
  });
});

// Admin Telegram Config APIs
app.get('/api/admin/telegram-config', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  res.json(getTelegramConfig());
});

app.post('/api/admin/update-telegram-config', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { telegramConfig } = req.body;
  if (!telegramConfig) {
    return res.status(400).json({ error: 'telegramConfig is required' });
  }
  saveTelegramConfig(telegramConfig);
  res.json({ success: true, telegramConfig });
});

// Public endpoint for users to test their Telegram Bot & Channel
app.post('/api/test-telegram', async (req, res) => {
  try {
    const { botToken, channelId } = req.body;
    const currentConfig = getTelegramConfig();
    const tokenToUse = (botToken && typeof botToken === 'string' && botToken.trim()) || currentConfig.botToken;
    const channelToUse = (channelId && typeof channelId === 'string' && channelId.trim()) || currentConfig.channelId;

    if (!tokenToUse || !channelToUse) {
      return res.status(400).json({ error: 'Telegram Bot Token နှင့် Channel ID ထည့်သွင်းပေးပါ' });
    }

    const testText = `🚀 <b>AnimeGabar Subtitle Translator</b>\n\n✅ Telegram Channel ချိတ်ဆက်မှု အောင်မြင်ပါသည်!\n⏰ အချိန်: ${new Date().toLocaleString('my-MM')}\n\nဘာသာပြန်ပြီး စာတန်းထိုးဖိုင် (.srt / .vtt) များကို ဤ Channel ဆီသို့ အလိုအလျောက် ပို့ပေးပါမည်။`;

    const url = `https://api.telegram.org/bot${tokenToUse.trim()}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelToUse.trim(),
        text: testText,
        parse_mode: 'HTML',
      }),
    });

    const data: any = await response.json();
    if (!response.ok || !data.ok) {
      const desc = data?.description || 'Telegram Bot သို့ မက်ဆေ့ခ်ျ ပို့၍ မရပါ';
      return res.status(400).json({
        success: false,
        error: `Telegram Error: ${desc} (Bot ကို Channel တွင် Admin အဖြစ် ထည့်သွင်းထားကြောင်းနှင့် Post Messages ခွင့်ပြုချက် ပေးထားကြောင်း စစ်ဆေးပါ)`,
      });
    }

    res.json({
      success: true,
      message: 'Telegram Channel သို့ စမ်းသပ်မက်ဆေ့ခ်ျ ပို့ပြီးပါပြီ!',
      chatTitle: data.result?.chat?.title || channelToUse,
    });
  } catch (err: any) {
    console.error('Error testing Telegram config:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Telegram စမ်းသပ်မှု မအောင်မြင်ပါ',
    });
  }
});

// Public Telegram Config status for client (safe, no bot token revealed)
app.get('/api/public-telegram-config', (req, res) => {
  const config = getTelegramConfig();
  res.json({
    configured: Boolean(config.botToken && config.channelId),
    channelId: config.channelId ? (config.channelId.startsWith('@') ? config.channelId : config.channelId.replace(/^(.{4}).*(.{3})$/, '$1***$2')) : '',
    sendOnDownload: config.sendOnDownload,
    enabled: config.enabled,
    hasToken: Boolean(config.botToken),
  });
});

app.post('/api/admin/test-telegram', async (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  try {
    const { botToken, channelId } = req.body;
    const currentConfig = getTelegramConfig();
    const tokenToUse = (botToken && typeof botToken === 'string' && botToken.trim()) || currentConfig.botToken;
    const channelToUse = (channelId && typeof channelId === 'string' && channelId.trim()) || currentConfig.channelId;

    if (!tokenToUse || !channelToUse) {
      return res.status(400).json({ error: 'Telegram Bot Token နှင့် Channel ID ထည့်သွင်းပေးပါ' });
    }

    const testText = `🚀 <b>AnimeGabar Subtitle Translator</b>\n\n✅ Telegram Channel ချိတ်ဆက်မှု အောင်မြင်ပါသည်!\n⏰ အချိန်: ${new Date().toLocaleString('my-MM')}\n\nဘာသာပြန်ပြီး စာတန်းထိုးဖိုင် (.srt / .vtt) များကို ဤ Channel ဆီသို့ အလိုအလျောက် ပို့ပေးပါမည်။`;

    const url = `https://api.telegram.org/bot${tokenToUse.trim()}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelToUse.trim(),
        text: testText,
        parse_mode: 'HTML',
      }),
    });

    const data: any = await response.json();
    if (!response.ok || !data.ok) {
      const desc = data?.description || 'Telegram Bot သို့ မက်ဆေ့ခ်ျ ပို့၍ မရပါ';
      return res.status(400).json({
        success: false,
        error: `Telegram Error: ${desc} (Bot ကို Channel တွင် Admin အဖြစ် ထည့်သွင်းထားကြောင်းနှင့် Post Messages ခွင့်ပြုချက် ပေးထားကြောင်း စစ်ဆေးပါ)`,
      });
    }

    res.json({
      success: true,
      message: 'Telegram Channel သို့ စမ်းသပ်မက်ဆေ့ခ်ျ ပို့ပြီးပါပြီ!',
      chatTitle: data.result?.chat?.title || channelToUse,
    });
  } catch (err: any) {
    console.error('Error testing Telegram config:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Telegram စမ်းသပ်မှု မအောင်မြင်ပါ',
    });
  }
});

// Send Subtitle Document to Telegram API (Called on Download/Export)
app.post('/api/send-to-telegram', async (req, res) => {
  try {
    const { fileName, content, format, contentMode, subtitleCount, customBotToken, customChannelId, customCaption } = req.body;

    if (!content || !fileName) {
      return res.status(400).json({ error: 'fileName and content are required' });
    }

    const config = getTelegramConfig();
    const botToken = (customBotToken && customBotToken.trim()) || config.botToken;
    const channelId = (customChannelId && customChannelId.trim()) || config.channelId;

    if (!botToken || !channelId) {
      return res.status(400).json({
        error: 'Telegram Bot Token သို့မဟုတ် Channel ID သတ်မှတ်ထားခြင်း မရှိပါ (Admin Panel / Settings တွင် ထည့်သွင်းပေးပါ)',
      });
    }

    const modeName =
      contentMode === 'translated'
        ? 'မြန်မာစာတန်းထိုး သီးသန့်'
        : contentMode === 'dual'
        ? 'နှစ်ဘာသာ ပူးတွဲ (Dual)'
        : 'မူရင်း';

    const savedAtStr = new Date().toLocaleString('my-MM', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    let caption = customCaption;
    if (!caption) {
      const template =
        config.captionTemplate ||
        '🎬 <b>ဘာသာပြန် စာတန်းထိုးဖိုင်:</b> <code>{fileName}</code>\n📝 <b>အမျိုးအစား:</b> {contentMode} ({format})\n📊 <b>စာကြောင်းရေ:</b> {subtitleCount} ကြောင်း\n⏱ <b>သိမ်းဆည်းချိန်:</b> {savedAt}\n✨ <b>Translated with:</b> AnimeGabar AI Subtitle Translator';

      caption = template
        .replace(/{fileName}/g, fileName)
        .replace(/{contentMode}/g, modeName)
        .replace(/{format}/g, (format || 'srt').toUpperCase())
        .replace(/{subtitleCount}/g, String(subtitleCount || 0))
        .replace(/{savedAt}/g, savedAtStr);
    }

    const telegramRes = await sendDocumentToTelegram({
      botToken,
      channelId,
      fileName,
      content,
      caption,
    });

    res.json({
      success: true,
      message: 'Telegram Channel သို့ ဖိုင် အောင်မြင်စွာ ပို့ပြီးပါပြီ',
      telegramResult: telegramRes.result,
    });
  } catch (error: any) {
    console.error('Error sending subtitle file to Telegram:', error);
    res.status(500).json({
      error: error.message || 'Telegram Channel သို့ ဖိုင် ပို့ဆောင်၍ မရပါ',
    });
  }
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
app.post('/api/save-subtitle-file', async (req, res) => {
  try {
    const { fileName, content, format, contentMode, subtitleCount, sendTelegram } = req.body;
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

    // Check if auto-send to Telegram channel is enabled
    const telegramConfig = getTelegramConfig();
    let telegramSent = false;
    let telegramError = null;

    if (
      (sendTelegram !== false && telegramConfig.enabled && telegramConfig.sendOnDownload) &&
      telegramConfig.botToken &&
      telegramConfig.channelId
    ) {
      try {
        const modeName =
          contentMode === 'translated'
            ? 'မြန်မာစာတန်းထိုး သီးသန့်'
            : contentMode === 'dual'
            ? 'နှစ်ဘာသာ ပူးတွဲ (Dual)'
            : 'မူရင်း';

        const savedAtStr = new Date().toLocaleString('my-MM', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        const template =
          telegramConfig.captionTemplate ||
          '🎬 <b>ဘာသာပြန် စာတန်းထိုးဖိုင်:</b> <code>{fileName}</code>\n📝 <b>အမျိုးအစား:</b> {contentMode} ({format})\n📊 <b>စာကြောင်းရေ:</b> {subtitleCount} ကြောင်း\n⏱ <b>သိမ်းဆည်းချိန်:</b> {savedAt}\n✨ <b>Translated with:</b> AnimeGabar AI Subtitle Translator';

        const caption = template
          .replace(/{fileName}/g, fileName)
          .replace(/{contentMode}/g, modeName)
          .replace(/{format}/g, (format || 'srt').toUpperCase())
          .replace(/{subtitleCount}/g, String(subtitleCount || 0))
          .replace(/{savedAt}/g, savedAtStr);

        await sendDocumentToTelegram({
          botToken: telegramConfig.botToken,
          channelId: telegramConfig.channelId,
          fileName,
          content,
          caption,
        });
        telegramSent = true;
      } catch (tgErr: any) {
        console.warn('Auto send to Telegram warning:', tgErr?.message || tgErr);
        telegramError = tgErr?.message || 'Telegram dispatch failed';
      }
    }

    res.json({ success: true, file: itemMeta, telegramSent, telegramError });
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
    throw new Error('Gemini API Key ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။ ဆက်တင်များ (Settings) တွင် မိမိ၏ Gemini API Key ထည့်သွင်းပေးပါ (Google AI Studio မှ အခမဲ့ ရယူနိုင်ပါသည်)');
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

// Verify Gemini API Key Endpoint
app.post('/api/verify-gemini-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const keyToTest = (apiKey && typeof apiKey === 'string' && apiKey.trim()) || process.env.GEMINI_API_KEY;

    if (!keyToTest) {
      return res.status(400).json({ valid: false, error: 'Gemini API Key ထည့်သွင်းထားခြင်း မရှိပါ' });
    }

    const ai = new GoogleGenAI({ apiKey: keyToTest.trim() });
    const testModels = [
      'gemini-2.5-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
    ];

    let verifiedModel = '';
    let lastErr: any = null;

    for (const testModel of testModels) {
      try {
        const response = await ai.models.generateContent({
          model: testModel,
          contents: 'Reply with: OK',
        });

        if (response.text) {
          verifiedModel = testModel;
          break;
        }
      } catch (err: any) {
        lastErr = err;
      }
    }

    if (verifiedModel) {
      return res.json({ valid: true, message: `Gemini API Key မှန်ကန်စွာ ချိတ်ဆက်ပြီးပါပြီ (${verifiedModel})` });
    }

    throw lastErr || new Error('API မှ တုံ့ပြန်မှု မရရှိပါ');
  } catch (err: any) {
    console.error('Error verifying Gemini API key:', err);
    let errMsg = err.message || 'API Key စစ်ဆေး၍ မရပါ';
    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('400')) {
      errMsg = 'ထည့်သွင်းထားသော Gemini API Key မှားယွင်းနေပါသည်';
    } else if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      errMsg = 'API Key အသုံးပြုမှု ပမာဏ (Quota/Rate Limit) ပြည့်နေပါသည်';
    }
    return res.status(400).json({ valid: false, error: errMsg });
  }
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
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
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
