/**
 * Which colour the customer is looking at, shared between the picker and the
 * gallery.
 *
 * The two sit in different columns of the product page and neither contains
 * the other, so the choice cannot travel down as a prop without wrapping the
 * whole layout in one client component. This is the repo's usual answer to
 * state that lives outside React — a tiny store read through
 * `useSyncExternalStore`, the same shape the shop filter uses over the URL.
 *
 * Keyed by handle so navigating to another product forgets the last choice
 * rather than carrying a colour that product may not even have.
 */

let current: { handle: string; colour: string } | null = null;
const listeners = new Set<() => void>();

export function setColour(handle: string, colour: string) {
  current = { handle, colour };
  for (const l of listeners) l();
}

export function subscribeColour(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readColour(handle: string): string | null {
  return current && current.handle === handle ? current.colour : null;
}

/** The server renders before anything has been picked. */
export const noColour = () => null;
