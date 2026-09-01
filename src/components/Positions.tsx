import { FlipButton } from '@/components/universe/FlipButton';
import { T } from '@/components/universe/T';
import { grid, positions } from '@/lib/copy';

/**
 * Six flat sentences. Numbered because they are a sequence — each one is
 * only true after the one before it, and the last one is the switch.
 */
export function Positions() {
  return (
    <section className="mt-28 border-t border-line" style={{ padding: 'clamp(40px, 6vw, 96px) var(--gutter) 0' }}>
      <ol className="grid gap-x-12 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
        {positions.map((p, i) => (
          <li key={i} className="grid grid-cols-[2.5ch_1fr] gap-4 border-t border-line pt-4">
            <span className="mono mt-2 text-mute">{String(i + 1).padStart(2, '0')}</span>
            <p className="display text-[clamp(26px,3vw,44px)]" style={{ ['--wdth' as string]: 100 + i * 8 }}>
              <T s={p.sincere} i={p.ironic} />
            </p>
          </li>
        ))}
      </ol>
      <p className="text mt-14 text-[17px] text-mute">
        <FlipButton>
          <T s={grid.otherReading.sincere} i={grid.otherReading.ironic} />
        </FlipButton>
      </p>
    </section>
  );
}
