/* Nexora AI — engine.js */
(function (global) {
  "use strict";

  var cfg = global.NEXORA_CONFIG || {};
  var free = cfg.free || {};
  var chartCfg = cfg.chart || {};
  var ranges = cfg.ranges || {};
  var proxies = free.corsProxies || [
    "https://api.allorigins.win/raw?url=",
    "https://corsproxy.io/?"
  ];

  var libPromise = null;
  var ohlcCache = {};
  var inst = null;

  function fetchJson(url, ms) {
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, ms || 14000);
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

  function fetchText(url, ms) {
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, ms || 14000);
    return fetch(url, { signal: c.signal, mode: "cors" })
      .then(function (r) {
        clearTimeout(t);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .catch(function (e) {
        clearTimeout(t);
        throw e;
      });
  }

  function withProxies(url, asText) {
    var list = [url];
    for (var i = 0; i < proxies.length; i++) {
      list.push(proxies[i] + encodeURIComponent(url));
    }
    var chain = Promise.reject(new Error("start"));
    list.forEach(function (u) {
      chain = chain.catch(function () {
        return asText ? fetchText(u) : fetchJson(u);
      });
    });
    return chain;
  }

  function normalizeSymbol(raw, marketId) {
    var s = String(raw || "").trim().toUpperCase();
    if (!s) return "";
    if (s.indexOf(".") !== -1) return s;
    if (marketId === "bist") return s + ".IS";
    return s;
  }

  function displaySymbol(sym) {
    return String(sym || "").replace(/\.IS$/i, "");
  }

  function parseYahoo(payload) {
    var result =
      payload &&
      payload.chart &&
      payload.chart.result &&
      payload.chart.result[0];
    if (!result) throw new Error("Yahoo boş");
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
    if (!candles.length) throw new Error("Mum yok");
    return { candles: candles, meta: result.meta || {}, source: "yahoo" };
  }

  function yahooOHLC(symbol, rangeKey) {
    var map = ranges[rangeKey] || { range: "3mo", interval: "1d" };
    var base = free.yahooChart || "https://query1.finance.yahoo.com/v8/finance/chart/";
    var base2 = free.yahooChart2 || "https://query2.finance.yahoo.com/v8/finance/chart/";
    var q =
      encodeURIComponent(symbol) +
      "?range=" + encodeURIComponent(map.range) +
      "&interval=" + encodeURIComponent(map.interval);
    return withProxies(base + q)
      .catch(function () { return withProxies(base2 + q); })
      .then(parseYahoo);
  }

  function stooqCode(symbol) {
    var s = String(symbol || "").toUpperCase();
    if (s.indexOf(".IS") !== -1) return s.replace(".IS", ".tr").toLowerCase();
    if (s.indexOf(".") !== -1) return s.toLowerCase();
    return s.toLowerCase() + ".us";
  }

  function parseStooqCsv(text) {
    var lines = String(text || "").trim().split(/\r?\n/);
    if (lines.length < 3) throw new Error("Stooq boş");
    var candles = [];
    for (var i = 1; i < lines.length; i++) {
      var p = lines[i].split(",");
      if (p.length < 5) continue;
      var parts = p[0].split("-");
      if (parts.length < 3) continue;
      var time = Math.floor(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]) / 1000);
      var o = Number(p[1]), h = Number(p[2]), l = Number(p[3]), c = Number(p[4]);
      var v = p[5] != null ? Number(p[5]) : 0;
      if (!isFinite(c)) continue;
      candles.push({
        time: time,
        open: isFinite(o) ? o : c,
        high: isFinite(h) ? h : c,
        low: isFinite(l) ? l : c,
        close: c,
        volume: isFinite(v) ? v : 0
      });
    }
    if (!candles.length) throw new Error("Stooq mum yok");
    return { candles: candles, meta: {}, source: "stooq" };
  }

  function stooqOHLC(symbol) {
    var code = stooqCode(symbol);
    var url =
      (free.stooq || "https://stooq.com/q/d/l/") +
      "?s=" + encodeURIComponent(code) + "&i=d";
    return withProxies(url, true).then(parseStooqCsv);
  }

  function getOHLC(symbol, rangeKey, marketId) {
    symbol = normalizeSymbol(symbol, marketId);
    rangeKey = rangeKey || chartCfg.defaultRange || "3mo";
    if (!symbol) return Promise.reject(new Error("Sembol gerekli"));

    var key = symbol + "|" + rangeKey;
    var hit = ohlcCache[key];
    if (hit && Date.now() < hit.exp) return Promise.resolve(hit.data);

    var tryApi = Promise.resolve(null);
    if (global.API && typeof global.API.getHistory === "function") {
      var map = ranges[rangeKey] || { range: "3mo", interval: "1d" };
      tryApi = global.API.getHistory(symbol, map.range, map.interval)
        .then(function (j) {
          if (!j) return null;
          return parseYahoo(j);
        })
        .catch(function () { return null; });
    }

    return tryApi
      .then(function (fromApi) {
        if (fromApi) return fromApi;
        return yahooOHLC(symbol, rangeKey);
      })
      .catch(function () {
        return stooqOHLC(symbol).then(function (pack) {
          var mapDays = { "1d": 2, "5d": 8, "1mo": 35, "3mo": 100, "6mo": 200, "1y": 280, "5y": 1400 };
          var n = mapDays[rangeKey] || 100;
          if (pack.candles.length > n) pack.candles = pack.candles.slice(-n);
          return pack;
        });
      })
      .then(function (pack) {
        var data = {
          symbol: symbol,
          display: displaySymbol(symbol),
          range: rangeKey,
          candles: pack.candles,
          meta: pack.meta || {},
          source: pack.source || "unknown"
        };
        ohlcCache[key] = {
          exp: Date.now() + (chartCfg.cacheTtlMs || 120000),
          data: data
        };
        return data;
      });
  }

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
        else reject(new Error("Grafik motoru yüklenemedi"));
      };
      s.onerror = function () {
        libPromise = null;
        reject(new Error("Grafik kütüphanesi indirilemedi"));
      };
      document.head.appendChild(s);
    });
    return libPromise;
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
    if (!inst) return;
    try {
      if (inst.ro) inst.ro.disconnect();
      if (inst.chart) inst.chart.remove();
    } catch (e) {}
    inst = null;
  }

  function mount(container, options) {
    options = options || {};
    return loadLib().then(function (LC) {
      destroy();
      if (!container) throw new Error("Konteyner yok");
      container.innerHTML = "";

      var chart = LC.createChart(container, {
        layout: {
          background: { type: "solid", color: options.bg || "#0b1220" },
          textColor: "#94a3b8"
        },
        grid: {
          vertLines: { color: "rgba(148,163,184,0.07)" },
          horzLines: { color: "rgba(148,163,184,0.07)" }
        },
        crosshair: { mode: LC.CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: "rgba(148,163,184,0.12)",
          scaleMargins: { top: 0.08, bottom: 0.18 }
        },
        timeScale: {
          borderColor: "rgba(148,163,184,0.12)",
          timeVisible: true,
          secondsVisible: false
        },
        width: container.clientWidth || 640,
        height: options.height || chartCfg.height || 440
      });

      var ro = null;
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(function () {
          chart.applyOptions({ width: container.clientWidth });
        });
        ro.observe(container);
      }

      inst = { chart: chart, LC: LC, ro: ro, series: null, vol: null, ma20: null, ma50: null };
      return inst;
    });
  }

  function applyType(type, candles) {
    if (!inst || !candles.length) return { count: 0 };
    var chart = inst.chart;

    ["series", "vol", "ma20", "ma50"].forEach(function (k) {
      if (inst[k]) {
        try { chart.removeSeries(inst[k]); } catch (e) {}
        inst[k] = null;
      }
    });

    type = type || "candle";

    if (type === "line") {
      inst.series = chart.addLineSeries({ color: "#22d3ee", lineWidth: 2, crosshairMarkerVisible: true });
      inst.series.setData(candles.map(function (b) {
        return { time: b.time, value: b.close };
      }));
    } else if (type === "area") {
      inst.series = chart.addAreaSeries({
        lineColor: "#22d3ee",
        topColor: "rgba(34,211,238,0.35)",
        bottomColor: "rgba(34,211,238,0.02)",
        lineWidth: 2
      });
      inst.series.setData(candles.map(function (b) {
        return { time: b.time, value: b.close };
      }));
    } else if (type === "bar") {
      inst.series = chart.addBarSeries({ upColor: "#34d399", downColor: "#f87171" });
      inst.series.setData(candles.map(function (b) {
        return { time: b.time, open: b.open, high: b.high, low: b.low, close: b.close };
      }));
    } else {
      inst.series = chart.addCandlestickSeries({
        upColor: "#34d399",
        downColor: "#f87171",
        borderUpColor: "#34d399",
        borderDownColor: "#f87171",
        wickUpColor: "#34d399",
        wickDownColor: "#f87171"
      });
      inst.series.setData(candles.map(function (b) {
        return { time: b.time, open: b.open, high: b.high, low: b.low, close: b.close };
      }));
    }

    inst.vol = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: { top: 0.82, bottom: 0 }
    });
    inst.vol.setData(candles.map(function (b) {
      return {
        time: b.time,
        value: b.volume || 0,
        color: b.close >= b.open ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)"
      };
    }));

    if (type === "candle" || type === "bar") {
      inst.ma20 = chart.addLineSeries({
        color: "#00f0ff", lineWidth: 1, lastValueVisible: false, priceLineVisible: false
      });
      inst.ma50 = chart.addLineSeries({
        color: "#a78bfa", lineWidth: 1, lastValueVisible: false, priceLineVisible: false
      });
      inst.ma20.setData(sma(candles, 20));
      inst.ma50.setData(sma(candles, 50));
    }

    try { chart.timeScale().fitContent(); } catch (e) {}

    return {
      count: candles.length,
      first: candles[0],
      last: candles[candles.length - 1]
    };
  }

  function render(container, symbol, rangeKey, type, options) {
    options = options || {};
    var marketId = options.marketId || null;
    return getOHLC(symbol, rangeKey, marketId).then(function (pack) {
      return mount(container, options).then(function () {
        var info = applyType(type || chartCfg.defaultType || "candle", pack.candles);
        if (!info.count) throw new Error("Çizilecek veri yok");
        return {
          symbol: pack.symbol,
          display: pack.display,
          source: pack.source,
          range: pack.range,
          type: type || "candle",
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
    displaySymbol: displaySymbol,
    getOHLC: getOHLC,
    mount: mount,
    applyType: applyType,
    render: render,
    destroy: destroy,
    clearCache: function () { ohlcCache = {}; }
  };
  global.Engine = global.NexoraEngine;
})(typeof window !== "undefined" ? window : this);
