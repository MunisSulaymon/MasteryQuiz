/**
 * Telegram Mini App (TMA) Service
 * Provides safe integration with Telegram WebApp JavaScript SDK
 */

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          user?: TelegramUser;
          start_param?: string;
          chat_instance?: string;
          chat_type?: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: TelegramThemeParams;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        shareToStory?: (media_url: string, params?: Record<string, unknown>) => void;
        ready: () => void;
        expand: () => void;
        close: () => void;
      };
    };
  }
}

/**
 * Check if the application is currently running inside the Telegram WebApp environment
 */
export function isRunningInTelegram(): boolean {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData);
}

/**
 * Access the WebApp object safely
 */
export function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

/**
 * Retrieve user info from Telegram initData
 */
export function getTelegramUser(): TelegramUser | null {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user || null;
}

/**
 * Get start_param passed to the Mini App (e.g., ?startapp=pack_123 or t.me/bot?startapp=pack_123)
 */
export function getTelegramStartParam(): string | null {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.start_param) {
    return tg.initDataUnsafe.start_param;
  }
  // Fallback to URL search parameters for web links
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('startapp') || params.get('tgWebAppStartParam') || null;
  }
  return null;
}

/**
 * Initialize Telegram WebApp settings (expand viewport, notify ready)
 */
export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (tg.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {
      console.warn('[Telegram TMA] Failed to initialize WebApp settings:', e);
    }
  }
}

/**
 * Tactile Haptic Feedback Bridge
 */
export const telegramHaptics = {
  tap: (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    } catch {}
  },
  success: () => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    } catch {}
  },
  error: () => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    } catch {}
  },
  selection: () => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    } catch {}
  }
};

/**
 * Share a study pack directly to Telegram group chats or friends
 */
export function sharePackToTelegram(pack: { id: string; name: string; questionCount: number }) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mastery-quiz-three.vercel.app';
  const shareUrl = `${baseUrl}/exam?startapp=pack_${pack.id}#/packs`;
  const shareText = `🎓 "${pack.name}" test to'plamini birga o'rganamiz!\n📊 ${pack.questionCount} ta savol (Leitner tizimi bo'yicha 100% o'zlashtirish)\n\n👇 Boshlash uchun bosing:`;

  const telegramShareLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

  const tg = getTelegramWebApp();
  if (tg && typeof tg.openTelegramLink === 'function') {
    tg.openTelegramLink(telegramShareLink);
  } else {
    window.open(telegramShareLink, '_blank', 'noopener,noreferrer');
  }
}
