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
const USAGE_CONFIG_FILE = path.join(DATA_DIR, 'usage_config.json');
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

const DEFAULT_USAGE = {
  freeTierDailyLimit: 50, // 50 lines / day for free users
  requireAccessKey: false,
  allowCustomApiKey: true,
  adminDefaultGeminiKey: '',
  announcementNotice: '',
  contactTelegram: '@AnimeGabar',
  loadBalancingStrategy: 'round_robin', // 'round_robin' | 'least_used' | 'random'
  geminiKeyPool: process.env.GEMINI_API_KEY
    ? [
        {
          id: 'server-env-key-1',
          key: process.env.GEMINI_API_KEY,
          label: 'Primary Server Gemini Key (ENV)',
          status: 'active',
          cooldownUntil: null,
          successCount: 0,
          errorCount: 0,
          lastUsedAt: null,
          lastErrorMsg: null,
          createdAt: new Date().toISOString(),
        },
      ]
    : [],
  accessKeys: [
    {
      id: 'demo-vip-1',
      code: 'AG-VIP-PREMIUM',
      label: 'VIP Unlimited Demo Key',
      maxLines: 0,
      usedLines: 0,
      expiresAt: null,
      createdAt: new Date().toISOString(),
      status: 'active',
      note: 'စနစ်စတင်ချိန် အစမ်းသုံးနိုင်သော VIP Key',
    },
  ],
};

// In-memory fallbacks for serverless stateless execution
let inMemoryDonation = { ...DEFAULT_DONATION };
let inMemoryTelegram = { ...DEFAULT_TELEGRAM };
let inMemoryAdmin = { ...DEFAULT_ADMIN };
let inMemoryUsage = { ...DEFAULT_USAGE };
let inMemoryManifest: any[] = [];
let poolRotationIndex = 0;

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****';
  return key.substring(0, 8) + '...' + key.substring(key.length - 4);
}

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

