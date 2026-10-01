import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  HelpCircle, 
  BookOpen, 
  ClipboardCheck, 
  Zap, 
  ChevronDown, 
  ExternalLink, 
  Send, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { triggerFeedback } from '../../services/dataService';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'leitner' | 'hemis' | 'faq' | 'support'>('leitner');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [botUsername, setBotUsername] = useState('MasteryQuizBot');

  React.useEffect(() => {
    if (isOpen) {
      fetch('/api/telegram/status')
        .then(r => r.json())
        .then(data => {
          if (data?.username) setBotUsername(data.username);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const faqs = [
    {
      q: "MasteryQuiz internet bo'lmaganda ham ishlaydimi?",
      a: "Ha! MasteryQuiz to'liq oflayn (Offline-First) arxitekturada ishlaydi. Siz yuklagan to'plamlar telefoningiz xotirasida saqlanadi va metroda, yo'lda yoki internet uzilganda ham bemalol test yechishingiz mumkin."
    },
    {
      q: "Boshqa telefonda yoki noutbukda kirganimda savollarim qoladimi?",
      a: "Ha, buning uchun 'Google bilan kirish' tugmasi orqali hisobingizga kiring. Barcha to'plamlaringiz va test natijalaringiz xavfsiz bulut bazasiga sinxronlanadi va har qanday qurilmangizda darhol aks etadi."
    },
    {
      q: "Yangi savollar to'plamini qanday kiritish mumkin?",
      a: "'Yangi to'plam' tugmasini bosing. Siz o'z faningizga oid HEMIS test matnini nusxalab to'g'ridan-to'g'ri joylashingiz yoki 'AI Generator' yordamida mavzu nomini yozib, avtomatik testlar tuzishingiz mumkin."
    },
    {
      q: "Tezkor test va Leitner o'rganish o'rtasida qanday farq bor?",
      a: "Leitner usulida savollar 3 ta qutiga bo'linadi va xato qilsangiz qaytadan o'rgatadi. 'Tezkor test' rejimida esa qutilar siljimaydi — u imtihon oldidan 2-3 daqiqa ichida o'zingizni sinab olish uchun mo'ljallangan."
    },
    {
      q: "MasteryQuiz mutlaqo bepulmi?",
      a: "Ha, 100% mutlaqo bepul! Hech qanday yashirin to'lovlar, obunalar yoki cheklovlar yo'q. Barcha imkoniyatlar talabalar uchun ochiq."
    }
  ];

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

      {/* Modal / Bottom Sheet */}
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

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 leading-tight">Yordam & Qo'llanma</h2>
              <p className="text-xs font-medium text-gray-500">Ilovadan foydalanish qoidalari va qo'llanma</p>
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

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-gray-100 bg-gray-50/50 flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'leitner', label: "Leitner usuli", icon: BookOpen },
            { id: 'hemis', label: "HEMIS Imtihon", icon: ClipboardCheck },
            { id: 'faq', label: "Savol-Javob", icon: HelpCircle },
            { id: 'support', label: "Murojaat", icon: Send }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerFeedback('click');
                  setActiveTab(tab.id as any);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-left">
          {activeTab === 'leitner' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                <h3 className="text-sm font-black text-indigo-900 mb-1">Qanday qilib 100% eslab qolinadi?</h3>
                <p className="text-xs text-indigo-950/80 leading-relaxed">
                  MasteryQuiz olmon olimi Sebastyan Lyaytner (Sebastian Leitner) tomonidan ishlab chiqilgan oraliqli takrorlash tizimidan foydalanadi.
                </p>
              </div>

              {/* 3 Boxes Graphic */}
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">1-Quti: Boshlang'ich daraja</h4>
                    <p className="text-xs text-amber-800/80 mt-0.5 leading-relaxed">
                      Barcha yangi va yaqinda xato qilingan savollar shu yerda bo'ladi. To'g'ri topsangiz 2-qutiga ko'tariladi.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">2-Quti: O'rtacha o'zlashtirilgan</h4>
                    <p className="text-xs text-blue-800/80 mt-0.5 leading-relaxed">
                      Bir marta to'g'ri topilgan savollar. Yana bir bor to'g'ri javob bersangiz, 3-qutiga o'tadi.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">3-Quti: Mukammal o'zlashtirildi</h4>
                    <p className="text-xs text-emerald-800/80 mt-0.5 leading-relaxed">
                      Ketma-ket to'g'ri topilgan savollar. To'plamdagi barcha savollar 3-qutiga yetganda, to'plam 100% yod olingan hisoblanadi!
                    </p>
                  </div>
                </div>
              </div>

              {/* Golden Rule */}
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-900 leading-relaxed font-medium">
                  <strong>Oltin qoida:</strong> Agar istalgan qutidagi savolga adashib xato javob bersangiz, u darhol yana 1-qutiga qaytadi. Shunday qilib, xatolaringiz doim nazoratda bo'ladi.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'hemis' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                <h3 className="text-sm font-black text-emerald-900 mb-1">Haqiqiy HEMIS Simulyatsiyasi</h3>
                <p className="text-xs text-emerald-950/80 leading-relaxed">
                  Oliy ta'lim muassasalaridagi rasmiy HEMIS elektron imtihon tizimining to'liq nusxasi.
                </p>
              </div>

              <div className="space-y-2 text-xs text-gray-700">
                <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                  <span className="font-bold">Savollar soni:</span>
                  <span className="font-mono font-bold text-gray-900">25 ta tasodifiy savol</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                  <span className="font-bold">Ajratilgan vaqt:</span>
                  <span className="font-mono font-bold text-gray-900">25 daqiqa</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                  <span className="font-bold">Shubhali savollarni belgilash (Flag):</span>
                  <span className="text-emerald-700 font-bold">Mavjud (sariq belgi)</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Baholash shkalasi</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="font-black text-emerald-800">86% – 100% (A)</p>
                    <p className="text-emerald-600 text-[11px]">A'lo natija</p>
                  </div>
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="font-black text-blue-800">71% – 85% (B)</p>
                    <p className="text-blue-600 text-[11px]">Yaxshi natija</p>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="font-black text-amber-800">56% – 70% (C)</p>
                    <p className="text-amber-600 text-[11px]">Qoniqarli</p>
                  </div>
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                    <p className="font-black text-rose-800">0% – 55% (F)</p>
                    <p className="text-rose-600 text-[11px]">Qayta topshirish</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50"
                  >
                    <button
                      onClick={() => {
                        triggerFeedback('click');
                        setOpenFaqIndex(isOpen ? null : index);
                      }}
                      className="w-full p-4 flex items-center justify-between gap-3 text-left font-bold text-xs text-gray-800 hover:bg-gray-100/60 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-indigo-600' : ''
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 text-xs text-gray-600 leading-relaxed border-t border-gray-100/80 pt-2"
                        >
                          {faq.a}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'support' && (
            <div className="space-y-4">
              <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3">
                <Send className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-sky-900">Telegram Hamjamiyati</h4>
                  <p className="text-xs text-sky-800/80 mt-1 leading-relaxed">
                    Savollaringiz, takliflaringiz yoki xatoliklar haqida bizning Telegram guruhimizga yozishingiz mumkin.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full p-3.5 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-xs font-bold text-indigo-700 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Telegram Bot: @{botUsername}
                  </span>
                  <ExternalLink className="w-4 h-4 text-indigo-500" />
                </a>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-600 leading-relaxed">
                  <p className="font-bold text-gray-900 mb-1">Dasturchiga murojaat:</p>
                  <p>Har qanday savol yoki universitet test bazalarini integratsiya qilish bo'yicha yordam kerak bo'lsa, xursandchilik bilan ko'maklashamiz.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md shadow-indigo-100"
          >
            Tushundim
          </button>
        </div>
      </motion.div>
    </div>
  );
}
