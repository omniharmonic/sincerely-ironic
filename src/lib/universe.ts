/**
 * The two universes. Everything user-facing is written in both, and the
 * visitor lands in one at random. `data-universe` on <html> is the single
 * runtime source of truth; CSS and the <T> component both read it.
 */
export type Universe = 'sincere' | 'ironic';

export const UNIVERSES: readonly Universe[] = ['sincere', 'ironic'];

export const STORAGE_KEY = 'si:universe';
export const ARRIVED_KEY = 'si:arrived';

export const other = (u: Universe): Universe => (u === 'sincere' ? 'ironic' : 'sincere');

/**
 * Runs inline in <head>, before paint, so the ground colour is right on the
 * first frame and there is never a flash of the wrong universe. Kept as a
 * string because it must not be bundled or deferred.
 */
export const NO_FLASH_SCRIPT = `(function(){var d=document.documentElement;try{var u=localStorage.getItem('${STORAGE_KEY}');if(u!=='sincere'&&u!=='ironic'){u=Math.random()<0.5?'sincere':'ironic';localStorage.setItem('${STORAGE_KEY}',u);localStorage.setItem('${ARRIVED_KEY}',u);}d.dataset.universe=u;}catch(e){d.dataset.universe='sincere';}})();`;
