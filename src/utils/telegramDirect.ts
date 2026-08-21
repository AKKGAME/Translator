/**
 * Direct Telegram Bot API helper for browser and static/serverless hosting (Vercel, Hostinger, etc.)
 * Works 100% reliably in browser environments without depending on a custom Node.js Express server.
 */

export const PERMANENT_TELEGRAM_BOT_TOKEN = '8086264754:AAE1BrjRniygo4S0MpftlXjfVIW0HhZxRDQ';
export const PERMANENT_TELEGRAM_CHANNEL_ID = '-1003174988160';

export interface TelegramTestResult {
  success: boolean;
  message: string;
  botName?: string;
  chatTitle?: string;
  error?: string;
}

export interface SendTelegramOptions {
  botToken?: string;
  channelId?: string;
  fileName: string;
  content: string;
  caption?: string;
}

/**
 * Format telegram error descriptions into clear Burmese explanations
 */
function parseTelegramError(errDesc: string): string {
  const lower = errDesc.toLowerCase();
  if (lower.includes('unauthorized') || lower.includes('token')) {
    return 'Telegram Bot Token မမှန်ကန်ပါ သို့မဟုတ် သက်တမ်းကုန်နေပါသည် (@BotFather မှ Token ပြန်စစ်ပါ)';
  }
  if (lower.includes('chat not found')) {
    return 'Channel ID / Username မတွေ့ရှိပါ (Channel ထဲသို့ Bot ကို Admin အဖြစ် ထည့်သွင်းထားရန် လိုအပ်ပါသည်)';
  }
  if (lower.includes('not enough rights') || lower.includes('admin') || lower.includes('post messages')) {
    return 'Bot တွင် Channel ထဲသို့ မက်ဆေ့ခ်ျပို့ရန် Post Messages (Admin) ခွင့်ပြုချက် မရှိသေးပါ';
  }
  if (lower.includes('bot was kicked') || lower.includes('blocked')) {
    return 'Bot ကို Channel မှ ဖယ်ရှားထားပါသည်';
  }
  return errDesc;
}

/**
 * Test Telegram Bot and Channel connection directly from browser or via server
 */
export async function testTelegramConnection(
  botToken?: string,
  channelId?: string
): Promise<TelegramTestResult> {
  const token = (botToken?.trim()) || PERMANENT_TELEGRAM_BOT_TOKEN;
  const chat = (channelId?.trim()) || PERMANENT_TELEGRAM_CHANNEL_ID;

  if (!token) {
    return { success: false, message: 'Telegram Bot Token ထည့်သွင်းပေးပါ' };
  }
  if (!chat) {
    return { success: false, message: 'Telegram Channel ID သို့မဟုတ် Username ထည့်သွင်းပေးပါ' };
  }

  // 1. Verify Bot Token via Telegram getMe API
  let botUsername = '';
  try {
    const getMeRes = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/getMe`);
    const getMeData = await getMeRes.json().catch(() => null);

    if (!getMeRes.ok || !getMeData?.ok) {
      const errMsg = getMeData?.description || 'Bot Token မမှန်ကန်ပါ';
      return {
        success: false,
        message: parseTelegramError(errMsg),
      };
    }
    botUsername = getMeData.result?.username ? `@${getMeData.result.username}` : getMeData.result?.first_name;
  } catch (err: any) {
    return {
      success: false,
      message: `Telegram API သို့ ချိတ်ဆက်၍ မရပါ: ${err.message || err}`,
    };
  }

  // 2. Test sending a message to the target Channel
  try {
    const timeStr = new Date().toLocaleTimeString('my-MM', { hour: '2-digit', minute: '2-digit' });
    const sendRes = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: `🤖 <b>AnimeGabar Subtitle Translator Bot ချိတ်ဆက်မှု စမ်းသပ်ခြင်း</b>\n\n✅ ချိတ်ဆက်မှု အောင်မြင်ပါသည်!\n⏰ အချိန်: ${timeStr}\n\n<i>(ဤမက်ဆေ့ခ်ျသည် စနစ်မှ စမ်းသပ်ပေးပို့ထားသော မက်ဆေ့ခ်ျဖြစ်ပါသည်)</i>`,
        parse_mode: 'HTML',
      }),
    });

    const sendData = await sendRes.json().catch(() => null);
    if (!sendRes.ok || !sendData?.ok) {
      const errMsg = sendData?.description || 'Channel သို့ မက်ဆေ့ခ်ျပို့၍ မရပါ';
      return {
        success: false,
        message: parseTelegramError(errMsg),
      };
    }

    const title = sendData.result?.chat?.title || chat;
    return {
      success: true,
      message: `ချိတ်ဆက်မှု အောင်မြင်ပါသည်! Bot: ${botUsername} | Channel: "${title}" သို့ စမ်းသပ်မက်ဆေ့ခ်ျ ပို့ပြီးပါပြီ။`,
      botName: botUsername,
      chatTitle: title,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Channel သို့ မက်ဆေ့ခ်ျပို့၍ မရပါ: ${err.message || err}`,
    };
  }
}

/**
 * Send Subtitle Document directly to Telegram from browser
 */
export async function sendDocumentToTelegramDirect(
  options: SendTelegramOptions
): Promise<{ success: boolean; message: string; messageId?: number }> {
  const { botToken, channelId, fileName, content, caption } = options;
  const token = (botToken?.trim()) || PERMANENT_TELEGRAM_BOT_TOKEN;
  const chat = (channelId?.trim()) || PERMANENT_TELEGRAM_CHANNEL_ID;

  if (!token || !chat) {
    return { success: false, message: 'Telegram Bot Token နှင့် Channel ID ထည့်သွင်းပေးပါ' };
  }

  try {
    const formData = new FormData();
    formData.append('chat_id', chat);

    // Subtitle document with UTF-8 BOM for Burmese text readability
    const fileBlob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
    formData.append('document', fileBlob, fileName);

    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }

    const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      const errMsg = data?.description || 'Telegram သို့ ဖိုင်ပို့၍ မရပါ';
      return {
        success: false,
        message: parseTelegramError(errMsg),
      };
    }

    return {
      success: true,
      message: 'Telegram Channel သို့ ဖိုင် အောင်မြင်စွာ ပို့ဆောင်ပြီးပါပြီ!',
      messageId: data.result?.message_id,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Telegram သို့ ဖိုင်ပို့ရန် အဆင်မပြေပါ: ${err.message || err}`,
    };
  }
}
