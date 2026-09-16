/* Public read-only CMS loader. Must finish BEFORE app.js renders or admin.js validates tickets. */
(() => {
  'use strict';
  const cfg = window.HS_ORDER_CONFIG || {};
  window.HS_MANAGED_OFFERS = null;
  window.HS_CONTENT_UNAVAILABLE = false;
  const allowedGroups = new Set(['chicken', 'meals', 'desserts', 'drinks', 'shakes']);
  const pricePattern = /^₹\s*\d{1,5}(?:\s*\/\s*₹\s*\d{1,5})?$/;
  const validMenu = data => Array.isArray(data) && data.length > 0 && data.length <= 70 && data.every(section =>
    section && typeof section.category === 'string' && section.category.trim().length > 0 && section.category.length <= 80 &&
    allowedGroups.has(section.group) && Array.isArray(section.items) && section.items.length <= 150 &&
    section.items.every(item => Array.isArray(item) && item.length >= 2 && item.length <= 3 &&
      typeof item[0] === 'string' && item[0].trim().length > 0 && item[0].length <= 120 &&
      typeof item[1] === 'string' && pricePattern.test(item[1]) && item[2] !== null));
  const validOffers = data => Array.isArray(data) && data.length <= 20 && data.every(offer => offer &&
    typeof offer.title === 'string' && offer.title.length <= 100 &&
    typeof offer.tag === 'string' && offer.tag.length <= 70 &&
    typeof offer.price === 'string' && offer.price.length <= 30 &&
    typeof offer.active === 'boolean');

  window.HS_CMS_READY = (async () => {
    if (!cfg.supabaseUrl || !cfg.publishableKey || !window.supabase?.createClient) return;
    try {
      const client = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey,
        {auth:{persistSession:false, autoRefreshToken:false, detectSessionInUrl:false}});
      const get = () => client.from('hs_content').select('menu,offers,revision,published').eq('id',1).maybeSingle();
      const {data, error} = await get();
      if (error) throw error;
      if (!data?.published || !validMenu(data.menu) || !validOffers(data.offers)) {
        throw Error('The café has not published a valid menu yet');
      }
      const freshMenu = data.menu.map(section => ({
        category:section.category, group:section.group,
        items:section.items.filter(item => item[2] !== false).map(item => [item[0],item[1]])
      })).filter(section => section.items.length);
      if (!freshMenu.length) throw Error('Published menu has no available products');
      window.HANGOVER_MENU = freshMenu;
      window.HS_MANAGED_OFFERS = data.offers.filter(offer => offer.active);
      window.HS_CONTENT_REVISION = data.revision;
      // Stable cart IDs depend on catalogue positions. Never silently remap old items to new prices.
      try {
        const key = 'hs-published-menu-revision';
        if (localStorage.getItem(key) !== String(data.revision)) {
          for (const entry of Object.keys(localStorage)) {
            if (entry.startsWith('hangover-dinein-cart-')) localStorage.removeItem(entry);
          }
          localStorage.setItem(key,String(data.revision));
        }
      } catch (_) { /* Storage may be blocked; checkout still verifies published prices. */ }
      // Refresh open customer screens when an editor publishes. No stale menu prices are retained.
      setInterval(async () => {
        try {
          const latest = await get();
          if (!latest.error && latest.data && latest.data.revision !== window.HS_CONTENT_REVISION) location.reload();
        } catch (_) { /* Network failure alone must not claim a new menu was published. */ }
      },60000);
    } catch (error) {
      window.HS_CONTENT_UNAVAILABLE = true;
      window.HS_MANAGED_OFFERS = [];
      console.warn('Dine-in ordering paused: published menu unavailable:',error.message);
    }
  })();
})();
