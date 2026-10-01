import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Settings as SettingsIcon, 
  Clock, 
  Layers, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Trash2, 
  RefreshCcw, 
  Check, 
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { dataService, AppSettings, triggerFeedback } from '../../services/dataService';
import { User } from 'firebase/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onRefreshData?: () => void;
}

export default function SettingsModal({ isOpen, onClose, user, onRefreshData }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>(() => dataService.getSettings());
  const [storageStats, setStorageStats] = useState(() => dataService.getStorageStats());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [telegramBotUsername, setTelegramBotUsername] = useState('MasteryQuizBot');
  const [botActive, setBotActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(dataService.getSettings());
      setStorageStats(dataService.getStorageStats());

      fetch('/api/telegram/status')
        .then(r => r.json())
        .then(data => {
          if (data?.username) setTelegramBotUsername(data.username);
          setBotActive(Boolean(data?.active));
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleUpdate = (updates: Partial<AppSettings>) => {
    triggerFeedback('click');
    const updated = { ...settings, ...updates };
    setSettings(updated);
    dataService.updateSettings(updates);
  };

  const handleTestSound = () => {
    triggerFeedback('success');
    showToast("Ovoz effekti chalindi!");
  };

  const handleClearCache = () => {
    triggerFeedback('error');
    dataService.clearGuestCache();
    setStorageStats(dataService.getStorageStats());
    setShowClearConfirm(false);
    showToast("Kesh muvaffaqiyatli tozalandi");
    if (onRefreshData) onRefreshData();
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Modal / Sheet Window */}
      <motion.div
        initial={{ y: '100%', opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden z-10"
      >
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 leading-tight">Sozlamalar</h2>
              <p className="text-xs font-medium text-gray-500">Ilova va o'qish parametrlarini sozlang</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors active:scale-95 cursor-pointer"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-left">
          {/* Section: Study & Quiz Configuration */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>O'rganish & Test vaqti</span>
            </h3>
            
            <div className="bg-gray-50 p-4 rounded-2xl space-y-4 border border-gray-100">
              {/* Question Timer */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-800">Savol taymeri</span>
                  <span className="text-xs font-black text-indigo-600">
                    {settings.questionTimer === 0 ? "Cheklovsiz" : `${settings.questionTimer} soniya`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-200/60 rounded-xl">
                  {[
                    { label: '15s', value: 15 },
                    { label: '20s', value: 20 },
                    { label: '30s', value: 30 },
                    { label: 'O\'chiq', value: 0 }
                  ].map(item => (
                    <button
                      key={item.value}
                      onClick={() => handleUpdate({ questionTimer: item.value })}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        settings.questionTimer === item.value
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Set Size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-800">Standart to'plam hajmi</span>
                  <span className="text-xs font-black text-indigo-600">{settings.defaultSetSize} ta savol</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-200/60 rounded-xl">
                  {[10, 20, 25, 30].map(size => (
                    <button
                      key={size}
                      onClick={() => handleUpdate({ defaultSetSize: size })}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        settings.defaultSetSize === size
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {size} ta
                    </button>
                  ))}
                </div>
              </div>

              {/* Exam Time Limit */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-800">HEMIS Sinov vaqti</span>
                  <span className="text-xs font-black text-indigo-600">{settings.examTimeMinutes} daqiqa</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-200/60 rounded-xl">
                  {[20, 25, 30].map(minutes => (
                    <button
                      key={minutes}
                      onClick={() => handleUpdate({ examTimeMinutes: minutes })}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        settings.examTimeMinutes === minutes
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {minutes} daq
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Audio & Haptics */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Ovoz & Taktil effektlar</span>
            </h3>

            <div className="bg-gray-50 p-4 rounded-2xl space-y-3 border border-gray-100">
              {/* Sound Toggle */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${settings.soundEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-400'}`}>
                    {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Ovoz effektlari</p>
                    <p className="text-xs text-gray-500">To'g'ri va xato javoblarda tovush</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {settings.soundEnabled && (
                    <button
                      onClick={handleTestSound}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      Sinash
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdate({ soundEnabled: !settings.soundEnabled })}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      settings.soundEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Haptic Toggle */}
              <div className="flex items-center justify-between py-1 border-t border-gray-200/60 pt-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${settings.hapticsEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Taktil tebranish (Vibration)</p>
                    <p className="text-xs text-gray-500">Telegram va mobil qurilmalarda tebranish</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !settings.hapticsEnabled;
                    handleUpdate({ hapticsEnabled: nextVal });
                    if (nextVal) triggerFeedback('success');
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.hapticsEnabled ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.hapticsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Section: Storage & Cache */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Xotira & Kesh boshqaruvi</span>
            </h3>

            <div className="bg-gray-50 p-4 rounded-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-600">Lokal to'plamlar:</span>
                <span className="font-mono font-bold text-gray-900">{storageStats.totalPacks} ta to'plam</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-600">Saqlangan savollar:</span>
                <span className="font-mono font-bold text-gray-900">{storageStats.totalQuestions} ta savol</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-600">Bulut holati:</span>
                <span className={`font-bold ${user ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {user ? `Ulangan (${user.email?.split('@')[0]})` : 'Faqat oflayn rejimda'}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200/60 flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex-1 py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Keshni tozalash</span>
                </button>
                {user && (
                  <button
                    onClick={async () => {
                      triggerFeedback('click');
                      const ok = await dataService.syncToCloud();
                      if (ok) showToast("Bulut bilan sinxronlandi!");
                    }}
                    className="flex-1 py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 active:scale-95"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    <span>Sinxronlash</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section: Telegram Bot & Mini App */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-sky-600" />
              <span>Telegram Bot & Mini App</span>
            </h3>

            <div className="bg-sky-50/70 p-4 rounded-2xl space-y-3 border border-sky-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700">Bot foydalanuvchi nomi:</span>
                <span className="font-mono font-bold text-sky-800">@{telegramBotUsername}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700">Mini App holati:</span>
                <span className={`font-bold ${botActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {botActive ? 'Faol va sozlangan ✅' : 'Kutilmoqda (Token kiritilmoqda)'}
                </span>
              </div>

              <div className="pt-2 border-t border-sky-200/60 flex flex-col gap-2">
                <a
                  href={`https://t.me/${telegramBotUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 active:scale-95 shadow-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Telegram botni ochish (@{telegramBotUsername})</span>
                </a>
                <p className="text-[11px] text-sky-900/80 leading-relaxed">
                  Tavsiya etilgan bot nomlari: <code className="font-bold">@MasteryQuizBot</code>, <code className="font-bold">@MasteryQuiz_Bot</code>, <code className="font-bold">@HemisMasteryBot</code>. Tokenni <code className="font-bold">.env</code> fayliga <code className="font-bold">TELEGRAM_BOT_TOKEN</code> sifatida joylang.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Platform Info */}
          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100/60 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-indigo-900 uppercase tracking-wider">MasteryQuiz Web & Mini App</span>
              <span className="font-mono font-bold text-indigo-700">v2.4.0</span>
            </div>
            <p className="text-indigo-800/80 leading-relaxed">
              O'zbekiston talabalari uchun 100% bepul ochiq ta'lim loyihasi. Hech qanday to'lovsiz, cheklovlarsiz o'rganing.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md shadow-indigo-100"
          >
            Tayyor
          </button>
        </div>
      </motion.div>

      {/* Confirmation Dialog for Cache Clear */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
            >
              <h3 className="text-lg font-black text-gray-900">Keshni tozalash</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Haqiqatan ham keshni tozalamoqchimisiz? Bulutga sinxronlanmagan mehmon to'plamlari va test natijalari o'chirilishi mumkin.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleClearCache}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                >
                  Tozalash
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-Modal Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] bg-gray-900 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
