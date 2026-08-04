/**
 * =============================================================================
 *  BIST AI Tracker — Market Data Client
 *  Module: api.js
 *  Version: 4.0.0
 *  Author: Ahmet Eymen Bakraç (Nexora)
 *
 *  Responsibility
 *  --------------
 *  Unified market-data access with ordered provider failover, short-lived
 *  in-memory cache, and CORS-aware transport for static hosting (e.g. GitHub Pages).
 *
 *  Failover order
 *  --------------
 *  1. Financial Modeling Prep
 *  2. Finnhub
 *  3. Twelve Data
 *  4. Alpha Vantage
 *  5. Polygon.io
 *  6. Yahoo Finance (no key; last resort + public CORS proxies)
 *
 *  Security note
 *  -------------
 *  Keys embedded in front-end bundles are visible to anyone who loads the page.
 *  Use only restricted / free-tier credentials. Prefer provider-side domain
 *  allowlists. Never commit high-privilege or billing-enabled secrets.
 * =============================================================================
 */

(function (global) {
  "use strict";

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  var CONFIG = {
    version: "4.0.0",
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

    /**
     * PROVIDER CREDENTIALS — fill only the values between quotes.
     * Leave a provider empty ("") to skip it in the failover chain.
     *
     * Example:
     *   fmp: "your_key_here",
     */
    credentials: {
      fmp: "",
      finnhub: "d92gf21r01qraam0tf4gd92gf21r01qraam0tf50",
      twelve: "f021e2f611c34dd892d465af169f4ae2",
      alpha: "",
      polygon: "",
      /** Optional news token; falls back to finnhub when empty */
      news: ""
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

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

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
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  /**
   * Transport: direct request, then configured CORS proxies in order.
   */
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
          return fetchJsonOnce(
            buildProxyUrl(url),
            CONFIG.requestTimeoutMs
          );
        });
      });
      return chain;
    });
  }

  // ---------------------------------------------------------------------------
  // Provider adapters (each throws on empty / invalid payload)
  // ---------------------------------------------------------------------------

  function quoteFromFmp(symbol) {
    var key = CONFIG.credentials.fmp;
    if (!key) return Promise.reject(new Error("FMP key not configured"));

    var url =
      CONFIG.endpoints.fmp +
      "/quote/" +
      encodeURIComponent(stripSuffix(symbol)) +
      "?apikey=" +
      encodeURIComponent(key);

    return requestJson(url).then(function (payload) {
      var row = Array.isArray(payload) ? payload[0] : payload;
      if (!row || row.price == null) throw new Error("FMP empty payload");
      return normalizeQuote(
        row.price,
        row.previousClose,
        row.currency || "USD",
        "fmp"
      );
    });
  }

  function quoteFromFinnhub(symbol) {
    var key = CONFIG.credentials.finnhub;
    if (!key) return Promise.reject(new Error("Finnhub key not configured"));

    var url =
      CONFIG.endpoints.finnhub +
      "/quote?symbol=" +
      encodeURIComponent(stripSuffix(symbol)) +
      "&token=" +
      encodeURIComponent(key);

    return requestJson(url).then(function (payload) {
      if (!payload || payload.c == null || payload.c === 0) {
        throw new Error("Finnhub empty payload");
      }
      return normalizeQuote(payload.c, payload.pc, "", "finnhub");
    });
  }

  function quoteFromTwelve(symbol) {
    var key = CONFIG.credentials.twelve;
    if (!key) return Promise.reject(new Error("Twelve Data key not configured"));

    var url =
      CONFIG.endpoints.twelve +
      "/quote?symbol=" +
      encodeURIComponent(symbol) +
      "&apikey=" +
      encodeURIComponent(key);

    return requestJson(url).then(function (payload) {
      if (!payload || payload.close == null) {
        throw new Error("Twelve Data empty payload");
      }
      var price = Number(payload.close);
      var prev =
        payload.previous_close != null
          ? Number(payload.previous_close)
          : price;
      return normalizeQuote(price, prev, payload.currency || "", "twelve");
    });
  }

  function quoteFromAlpha(symbol) {
    var key = CONFIG.credentials.alpha;
    if (!key) return Promise.reject(new Error("Alpha Vantage key not configured"));

    var url =
      CONFIG.endpoints.alpha +
      "?function=GLOBAL_QUOTE&symbol=" +
      encodeURIComponent(stripSuffix(symbol)) +
      "&apikey=" +
      encodeURIComponent(key);

    return requestJson(url).then(function (payload) {
      var quote = payload && payload["Global Quote"];
      if (!quote || !quote["05. price"]) {
        throw new Error("Alpha Vantage empty payload");
      }
      return normalizeQuote(
        quote["05. price"],
        quote["08. previous close"],
        "",
        "alpha"
      );
    });
  }

  function quoteFromPolygon(symbol) {
    var key = CONFIG.credentials.polygon;
    if (!key) return Promise.reject(new Error("Polygon key not configured"));

    var url =
      CONFIG.endpoints.polygon +
      "/v2/aggs/ticker/" +
      encodeURIComponent(stripSuffix(symbol)) +
      "/prev?adjusted=true&apiKey=" +
      encodeURIComponent(key);

    return requestJson(url).then(function (payload) {
      var row = payload && payload.results && payload.results[0];
      if (!row || row.c == null) throw new Error("Polygon empty payload");
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
        throw new Error("Yahoo empty payload");
      }
      var price = meta.regularMarketPrice;
      var prev = meta.chartPreviousClose || meta.previousClose || price;
      return normalizeQuote(price, prev, meta.currency || "", "yahoo");
    });
  }

  var PROVIDER_CHAIN = [
    { id: "fmp", invoke: quoteFromFmp, requiresKey: "fmp" },
    { id: "finnhub", invoke: quoteFromFinnhub, requiresKey: "finnhub" },
    { id: "twelve", invoke: quoteFromTwelve, requiresKey: "twelve" },
    { id: "alpha", invoke: quoteFromAlpha, requiresKey: "alpha" },
    { id: "polygon", invoke: quoteFromPolygon, requiresKey: "polygon" },
    { id: "yahoo", invoke: quoteFromYahoo, requiresKey: null }
  ];

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  var MarketData = {
    version: CONFIG.version,

    /**
     * Resolve a live quote for a Yahoo-style symbol (e.g. ASELS.IS, AAPL).
     * Walks the provider chain until one returns a valid quote.
     *
     * @param {string} symbol
     * @returns {Promise<{
     *   price: number,
     *   previousClose: number,
     *   change: number,
     *   changePercent: number,
     *   currency: string,
     *   source: string,
     *   asOf: number
     * }|null>}
     */
    getQuote: function (symbol) {
      var normalized = String(symbol || "").trim();
      if (!normalized) {
        return Promise.resolve(null);
      }

      var cacheKey = "quote:" + normalized;
      var cached = cache.get(cacheKey);
      if (cached) {
        return Promise.resolve(cached);
      }

      var sequence = Promise.resolve(null);

      PROVIDER_CHAIN.forEach(function (provider) {
        sequence = sequence.then(function (result) {
          if (result) return result;

          if (
            provider.requiresKey &&
            !CONFIG.credentials[provider.requiresKey]
          ) {
            return null;
          }

          return provider.invoke(normalized).catch(function (err) {
            if (typeof console !== "undefined" && console.warn) {
              console.warn(
                "[MarketData] provider skipped (" + provider.id + "):",
                err && err.message
              );
            }
            return null;
          });
        });
      });

      return sequence.then(function (quote) {
        if (quote) {
          cache.set(cacheKey, quote, CONFIG.quoteCacheTtlMs);
        }
        return quote;
      });
    },

    /**
     * Convenience for BIST tickers without suffix.
     * @param {string} bistCode e.g. "ASELS"
     */
    getBistQuote: function (bistCode) {
      var code = String(bistCode || "").trim();
      if (code && code.indexOf(".") === -1) code += ".IS";
      return this.getQuote(code);
    },

    /**
     * OHLCV history via Yahoo chart API.
     * @param {string} symbol
     * @param {string} [range="1mo"]
     * @param {string} [interval="1d"]
     */
    getHistory: function (symbol, range, interval) {
      range = range || "1mo";
      interval = interval || "1d";
      var normalized = String(symbol || "").trim();
      if (normalized && normalized.indexOf(".") === -1) {
        normalized += ".IS";
      }
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

    /**
     * Company news (Finnhub). Requires credentials.news or credentials.finnhub.
     */
    getCompanyNews: function (symbol, fromIsoDate, toIsoDate) {
      var token =
        CONFIG.credentials.news || CONFIG.credentials.finnhub || "";
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

    /** Drop in-memory quote cache */
    clearCache: function () {
      cache.clear();
    }
  };

  // Backward-compatible global used by stock.html / index.html
  var API = {
    VERSION: MarketData.version,
    getLiveQuote: function (symbol) {
      return MarketData.getQuote(symbol).then(function (q) {
        if (!q) return null;
        // Legacy shape expected by existing pages
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
    Cache: cache
  };

  global.MarketData = MarketData;
  global.API = API;

  if (typeof console !== "undefined" && console.info) {
    console.info(
      "[MarketData] v" +
        MarketData.version +
        " ready · failover FMP→Finnhub→Twelve→Alpha→Polygon→Yahoo"
    );
  }
})(typeof window !== "undefined" ? window : this);
