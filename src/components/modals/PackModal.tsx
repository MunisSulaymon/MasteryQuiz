import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Palette, Check } from 'lucide-react';
import { QuizPack } from '../../types';
import { normalizeUzbekText } from '../../utils';

interface PackModalProps {
  onClose: () => void;
  onSave: (pack: Partial<QuizPack>) => void;
  initialPack?: QuizPack;
}

const COLORS = [
  { id: 'indigo', hex: 'bg-indigo-500' },
  { id: 'emerald', hex: 'bg-emerald-500' },
  { id: 'rose', hex: 'bg-rose-500' },
  { id: 'amber', hex: 'bg-amber-500' },
  { id: 'violet', hex: 'bg-violet-500' },
];

const DELETE_OPTIONS = [
  { label: 'Never delete', value: 'never' },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
  { label: 'Custom date', value: 'custom' },
  { label: 'On exam date', value: 'exam' },
];

export default function PackModal({ onClose, onSave, initialPack }: PackModalProps) {
  const [name, setName] = useState(initialPack?.name || '');
  const [color, setColor] = useState(initialPack?.color || 'indigo');
  const [deleteOption, setDeleteOption] = useState<any>(initialPack?.deleteAt ? 'custom' : 'never');
  const [customDate, setCustomDate] = useState(initialPack?.deleteAt ? new Date(initialPack.deleteAt).toISOString().split('T')[0] : '');

  const handleSave = () => {
    if (!name.trim()) return;

    let deleteAt: number | null = null;
    if (deleteOption === 'custom' || deleteOption === 'exam') {
      if (customDate) {
        const date = new Date(customDate);
        if (deleteOption === 'exam') {
          date.setDate(date.getDate() + 1); // Delete day after exam
        }
        deleteAt = date.getTime();
      }
    } else if (typeof deleteOption === 'number') {
      const date = new Date();
      date.setDate(date.getDate() + deleteOption);
      deleteAt = date.getTime();
    }

    onSave({
      name: normalizeUzbekText(name),
      color,
      deleteAt,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black">{initialPack ? 'Edit Pack' : 'Create New Pack'}</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Pack Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Statistics Exam 2026"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">Color Tag</label>
              <div className="flex gap-4">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setColor(c.id)}
                    className={`w-10 h-10 rounded-full ${c.hex} transition-transform hover:scale-110 flex items-center justify-center text-white`}
                  >
                    {color === c.id && <Check className="w-5 h-5 stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Delete */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Auto-Delete Setting</label>
              <div className="grid grid-cols-2 gap-2">
                {DELETE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setDeleteOption(opt.value)}
                    className={`px-4 py-3 text-xs font-bold rounded-xl border transition-all ${
                      deleteOption === opt.value 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'bg-white border-gray-100 text-gray-600 hover:border-indigo-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Input */}
            <AnimatePresence>
              {(deleteOption === 'custom' || deleteOption === 'exam') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">
                      {deleteOption === 'exam' ? 'Exam Date' : 'Target Date'}
                    </label>
                    <input 
                      type="date" 
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    {deleteOption === 'exam' && (
                      <p className="text-[10px] text-gray-400 mt-2 font-medium">Pack will be automatically deleted the day after this date.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-10 flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {initialPack ? 'Save Changes' : 'Create Pack'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
