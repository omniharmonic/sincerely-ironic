import Link from 'next/link';

/**
 * Two faces in one name: the sincere half is Fraunces, upright-ish and
 * italic; the ironic half is Anybody, wide and loud. The whole identity, in
 * the wordmark, without a logo.
 */
export function Wordmark({ className = '', size = '18px' }: { className?: string; size?: string }) {
  return (
    <Link href="/" className={`wordmark ${className}`} style={{ fontSize: size }} aria-label="Sincerely Ironic, home">
      <span className="wordmark__sincere">Sincerely</span>
      <span className="wordmark__ironic">Ironic</span>
    </Link>
  );
}
