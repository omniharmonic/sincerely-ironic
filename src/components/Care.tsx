import { T } from '@/components/universe/T';
import { care } from '@/lib/copy';

/** Care instructions, set like a manifesto, because that is what they are. */
export function Care() {
  return (
    <section className="mt-28 border-t border-line" style={{ padding: 'clamp(40px, 6vw, 96px) var(--gutter) 0' }}>
      <ol className="grid gap-x-12 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
        {care.map((line, i) => (
          <li key={i} className="border-t border-line pt-4">
            <p className="display text-[clamp(26px,3vw,44px)]" style={{ ['--wdth' as string]: 104 + i * 6 }}>
              <T s={line.sincere} i={line.ironic} />
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
