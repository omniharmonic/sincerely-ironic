import type { ReactNode } from 'react';

/**
 * Text in both registers. Both readings are always in the DOM; CSS shows the
 * one for the current universe (see globals.css, `[data-universe]`). This
 * costs nothing at hydration and means there is never a flash of the wrong
 * copy — and it is literally true that every sentence on the site is both.
 *
 * Works in server components. For a single string (a title attribute, an
 * aria-label) use `useUniverse()` instead.
 */
export function T({
  s,
  i,
  as: Tag = 'span',
  className,
}: {
  s: ReactNode;
  i: ReactNode;
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'li' | 'em' | 'strong';
  className?: string;
}) {
  return (
    <Tag className={className}>
      <span data-s="">{s}</span>
      <span data-i="">{i}</span>
    </Tag>
  );
}

/** Same idea for trusted HTML (Shopify descriptions). */
export function THtml({
  s,
  i,
  className,
}: {
  s: string;
  i: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div data-s="" dangerouslySetInnerHTML={{ __html: s }} />
      <div data-i="" dangerouslySetInnerHTML={{ __html: i }} />
    </div>
  );
}
