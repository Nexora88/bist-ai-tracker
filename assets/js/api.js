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
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  /** Canlı / gecikmeli fiyat */
  API.getLiveQuote = async function (symbol) {
    if (!symbol) return null;
    var data = await callFn(cfg.functionQuote || "market-quote", {
      symbol: String(symbol).toUpperCase()
    });
    if (!data || data.error) return null;
    return {
      symbol: data.symbol || symbol,
      price: data.price != null ? Number(data.price) : null,
      pct: data.pct != null ? Number(data.pct) : null,
      changePercent: data.pct != null ? Number(data.pct) : null
    };
  };

  /** Basit geçmiş (function destekliyorsa) */
  API.getHistory = async function (symbol, range) {
    if (!symbol) return null;
    var data = await callFn(cfg.functionQuote || "market-quote", {
      symbol: String(symbol).toUpperCase(),
      history: true,
      range: range || "1mo"
    });
    if (!data || !Array.isArray(data.history)) return null;
    return data.history;
  };

  /** Haber akışı */
  API.getNews = async function (opts) {
    opts = opts || {};
    var data = await callFn(cfg.functionNews || "market-news", {
      limit: opts.limit || 20,
      q: opts.q || ""
    });
    if (!data) return [];
    if (Array.isArray(data.articles)) return data.articles;
    if (Array.isArray(data)) return data;
    return [];
  };

  global.API = API;
})(typeof window !== "undefined" ? window : this);
