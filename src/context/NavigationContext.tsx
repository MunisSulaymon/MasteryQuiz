import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react';

export type AppView = 'landing' | 'packs' | 'selection' | 'quiz' | 'drill' | 'summary' | 'victory' | 'exam' | 'exam-run' | 'exam-results';

export interface NavigationState {
  stack: NavigationEntry[];
}

export interface NavigationEntry {
  view: AppView;
  params?: any;
  title?: string;
}

type NavigationAction =
  | { type: 'PUSH'; entry: NavigationEntry }
  | { type: 'POP' }
  | { type: 'REPLACE'; entry: NavigationEntry }
  | { type: 'RESET'; entry: NavigationEntry };

interface NavigationContextType {
  state: NavigationState;
  push: (view: AppView, params?: any, title?: string) => void;
  pop: () => void;
  replace: (view: AppView, params?: any, title?: string) => void;
  reset: (view: AppView, params?: any, title?: string) => void;
  registerGuard: (id: string, guard: () => Promise<boolean> | boolean) => void;
  unregisterGuard: (id: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'PUSH':
      return { ...state, stack: [...state.stack, action.entry] };
    case 'POP':
      if (state.stack.length <= 1) return state;
      return { ...state, stack: state.stack.slice(0, -1) };
    case 'REPLACE':
      const newStack = [...state.stack];
      newStack[newStack.length - 1] = action.entry;
      return { ...state, stack: newStack };
    case 'RESET':
      return { stack: [action.entry] };
    default:
      return state;
  }
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(navigationReducer, {
    stack: [{ view: 'landing' }]
  });

  const guards = useRef<Record<string, () => Promise<boolean> | boolean>>({});

  const registerGuard = useCallback((id: string, guard: () => Promise<boolean> | boolean) => {
    guards.current[id] = guard;
  }, []);

  const unregisterGuard = useCallback((id: string) => {
    delete guards.current[id];
  }, []);

  const checkGuards = async (): Promise<boolean> => {
    const guardsList = Object.values(guards.current) as (() => Promise<boolean> | boolean)[];
    for (const guard of guardsList) {
      if (typeof guard === 'function') {
        const canProceed = await guard();
        if (!canProceed) return false;
      }
    }
    return true;
  };

  const push = useCallback(async (view: AppView, params?: any, title?: string) => {
    if (!(await checkGuards())) return;
    dispatch({ type: 'PUSH', entry: { view, params, title } });
    window.history.pushState({ view, params, title }, '', `#/${view}`);
  }, []);

  const pop = useCallback(async () => {
    console.log("Navigation pop called. Current stack length:", state.stack.length);
    if (state.stack.length <= 1) {
      console.warn("Stack length <= 1, cannot pop.");
      return;
    }
    if (!(await checkGuards())) {
      console.warn("Pop blocked by guards.");
      return;
    }
    console.log("Popping stack entry...");
    dispatch({ type: 'POP' });
    window.history.back();
  }, [state.stack.length]);

  const replace = useCallback(async (view: AppView, params?: any, title?: string) => {
    if (!(await checkGuards())) return;
    dispatch({ type: 'REPLACE', entry: { view, params, title } });
    window.history.replaceState({ view, params, title }, '', `#/${view}`);
  }, []);

  const reset = useCallback(async (view: AppView, params?: any, title?: string) => {
    if (!(await checkGuards())) return;
    dispatch({ type: 'RESET', entry: { view, params, title } });
    window.history.replaceState({ view, params, title }, '', `#/${view}`);
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If history is popped, we should update our stack
      // This is a bit tricky with a stack-based custom reducer
      // For simplicity, if we detect browser back, we just pop or reset based on hash
      const hash = window.location.hash.replace('#/', '');
      if (hash) {
        dispatch({ type: 'RESET', entry: { view: hash as AppView, params: event.state?.params } });
      } else {
        dispatch({ type: 'RESET', entry: { view: 'landing' } });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync initial hash
  useEffect(() => {
    const hash = window.location.hash.replace('#/', '');
    if (hash) {
      dispatch({ type: 'RESET', entry: { view: hash as AppView } });
    }
  }, []);

  return (
    <NavigationContext.Provider value={{ state, push, pop, replace, reset, registerGuard, unregisterGuard }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation must be used within NavigationProvider');
  return context;
}