function getUsageConfig() {
  try {
    if (fs.existsSync(USAGE_CONFIG_FILE)) {
      const data = fs.readFileSync(USAGE_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const merged = { ...DEFAULT_USAGE, ...parsed };
      if (!Array.isArray(merged.geminiKeyPool)) {
        merged.geminiKeyPool = DEFAULT_USAGE.geminiKeyPool || [];
      }
      return merged;
    }
  } catch (err) {
    console.error('Error reading usage_config.json:', err);
  }
  return inMemoryUsage;
}

function saveUsageConfig(config: any) {
  inMemoryUsage = { ...DEFAULT_USAGE, ...config };
  try {
    fs.writeFileSync(USAGE_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write usage config to disk:', err);
  }
}

// Get all healthy candidate keys from pool with auto cooldown clearance & load balancing
function getHealthyKeyCandidates(config: any): any[] {
  const pool = config.geminiKeyPool || [];
  const now = Date.now();
  let updated = false;

  for (const k of pool) {
    if (k.status === 'cooldown' && k.cooldownUntil && now >= k.cooldownUntil) {
      k.status = 'active';
      k.cooldownUntil = null;
      k.lastErrorMsg = 'Cooldown finished (Restored to Active)';
      updated = true;
    }
  }

  if (updated) {
    saveUsageConfig(config);
  }

  const healthy = pool.filter(
    (k: any) => k.status === 'active' && k.key && typeof k.key === 'string' && k.key.trim().length > 10
  );

  // If strategy is least_used, sort by successCount ascending
  if (config.loadBalancingStrategy === 'least_used') {
    return [...healthy].sort((a, b) => (a.successCount || 0) - (b.successCount || 0));
  }

  // If strategy is random, shuffle healthy
  if (config.loadBalancingStrategy === 'random' && healthy.length > 1) {
    return [...healthy].sort(() => Math.random() - 0.5);
  }

  // Default round_robin: rotate starting from poolRotationIndex
  if (healthy.length > 1) {
    const startIdx = poolRotationIndex % healthy.length;
    poolRotationIndex = (poolRotationIndex + 1) % healthy.length;
    return [...healthy.slice(startIdx), ...healthy.slice(0, startIdx)];
  }

  return healthy;
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

// Public Usage Limits & System Status
app.get('/api/usage-status', (req, res) => {
  const config = getUsageConfig();
  res.json({
    freeTierDailyLimit: config.freeTierDailyLimit ?? 50,
    requireAccessKey: Boolean(config.requireAccessKey),
    allowCustomApiKey: config.allowCustomApiKey !== false,
    hasAdminKey: Boolean(config.adminDefaultGeminiKey || process.env.GEMINI_API_KEY),
    announcementNotice: config.announcementNotice || '',
  });
});

// Public Verify Access Key Endpoint
app.post('/api/verify-access-key', (req, res) => {
  const { accessCode } = req.body;
  const normalized = (accessCode && typeof accessCode === 'string') ? accessCode.trim().toUpperCase() : '';
  if (!normalized) {
    return res.status(400).json({ valid: false, error: 'Access Key ထည့်သွင်းပေးပါ' });
  }

  const config = getUsageConfig();
  const found = config.accessKeys?.find((k: any) => k.code?.trim().toUpperCase() === normalized);

  if (!found) {
    return res.status(404).json({ valid: false, error: 'ထည့်သွင်းထားသော Access Key မတွေ့ရှိပါ သို့မဟုတ် မမှန်ကန်ပါ' });
  }

  if (found.status === 'revoked') {
    return res.status(403).json({ valid: false, error: 'ဤ Access Key ကို Admin မှ ပယ်ဖျက် (Revoke) ထားပါသည်' });
  }

  if (found.expiresAt) {
    const expDate = new Date(found.expiresAt).getTime();
    if (Date.now() > expDate) {
      return res.status(403).json({ valid: false, error: 'ဤ Access Key သည် သက်တမ်းကုန်ဆုံးသွားပါပြီ' });
    }
  }

  if (found.maxLines > 0 && found.usedLines >= found.maxLines) {
    return res.status(403).json({
      valid: false,
      error: `ဤ Key ၏ သတ်မှတ်စာကြောင်းရေ (${found.maxLines.toLocaleString()} ကြောင်း) အားလုံး ကုန်ဆုံးသွားပါပြီ`,
    });
  }

  const remaining = found.maxLines > 0 ? Math.max(0, found.maxLines - found.usedLines) : null;

  res.json({
    valid: true,
    message: 'Access Key မှန်ကန်ပါသည်',
    key: {
      code: found.code,
      label: found.label,
      maxLines: found.maxLines,
      usedLines: found.usedLines,
      remainingLines: remaining,
      expiresAt: found.expiresAt,
      isUnlimited: found.maxLines === 0,
    },
  });
});

// Admin Usage & Access Keys APIs
app.get('/api/admin/usage-config', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  res.json(getUsageConfig());
});

app.post('/api/admin/update-usage-config', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { usageConfig } = req.body;
  if (!usageConfig) {
    return res.status(400).json({ error: 'usageConfig is required' });
  }
  const current = getUsageConfig();
  const updated = {
    ...current,
    ...usageConfig,
    accessKeys: usageConfig.accessKeys || current.accessKeys || [],
  };
  saveUsageConfig(updated);
  res.json({ success: true, usageConfig: updated });
});

app.post('/api/admin/access-keys/create', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { code, label, maxLines, expiresAt, note } = req.body;
  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'Access Key Code ထည့်သွင်းပေးပါ' });
  }

  const config = getUsageConfig();
  const normalized = code.trim().toUpperCase();

  if (config.accessKeys?.some((k: any) => k.code?.trim().toUpperCase() === normalized)) {
    return res.status(400).json({ error: `Key Code "${normalized}" ရှိနှင့်ပြီးဖြစ်ပါသည်` });
  }

  const newKey = {
    id: 'key_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
    code: normalized,
    label: label?.trim() || `User: ${normalized}`,
    maxLines: typeof maxLines === 'number' ? maxLines : 5000,
    usedLines: 0,
    expiresAt: expiresAt || null,
    createdAt: new Date().toISOString(),
    status: 'active',
    note: note?.trim() || '',
  };

  config.accessKeys = [newKey, ...(config.accessKeys || [])];
  saveUsageConfig(config);

  res.json({ success: true, key: newKey, accessKeys: config.accessKeys });
});

