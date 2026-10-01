/**
 * Telegram Bot & Mini App Server Engine
 * Lightweight, zero-dependency Telegram Bot API client using native Node.js fetch
 */

export interface BotState {
  configured: boolean;
  active: boolean;
  username: string | null;
  botName: string | null;
  appUrl: string;
  error?: string | null;
}

let botState: BotState = {
  configured: false,
  active: false,
  username: null,
  botName: null,
  appUrl: process.env.APP_URL || 'https://mastery-quiz-three.vercel.app',
  error: null
};

let pollingActive = false;
let lastUpdateId = 0;

/**
 * Make an HTTP request to Telegram Bot API
 */
async function callTelegramApi(token: string, method: string, payload?: Record<string, any>) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const data = await response.json();
  return data;
}

/**
 * Initialize and verify Telegram Bot
 */
export async function initTelegramBot(): Promise<BotState> {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  const envUsername = process.env.TELEGRAM_BOT_USERNAME || 'MasteryQuizBot';
  const appUrl = process.env.APP_URL || 'https://mastery-quiz-three.vercel.app';

  botState.appUrl = appUrl;

  if (!token || token.trim() === '') {
    console.log('[Telegram Bot] TELEGRAM_BOT_TOKEN is not set in .env. Bot engine in standby.');
    botState = {
      configured: false,
      active: false,
      username: envUsername,
      botName: null,
      appUrl,
      error: 'TELEGRAM_BOT_TOKEN is not configured in .env'
    };
    return botState;
  }

  try {
    console.log('[Telegram Bot] Connecting to Telegram Bot API...');
    const meRes = await callTelegramApi(token, 'getMe');

    if (!meRes.ok) {
      console.error('[Telegram Bot] Failed to authenticate with Telegram:', meRes.description);
      botState = {
        configured: true,
        active: false,
        username: envUsername,
        botName: null,
        appUrl,
        error: meRes.description || 'Invalid Bot Token'
      };
      return botState;
    }

    const botInfo = meRes.result;
    console.log(`[Telegram Bot] Successfully connected as @${botInfo.username} (${botInfo.first_name})`);

    botState = {
      configured: true,
      active: true,
      username: botInfo.username,
      botName: botInfo.first_name,
      appUrl,
      error: null
    };

    // 1. Configure Telegram Chat Menu Button (Persistent WebApp Menu Button)
    try {
      const menuRes = await callTelegramApi(token, 'setChatMenuButton', {
        menu_button: {
          type: 'web_app',
          text: '📱 MasteryQuiz',
          web_app: {
            url: appUrl
          }
        }
      });
      if (menuRes.ok) {
        console.log(`[Telegram Bot] Configured native WebApp menu button pointing to ${appUrl}`);
      }
    } catch (e) {
      console.warn('[Telegram Bot] Could not set chat menu button:', e);
    }

    // 2. Set Bot Commands
    try {
      await callTelegramApi(token, 'setMyCommands', {
        commands: [
          { command: 'start', description: "MasteryQuiz Mini App'ni ishga tushirish" },
          { command: 'quiz', description: "Tezkor sinov va test mashqi" },
          { command: 'packs', description: "Mavjud fanlar to'plamlari ro'yxati" },
          { command: 'help', description: "Qo'llanma va Leitner tizimi" }
        ]
      });
      console.log('[Telegram Bot] Bot command list registered.');
    } catch (e) {
      console.warn('[Telegram Bot] Could not set bot commands:', e);
    }

    // 3. Start Polling for updates if not already polling
    if (!pollingActive) {
      pollingActive = true;
      startLongPolling(token, appUrl);
    }

    return botState;
  } catch (err: any) {
    console.error('[Telegram Bot] Unexpected initialization error:', err.message);
    botState = {
      configured: true,
      active: false,
      username: envUsername,
      botName: null,
      appUrl,
      error: err.message
    };
    return botState;
  }
}

/**
 * Handle incoming updates from Telegram
 */
