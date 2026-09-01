import { ImageResponse } from 'next/og';

import { hero, site } from '@/lib/copy';

export const alt = `${site.name} — ${hero.statement}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: '#F3F3F0',
          color: '#0D0D0D',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.6 }}>
          <span>{site.name}</span>
          <span>Universe: unconfirmed</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 250,
            fontWeight: 900,
            letterSpacing: -12,
            lineHeight: 0.85,
            backgroundImage: 'linear-gradient(100deg, #FF4FB0 0%, #FFE94D 30%, #4DF0FF 62%, #8A4DFF 100%)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {hero.statement}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.6 }}>
          <span>Apparel · Sixth Wall Productions</span>
          <span>sincerelyironic.com</span>
        </div>
      </div>
    ),
    size,
  );
}