app.post('/api/admin/access-keys/toggle', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { keyId } = req.body;
  const config = getUsageConfig();
  let found = false;

  config.accessKeys = (config.accessKeys || []).map((k: any) => {
    if (k.id === keyId || k.code?.trim().toUpperCase() === (keyId || '').trim().toUpperCase()) {
      found = true;
      const nextStatus = k.status === 'active' ? 'revoked' : 'active';
      return { ...k, status: nextStatus };
    }
    return k;
  });

  if (!found) {
    return res.status(404).json({ error: 'Key not found' });
  }

  saveUsageConfig(config);
  res.json({ success: true, accessKeys: config.accessKeys });
});

app.post('/api/admin/access-keys/reset-usage', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { keyId } = req.body;
  const config = getUsageConfig();
  let found = false;

  config.accessKeys = (config.accessKeys || []).map((k: any) => {
    if (k.id === keyId || k.code?.trim().toUpperCase() === (keyId || '').trim().toUpperCase()) {
      found = true;
      return { ...k, usedLines: 0 };
    }
    return k;
  });

  if (!found) {
    return res.status(404).json({ error: 'Key not found' });
  }

  saveUsageConfig(config);
  res.json({ success: true, accessKeys: config.accessKeys });
});

app.post('/api/admin/access-keys/delete', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { keyId } = req.body;
  const config = getUsageConfig();
  const prevLen = config.accessKeys?.length || 0;

  config.accessKeys = (config.accessKeys || []).filter(
    (k: any) => k.id !== keyId && k.code?.trim().toUpperCase() !== (keyId || '').trim().toUpperCase()
  );

  if (config.accessKeys.length === prevLen) {
    return res.status(404).json({ error: 'Key not found' });
  }

  saveUsageConfig(config);
  res.json({ success: true, accessKeys: config.accessKeys });
});

// Batch delete VIP access keys (selected, expired/used-up, or all)
app.post('/api/admin/access-keys/delete-batch', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { keyIds, expiredOnly, all } = req.body;
  const config = getUsageConfig();
  const currentKeys = config.accessKeys || [];
  const prevCount = currentKeys.length;

  if (all) {
    config.accessKeys = [];
  } else if (expiredOnly) {
    const now = Date.now();
    config.accessKeys = currentKeys.filter((k: any) => {
      const isExpired = k.expiresAt && new Date(k.expiresAt).getTime() < now;
      const isExhausted = k.maxLines > 0 && (k.usedLines || 0) >= k.maxLines;
      return !isExpired && !isExhausted;
    });
  } else if (Array.isArray(keyIds) && keyIds.length > 0) {
    const idSet = new Set(keyIds.map((id: string) => String(id).trim().toUpperCase()));
    config.accessKeys = currentKeys.filter((k: any) => {
      const idMatch = idSet.has(String(k.id).toUpperCase());
      const codeMatch = k.code && idSet.has(String(k.code).trim().toUpperCase());
      return !idMatch && !codeMatch;
    });
  } else {
    return res.status(400).json({ error: 'ဖျက်မည့် Key များကို ရွေးချယ်ပေးပါ' });
  }

  const deletedCount = prevCount - (config.accessKeys?.length || 0);
  saveUsageConfig(config);
  res.json({
    success: true,
    deletedCount,
    accessKeys: config.accessKeys,
    message: `${deletedCount} ခုသော VIP Key(s) ကို အောင်မြင်စွာ ဖျက်ပစ်ပြီးပါပြီ`,
  });
});

