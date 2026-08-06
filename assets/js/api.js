/**
 * =============================================================================
 *  Nexora AI Tracker — Market Data Client
 *  Module: api.js
 *  Version: 4.2.0
 *
 *  Keys: only from secrets.js → window.API_KEYS or window.NEXORA_KEYS
 *
 *  <script src="assets/js/secrets.js"></script>
 *  <script src="assets/js/api.js"></script>
 * =============================================================================
 */

(function (global) {
  "use strict";

  function readKeys() {
    var raw =
      (global.NEXORA_KEYS && typeof global.NEXORA_KEYS === "object"
        ? global.NEXORA_KEYS
        : null) ||
      (global.API_KEYS && typeof global.API_KEYS === "object"
        ? global.API_KEYS
        : null) ||
      {};

    return {
      fmp:
        raw.fmp ||
        raw.FMP ||
        raw.financialModelingPrep ||
        raw.financialmodelingprep ||
        "",
      finnhub: raw.finnhub || raw.FINNHUB || "",
      twelve:
        raw.twelve ||
        raw.TWELVE ||
        raw.twelveData ||
        raw.twelve_data ||
        "",
      alpha: raw.alpha || raw.ALPHA || raw.alphavantage || "",
      polygon: raw.polygon || raw.POLYGON || "",
      marketaux: raw.marketaux || raw.MARKETAUX || "",
      newsApi: raw.newsApi || raw.newsapi || raw.NEWSAPI || "",
      news: raw.news || raw.NEWS || raw.finnhub || raw.FINNHUB || ""
    };
  }

  var KEYS = readKeys();

  var CONFIG = {
    version: "4.2.0",
    /** Tek istek zaman aşımı (proxy dahil) */
    requestTimeoutMs: 20000,
    /** Aynı sembol için bellek önbelleği */
    quoteCacheTtlMs: 60000,
    /** Ana sayfa / arka plan yenileme aralığı (ms) — sayfalar bunu kullanabilir */
    refreshIntervalMs: 90000,
    endpoints: {
      yahoo: "https://query1.finance.yahoo.com",
      fmp: "https://financialmodelingprep.com/api/v3",
      finnhub: "https://finnhub.io/api/v1",
      twelve: "https://api.twelvedata.com",
      alpha: "https://www.alphavantage.co/query",
      polygon: "https://api.polygon.io"
    },
    corsProxies: [
      function (url) {
        return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
      },
      function (url) {
        return "https://corsproxy.io/?" + encodeURIComponent(url);
      }
    ]
  };

  function createCache() {
    var store = new Map();
    return {
      get: function (key) {
        var e = store.get(key);
        if (!e) return null;
        if (Date.now() > e.exp) {
          store.delete(key);
          return null;
        }
        return e.val;
      },
      set: function (key, val, ttl) {
        store.set(key, { val: val, exp: Date.now() + (ttl || CONFIG.quoteCacheTtlMs) });
      },
      clear: function () {
        store.clear();
      }
    };
  }

  var cache = createCache();

  function stripSuffix(symbol) {
    return String(symbol || "").replace(/\.[A-Za-z]+$/i, "");
  }

  function normalizeQuote(price, previousClose, currency, source) {
    price = Number(price);
    previousClose = previousClose != null ? Number(previousClose) : price;
    if (!isFinite(price)) return null;
    var change = price - previousClose;
    var changePercent = previousClose ? (change / previousClose) * 100 : 0;
    return {
      price: price,
      previousClose: previousClose,
      change: change,
      changePercent: changePercent,
      currency: currency || "",
      source: source || "",
      asOf: Date.now()
    };
  }

  function fetchJsonOnce(url, timeoutMs) {
    var ms = timeoutMs || CONFIG.requestTimeoutMs;
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, ms);

    return fetch(url, { signal: controller.signal, mode: "cors" })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .catch(function (err) {
        clearTimeout(timer);
        if (err && err.name === "AbortError") {
          throw new Error("Timeout " + ms + "ms");
        }
        throw err;
      });
  }

  function requestJson(url) {
    return fetchJsonOnce(url).catch(function (directErr) {
      var chain = Promise.reject(directErr);
      CONFIG.corsProxies.forEach(function (build) {
        chain = chain.catch(function () {
          return fetchJsonOnce(build(url));
        });
      });
      return chain;
    });
  }

  function quoteFromFmp(symbol) {
    if (!KEYS.fmp) return Promise.reject(new Error("FMP key missing"));
    var url =
      CONFIG.endpoints.fmp +
      "/quote/" +
      encodeURIComponent(stripSuffix(symbol)) +
      "?apikey=" +
      encodeURIComponent(KEYS.fmp);
    return requestJson(url).then(function (payload) {
      var row = Array.isArray(payload) ? payload[0] : payload;
      if (!row || row.price == null) throw new Error("FMP empty");
      return normalizeQuote(row.price, row.previousClose, row.currency || "USD", "fmp");
    });
  }

  function quoteFromFinnhub(symbol) {
    if (!KEYS.finnhub) return Promise.reject(new Error("Finnhub key missing"));
    var url =
      CONFIG.endpoints.finnhub +
      "/quote?symbol=" +
      encodeURIComponent(stripSuffix(symbol)) +
      "&token=" +
      encodeURIComponent(KEYS.finnhub);
    return requestJson(url).then(function (payload) {
      if (!payload || payload.c == null || payload.c === 0) {
        throw new Error("Finnhub empty");
      }
      return normalizeQuote(payload.c, payload.pc, "", "finnhub");
    });
  }

  function quoteFromTwelve(symbol) {
    if (!KEYS.twelve) return Promise.reject(new Error("Twelve key missing"));
    var url =
      CONFIG.endpoints.twelve +
      "/quote?symbol=" +
      encodeURIComponent(symbol) +
      "&apikey=" +
      encodeURIComponent(KEYS.twelve);
    return requestJson(url).then(function (payload) {
      if (!payload || payload.close == null) throw new Error("Twelve empty");
      var price = Number(payload.close);
      var prev =
        payload.previous_close != null ? Number(payload.previous_close) : price;
      return normalizeQuote(price, prev, payload.currency || "", "twelve");
    });
  }

  function quoteFromAlpha(symbol) {
    if (!KEYS.alpha) return Promise.reject(new Error("Alpha key missing"));
    var url =
      CONFIG.endpoints.alpha +
      "?function=GLOBAL_QUOTE&symbol=" +
      encodeURIComponent(stripSuffix(symbol)) +
      "&apikey=" +
      encodeURIComponent(KEYS.alpha);
    return requestJson(url).then(function (payload) {
      var quote = payload && payload["Global Quote"];
      if (!quote || !quote["05. price"]) throw new Error("Alpha empty");
      return normalizeQuote(
        quote["05. price"],
        quote["08. previous close"],
        "",
        "alpha"
      );
    });
  }

  function quoteFromPolygon(symbol) {
    if (!KEYS.polygon) return Promise.reject(new Error("Polygon key missing"));
    var url =
      CONFIG.endpoints.polygon +
      "/v2/aggs/ticker/" +
      encodeURIComponent(stripSuffix(symbol)) +
      "/prev?adjusted=true&apiKey=" +
      encodeURIComponent(KEYS.polygon);
    return requestJson(url).then(function (payload) {
      var row = payload && payload.results && payload.results[0];
      if (!row || row.c == null) throw new Error("Polygon empty");
      return normalizeQuote(row.c, row.o, "USD", "polygon");
    });
  }

  function quoteFromYahoo(symbol) {
    var url =
      CONFIG.endpoints.yahoo +
      "/v8/finance/chart/" +
      encodeURIComponent(symbol) +
      "?interval=1d&range=2d";
    return requestJson(url).then(function (payload) {
      var meta =
        payload &&
        payload.chart &&
        payload.chart.result &&
        payload.chart.result[0] &&
        payload.chart.result[0].meta;
      if (!meta || meta.regularMarketPrice == null) {
        throw new Error("Yahoo empty");
      }
      var price = meta.regularMarketPrice;
      var prev = meta.chartPreviousClose || meta.previousClose || price;
      return normalizeQuote(price, prev, meta.currency || "", "yahoo");
    });
  }

  /**
   * Sıra: key’li kaynaklar → Yahoo.
   * BIST (.IS) için bazı US API’ler boş dönebilir; zincir devam eder.
   */
  var PROVIDER_CHAIN = [
    { id: "fmp", invoke: quoteFromFmp, need: "fmp" },
    { id: "finnhub", invoke: quoteFromFinnhub, need: "finnhub" },
    { id: "twelve", invoke: quoteFromTwelve, need: "twelve" },
    { id: "alpha", invoke: quoteFromAlpha, need: "alpha" },
    { id: "polygon", invoke: quoteFromPolygon, need: "polygon" },
    { id: "yahoo", invoke: quoteFromYahoo, need: null }
  ];

  var MarketData = {
    version: CONFIG.version,
    refreshIntervalMs: CONFIG.refreshIntervalMs,

    reloadKeys: function () {
      KEYS = readKeys();
      return KEYS;
    },

    getQuote: function (symbol) {
      var normalized = String(symbol || "").trim();
      if (!normalized) return Promise.resolve(null);

      var cacheKey = "quote:" + normalized;
      var hit = cache.get(cacheKey);
      if (hit) return Promise.resolve(hit);

      var sequence = Promise.resolve(null);

      PROVIDER_CHAIN.forEach(function (provider) {
        sequence = sequence.then(function (result) {
          if (result) return result;
          if (provider.need && !KEYS[provider.need]) return null;
          return provider.invoke(normalized).catch(function (err) {
            if (typeof console !== "undefined" && console.warn) {
              console.warn(
                "[MarketData] skip " + provider.id + ":",
                err && err.message ? err.message : err
              );
            }
            return null;
          });
        });
      });

      return sequence.then(function (quote) {
        if (quote) cache.set(cacheKey, quote, CONFIG.quoteCacheTtlMs);
        return quote;
      });
    },

    getBistQuote: function (code) {
      var c = String(code || "").trim();
      if (c && c.indexOf(".") === -1) c += ".IS";
      return this.getQuote(c);
    },

    getHistory: function (symbol, range, interval) {
      range = range || "1mo";
      interval = interval || "1d";
      var normalized = String(symbol || "").trim();
      if (normalized && normalized.indexOf(".") === -1) normalized += ".IS";
      var url =
        CONFIG.endpoints.yahoo +
        "/v8/finance/chart/" +
        encodeURIComponent(normalized) +
        "?range=" +
        encodeURIComponent(range) +
        "&interval=" +
        encodeURIComponent(interval);
      return requestJson(url);
    },

    getCompanyNews: function (symbol, fromIso, toIso) {
      var token = KEYS.news || KEYS.finnhub || "";
      if (!token) return Promise.resolve([]);
      var url =
        CONFIG.endpoints.finnhub +
        "/company-news?symbol=" +
        encodeURIComponent(stripSuffix(symbol)) +
        "&from=" +
        encodeURIComponent(fromIso) +
        "&to=" +
        encodeURIComponent(toIso) +
        "&token=" +
        encodeURIComponent(token);
      return requestJson(url);
    },

    clearCache: function () {
      cache.clear();
    }
  };

  var API = {
    VERSION: MarketData.version,
    REFRESH_MS: CONFIG.refreshIntervalMs,

    getLiveQuote: function (symbol) {
      return MarketData.getQuote(symbol).then(function (q) {
        if (!q) return null;
        return {
          price: q.price,
          prev: q.previousClose,
          chg: q.change,
          pct: q.changePercent,
          currency: q.currency,
          source: q.source
        };
      });
    },

    getQuote: function (symbol) {
      return this.getLiveQuote(symbol);
    },

    getHistory: function (symbol, range, interval) {
      return MarketData.getHistory(symbol, range, interval);
    },

    getCompanyNews: function (symbol, from, to) {
      return MarketData.getCompanyNews(symbol, from, to);
    },

    reloadKeys: function () {
      return MarketData.reloadKeys();
    },

    clearCache: function () {
      MarketData.clearCache();
    },

    Cache: cache
  };

  global.MarketData = MarketData;
  global.API = API;

  if (typeof console !== "undefined" && console.info) {
    var loaded = [];
    if (KEYS.fmp) loaded.push("fmp");
    if (KEYS.finnhub) loaded.push("finnhub");
    if (KEYS.twelve) loaded.push("twelve");
    if (KEYS.alpha) loaded.push("alpha");
    if (KEYS.polygon) loaded.push("polygon");
    console.info(
      "[MarketData] v" +
        CONFIG.version +
        " · timeout " +
        CONFIG.requestTimeoutMs +
        "ms · cache " +
        CONFIG.quoteCacheTtlMs / 1000 +
        "s · refresh " +
        CONFIG.refreshIntervalMs / 1000 +
        "s · keys: " +
        (loaded.length ? loaded.join(", ") : "none (Yahoo only)")
    );
  }
})(typeof window !== "undefined" ? window : this);
