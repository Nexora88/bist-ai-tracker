/* Nexora API — tarayıcı sadece Supabase Edge Function çağırır
 * Gizli FMP / Finnhub anahtarları burada YOK.
 * Ayarlar: assets/js/secrets.js → NEXORA_CONFIG
 */
(function (global) {
  "use strict";

  var cfg = global.NEXORA_CONFIG || {};
  var API = {};

  function fnUrl(name) {
    var base = String(cfg.supabaseUrl || "").replace(/\/$/, "");
    var fn = String(name || cfg.functionQuote || "super-worker").replace(/^\//, "");
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
        console.warn("[Nexora] JSON parse hatası", url, text.slice(0, 160));
        return null;
      }

      if (!res.ok) {
        console.warn("[Nexora] HTTP", res.status, url, data);
        return null;
      }
      return data;
    } catch (e) {
      console.warn("[Nexora] fetch hatası", url, e);
      return null;
    }
  }

  /**
   * Anlık / gecikmeli fiyat
   * @param {string} symbol  Örn: AAPL, THYAO.IS
   * @returns {Promise<{symbol, price, pct, changePercent}|null>}
   */
  API.getLiveQuote = async function (symbol) {
    if (!symbol) return null;

    var data = await callFn(cfg.functionQuote || "super-worker", {
      symbol: String(symbol).toUpperCase().trim()
    });

    if (!data || data.error) return null;
    if (data.price == null && data.pct == null) return null;

    var pct = data.pct != null ? Number(data.pct) : null;
    return {
      symbol: data.symbol || symbol,
      price: data.price != null ? Number(data.price) : null,
      pct: pct,
      changePercent: pct
    };
  };

  /**
   * Geçmiş kapanışlar (Ultra Grafik / sparkline)
   * @param {string} symbol
   * @param {string} [range]  5d | 1mo | 3mo | 6mo | 1y | 5y
   * @returns {Promise<Array<{time:number, close:number, value:number}>|null>}
   */
  API.getHistory = async function (symbol, range) {
    if (!symbol) return null;

    var data = await callFn(cfg.functionQuote || "super-worker", {
      symbol: String(symbol).toUpperCase().trim(),
      history: true,
      range: range || "3mo"
    });

    if (!data || data.error) return null;

    var raw = data.history;
    if (!Array.isArray(raw) || raw.length < 2) return null;

    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var h = raw[i];
      if (!h) continue;

      var close = Number(h.close != null ? h.close : h.value);
      var time = h.time;

      if (typeof time === "string") {
        time = Math.floor(new Date(time).getTime() / 1000);
      }
      if ((time == null || !isFinite(time)) && h.date) {
        time = Math.floor(new Date(h.date).getTime() / 1000);
      }

      if (!isFinite(close) || !isFinite(time)) continue;

      out.push({
        time: time,
        close: close,
        value: close
      });
    }

    if (out.length < 2) return null;

    out.sort(function (a, b) {
      return a.time - b.time;
    });

    return out;
  };

  /**
   * Haber / gündem (functionNews yoksa boş dizi)
   * @param {{limit?:number, q?:string}} [opts]
   * @returns {Promise<Array>}
   */
  API.getNews = async function (opts) {
    opts = opts || {};
    var name = cfg.functionNews || cfg.functionQuote || "super-worker";

    var data = await callFn(name, {
      news: true,
      limit: opts.limit || 20,
      q: opts.q || ""
    });

    if (!data) return [];
    if (Array.isArray(data.articles)) return data.articles;
    if (Array.isArray(data.news)) return data.news;
    if (Array.isArray(data)) return data;
    return [];
  };

  /** Bağlantı teşhis (konsolda API.ping()) */
  API.ping = async function () {
    var data = await callFn(cfg.functionQuote || "super-worker", {
      symbol: "AAPL"
    });
    console.log("[Nexora] ping", data);
    return data;
  };

  global.API = API;
})(typeof window !== "undefined" ? window : this);
