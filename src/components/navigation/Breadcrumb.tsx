import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useNavigation, AppView } from '../../context/NavigationContext';

const VIEW_NAMES: Record<AppView, string> = {
  landing: 'Asosiy',
  packs: 'To\'plamlar',
  selection: 'Tanlov',
  quiz: 'O\'rganish',
  drill: 'Takrorlash',
  summary: 'Xulosa',
  victory: 'G\'alaba',
  exam: 'Imtihon',
  'exam-run': 'Imtihon Jarayoni',
  'exam-results': 'Natijalar'
};

export const Breadcrumb: React.FC = () => {
  const { state, reset } = useNavigation();
  const { stack } = state;

  if (stack.length <= 1) return null;

  return (
    <nav className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar scroll-smooth" aria-label="Breadcrumb">
      <button
        onClick={() => reset('landing')}
        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 transition-colors shrink-0"
      >
        <Home className="w-3.5 h-3.5" />
      </button>

      {stack.map((entry, idx) => {
        if (entry.view === 'landing') return null;
        
        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
            <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${
              idx === stack.length - 1 ? 'text-indigo-600' : 'text-gray-400'
            }`}>
              {entry.title || VIEW_NAMES[entry.view] || entry.view}
            </span>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
