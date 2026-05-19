import { useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';

export function useBeforeLeave(id: string, guard: () => Promise<boolean> | boolean) {
  const { registerGuard, unregisterGuard } = useNavigation();

  useEffect(() => {
    registerGuard(id, guard);
    return () => unregisterGuard(id);
  }, [id, guard, registerGuard, unregisterGuard]);
}
