import Link from 'next/link';

import { T } from '@/components/universe/T';
import { footer, site } from '@/lib/copy';
import { Wordmark } from './Wordmark';

export function Footer() {
  return (
    <footer className="border-t border-line mt-24" style={{ padding: 'clamp(40px, 6vw, 80px) var(--gutter) 60px' }}>
      <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Wordmark size="clamp(28px, 4vw, 48px)" />
          <p className="text mt-5 max-w-[46ch] text-[15px] leading-relaxed text-mute">
            <T s={footer.line.sincere} i={footer.line.ironic} />
          </p>
        </div>
        <ul className="mono flex flex-col gap-3 md:items-end">
          <li>
            <Link href="/about" className="hover:underline underline-offset-4">
              What this is
            </Link>
          </li>
          <li>
            <a href={site.parent.url} className="hover:underline underline-offset-4" rel="noopener">
              <T s={footer.parent.sincere} i={footer.parent.ironic} /> ↗
            </a>
          </li>
          <li>
            <a href={`mailto:${site.parent.email}`} className="hover:underline underline-offset-4">
              <T s={footer.write.sincere} i={footer.write.ironic} />
            </a>
          </li>
        </ul>
      </div>
      <p className="mono mt-12 text-mute">
        © {new Date().getFullYear()} {site.parent.name} · Boulder, Colorado · <span className="normal-case tracking-normal">and one other place</span>
      </p>
    </footer>
  );
}
