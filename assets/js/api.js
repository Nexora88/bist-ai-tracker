/* Nexora API — super-worker öncelik, Yahoo ücretsiz yedek */
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
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
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
        return null;
      }
      if (!res.ok) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function freeOn() {
    return cfg.free && cfg.free.enabled !== false;
  }

  /** Yahoo chart JSON (proxy ile) */
  async function yahooChart(symbol, range, interval) {
    if (!freeOn()) return null;
    range = range || "1d";
    interval = interval || "5m";
    var yUrl =
      (cfg.free.yahooChart || "https://query1.finance.yahoo.com/v8/finance/chart/") +
      encodeURIComponent(symbol) +
      "?range=" +
      encodeURIComponent(range) +
      "&interval=" +
      encodeURIComponent(interval);
    var proxy = cfg.free.corsProxy || "https://api.allorigins.win/raw?url=";
    try {
      var res = await fetch(proxy + encodeURIComponent(yUrl));
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function parseYahooQuote(data, symbol) {
    var r = data && data.chart && data.chart.result && data.chart.result[0];
    if (!r || !r.meta) return null;
    var m = r.meta;
    var price = m.regularMarketPrice != null ? m.regularMarketPrice : m.previousClose;
    var prev = m.chartPreviousClose != null ? m.chartPreviousClose : m.previousClose;
    var pct = null;
    if (price != null && prev != null && prev !== 0) {
      pct = ((price - prev) / prev) * 100;
    }
    return {
      symbol: m.symbol || symbol,
      price: price != null ? Number(price) : null,
      pct: pct != null ? Number(pct) : null,
      changePercent: pct != null ? Number(pct) : null,
      open: m.regularMarketOpen != null ? Number(m.regularMarketOpen) : null,
      high: m.regularMarketDayHigh != null ? Number(m.regularMarketDayHigh) : null,
      low: m.regularMarketDayLow != null ? Number(m.regularMarketDayLow) : null,
      source: "yahoo-free"
    };
  }

  function parseYahooHistory(data) {
    var r = data && data.chart && data.chart.result && data.chart.result[0];
    if (!r) return null;
    var ts = r.timestamp || [];
    var closes = (r.indicators && r.indicators.quote && r.indicators.quote[0] && r.indicators.quote[0].close) || [];
    var out = [];
    for (var i = 0; i < ts.length; i++) {
      var c = closes[i];
      if (c == null || !isFinite(c)) continue;
      out.push({ time: ts[i], close: c, value: c });
    }
    return out.length >= 2 ? out : null;
  }

  function rangeMap(range) {
    var m = {
      "5d": { range: "5d", interval: "15m" },
      "1mo": { range: "1mo", interval: "1d" },
      "3mo": { range: "3mo", interval: "1d" },
      "6mo": { range: "6mo", interval: "1d" },
      "1y": { range: "1y", interval: "1d" },
      "5y": { range: "5y", interval: "1wk" }
    };
    return m[range] || m["3mo"];
  }

  API.getLiveQuote = async function (symbol) {
    if (!symbol) return null;
    symbol = String(symbol).toUpperCase().trim();

    // 1) Supabase worker
    var data = await callFn(cfg.functionQuote || "super-worker", { symbol: symbol });
    if (data && !data.error && data.price != null) {
      var pct = data.pct != null ? Number(data.pct) : null;
      return {
        symbol: data.symbol || symbol,
        price: Number(data.price),
        pct: pct,
        changePercent: pct,
        source: data.source || "worker"
      };
    }

    // 2) Yahoo ücretsiz
    var y = await yahooChart(symbol, "1d", "5m");
    var q = parseYahooQuote(y, symbol);
    if (q && q.price != null) return q;

    return null;
  };

  API.getHistory = async function (symbol, range) {
    if (!symbol) return null;
    symbol = String(symbol).toUpperCase().trim();
    range = range || "3mo";

    // 1) Worker
    var data = await callFn(cfg.functionQuote || "super-worker", {
      symbol: symbol,
      history: true,
      range: range
    });
    if (data && Array.isArray(data.history) && data.history.length >= 2) {
      return data.history
        .map(function (h) {
          var close = Number(h.close != null ? h.close : h.value);
          var time = h.time;
          if (typeof time === "string") time = Math.floor(new Date(time).getTime() / 1000);
          if (!isFinite(close) || !isFinite(time)) return null;
          return { time: time, close: close, value: close };
        })
        .filter(Boolean)
        .sort(function (a, b) {
          return a.time - b.time;
        });
    }

    // 2) Yahoo ücretsiz
    var rm = rangeMap(range);
    var y = await yahooChart(symbol, rm.range, rm.interval);
    return parseYahooHistory(y);
  };

  API.getProfile = async function (symbol) {
    if (!symbol) return null;
    symbol = String(symbol).toUpperCase().trim();
    var data = await callFn(cfg.functionQuote || "super-worker", {
      symbol: symbol,
      profile: true
    });
    if (data && !data.error) return data;

    // Yedek: en azından quote alanları
    var q = await API.getLiveQuote(symbol);
    if (!q) return null;
    return {
      symbol: symbol,
      price: q.price,
      pct: q.pct,
      open: q.open,
      high: q.high,
      low: q.low,
      source: "yahoo-free"
    };
  };

  API.getNews = async function (opts) {
    opts = opts || {};
    var data = await callFn(cfg.functionNews || "super-worker", {
      news: true,
      limit: opts.limit || 20,
      q: opts.q || ""
    });
    if (!data) return [];
    if (Array.isArray(data.articles)) return data.articles;
    if (Array.isArray(data)) return data;
    return [];
  };

  API.ping = async function () {
    var a = await API.getLiveQuote("AAPL");
    console.log("[Nexora] ping AAPL", a);
    return a;
  };

  global.API = API;
})(typeof window !== "undefined" ? window : this);
