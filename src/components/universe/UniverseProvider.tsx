'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { ARRIVED_KEY, STORAGE_KEY, other, type Universe } from '@/lib/universe';

interface UniverseContextValue {
  universe: Universe;
  /** Which one the visitor first landed in, this browser. */
  arrived: Universe;
  /** True once the client has read the real value off <html>. */
  ready: boolean;
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

let arrivedCache: Universe | null = null;
function readArrived(): Universe {
  if (arrivedCache) return arrivedCache;
  try {
    const a = localStorage.getItem(ARRIVED_KEY);
    arrivedCache = a === 'ironic' ? 'ironic' : 'sincere';
  } catch {
    arrivedCache = 'sincere';
  }
  return arrivedCache;
}

const serverSincere = (): Universe => 'sincere';
const clientReady = () => true;
const serverNotReady = () => false;

export function UniverseProvider({ children }: { children: ReactNode }) {
  const universe = useSyncExternalStore(subscribe, readFromDocument, serverSincere);
  const arrived = useSyncExternalStore(subscribe, readArrived, serverSincere);
  const ready = useSyncExternalStore(subscribe, clientReady, serverNotReady);

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

  const value = useMemo(
    () => ({ universe, arrived, ready, set, flip }),
    [universe, arrived, ready, set, flip],
  );

  return <UniverseContext.Provider value={value}>{children}</UniverseContext.Provider>;
}

export function useUniverse(): UniverseContextValue {
  const ctx = useContext(UniverseContext);
  if (!ctx) throw new Error('useUniverse must be used inside <UniverseProvider>');
  return ctx;
}
