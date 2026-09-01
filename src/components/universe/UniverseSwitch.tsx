'use client';

import { useUniverse } from './UniverseProvider';

/**
 * The one control that matters. A real switch: role="switch", keyboard
 * operable, aria-checked means "ironic". The knob is the only place the slick
 * appears in the chrome.
 */
export function UniverseSwitch({ className = '' }: { className?: string }) {
  const { universe, set } = useUniverse();
  const ironic = universe === 'ironic';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={ironic}
      aria-label={`Universe: ${universe}. Switch to ${ironic ? 'sincere' : 'ironic'}.`}
      onClick={() => set(ironic ? 'sincere' : 'ironic')}
      className={`switch ${className}`}
      data-state={universe}
    >
      <span className="switch__label" data-side="sincere">
        Sincere
      </span>
      <span className="switch__track" aria-hidden="true">
        <span className="switch__knob slick-bg" />
      </span>
      <span className="switch__label" data-side="ironic">
        Ironic
      </span>
    </button>
  );
}