// Admin Gemini Key Pool APIs (Multi-Key Management)
app.get('/api/admin/gemini-keys', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const config = getUsageConfig();
  const pool = config.geminiKeyPool || [];
  const now = Date.now();

  const maskedKeys = pool.map((k: any) => ({
    id: k.id,
    label: k.label || 'Gemini Key',
    maskedKey: maskApiKey(k.key),
    status: k.status,
    cooldownUntil: k.cooldownUntil,
    cooldownRemainingSeconds: k.cooldownUntil && k.cooldownUntil > now ? Math.ceil((k.cooldownUntil - now) / 1000) : 0,
    successCount: k.successCount || 0,
    errorCount: k.errorCount || 0,
    lastUsedAt: k.lastUsedAt || null,
    lastErrorMsg: k.lastErrorMsg || null,
    createdAt: k.createdAt || new Date().toISOString(),
  }));

  const activeCount = pool.filter((k: any) => k.status === 'active').length;
  const cooldownCount = pool.filter((k: any) => k.status === 'cooldown' && k.cooldownUntil && k.cooldownUntil > now).length;
  const errorCount = pool.filter((k: any) => k.status === 'error' || k.status === 'disabled').length;

  res.json({
    keys: maskedKeys,
    totalKeys: pool.length,
    activeCount,
    cooldownCount,
    errorCount,
    strategy: config.loadBalancingStrategy || 'round_robin',
  });
});

// Add single or bulk API keys
app.post('/api/admin/gemini-keys/add', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { rawKeys, labelPrefix } = req.body;
  if (!rawKeys || typeof rawKeys !== 'string' || !rawKeys.trim()) {
    return res.status(400).json({ error: 'Gemini API Key(s) ထည့်သွင်းပေးပါ' });
  }

  const config = getUsageConfig();
  if (!Array.isArray(config.geminiKeyPool)) {
    config.geminiKeyPool = [];
  }

  // Parse lines or comma separated tokens
  const lines = rawKeys.split(/[\n\r,;\t]+/);
  const newItems: any[] = [];
  let skippedDuplicates = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx].trim();
    if (!raw || raw.length < 15) continue;

    // Check if key already exists in pool
    const existing = config.geminiKeyPool.find((k: any) => k.key === raw);
    if (existing) {
      skippedDuplicates++;
      continue;
    }

    const keyIndex = config.geminiKeyPool.length + newItems.length + 1;
    const label = labelPrefix ? `${labelPrefix} #${keyIndex}` : `Gemini Pool Key #${keyIndex}`;

    const newItem = {
      id: 'gkey_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      key: raw,
      label,
      status: 'active',
      cooldownUntil: null,
      successCount: 0,
      errorCount: 0,
      lastUsedAt: null,
      lastErrorMsg: null,
      createdAt: new Date().toISOString(),
    };

    newItems.push(newItem);
  }

  if (newItems.length === 0 && skippedDuplicates > 0) {
    return res.status(400).json({ error: 'ထည့်သွင်းသော Key များ အားလုံး Pool ထဲတွင် ရှိပြီးသား ဖြစ်နေပါသည်' });
  }

  if (newItems.length === 0) {
    return res.status(400).json({ error: 'မှန်ကန်သော Gemini API Key မတွေ့ရှိပါ' });
  }

  config.geminiKeyPool.push(...newItems);
  saveUsageConfig(config);

  res.json({
    success: true,
    addedCount: newItems.length,
    skippedDuplicates,
    message: `${newItems.length} Key(s) ကို API Key Pool သို့ အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ`,
  });
});

