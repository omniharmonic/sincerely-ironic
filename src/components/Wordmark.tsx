import Link from 'next/link';

import { Logo } from './Logo';

/**
 * Mark plus name. The name keeps its two faces — Fraunces for the first
 * word, Anybody for the second — which is as much as the site says about it.
 */
export function Wordmark({ className = '', size = '17px' }: { className?: string; size?: string }) {
  return (
    <Link href="/" className={`wordmark ${className}`} style={{ fontSize: size }} aria-label="Sincerely Ironic, home">
      <Logo className="wordmark__mark" />
      <span className="wordmark__sincere">Sincerely</span>
      <span className="wordmark__ironic">Ironic</span>
    </Link>
  );
}
