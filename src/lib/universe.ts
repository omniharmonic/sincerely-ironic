/**
 * Two readings of the site. `data-universe` on <html> is the single runtime
 * source of truth; CSS and the <T> component both read it. The visitor lands
 * in one at random and the switch moves them. Nothing on the site names it.
 */
export type Universe = 'sincere' | 'ironic';

export const STORAGE_KEY = 'si:universe';

export const other = (u: Universe): Universe => (u === 'sincere' ? 'ironic' : 'sincere');

/**
 * Runs inline in <head>, before paint, so the ground colour is right on the
 * first frame. Kept as a string because it must not be bundled or deferred.
 */
export const NO_FLASH_SCRIPT = `(function(){var d=document.documentElement;try{var u=localStorage.getItem('${STORAGE_KEY}');if(u!=='sincere'&&u!=='ironic'){u=Math.random()<0.5?'sincere':'ironic';localStorage.setItem('${STORAGE_KEY}',u);}d.dataset.universe=u;}catch(e){d.dataset.universe='sincere';}})();`;
