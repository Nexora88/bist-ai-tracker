/**
 * =============================================================================
 *  BIST AI Tracker — Market Data Client
 *  Module: api.js
 *  Version: 4.1.0
 *  Author: Ahmet Eymen Bakraç (Nexora)
 *
 *  Keys: ONLY from secrets.js (window.NEXORA_KEYS or window.API_KEYS)
 *  Do not put API keys in this file.
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
    version: "4.1.0",
    requestTimeoutMs: 12e3,
    quoteCacheTtlMs: 30e3,
    endpoints: {
      yahoo: "https://query1.finance.yahoo.com",
      fmp: "https://financialmodelingprep.com/api/v3",
      finnhub: "https://finnhub.io/api/v1",
      twelve: "https://api.twelvedata.com",
      alpha: "https://www.alphavantage.co/query",
      polygon: "https://api.polygon.io"
    },
    corsProxies: [
      function (targetUrl) {
        return (
          "https://api.allorigins.win/raw?url=" + encodeURIComponent(targetUrl)
        );
      },
      function (targetUrl) {
        return "https://corsproxy.io/?" + encodeURIComponent(targetUrl);
      }
    ]
  };

  function createCache() {
    var store = new Map();
    return {
      get: function (key) {
        var entry = store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
          store.delete(key);
          return null;
        }
        return entry.value;
      },
      set: function (key, value, ttlMs) {
        store.set(key, {
          value: value,
          expiresAt: Date.now() + (ttlMs || CONFIG.quoteCacheTtlMs)
        });
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
    previousClose =
      previousClose != null ? Number(previousClose) : price;
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
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, timeoutMs || CONFIG.requestTimeoutMs);

    return fetch(url, { signal: controller.signal, mode: "cors" })
      .then(function (response) {
        clearTimeout(timer);
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  function requestJson(url) {
    return fetchJsonOnce(url, CONFIG.requestTimeoutMs).catch(function (
      directError
    ) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[MarketData] direct fetch failed:", directError.message);
      }
      var chain = Promise.reject(directError);
      CONFIG.corsProxies.forEach(function (buildProxyUrl) {
        chain = chain.catch(function () {
          return fetchJsonOnce(buildProxyUrl(url), CONFIG.requestTimeoutMs);
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
      return normalizeQuote(
        row.price,
        row.previousClose,
        row.currency || "USD",
        "fmp"
      );
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
        payload.previous_close != null
          ? Number(payload.previous_close)
          : price;
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

    reloadKeys: function () {
      KEYS = readKeys();
      return KEYS;
    },

    getQuote: function (symbol) {
      var normalized = String(symbol || "").trim();
      if (!normalized) return Promise.resolve(null);

      var cacheKey = "quote:" + normalized;
      var cached = cache.get(cacheKey);
      if (cached) return Promise.resolve(cached);

      var sequence = Promise.resolve(null);

      PROVIDER_CHAIN.forEach(function (provider) {
        sequence = sequence.then(function (result) {
          if (result) return result;
          if (provider.need && !KEYS[provider.need]) return null;
          return provider.invoke(normalized).catch(function (err) {
            if (typeof console !== "undefined" && console.warn) {
              console.warn(
                "[MarketData] skip " + provider.id + ":",
                err && err.message
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

    getBistQuote: function (bistCode) {
      var code = String(bistCode || "").trim();
      if (code && code.indexOf(".") === -1) code += ".IS";
      return this.getQuote(code);
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

    getCompanyNews: function (symbol, fromIsoDate, toIsoDate) {
      var token = KEYS.news || KEYS.finnhub || "";
      if (!token) return Promise.resolve([]);
      var url =
        CONFIG.endpoints.finnhub +
        "/company-news?symbol=" +
        encodeURIComponent(stripSuffix(symbol)) +
        "&from=" +
        encodeURIComponent(fromIsoDate) +
        "&to=" +
        encodeURIComponent(toIsoDate) +
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
        " · keys from secrets.js: " +
        (loaded.length ? loaded.join(", ") : "none (Yahoo only)")
    );
  }
})(typeof window !== "undefined" ? window : this);
