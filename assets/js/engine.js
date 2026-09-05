/* Nexora AI — engine.js v2.2
   Tarayıcıdan Yahoo'ya doğrudan istek YOK (CORS).
   Sıra: Worker/API → proxy+Yahoo → alternatif proxy.
*/
(function (global) {
  "use strict";

  var cfg = global.NEXORA_CONFIG || {};
  var free = cfg.free || {};
  var chartCfg = cfg.chart || {};
  var ranges = cfg.ranges || {
    "1d": { range: "1d", interval: "5m" },
    "5d": { range: "5d", interval: "15m" },
    "1mo": { range: "1mo", interval: "1d" },
    "3mo": { range: "3mo", interval: "1d" },
    "6mo": { range: "6mo", interval: "1d" },
    "1y": { range: "1y", interval: "1d" },
    "5y": { range: "5y", interval: "1wk" }
  };

  var PROXIES = (free.corsProxies && free.corsProxies.length)
    ? free.corsProxies
    : [
        "https://api.allorigins.win/raw?url=",
        "https://api.codetabs.com/v1/proxy?quest=",
        "https://corsproxy.io/?"
      ];

  var libPromise = null;
  var ohlcCache = {};
  var inst = null;

  function fetchRaw(url, ms) {
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, ms || 16000);
    return fetch(url, {
      signal: c.signal,
      mode: "cors",
      credentials: "omit",
      cache: "no-store"
    }).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).catch(function (e) {
      clearTimeout(t);
      throw e;
    });
  }

  function fetchViaProxies(targetUrl) {
    var errors = [];
    var i = 0;

    function next() {
      if (i >= PROXIES.length) {
        return Promise.reject(
          new Error(errors.length ? errors[0] : "Tüm proxy kaynakları yanıt vermedi")
        );
      }
      var proxy = PROXIES[i++];
      var full = proxy + encodeURIComponent(targetUrl);
      return fetchRaw(full)
        .then(function (text) {
          if (!text || text.length < 20) throw new Error("Boş cevap");
          if (text.charAt(0) === "<" || /<!DOCTYPE|verify your browser/i.test(text)) {
            throw new Error("Proxy HTML döndü");
          }
          try {
            return JSON.parse(text);
          } catch (e) {
            throw new Error("JSON parse hatası");
          }
        })
        .catch(function (err) {
          errors.push((err && err.message) || "proxy hata");
          return next();
        });
    }
    return next();
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
    if (!result) throw new Error("Grafik verisi boş");
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
    if (!candles.length) throw new Error("Mum çubuğu yok");
    return { candles: candles, meta: result.meta || {}, source: "yahoo" };
  }

  function yahooUrl(symbol, rangeKey) {
    var map = ranges[rangeKey] || { range: "3mo", interval: "1d" };
    var base = free.yahooChart || "https://query1.finance.yahoo.com/v8/finance/chart/";
    return (
      base +
      encodeURIComponent(symbol) +
      "?range=" + encodeURIComponent(map.range) +
      "&interval=" + encodeURIComponent(map.interval) +
      "&includePrePost=false&events=div%2Csplits"
    );
  }

  function yahooUrl2(symbol, rangeKey) {
    var map = ranges[rangeKey] || { range: "3mo", interval: "1d" };
    var base = free.yahooChart2 || "https://query2.finance.yahoo.com/v8/finance/chart/";
    return (
      base +
      encodeURIComponent(symbol) +
      "?range=" + encodeURIComponent(map.range) +
      "&interval=" + encodeURIComponent(map.interval)
    );
  }

  function fromApiLayer(symbol, rangeKey) {
    if (!global.API) return Promise.resolve(null);
    var map = ranges[rangeKey] || { range: "3mo", interval: "1d" };

    if (typeof global.API.getHistory !== "function") return Promise.resolve(null);

    return global.API.getHistory(symbol, map.range, map.interval)
      .then(function (j) {
        if (!j) return null;
        if (Array.isArray(j) && j.length >= 2 && j[0].time != null) {
          var candles = j
            .map(function (h) {
              var close = Number(h.close != null ? h.close : h.value);
              var time = h.time;
              if (typeof time === "string") time = Math.floor(new Date(time).getTime() / 1000);
              return {
                time: time,
                open: Number(h.open != null ? h.open : close),
                high: Number(h.high != null ? h.high : close),
                low: Number(h.low != null ? h.low : close),
                close: close,
                volume: Number(h.volume || 0)
              };
            })
            .filter(function (b) {
              return isFinite(b.close) && isFinite(b.time);
            });
          if (candles.length) return { candles: candles, meta: {}, source: "api" };
        }
        if (j.chart) return parseYahoo(j);
        if (j.history && Array.isArray(j.history)) {
          var c2 = j.history
            .map(function (h) {
              var close = Number(h.close != null ? h.close : h.value);
              var time = h.time;
              if (typeof time === "string") time = Math.floor(new Date(time).getTime() / 1000);
              return {
                time: time,
                open: Number(h.open != null ? h.open : close),
                high: Number(h.high != null ? h.high : close),
                low: Number(h.low != null ? h.low : close),
                close: close,
                volume: Number(h.volume || 0)
              };
            })
            .filter(function (b) {
              return isFinite(b.close) && isFinite(b.time);
            });
          if (c2.length) return { candles: c2, meta: {}, source: "worker" };
        }
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  function getOHLC(symbol, rangeKey, marketId) {
    symbol = normalizeSymbol(symbol, marketId);
    rangeKey = rangeKey || chartCfg.defaultRange || "3mo";
    if (!symbol) return Promise.reject(new Error("Sembol gerekli"));

    var key = symbol + "|" + rangeKey;
    var hit = ohlcCache[key];
    if (hit && Date.now() < hit.exp) return Promise.resolve(hit.data);

    return fromApiLayer(symbol, rangeKey)
      .then(function (fromApi) {
        if (fromApi && fromApi.candles && fromApi.candles.length) return fromApi;
        return fetchViaProxies(yahooUrl(symbol, rangeKey))
          .then(parseYahoo)
          .catch(function () {
            return fetchViaProxies(yahooUrl2(symbol, rangeKey)).then(parseYahoo);
          });
      })
      .then(function (pack) {
        if (!pack || !pack.candles || !pack.candles.length) {
          throw new Error("Bu sembol için grafik verisi bulunamadı");
        }
        var data = {
          symbol: symbol,
          display: displaySymbol(symbol),
          range: rangeKey,
          candles: pack.candles,
          meta: pack.meta || {},
          source: pack.source || "yahoo"
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
    var url =
      (chartCfg && chartCfg.libUrl) ||
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
        reject(new Error("Grafik kütüphanesi indirilemedi (unpkg)"));
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
        height: options.height || (chartCfg && chartCfg.height) || 440
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
        try {
          chart.removeSeries(inst[k]);
        } catch (e) {}
        inst[k] = null;
      }
    });

    type = type || "candle";

    if (type === "line") {
      inst.series = chart.addLineSeries({
        color: "#22d3ee",
        lineWidth: 2,
        crosshairMarkerVisible: true
      });
      inst.series.setData(
        candles.map(function (b) {
          return { time: b.time, value: b.close };
        })
      );
    } else if (type === "area") {
      inst.series = chart.addAreaSeries({
        lineColor: "#22d3ee",
        topColor: "rgba(34,211,238,0.35)",
        bottomColor: "rgba(34,211,238,0.02)",
        lineWidth: 2
      });
      inst.series.setData(
        candles.map(function (b) {
          return { time: b.time, value: b.close };
        })
      );
    } else if (type === "bar") {
      inst.series = chart.addBarSeries({ upColor: "#34d399", downColor: "#f87171" });
      inst.series.setData(
        candles.map(function (b) {
          return {
            time: b.time,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close
          };
        })
      );
    } else {
      inst.series = chart.addCandlestickSeries({
        upColor: "#34d399",
        downColor: "#f87171",
        borderUpColor: "#34d399",
        borderDownColor: "#f87171",
        wickUpColor: "#34d399",
        wickDownColor: "#f87171"
      });
      inst.series.setData(
        candles.map(function (b) {
          return {
            time: b.time,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close
          };
        })
      );
    }

    inst.vol = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: { top: 0.82, bottom: 0 }
    });
    inst.vol.setData(
      candles.map(function (b) {
        return {
          time: b.time,
          value: b.volume || 0,
          color:
            b.close >= b.open
              ? "rgba(52,211,153,0.35)"
              : "rgba(248,113,113,0.35)"
        };
      })
    );

    if (type === "candle" || type === "bar") {
      inst.ma20 = chart.addLineSeries({
        color: "#00f0ff",
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false
      });
      inst.ma50 = chart.addLineSeries({
        color: "#a78bfa",
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false
      });
      inst.ma20.setData(sma(candles, 20));
      inst.ma50.setData(sma(candles, 50));
    }

    try {
      chart.timeScale().fitContent();
    } catch (e) {}

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
        var info = applyType(
          type || (chartCfg && chartCfg.defaultType) || "candle",
          pack.candles
        );
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
    clearCache: function () {
      ohlcCache = {};
    }
  };
  global.Engine = global.NexoraEngine;
})(typeof window !== "undefined" ? window : this);
