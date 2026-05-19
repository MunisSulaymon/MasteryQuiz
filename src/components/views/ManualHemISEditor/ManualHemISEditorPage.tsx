import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Save, 
  Upload, 
  ArrowLeft, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Search,
  ChevronRight,
  GripVertical
} from 'lucide-react';
import { useManualEditor, EditorState } from '../../../hooks/useManualEditor';
import { useAutoSave, clearDraft } from '../../../hooks/useAutoSave';
import { useValidation } from '../../../hooks/useValidation';
import { dataService } from '../../../services/dataService';
import { ExamQuestion } from '../../../types';
import QuestionCard from './QuestionCard';
import QuestionFormPanel from './QuestionFormPanel';
import ValidationBanner from './ValidationBanner';
import BulkImportModal from './BulkImportModal';
import { cn } from '../../../lib/utils';

interface ManualHemISEditorPageProps {
  packId: string | null;
  packTitle: string;
  onRefresh: () => void;
  onBack?: () => void;
}

const ManualHemISEditorPage = ({ packId, packTitle, onRefresh, onBack }: ManualHemISEditorPageProps) => {
  const { state, dispatch } = useManualEditor(packId, packTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const errors = useValidation(state.questions);
  
  // Auto-save drafts
  useAutoSave(state, (draft) => {
    // Optionally ask user if they want to restore draft
    // For now, we just let it be available if they want to restore
    console.log("Draft found for pack:", packId);
  });

  // Load Initial Questions
  useEffect(() => {
    if (packId) {
      const loadQuestions = async () => {
        try {
          const questions = await dataService.getQuestionsByPack(packId);
          dispatch({ type: 'LOAD_PACK', packId, packTitle, questions });
        } catch (err) {
          console.error("Failed to load questions", err);
        }
      };
      loadQuestions();
    }
  }, [packId, packTitle, dispatch]);

  const handleSave = async () => {
    if (!packId || errors.length > 0) return;

    setIsSaving(true);
    try {
      // Save all changed questions
      await dataService.saveQuestionsBatch(packId, state.questions);
      dispatch({ type: 'MARK_SAVED' });
      clearDraft(packId);
      setToast({ message: "Barcha o'zgarishlar muvaffaqiyatli saqlandi!", type: 'success' });
      onRefresh();
    } catch (err: any) {
      setToast({ message: `Xatolik: ${err.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const filteredQuestions = state.questions.filter(q => 
    q.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeQuestion = state.questions[state.activeQuestionIndex];

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <ValidationBanner 
        errors={errors} 
        onGoToError={(idx) => dispatch({ type: 'SET_ACTIVE_QUESTION', index: idx })} 
      />

      {/* Editor Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-none mb-1">Savol Muharriri</h2>
            <p className="text-sm font-bold text-gray-400">{packTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-5 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving || errors.length > 0}
            className={cn(
              "px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 shadow-lg active:scale-95",
              errors.length > 0 
                ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
            )}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : <Save className="w-4 h-4" />}
            Saqlash
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Question List */}
        <div className="w-80 border-r border-gray-100 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-50">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-100 text-sm font-bold placeholder:text-gray-400"
                />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {filteredQuestions.length === 0 && (
              <div className="text-center py-10 px-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Savollar topilmadi</p>
              </div>
            )}
            
            {filteredQuestions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={state.questions.indexOf(q)}
                isActive={state.activeQuestionIndex === state.questions.indexOf(q)}
                onClick={() => dispatch({ type: 'SET_ACTIVE_QUESTION', index: state.questions.indexOf(q) })}
                hasErrors={errors.some(e => e.questionIndex === state.questions.indexOf(q))}
              />
            ))}
          </div>

          <div className="p-4 bg-gray-50/50 border-t border-gray-100">
            <button
              onClick={() => dispatch({ type: 'ADD_QUESTION' })}
              className="w-full py-4 bg-white hover:bg-indigo-600 hover:text-white border-2 border-indigo-100 hover:border-indigo-600 text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Yangi savol
            </button>
          </div>
        </div>

        {/* Right Content: Active Question Form */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeQuestion ? (
              <motion.div
                key={activeQuestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto"
              >
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                      <div className="bg-indigo-600 w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-100">
                        {state.activeQuestionIndex + 1}
                      </div>
                      <h2 className="text-2xl font-black text-gray-900">Savol tahriri</h2>
                   </div>

                   <button
                     onClick={() => dispatch({ type: 'DELETE_QUESTION', index: state.activeQuestionIndex })}
                     className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                     title="Savolni o'chirish"
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                </div>

                <QuestionFormPanel
                  question={activeQuestion}
                  onUpdateStem={(text) => dispatch({ type: 'UPDATE_STEM', stem: text })}
                  onUpdateOption={(idx, text) => dispatch({ type: 'UPDATE_OPTION', index: idx, text })}
                  onSetCorrect={(idx) => dispatch({ type: 'SET_CORRECT', index: idx })}
                  onUpdateMetadata={(updates) => dispatch({ type: 'UPDATE_METADATA', updates })}
                  errors={errors.filter(e => e.questionIndex === state.activeQuestionIndex)}
                />
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-gray-100 max-w-sm">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 mx-auto mb-6">
                    <Plus className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Savol qo'shing</h3>
                  <p className="text-sm font-bold text-gray-400 mb-8 leading-relaxed">
                    Ushbu paketga savol qo'shish uchun tugmani bosing yoki HEMIS formatidagi faylni import qiling.
                  </p>
                  <button
                    onClick={() => dispatch({ type: 'ADD_QUESTION' })}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-100"
                  >
                    Boshlash
                  </button>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onImport={(questions) => dispatch({ type: 'BULK_IMPORT', questions })}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 border-2",
              toast.type === 'success' 
                ? "bg-white border-emerald-500 text-emerald-900" 
                : "bg-white border-rose-500 text-rose-900"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
            <span className="font-black text-sm uppercase tracking-wider">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManualHemISEditorPage;
