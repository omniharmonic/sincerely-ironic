'use client';

import { useUniverse } from './UniverseProvider';

/**
 * The one control. Unlabelled. role="switch", keyboard operable; the knob is
 * the only rainbow in the chrome apart from the mark.
 */
export function UniverseSwitch({ className = '' }: { className?: string }) {
  const { universe, set } = useUniverse();
  const ironic = universe === 'ironic';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={ironic}
      aria-label="Switch"
      onClick={() => set(ironic ? 'sincere' : 'ironic')}
      className={`switch ${className}`}
      data-state={universe}
    >
      <span className="switch__track" aria-hidden="true">
        <span className="switch__knob slick-bg" />
      </span>
    </button>
  );
}
