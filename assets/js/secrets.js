/* Nexora — istemci ayarları
 * Gizli FMP/Finnhub YOK. Ücretli anahtarlar sadece Supabase Secrets’te.
 */
window.NEXORA_CONFIG = {
  supabaseUrl: "https://ckxgbmvjehshgicafsjp.supabase.co",
  supabaseAnonKey: "sb_publishable_J370jM_6LUMXGfwGfbWK0Q_nR0I6NA2",

  functionQuote: "super-worker",
  functionNews: "super-worker",

  /* Ücretsiz yedekler (anahtar gerekmez) */
  free: {
    enabled: true,
    /* Yahoo chart — doğrudan çoğu tarayıcıda CORS engelli; proxy ile kullanılır */
    yahooChart: "https://query1.finance.yahoo.com/v8/finance/chart/",
    /* CORS köprüsü */
    corsProxy: "https://api.allorigins.win/raw?url="
  }
};
