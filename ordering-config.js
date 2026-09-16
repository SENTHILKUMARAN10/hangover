/* PUBLIC browser settings only. Never add a service-role key, admin password or PIN for real authentication. */
window.HS_ORDER_CONFIG = Object.freeze({
  supabaseUrl: '',
  publishableKey: '',
  /* Public login identifier only: the actual password is verified by Supabase Auth. */
  adminLoginEmail: '',
  tableCount: 30,
  ordersTopic: 'hs:orders:v1',
  presenceTopic: 'hs:owner-presence:v1'
});
if (!document.querySelector('link[href="dinein.css"]')) {
  const dineinStyle = document.createElement('link');
  dineinStyle.rel = 'stylesheet';
  dineinStyle.href = 'dinein.css';
  document.head.append(dineinStyle);
}