// Toggle key enable/disabled or reset cooldown
app.post('/api/admin/gemini-keys/toggle', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { keyId } = req.body;
  const config = getUsageConfig();
  const pool = config.geminiKeyPool || [];
  let found = false;

  config.geminiKeyPool = pool.map((k: any) => {
    if (k.id === keyId) {
      found = true;
      let nextStatus = k.status === 'active' ? 'disabled' : 'active';
      return { ...k, status: nextStatus, cooldownUntil: null, lastErrorMsg: null };
    }
    return k;
  });

  if (!found) {
    return res.status(404).json({ error: 'Key not found' });
  }

  saveUsageConfig(config);
  res.json({ success: true, message: 'Key status updated' });
});

// Delete a key from pool
app.post('/api/admin/gemini-keys/delete', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { keyId } = req.body;
  const config = getUsageConfig();
  const pool = config.geminiKeyPool || [];
  const prevLen = pool.length;

  config.geminiKeyPool = pool.filter((k: any) => k.id !== keyId);

  if (config.geminiKeyPool.length === prevLen) {
    return res.status(404).json({ error: 'Key not found' });
  }

  saveUsageConfig(config);
  res.json({ success: true, message: 'Key removed from pool' });
});

// Batch delete Gemini Key Pool items (selected keys, error keys, or all keys)
app.post('/api/admin/gemini-keys/delete-batch', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { keyIds, onlyErrors, onlyDisabled, all } = req.body;
  const config = getUsageConfig();
  const pool = config.geminiKeyPool || [];
  const prevCount = pool.length;

  if (all) {
    config.geminiKeyPool = [];
  } else if (onlyErrors) {
    config.geminiKeyPool = pool.filter((k: any) => k.status !== 'error' && !k.lastErrorMsg?.includes('Invalid'));
  } else if (onlyDisabled) {
    config.geminiKeyPool = pool.filter((k: any) => k.status !== 'disabled');
  } else if (Array.isArray(keyIds) && keyIds.length > 0) {
    const idSet = new Set(keyIds.map((id: string) => String(id).trim()));
    config.geminiKeyPool = pool.filter((k: any) => !idSet.has(String(k.id)));
  } else {
    return res.status(400).json({ error: 'ဖျက်မည့် Key များကို ရွေးချယ်ပေးပါ' });
  }

  const deletedCount = prevCount - (config.geminiKeyPool?.length || 0);
  saveUsageConfig(config);
  res.json({
    success: true,
    deletedCount,
    remainingCount: config.geminiKeyPool?.length || 0,
    message: `${deletedCount} ခုသော Gemini Key(s) ကို Key Pool မှ အောင်မြင်စွာ ဖျက်ပစ်ပြီးပါပြီ`,
  });
});

// Reset key success/error counters
app.post('/api/admin/gemini-keys/reset-stats', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { keyId } = req.body;
  const config = getUsageConfig();
  const pool = config.geminiKeyPool || [];

  config.geminiKeyPool = pool.map((k: any) => {
    if (!keyId || k.id === keyId) {
      return {
        ...k,
        successCount: 0,
        errorCount: 0,
        status: k.status === 'error' ? 'active' : k.status,
        cooldownUntil: null,
        lastErrorMsg: null,
      };
    }
    return k;
  });

  saveUsageConfig(config);
  res.json({ success: true, message: 'Stats reset successfully' });
});

// Test single key in pool
app.post('/api/admin/gemini-keys/test', async (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { keyId } = req.body;
  const config = getUsageConfig();
  const pool = config.geminiKeyPool || [];
  const target = pool.find((k: any) => k.id === keyId);

  if (!target || !target.key) {
    return res.status(404).json({ error: 'Key not found in pool' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: target.key.trim() });
    const testModels = ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
    let verifiedModel = '';

    for (const m of testModels) {
      try {
        const result = await ai.models.generateContent({
          model: m,
          contents: 'Ping test. Reply: OK',
        });
        if (result.text) {
          verifiedModel = m;
          break;
        }
      } catch (mErr) {
        // try next
      }
    }

    if (verifiedModel) {
      target.status = 'active';
      target.cooldownUntil = null;
      target.lastErrorMsg = null;
      target.lastUsedAt = new Date().toISOString();
      saveUsageConfig(config);
      return res.json({ valid: true, model: verifiedModel, message: `Key is Active & Valid (${verifiedModel})` });
    }

    throw new Error('Gemini API did not respond');
  } catch (err: any) {
    target.status = 'error';
    target.lastErrorMsg = err.message || 'API Validation Error';
    saveUsageConfig(config);
    return res.status(400).json({ valid: false, error: target.lastErrorMsg });
  }
});

