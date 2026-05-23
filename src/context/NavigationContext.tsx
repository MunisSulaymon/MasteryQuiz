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
  console.log(`[reducer] Action: ${action.type}`, action);
  switch (action.type) {
    case 'PUSH': {
      const result = { ...state, stack: [...state.stack, action.entry] };
      console.log(`[reducer] After PUSH: new stack=`, result.stack);
      return result;
    }
    case 'POP': {
      if (state.stack.length <= 1) {
        console.warn(`[reducer] POP ignored: stack length is ${state.stack.length}`);
        return state;
      }
      const result = { ...state, stack: state.stack.slice(0, -1) };
      console.log(`[reducer] After POP: new stack=`, result.stack);
      return result;
    }
    case 'REPLACE': {
      const replaceStack = [...state.stack];
      replaceStack[replaceStack.length - 1] = action.entry;
      const result = { ...state, stack: replaceStack };
      console.log(`[reducer] After REPLACE: new stack=`, result.stack);
      return result;
    }
    case 'RESET': {
      const result = { stack: [action.entry] };
      console.log(`[reducer] After RESET: new stack=`, result.stack);
      return result;
    }
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
    console.log(`[guards] Evaluating ${guardsList.length} navigation guards...`);
    for (const guard of guardsList) {
      if (typeof guard === 'function') {
        const canProceed = await guard();
        console.log(`[guards] Guard check returned:`, canProceed);
        if (canProceed === false) {
          console.warn(`[guards] Navigation blocked by a registered guard.`);
          return false;
        }
      }
    }
    return true;
  };

  const push = useCallback(async (view: AppView, params?: any, title?: string) => {
    console.log(`[push] Attempting push to target view: "${view}", current stack=`, state.stack);
    if (!(await checkGuards())) {
      console.warn(`[push] Blocked by guards. Cannot push to "${view}"`);
      return;
    }
    dispatch({ type: 'PUSH', entry: { view, params, title } });
    window.history.pushState({ view, params, title }, '', `#/${view}`);
    console.log(`[push] Successfully pushed to "${view}" in history`);
  }, [state.stack.length]);

  const pop = useCallback(async () => {
    console.log(`[pop] Attempting pop, current stack=`, state.stack);
    if (state.stack.length <= 1) {
      console.warn(`[pop] Cannot pop, stack depth is already ${state.stack.length}`);
      return;
    }
    if (!(await checkGuards())) {
      console.warn(`[pop] Blocked by guards. Cannot pop`);
      return;
    }
    dispatch({ type: 'POP' });
    window.history.back();
    console.log(`[pop] Successfully popped, called window.history.back()`);
  }, [state.stack.length]);

  const replace = useCallback(async (view: AppView, params?: any, title?: string) => {
    console.log(`[replace] Attempting replace with: "${view}", current stack=`, state.stack);
    if (!(await checkGuards())) {
      console.warn(`[replace] Blocked by guards`);
      return;
    }
    dispatch({ type: 'REPLACE', entry: { view, params, title } });
    window.history.replaceState({ view, params, title }, '', `#/${view}`);
  }, []);

  const reset = useCallback(async (view: AppView, params?: any, title?: string) => {
    console.log(`[reset] Attempting reset to: "${view}", current stack=`, state.stack);
    if (!(await checkGuards())) {
      console.warn(`[reset] Blocked by guards`);
      return;
    }
    dispatch({ type: 'RESET', entry: { view, params, title } });
    window.history.replaceState({ view, params, title }, '', `#/${view}`);
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const hash = window.location.hash.replace('#/', '');
      const targetView = (hash || 'landing') as AppView;

      // Avoid unnecessary state updates if we're already on the right view at the top of the stack
      const currentView = state.stack[state.stack.length - 1].view;
      if (currentView === targetView) return;

      // Check if target is the previous one in stack (meaning it was probably a back action)
      if (state.stack.length > 1 && state.stack[state.stack.length - 2].view === targetView) {
        dispatch({ type: 'POP' });
      } else {
        dispatch({ type: 'RESET', entry: { view: targetView, params: event.state?.params } });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state.stack]);

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
