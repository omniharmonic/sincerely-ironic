import Link from 'next/link';

import { UniverseSwitch } from '@/components/universe/UniverseSwitch';
import { T } from '@/components/universe/T';
import { notFound } from '@/lib/copy';

export default function NotFound() {
  return (
    <div style={{ padding: 'clamp(60px, 10vw, 140px) var(--gutter) 0' }}>
      <p className="mono text-mute">404</p>
      <h1 className="display mt-6 max-w-[14ch] text-[clamp(40px,7vw,120px)]" style={{ ['--wdth' as string]: 108 }}>
        <T s={notFound.title.sincere} i={notFound.title.ironic} />
      </h1>
      <p className="text-lg mt-8 max-w-[46ch] text-[20px] leading-snug text-mute">
        <T s={notFound.body.sincere} i={notFound.body.ironic} />
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-6">
        <UniverseSwitch />
        <Link href="/#shop" className="btn btn--ghost">
          <T s={notFound.cta.sincere} i={notFound.cta.ironic} />
        </Link>
      </div>
    </div>
  );
}