// Test all keys in pool
app.post('/api/admin/gemini-keys/test-all', async (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const config = getUsageConfig();
  const pool = config.geminiKeyPool || [];

  if (pool.length === 0) {
    return res.json({ total: 0, valid: 0, invalid: 0, results: [] });
  }

  let validCount = 0;
  let invalidCount = 0;
  const results: any[] = [];

  for (const item of pool) {
    if (item.status === 'disabled') {
      results.push({ id: item.id, valid: false, status: 'disabled', error: 'Disabled by admin' });
      continue;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: item.key.trim() });
      const testModels = ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
      let ok = false;
      let okModel = '';

      for (const m of testModels) {
        try {
          const resp = await ai.models.generateContent({
            model: m,
            contents: 'Test OK',
          });
          if (resp.text) {
            ok = true;
            okModel = m;
            break;
          }
        } catch (e) {
          // next
        }
      }

      if (ok) {
        item.status = 'active';
        item.cooldownUntil = null;
        item.lastErrorMsg = null;
        validCount++;
        results.push({ id: item.id, valid: true, model: okModel });
      } else {
        item.status = 'error';
        item.lastErrorMsg = 'Failed response';
        invalidCount++;
        results.push({ id: item.id, valid: false, error: 'No response' });
      }
    } catch (e: any) {
      item.status = 'error';
      item.lastErrorMsg = e.message || 'Validation failed';
      invalidCount++;
      results.push({ id: item.id, valid: false, error: item.lastErrorMsg });
    }
  }

  saveUsageConfig(config);

  res.json({
    total: pool.length,
    valid: validCount,
    invalid: invalidCount,
    results,
    message: `Test Complete: ${validCount} Active, ${invalidCount} Error`,
  });
});

