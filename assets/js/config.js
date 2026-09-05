/* Nexora AI — config.js (klasik script, export YOK) */
(function (global) {
  "use strict";

  global.NEXORA_CONFIG = {
    name: "Nexora AI",
    version: "2.0.0",
    environment: "production",

    /* Supabase Edge (super-worker) — boş bırakırsan sadece ücretsiz yedek çalışır */
    supabaseUrl: "",          /* örn: https://xxxx.supabase.co */
    supabaseAnonKey: "",      /* anon public key — secret değil */
    functionQuote: "super-worker",

    free: {
      enabled: true,
      yahooChart: "https://query1.finance.yahoo.com/v8/finance/chart/",
      corsProxy: "https://api.allorigins.win/raw?url=",
      corsProxy2: "https://corsproxy.io/?"
    },

    chart: {
      libUrl:
        "https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js",
      defaultRange: "3mo",
      cacheTtlMs: 180000,
      height: 420
    },

    ranges: {
      "1d":  { range: "1d",  interval: "5m" },
      "5d":  { range: "5d",  interval: "15m" },
      "1mo": { range: "1mo", interval: "1d" },
      "3mo": { range: "3mo", interval: "1d" },
      "6mo": { range: "6mo", interval: "1d" },
      "1y":  { range: "1y",  interval: "1d" },
      "5y":  { range: "5y",  interval: "1wk" }
    },

    refreshInterval: 60000
  };
})(typeof window !== "undefined" ? window : this);
