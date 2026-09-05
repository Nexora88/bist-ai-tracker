/* Nexora AI — engine.js
   Kendi mum grafiği (Lightweight Charts). TradingView widget YOK.
   Aralık değişince destroy + yeniden kurulum.
*/
(function (global) {
  "use strict";

  var cfg = global.NEXORA_CONFIG || {};
  var chartCfg = cfg.chart || {};
  var ranges = cfg.ranges || {};
  var free = cfg.free || {};

  var libPromise = null;
  var ohlcCache = {};
  var instance = null;

  function loadLib() {
    if (global.LightweightCharts) return Promise.resolve(global.LightweightCharts);
    if (libPromise) return libPromise;
    var url = chartCfg.libUrl ||
      "https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js";
    libPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = function () {
        if (global.LightweightCharts) resolve(global.LightweightCharts);
        else reject(new Error("LightweightCharts yok"));
      };
      s.onerror = function () {
        libPromise = null;
        reject(new Error("Grafik kütüphanesi indirilemedi"));
      };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  function normalizeSymbol(raw) {
    var s = String(raw || "").trim().toUpperCase();
    if (!s) return "";
    if (s.indexOf(".") !== -1) return s;
    var us = {
      AAPL: 1, MSFT: 1, NVDA: 1, TSLA: 1, AMZN: 1, GOOGL: 1, GOOG: 1,
      META: 1, NFLX: 1, AMD: 1, INTC: 1, JPM: 1, BAC: 1, V: 1, MA: 1
    };
    if (us[s]) return s;
    if (/^[A-Z]{3,6}$/.test(s)) return s + ".IS";
    return s;
  }

  function fetchJson(url, ms) {
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, ms || 12000);
    return fetch(url, { signal: c.signal, mode: "cors" })
      .then(function (r) {
        clearTimeout(t);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function (e) {
        clearTimeout(t);
        throw e;
      });
  }

  function fetchWithFallback(targetUrl) {
    var list = [targetUrl];
    if (free.corsProxy) list.push(free.corsProxy + encodeURIComponent(targetUrl));
    if (free.corsProxy2) list.push(free.corsProxy2 + encodeURIComponent(targetUrl));
    var chain = Promise.reject(new Error("start"));
    list.forEach(function (u) {
      chain = chain.catch(function () { return fetchJson(u); });
    });
    return chain;
  }

  function parseYahoo(payload) {
    var result =
      payload &&
      payload.chart &&
      payload.chart.result &&
      payload.chart.result[0];
    if (!result) throw new Error("Boş grafik cevabı");
    var ts = result.timestamp || [];
    var q = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
    var candles = [];
    for (var i = 0; i < ts.length; i++) {
      var c = q.close && q.close[i];
      if (c == null || !isFinite(Number(c))) continue;
      var o = q.open && q.open[i];
      var h = q.high && q.high[i];
      var l = q.low && q.low[i];
      var v = q.volume && q.volume[i];
      candles.push({
        time: ts[i],
        open: Number(o != null ? o : c),
        high: Number(h != null ? h : c),
        low: Number(l != null ? l : c),
        close: Number(c),
        volume: v != null ? Number(v) : 0
      });
    }
    if (!candles.length) throw new Error("Mum verisi yok");
    return { candles: candles, meta: result.meta || {}, source: "yahoo" };
  }

  function getOHLC(symbol, rangeKey) {
    symbol = normalizeSymbol(symbol);
    rangeKey = rangeKey || chartCfg.defaultRange || "3mo";
    var map = ranges[rangeKey] || { range: "3mo", interval: "1d" };
    var cacheKey = symbol + "|" + rangeKey;
    var hit = ohlcCache[cacheKey];
    if (hit && Date.now() < hit.exp) return Promise.resolve(hit.data);

    var yUrl =
      (free.yahooChart || "https://query1.finance.yahoo.com/v8/finance/chart/") +
      encodeURIComponent(symbol) +
      "?range=" + encodeURIComponent(map.range) +
      "&interval=" + encodeURIComponent(map.interval);

    /* 1) Mevcut API.getHistory varsa dene */
    var p = Promise.resolve(null);
    if (global.API && typeof global.API.getHistory === "function") {
      p = global.API.getHistory(symbol, map.range, map.interval)
        .then(function (j) { return j ? parseYahoo(j) : null; })
        .catch(function () { return null; });
    }

    return p.then(function (fromApi) {
      if (fromApi) return fromApi;
      return fetchWithFallback(yUrl).then(parseYahoo);
    }).then(function (pack) {
      ohlcCache[cacheKey] = {
        exp: Date.now() + (chartCfg.cacheTtlMs || 180000),
        data: {
          symbol: symbol,
          range: rangeKey,
          candles: pack.candles,
          meta: pack.meta,
          source: pack.source
        }
      };
      return ohlcCache[cacheKey].data;
    });
  }

  function sma(candles, period) {
    var out = [];
    var sum = 0;
    for (var i = 0; i < candles.length; i++) {
      sum += candles[i].close;
      if (i >= period) sum -= candles[i - period].close;
      if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period });
    }
    return out;
  }

  function destroy() {
    if (instance) {
      try {
        if (instance.ro) instance.ro.disconnect();
        if (instance.chart) instance.chart.remove();
      } catch (e) {}
      instance = null;
    }
  }

  function mount(container, options) {
    options = options || {};
    return loadLib().then(function (LC) {
      destroy();
      if (!container) throw new Error("Konteyner yok");
      container.innerHTML = "";

      var chart = LC.createChart(container, {
        layout: {
          background: { type: "solid", color: options.bg || "#0d0d1a" },
          textColor: "#94a3b8"
        },
        grid: {
          vertLines: { color: "rgba(148,163,184,0.08)" },
          horzLines: { color: "rgba(148,163,184,0.08)" }
        },
        rightPriceScale: {
          borderColor: "rgba(148,163,184,0.12)",
          scaleMargins: { top: 0.08, bottom: 0.2 }
        },
        timeScale: {
          borderColor: "rgba(148,163,184,0.12)",
          timeVisible: true,
          secondsVisible: false
        },
        width: container.clientWidth || 640,
        height: options.height || chartCfg.height || 420
      });

      var candle = chart.addCandlestickSeries({
        upColor: "#34d399",
        downColor: "#f87171",
        borderUpColor: "#34d399",
        borderDownColor: "#f87171",
        wickUpColor: "#34d399",
        wickDownColor: "#f87171"
      });
      var vol = chart.addHistogramSeries({
        priceFormat: { type: "volume" },
        priceScaleId: "",
        scaleMargins: { top: 0.82, bottom: 0 }
      });
      var ma20 = chart.addLineSeries({ color: "#00f0ff", lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
      var ma50 = chart.addLineSeries({ color: "#7b2cff", lineWidth: 1, lastValueVisible: false, priceLineVisible: false });

      var ro = null;
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(function () {
          chart.applyOptions({ width: container.clientWidth });
        });
        ro.observe(container);
      }

      instance = { chart: chart, candle: candle, vol: vol, ma20: ma20, ma50: ma50, ro: ro };
      return instance;
    });
  }

  function setCandles(candles) {
    if (!instance || !candles || !candles.length) return { count: 0 };
    instance.candle.setData(candles.map(function (b) {
      return { time: b.time, open: b.open, high: b.high, low: b.low, close: b.close };
    }));
    instance.vol.setData(candles.map(function (b) {
      return {
        time: b.time,
        value: b.volume || 0,
        color: b.close >= b.open ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)"
      };
    }));
    instance.ma20.setData(sma(candles, 20));
    instance.ma50.setData(sma(candles, 50));
    try { instance.chart.timeScale().fitContent(); } catch (e) {}
    return {
      count: candles.length,
      first: candles[0],
      last: candles[candles.length - 1]
    };
  }

  /**
   * Tek çağrı: veri çek + çiz
   * @returns {Promise<{symbol, source, count, last, first}>}
   */
  function render(container, symbol, rangeKey, options) {
    return getOHLC(symbol, rangeKey).then(function (pack) {
      return mount(container, options).then(function () {
        var info = setCandles(pack.candles);
        if (!info.count) throw new Error("Çizilecek bar yok");
        return {
          symbol: pack.symbol,
          source: pack.source,
          range: pack.range,
          count: info.count,
          first: info.first,
          last: info.last,
          meta: pack.meta
        };
      });
    });
  }

  global.NexoraEngine = {
    normalizeSymbol: normalizeSymbol,
    getOHLC: getOHLC,
    mount: mount,
    setCandles: setCandles,
    render: render,
    destroy: destroy,
    clearCache: function () { ohlcCache = {}; }
  };

  /* Eski isim uyumu */
  global.Engine = global.NexoraEngine;
})(typeof window !== "undefined" ? window : this);