export async function handleTelegramMessage(token: string, appUrl: string, message: any) {
  if (!message || !message.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  const userName = message.from?.first_name || 'Talaba';

  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const startParam = parts.length > 1 ? parts[1] : null;

    let deepLinkUrl = appUrl;
    if (startParam) {
      deepLinkUrl = `${appUrl}/exam?startapp=${encodeURIComponent(startParam)}#/packs`;
    }

    const welcomeMsg = `Assalomu alaykum, <b>${userName}</b>!\n\n` +
      `🎓 <b>MasteryQuiz</b> — Oliy ta'lim talabalari va o'quvchilar uchun 100% bepul test hamda imtihon simulyatori.\n\n` +
      `🧠 <b>Imkoniyatlar:</b>\n` +
      `• Leitner 3-quti tizimi (savollarni 100% eslab qolish)\n` +
      `• Rasmiy HEMIS imtihoni formati (25 savol / 25 daqiqa)\n` +
      `• Guruhlarda do'stlar bilan bellashish\n` +
      `• To'liq oflayn ishlash va bulutli sinxronizatsiya\n\n` +
      `👇 O'qishni boshlash uchun quyidagi tugmani bosing:`;

    await callTelegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text: welcomeMsg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚀 MasteryQuiz ilovasini ochish',
              web_app: { url: deepLinkUrl }
            }
          ],
          [
            {
              text: '📚 To\'plamlar',
              web_app: { url: `${appUrl}#/packs` }
            },
            {
              text: '📝 HEMIS Sinov',
              web_app: { url: `${appUrl}#/exam` }
            }
          ],
          [
            {
              text: '👥 Guruhga qo\'shish',
              url: `https://t.me/${botState.username || 'MasteryQuizBot'}?startgroup=true`
            }
          ]
        ]
      }
    });
    return;
  }

  if (text.startsWith('/quiz')) {
    const quizMsg = `⚡ <b>Tezkor Sinov Rejimi</b>\n\n` +
      `Bilimingizni sinashga tayyormisiz? Istalgan to'plamdan tezkor test topshirishingiz mumkin.\n\n` +
      `Taymer va savollar sonini sozlashingiz mumkin.`;

    await callTelegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text: quizMsg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '⚡ Testni boshlash',
              web_app: { url: `${appUrl}#/packs` }
            }
          ]
        ]
      }
    });
    return;
  }

  if (text.startsWith('/packs')) {
    const packsMsg = `📚 <b>Test To'plamlari</b>\n\n` +
      `Siz o'z fanlaringiz testlarini kiritishingiz yoki AI generatori orqali yangi to'plamlar tuzishingiz mumkin.\n\n` +
      `Barcha to'plamlaringiz avtomatik saqlanadi.`;

    await callTelegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text: packsMsg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📂 To\'plamlarni ko\'rish',
              web_app: { url: `${appUrl}#/packs` }
            }
          ]
        ]
      }
    });
    return;
  }

  if (text.startsWith('/help')) {
    const helpMsg = `ℹ️ <b>MasteryQuiz Qo'llanma</b>\n\n` +
      `<b>1. Leitner usuli qanday ishlaydi?</b>\n` +
      `Savolga to'g'ri javob bersangiz keyingi qutiga o'tadi. Xato qilsangiz — yana 1-qutiga qaytadi.\n\n` +
      `<b>2. Guruhda qanday ishlatiladi?</b>\n` +
      `Botni talabalar guruhiga qo'shing va do'stlaringiz bilan test natijalarini ulashing.\n\n` +
      `<b>3. Bot buyruqlari:</b>\n` +
      `/start - Bosh menyu va ilovani ochish\n` +
      `/quiz - Tezkor test topshirish\n` +
      `/packs - Mavjud to'plamlar\n` +
      `/help - Qo'llanma`;

    await callTelegramApi(token, 'sendMessage', {
      chat_id: chatId,
      text: helpMsg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📱 Ilovada to\'liq qo\'llanmani ochish',
              web_app: { url: appUrl }
            }
          ]
        ]
      }
    });
    return;
  }

  // Default fallback
  await callTelegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: `Salom! MasteryQuiz ilovasini ishga tushirish uchun quyidagi tugmani bosing:`,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🚀 MasteryQuiz ilovasi',
            web_app: { url: appUrl }
          }
        ]
      ]
    }
  });
}

/**
 * Long-polling worker for local/dev updates
 */
async function startLongPolling(token: string, appUrl: string) {
  console.log('[Telegram Bot] Starting update long-polling worker...');

  const poll = async () => {
    if (!pollingActive) return;
    try {
      const res = await callTelegramApi(token, 'getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 20
      });

      if (res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          lastUpdateId = update.update_id;
          if (update.message) {
            await handleTelegramMessage(token, appUrl, update.message);
          }
        }
      }
    } catch (e: any) {
      // Ignore network aborts or transient errors
      await new Promise(r => setTimeout(r, 3000));
    }

    if (pollingActive) {
      setTimeout(poll, 500);
    }
  };

  poll();
}

/**
 * Return current Telegram Bot state for API health endpoints
 */
export function getTelegramBotStatus(): BotState {
  return botState;
}
