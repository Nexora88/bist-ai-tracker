/* Nexora API — sadece Supabase Edge Function */
(function (global) {
  "use strict";

  var cfg = global.NEXORA_CONFIG || {};
  var API = global.API || {};

  function fnUrl(name) {
    var base = String(cfg.supabaseUrl || "").replace(/\/$/, "");
    var fn = String(name || "").replace(/^\//, "");
    return base + "/functions/v1/" + fn;
  }

  async function callFn(name, body) {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      console.warn("[Nexora] secrets.js: supabaseUrl veya supabaseAnonKey eksik");
      return null;
    }
    var url = fnUrl(name);
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
      var text = await res.text();
      var data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        console.warn("[Nexora] JSON parse", url, text.slice(0, 120));
        return null;
      }
      if (!res.ok) {
        console.warn("[Nexora] HTTP", res.status, url, data);
        return null;
      }
      return data;
    } catch (e) {
      console.warn("[Nexora] fetch hata", url, e);
      return null;
    }
  }

  API.getLiveQuote = async function (symbol) {
    if (!symbol) return null;
    var data = await callFn(cfg.functionQuote || "market-quote", {
      symbol: String(symbol).toUpperCase().trim()
    });
    if (!data || data.error) return null;
    return {
      symbol: data.symbol || symbol,
      price: data.price != null ? Number(data.price) : null,
      pct: data.pct != null ? Number(data.pct) : null,
      changePercent: data.pct != null ? Number(data.pct) : null
    };
  };

  API.getHistory = async function (symbol, range) {
    if (!symbol) return null;
    var data = await callFn(cfg.functionQuote || "market-quote", {
      symbol: String(symbol).toUpperCase().trim(),
      history: true,
      range: range || "1mo"
    });
    if (!data || !Array.isArray(data.history)) return null;
    return data.history;
  };

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
