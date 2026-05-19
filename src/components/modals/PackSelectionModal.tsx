import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Plus, Save, X, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { QuizPack } from '../../types';

interface PackSelectionModalProps {
  packs: QuizPack[];
  onSelect: (packId: string) => void;
  onCreateAndSelect: (name: string, autoDeleteDays: number | null) => Promise<void>;
  onClose: () => void;
  isSaving?: boolean;
}

export default function PackSelectionModal({ 
  packs, 
  onSelect, 
  onCreateAndSelect, 
  onClose,
  isSaving = false
}: PackSelectionModalProps) {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [selectedId, setSelectedId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [autoDelete, setAutoDelete] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreateAndSelect(newName, autoDelete);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
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
        className="relative bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Packni tanlang</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'select' ? (
              <motion.div 
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2 px-2">To'plamni tanlang</label>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2 no-scrollbar">
                    <button 
                      onClick={() => setMode('create')}
                      className="w-full p-4 rounded-2xl border-2 border-dashed border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/50 text-indigo-600 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
                      <span className="font-bold text-sm">— Yangi pack yaratish —</span>
                    </button>
                    
                    {packs.map(pack => (
                      <button
                        key={pack.id}
                        onClick={() => setSelectedId(pack.id)}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                          selectedId === pack.id ? 'border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-100' : 'border-gray-50 hover:border-gray-100 bg-gray-50/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full bg-${pack.color}-500 shadow-sm`} />
                          <span className={`text-sm font-bold ${selectedId === pack.id ? 'text-indigo-900' : 'text-gray-700'}`}>{pack.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{pack.questionCount} ta</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    disabled={!selectedId || isSaving}
                    onClick={() => onSelect(selectedId)}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Save className="w-5 h-5 animate-pulse" /> : <CheckCircle2 className="w-5 h-5" />}
                    Saqlash
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="create"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2 px-2">Pack nomi</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Masalan: Anatomiya Imtihon"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2 px-2">Avtomatik o'chirish</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Hech qachon', value: null },
                      { label: '30 kun', value: 30 },
                      { label: '60 kun', value: 60 },
                      { label: '90 kun', value: 90 },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => setAutoDelete(opt.value)}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                          autoDelete === opt.value ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setMode('select')}
                    className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Orqaga
                  </button>
                  <button 
                    disabled={!newName.trim() || isSaving}
                    onClick={handleCreate}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Plus className="w-4 h-4 animate-pulse" /> : <Plus className="w-4 h-4" />}
                    Yaratish
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
