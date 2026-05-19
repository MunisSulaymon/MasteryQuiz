import React, { useState, useEffect } from 'react';
import { EditorQuestion } from '../../../hooks/useManualEditor';
import { formatQuestionToHemis } from '../../../utils/hemisFormatter';
import { Copy, Check } from 'lucide-react';

interface HemisPreviewProps {
  question: EditorQuestion;
}

const HemisPreview = ({ question }: HemisPreviewProps) => {
  const [formatted, setFormatted] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFormatted(formatQuestionToHemis(question));
    }, 300);
    return () => clearTimeout(timer);
  }, [question]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-100 rounded-2xl p-6 relative group overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">HEMIS Formatida ko'rinishi</h4>
        <button
          onClick={handleCopy}
          className="p-2 hover:bg-white rounded-lg transition-colors flex items-center gap-2 group/btn"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400 group-hover/btn:text-indigo-600" />
          )}
          <span className="text-[10px] font-bold text-gray-500 group-hover/btn:text-indigo-600">Nusxalash</span>
        </button>
      </div>
      
      <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap break-all bg-white p-4 rounded-xl border border-gray-100">
        {formatted || <span className="italic text-gray-300">Preview...</span>}
      </pre>
    </div>
  );
};

export default React.memo(HemisPreview);
