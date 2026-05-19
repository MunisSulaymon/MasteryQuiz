import { ExamQuestion } from '../types';

export const formatQuestionToHemis = (q: Partial<ExamQuestion>): string => {
  if (!q.text) return '';
  
  const options = q.options || ['', '', '', ''];
  const correctIndex = q.correctIndex ?? -1;
  
  const formattedOptions = options.map((opt, idx) => {
    if (idx === correctIndex) {
      return `#${opt}`;
    }
    return opt;
  });

  return `${q.text}
====
${formattedOptions.join('\n====\n')}
++++`;
};

export const formatPackToHemis = (questions: ExamQuestion[]): string => {
  return questions.map(formatQuestionToHemis).join('\n\n');
};
