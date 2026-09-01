'use client';

import type { ReactNode } from 'react';

import { useUniverse } from './UniverseProvider';

/** An inline control that flips the universe. Used wherever copy points at "the other reading". */
export function FlipButton({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { flip } = useUniverse();
  return (
    <button type="button" onClick={flip} className={`cursor-pointer underline decoration-accent decoration-2 underline-offset-4 hover:text-accent ${className}`}>
      {children}
    </button>
  );
}
