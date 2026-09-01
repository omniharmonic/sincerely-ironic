'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { STORAGE_KEY, other, type Universe } from '@/lib/universe';

interface UniverseContextValue {
  universe: Universe;
  set: (u: Universe) => void;
  flip: () => void;
}

const UniverseContext = createContext<UniverseContextValue | null>(null);

/*
 * <html data-universe> is the store. The inline no-flash script writes it
 * before paint; this module reads it and notifies subscribers when the switch
 * writes it again. The server snapshot is always 'sincere' — nothing visible
 * depends on it, because <T> renders both readings and CSS picks.
 */
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function readFromDocument(): Universe {
  return document.documentElement.dataset.universe === 'ironic' ? 'ironic' : 'sincere';
}

const serverSincere = (): Universe => 'sincere';

export function UniverseProvider({ children }: { children: ReactNode }) {
  const universe = useSyncExternalStore(subscribe, readFromDocument, serverSincere);

  const set = useCallback((u: Universe) => {
    document.documentElement.dataset.universe = u;
    try {
      localStorage.setItem(STORAGE_KEY, u);
    } catch {
      /* private mode, etc. */
    }
    listeners.forEach((l) => l());
  }, []);

  const flip = useCallback(() => set(other(readFromDocument())), [set]);

  const value = useMemo(() => ({ universe, set, flip }), [universe, set, flip]);

  return <UniverseContext.Provider value={value}>{children}</UniverseContext.Provider>;
}

export function useUniverse(): UniverseContextValue {
  const ctx = useContext(UniverseContext);
  if (!ctx) throw new Error('useUniverse must be used inside <UniverseProvider>');
  return ctx;
}
