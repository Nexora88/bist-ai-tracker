/* Nexora AI — config.js (klasik script, export yok) */
(function (global) {
  "use strict";

  global.NEXORA_CONFIG = {
    name: "Nexora AI",
    version: "2.1.0",

    supabaseUrl: "",
    supabaseAnonKey: "",
    functionQuote: "super-worker",

    free: {
      enabled: true,
      yahooChart: "https://query1.finance.yahoo.com/v8/finance/chart/",
      yahooChart2: "https://query2.finance.yahoo.com/v8/finance/chart/",
      stooq: "https://stooq.com/q/d/l/",
      corsProxies: [
        "https://api.allorigins.win/raw?url=",
        "https://corsproxy.io/?",
        "https://api.codetabs.com/v1/proxy?quest="
      ]
    },

    chart: {
      libUrl:
        "https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js",
      defaultRange: "3mo",
      defaultType: "candle",
      cacheTtlMs: 120000,
      height: 440
    },

    ranges: {
      "1d":  { range: "1d",  interval: "5m",  label: "1G" },
      "5d":  { range: "5d",  interval: "15m", label: "5G" },
      "1mo": { range: "1mo", interval: "1d",  label: "1A" },
      "3mo": { range: "3mo", interval: "1d",  label: "3A" },
      "6mo": { range: "6mo", interval: "1d",  label: "6A" },
      "1y":  { range: "1y",  interval: "1d",  label: "1Y" },
      "5y":  { range: "5y",  interval: "1wk", label: "5Y" }
    },

    markets: {
      bist:   { id: "bist",   name: "BIST",   flag: "TR", suffix: ".IS", currency: "TRY" },
      nasdaq: { id: "nasdaq", name: "NASDAQ", flag: "US", suffix: "",    currency: "USD" },
      nyse:   { id: "nyse",   name: "NYSE",   flag: "US", suffix: "",    currency: "USD" }
    },

    refreshInterval: 60000
  };
})(typeof window !== "undefined" ? window : this);
