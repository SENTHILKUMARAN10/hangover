/* PUBLIC browser settings only. Never add a service-role key, owner password or secret. */
window.HS_ORDER_CONFIG = Object.freeze({
  supabaseUrl: '',
  publishableKey: '',
  tableCount: 30,
  ordersTopic: 'hs:orders:v1',
  presenceTopic: 'hs:owner-presence:v1'
});
