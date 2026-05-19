import { useEffect, useRef } from 'react';
import { EditorState } from './useManualEditor';

const DRAFT_KEY_PREFIX = 'masteryquiz_manual_draft_';

export const useAutoSave = (state: EditorState, onDraftFound: (draft: EditorState) => void) => {
  const isInitialMount = useRef(true);
  const lastStateRef = useRef<EditorState>(state);

  useEffect(() => {
    if (isInitialMount.current && state.packId) {
      const draftJson = localStorage.getItem(`${DRAFT_KEY_PREFIX}${state.packId}`);
      if (draftJson) {
        try {
          const draft = JSON.parse(draftJson) as EditorState;
          // Check if draft is potentially newer or has unsaved changes
          const hasUnsavedInDraft = draft.questions.some(q => q.isDirty);
          if (hasUnsavedInDraft) {
            onDraftFound(draft);
          }
        } catch (e) {
          console.error("Draft parsing failed", e);
        }
      }
      isInitialMount.current = false;
    }
  }, [state.packId, onDraftFound]);

  useEffect(() => {
    if (!state.packId) return;

    const timeoutId = setTimeout(() => {
      const hasUnsaved = state.questions.some(q => q.isDirty);
      if (hasUnsaved) {
        localStorage.setItem(`${DRAFT_KEY_PREFIX}${state.packId}`, JSON.stringify(state));
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [state]);

  // Handle page leave warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsaved = state.questions.some(q => q.isDirty);
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.questions]);
};

export const clearDraft = (packId: string) => {
  localStorage.removeItem(`${DRAFT_KEY_PREFIX}${packId}`);
};
