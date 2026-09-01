import Link from 'next/link';

import { site } from '@/lib/copy';
import { Wordmark } from './Wordmark';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line" style={{ padding: 'clamp(40px, 6vw, 80px) var(--gutter) 60px' }}>
      <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
        <Wordmark size="clamp(24px, 3vw, 40px)" />
        <ul className="mono flex flex-wrap gap-x-8 gap-y-3 md:justify-end">
          <li>
            <Link href="/about" className="hover:underline underline-offset-4">
              About
            </Link>
          </li>
          <li>
            <a href={site.parent.url} className="hover:underline underline-offset-4" rel="noopener">
              {site.parent.name} ↗
            </a>
          </li>
          <li>
            <a href={`mailto:${site.parent.email}`} className="hover:underline underline-offset-4">
              {site.parent.email}
            </a>
          </li>
        </ul>
      </div>
      <p className="mono mt-12 text-mute">
        © {new Date().getFullYear()} {site.name} · {site.shipsFrom}
      </p>
    </footer>
  );
}