// Update load balancing strategy
app.post('/api/admin/gemini-keys/update-strategy', (req, res) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized: Admin login required' });
  }
  const { strategy } = req.body;
  if (!['round_robin', 'least_used', 'random'].includes(strategy)) {
    return res.status(400).json({ error: 'Invalid strategy' });
  }
  const config = getUsageConfig();
  config.loadBalancingStrategy = strategy;
  saveUsageConfig(config);
  res.json({ success: true, strategy });
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
    const accessCode = (settings?.accessCode || (req.headers['x-access-code'] as string) || '').trim().toUpperCase();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const usageConfig = getUsageConfig();
    let effectiveApiKey = (customApiKey && customApiKey.trim()) || '';
    let matchedAccessKey: any = null;

    // 1. If user didn't supply their own API Key, check access code & system rules
    if (!effectiveApiKey) {
      if (accessCode) {
        matchedAccessKey = usageConfig.accessKeys?.find(
          (k: any) => k.code?.trim().toUpperCase() === accessCode
        );

        if (!matchedAccessKey) {
          return res.status(403).json({
            error: 'ထည့်သွင်းထားသော VIP Access Key မတွေ့ရှိပါ သို့မဟုတ် မမှန်ကန်ပါ',
            needAccessKey: true,
          });
        }

        if (matchedAccessKey.status === 'revoked') {
          return res.status(403).json({
            error: 'ဤ Access Key ကို Admin မှ ပယ်ဖျက် (Revoke) ထားပါသည်',
            needAccessKey: true,
          });
        }

        if (matchedAccessKey.expiresAt) {
          const expDate = new Date(matchedAccessKey.expiresAt).getTime();
          if (Date.now() > expDate) {
            return res.status(403).json({
              error: 'ဤ VIP Access Key သည် သက်တမ်းကုန်ဆုံးသွားပါပြီ',
              needAccessKey: true,
            });
          }
        }

        if (matchedAccessKey.maxLines > 0 && matchedAccessKey.usedLines >= matchedAccessKey.maxLines) {
          return res.status(403).json({
            error: `ဤ VIP Key ၏ စာကြောင်းရေ (${matchedAccessKey.maxLines.toLocaleString()} ကြောင်း) အားလုံး ကုန်ဆုံးသွားပါပြီ`,
            needAccessKey: true,
          });
        }

        // Key is valid -> use admin provided key or env key
        effectiveApiKey = (usageConfig.adminDefaultGeminiKey && usageConfig.adminDefaultGeminiKey.trim()) || process.env.GEMINI_API_KEY || '';
      } else {
        // Free user without VIP key
        if (usageConfig.requireAccessKey) {
          return res.status(403).json({
            error: 'စနစ်ကို အသုံးပြုရန် VIP Access Key သို့မဟုတ် မိမိ၏ Gemini API Key လိုအပ်ပါသည်',
            needAccessKey: true,
          });
        }

        effectiveApiKey = (usageConfig.adminDefaultGeminiKey && usageConfig.adminDefaultGeminiKey.trim()) || process.env.GEMINI_API_KEY || '';
      }
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

    let responseText = '';
    let success = false;
    let lastError: any = null;

    // Supported model fallback order
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
    ];

    // Determine Key Candidates
    let keyCandidates: any[] = [];
    if (effectiveApiKey && customApiKey) {
      // User supplied their own private key
      keyCandidates = [{ id: 'user-key', key: effectiveApiKey, label: 'Custom User Key' }];
    } else {
      // Use Admin Multi-Key Pool with smart rotation & auto cooldown clearance
      const healthyPoolKeys = getHealthyKeyCandidates(usageConfig);
      if (healthyPoolKeys.length > 0) {
        keyCandidates = healthyPoolKeys;
      } else if (usageConfig.adminDefaultGeminiKey && usageConfig.adminDefaultGeminiKey.trim()) {
        keyCandidates = [{ id: 'admin-default', key: usageConfig.adminDefaultGeminiKey.trim(), label: 'Admin Default Key' }];
      } else if (process.env.GEMINI_API_KEY) {
        keyCandidates = [{ id: 'env-default', key: process.env.GEMINI_API_KEY, label: 'Server ENV Key' }];
      }
    }

    if (keyCandidates.length === 0) {
      return res.status(503).json({
        error: 'Gemini API Key မရှိသေးပါ သို့မဟုတ် Key Pool ရှိ Key အားလုံး Cooldown ဖြစ်နေပါသည် (၁ မိနစ်စောင့်ပါ သို့မဟုတ် ကိုယ်ပိုင် Key ထည့်ပါ)',
        isRateLimit: true,
      });
    }

    // Try candidates in pool (Auto Failover)
    for (const candidate of keyCandidates) {
      if (success) break;

      let candidateAi: GoogleGenAI;
      try {
        candidateAi = getGeminiClient(candidate.key);
      } catch (e: any) {
        continue;
      }

      for (const modelName of modelsToTry) {
        if (success) break;
        try {
          const response = await candidateAi.models.generateContent({
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
            // Record success for this pool key
            if (candidate.id !== 'user-key' && usageConfig.geminiKeyPool) {
              const matchedInConfig = usageConfig.geminiKeyPool.find((k: any) => k.id === candidate.id);
              if (matchedInConfig) {
                matchedInConfig.successCount = (matchedInConfig.successCount || 0) + 1;
                matchedInConfig.lastUsedAt = new Date().toISOString();
                matchedInConfig.status = 'active';
                matchedInConfig.cooldownUntil = null;
                matchedInConfig.lastErrorMsg = null;
                saveUsageConfig(usageConfig);
              }
            }
            break;
          }
        } catch (err: any) {
          lastError = err;
          const isRateLimit =
            err?.status === 'RESOURCE_EXHAUSTED' ||
            err?.code === 429 ||
            (err?.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED')));

          if (isRateLimit) {
            console.warn(`[${modelName}] [Key ${maskApiKey(candidate.key)}] Rate limit hit.`);
          } else {
            console.warn(`[${modelName}] [Key ${maskApiKey(candidate.key)}] Error: ${err?.message || err}`);
          }
        }
      }

      // If this candidate failed across all models, update its health status in pool
      if (!success && candidate.id !== 'user-key' && usageConfig.geminiKeyPool) {
        const matchedInConfig = usageConfig.geminiKeyPool.find((k: any) => k.id === candidate.id);
        if (matchedInConfig) {
          matchedInConfig.errorCount = (matchedInConfig.errorCount || 0) + 1;
          const isRateLimit =
            lastError?.status === 'RESOURCE_EXHAUSTED' ||
            lastError?.code === 429 ||
            (lastError?.message && (lastError.message.includes('429') || lastError.message.includes('quota') || lastError.message.includes('RESOURCE_EXHAUSTED')));

          if (isRateLimit) {
            matchedInConfig.status = 'cooldown';
            matchedInConfig.cooldownUntil = Date.now() + 60000; // 1 min cooldown
            matchedInConfig.lastErrorMsg = `429 Rate Limit (Cooldown 1 min)`;
          } else if (lastError?.message && (lastError.message.includes('API_KEY_INVALID') || lastError.message.includes('400'))) {
            matchedInConfig.status = 'error';
            matchedInConfig.lastErrorMsg = 'Invalid API Key';
          }
          saveUsageConfig(usageConfig);
          console.warn(`[Auto-Failover] Key ${maskApiKey(candidate.key)} in cooldown. Trying next key in pool...`);
        }
      }
    }

    if (!success) {
      const isRateLimit =
        lastError?.status === 'RESOURCE_EXHAUSTED' ||
        lastError?.code === 429 ||
        (lastError?.message && (lastError.message.includes('429') || lastError.message.includes('quota') || lastError.message.includes('RESOURCE_EXHAUSTED')));

      if (isRateLimit) {
        return res.status(429).json({
          error: 'Gemini API Rate Limit hit. Retrying automatically across Key Pool...',
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

    // Deduct translated lines from matched access key if applicable
    let keyUsageInfo: any = null;
    if (matchedAccessKey) {
      try {
        const freshConfig = getUsageConfig();
        const foundIndex = freshConfig.accessKeys?.findIndex(
          (k: any) => k.id === matchedAccessKey.id || k.code?.trim().toUpperCase() === matchedAccessKey.code?.trim().toUpperCase()
        );
        if (foundIndex !== -1 && freshConfig.accessKeys) {
          freshConfig.accessKeys[foundIndex].usedLines = (freshConfig.accessKeys[foundIndex].usedLines || 0) + items.length;
          saveUsageConfig(freshConfig);
          keyUsageInfo = {
            code: freshConfig.accessKeys[foundIndex].code,
            usedLines: freshConfig.accessKeys[foundIndex].usedLines,
            maxLines: freshConfig.accessKeys[foundIndex].maxLines,
            remainingLines: freshConfig.accessKeys[foundIndex].maxLines > 0
              ? Math.max(0, freshConfig.accessKeys[foundIndex].maxLines - freshConfig.accessKeys[foundIndex].usedLines)
              : null,
          };
        }
      } catch (err) {
        console.warn('Could not update key usage lines:', err);
      }
    }

    res.json({
      translations: parsedData.translations || [],
      keyUsage: keyUsageInfo,
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
