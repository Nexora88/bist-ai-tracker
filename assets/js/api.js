/* Nexora API — tarayıcı sadece Supabase Edge Function çağırır */
(function (global) {
  "use strict";

  var cfg = global.NEXORA_CONFIG || {};
  var API = global.API || {};

  function fnUrl(name) {
    var base = String(cfg.supabaseUrl || "").replace(/\/$/, "");
    return base + "/functions/v1/" + name;
  }

  async function callFn(name, body) {
    var url = fnUrl(name);
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      console.warn("Nexora: supabaseUrl / supabaseAnonKey eksik (secrets.js)");
      return null;
    }
    try {
      var res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + cfg.supabaseAnonKey,
          apikey: cfg.supabaseAnonKey
        },
        body: JSON.stringify(body || {})
      });
      if (!res.ok) {
        console.error("🔒 [NEXORA AEGIS]: Sunucu yanıt vermedi, Durum kuralı:", res.status);
        return null;
      }
      return await res.json();
    } catch (e) {
      console.error("🔒 [NEXORA AEGIS NETWORK ERR]: Bağlantı koptu:", e);
      return null;
    }
  }

  /** Canlı / gecikmeli fiyat */
  API.getLiveQuote = async function (symbol) {
    if (!symbol) return null;
    
    // HATA ÇÖZÜMÜ: Doğrudan senin canlı fonksiyon adın olan super-worker çağrılıyor
    var data = await callFn(cfg.functionQuote || "super-worker", {
      symbol: String(symbol).toUpperCase().trim(),
      history: false // Sadece anlık fiyat istiyoruz
    });
    
    if (!data || data.error) {
      console.warn("⚠️ [NEXORA]: Canlı fiyat verisi sunucudan boş döndü.");
      return null;
    }
    
    return {
      symbol: data.symbol || symbol,
      price: data.price != null ? Number(data.price) : null,
      pct: data.pct != null ? Number(data.pct) : null,
      changePercent: data.pct != null ? Number(data.pct) : null
    };
  };

  /** Basit geçmiş (Deno Edge Function tam uyumlu) */
  API.getHistory = async function (symbol, range) {
    if (!symbol) return null;
    
    // HATA ÇÖZÜMÜ: Senin koddaki body.history tetikleyicisini TRUE olarak tam POST gövdesine veriyoruz
    var data = await callFn(cfg.functionQuote || "super-worker", {
      symbol: String(symbol).toUpperCase().trim(),
      history: true,
      range: range || "1mo"
    });
    
    if (!data || !Array.isArray(data.history)) {
      console.warn("⚠️ [NEXORA]: Grafik geçmiş veri dizisi sunucudan alınamadı.");
      return null;
    }
    
    return data.history;
  };

  /** Haber akışı */
  API.getNews = async function (opts) {
    opts = opts || {};
    // Eğer haberler için ayrı bir fonksiyon açmadıysan, şimdilik bunu da super-worker karşılayabilir
    var data = await callFn(cfg.functionNews || "super-worker", {
      limit: opts.limit || 20,
      q: opts.q || "",
      newsRequest: true // Sunucu tarafında ileride filtrelemek istersen diye ekledim
    });
    if (!data) return [];
    if (Array.isArray(data.articles)) return data.articles;
    if (Array.isArray(data)) return data;
    return [];
  };

  global.API = API;
})(typeof window !== "undefined" ? window : this);
