import { ImageResponse } from 'next/og';

import { LOGO_PATHS } from '@/components/Logo';
import { hero, site } from '@/lib/copy';

export const alt = `${site.name} — ${hero.statement}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SLICK = 'linear-gradient(100deg, #FF2E9E 0%, #FFB52E 30%, #1FCFEE 62%, #7C3AED 100%)';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 64,
          padding: 72,
          background: '#F3F3F0',
          color: '#0D0D0D',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 420,
            height: 354,
            borderRadius: 22,
            overflow: 'hidden',
            backgroundImage: SLICK,
            flexShrink: 0,
          }}
        >
          <svg viewBox={LOGO_PATHS.viewBox} width={420} height={354}>
            <path d={LOGO_PATHS.b} fill="#ffffff" fillOpacity={0.62} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={1.2} />
            <path d={LOGO_PATHS.a} fill="#ffffff" fillOpacity={0.62} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={1.2} />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 900, letterSpacing: -4, lineHeight: 0.95, textTransform: 'uppercase' }}>
            {hero.statement}
          </div>
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.6 }}>
            {site.name} · sincerelyironic.com
          </div>
        </div>
      </div>
    ),
    size,
  );
}
