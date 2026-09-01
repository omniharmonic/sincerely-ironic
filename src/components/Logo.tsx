import { useId } from 'react';

/**
 * The mark. Two silhouettes in white glass on the slick: a translucent white
 * fill that catches a highlight along the top edge, a fine white rim, and a
 * soft shadow so they sit slightly above the gradient. The gradient is CSS,
 * so it drifts with everything else that is rainbow on the site.
 */
const VIEWBOX = '0 0 264.58336 223.17815';

const FIGURE_A =
  'm 183.78587,-6.9532424e-5 h 31.97516 L 264.58334,111.34812 H 242.8523 l -0.006,32.89246 c -0.16821,14.64858 -12.74832,22.1747 -22.00482,21.90278 H 210.3678 v 57.0348 h -31.7014 v -57.0348 c 24.34385,0.33922 31.8727,-7.32301 31.80542,-25.2265 v -29.56874 h 22.30594 z';

const FIGURE_B =
  'M 89.26758,-6.93e-5 H 148.9691 L 198.40466,111.34812 H 176.6736 v 32.99105 c -0.13735,12.03845 -8.88383,20.57637 -21.83507,21.79872 h -11.08729 v 57.0348 H 64.010498 V 163.83265 C 25.697809,158.00406 6e-6,127.55381 6e-6,84.900524 6e-6,34.175831 40.310752,-6.93e-5 89.26758,-6.93e-5 Z m 44.03701,55.4687443 c -11.35899,0 -20.5758,9.190289 -20.5758,20.550281 0,11.39366 9.21681,20.583128 20.5758,20.583128 11.35896,0 20.54838,-9.189468 20.54838,-20.583128 0,-11.35719 -9.18942,-20.550281 -20.54838,-20.550281 z';

export function Logo({ className = '', title = 'Sincerely Ironic' }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, '');
  const glass = `glass-${id}`;
  const shadow = `shadow-${id}`;
  return (
    <span className={`logo slick-bg ${className}`} role="img" aria-label={title}>
      <svg viewBox={VIEWBOX} className="logo__figures" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={glass} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.82" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.64" />
          </linearGradient>
          <filter id={shadow} x="-10%" y="-10%" width="120%" height="125%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#000" floodOpacity="0.18" />
          </filter>
        </defs>
        <g filter={`url(#${shadow})`}>
          <path d={FIGURE_B} fill={`url(#${glass})`} stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.1" />
          <path d={FIGURE_A} fill={`url(#${glass})`} stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.1" />
        </g>
      </svg>
    </span>
  );
}

/** For contexts without CSS (the OG image). */
export const LOGO_PATHS = { viewBox: VIEWBOX, a: FIGURE_A, b: FIGURE_B };
