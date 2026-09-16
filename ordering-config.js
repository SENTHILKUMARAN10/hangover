/* PUBLIC browser settings only. Never add a service-role key, owner password or secret. */
window.HS_ORDER_CONFIG = Object.freeze({
  supabaseUrl: '',
  publishableKey: '',
  tableCount: 30,
  ordersTopic: 'hs:orders:v1',
  presenceTopic: 'hs:owner-presence:v1'
});
/* The existing homepage loads this config after its normal theme. */
if (!document.querySelector('link[href="dinein.css"]')) {
  const dineinStyle = document.createElement('link');
  dineinStyle.rel = 'stylesheet';
  dineinStyle.href = 'dinein.css';
  document.head.append(dineinStyle);
}
