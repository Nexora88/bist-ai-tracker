// secrets.js
(function (global) {
  "use strict";

  // Nexora Küresel Yapılandırma Ayarları
  global.NEXORA_CONFIG = {
    // Supabase Proje Kimliğin ve Canlı Fonksiyon İsmin
    supabaseUrl: "https://ckxgbmvjehshgicafsjp.supabase.co",
    supabaseAnonKey: "sb_publishable_J370jM_6LUMXGfwGfbWK0Q_nR0I6NA2",
    
    // Senin Edge Function dosyanın gerçek tetikleme adı (super-worker)
    functionQuote: "super-worker",
    functionNews: "market-news"
  };

  console.log("🔒 [NEXORA GUARD]: Sunucu arkası siber veri hattı config katmanı başarıyla yüklendi.");
})(typeof window !== "undefined" ? window : this);
