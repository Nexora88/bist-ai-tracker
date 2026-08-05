/**
 * =============================================================================
 *  BIST AI Tracker — Price Alert Engine
 *  Module: alarm.js
 *  Version: 1.0.0
 *  Author: Ahmet Eymen Bakraç (Nexora)
 *
 *  <script src="assets/js/api.js"></script>
 *  <script src="assets/js/alarm.js"></script>
 *
 *  Alarm.add({ symbol: "ASELS", target: 90, direction: "above" });
 *  Alarm.start();
 * =============================================================================
 */

(function (global) {
  "use strict";

  var STORAGE_KEY = "nexora_alerts_v1";
  var DEFAULT_INTERVAL_MS = 60000;
  var MAX_ALERTS = 50;

  var Store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  function fetchQuote(symbol) {
    symbol = String(symbol || "").trim();
    if (!symbol) return Promise.resolve(null);

    if (global.API && typeof global.API.getLiveQuote === "function") {
      return global.API.getLiveQuote(symbol).catch(function () {
        return null;
      });
    }

    if (global.MarketData && typeof global.MarketData.getQuote === "function") {
      return global.MarketData.getQuote(symbol)
        .then(function (q) {
          if (!q) return null;
          return {
            price: q.price,
            prev: q.previousClose,
            chg: q.change,
            pct: q.changePercent,
            currency: q.currency,
            source: q.source
          };
        })
        .catch(function () {
          return null;
        });
    }

    var url =
      "https://query1.finance.yahoo.com/v8/finance/chart/" +
      encodeURIComponent(symbol) +
      "?interval=1d&range=2d";

    return fetch(url, { mode: "cors" })
      .then(function (r) {
        if (!r.ok) throw new Error("http");
        return r.json();
      })
      .catch(function () {
        return fetch(
          "https://api.allorigins.win/raw?url=" + encodeURIComponent(url)
        ).then(function (r) {
          if (!r.ok) throw new Error("proxy");
          return r.json();
        });
      })
      .then(function (data) {
        var meta =
          data &&
          data.chart &&
          data.chart.result &&
          data.chart.result[0] &&
          data.chart.result[0].meta;
        if (!meta || meta.regularMarketPrice == null) return null;
        var price = Number(meta.regularMarketPrice);
        var prev = Number(
          meta.chartPreviousClose || meta.previousClose || price
        );
        return {
          price: price,
          prev: prev,
          chg: price - prev,
          pct: prev ? ((price - prev) / prev) * 100 : 0,
          currency: meta.currency || "",
          source: "yahoo"
        };
      })
      .catch(function () {
        return null;
      });
  }

  function uid() {
    return (
      "a_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function normalizeSymbol(symbol) {
    var s = String(symbol || "").trim().toUpperCase();
    if (/^[A-Z]{3,6}$/.test(s) && s.indexOf(".") === -1) {
      s = s + ".IS";
    }
    return s;
  }

  function loadAll() {
    var list = Store.get(STORAGE_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveAll(list) {
    Store.set(STORAGE_KEY, list);
  }

  function isTriggered(alert, price) {
    if (price == null || isNaN(price)) return false;
    if (alert.direction === "above") return price >= Number(alert.target);
    if (alert.direction === "below") return price <= Number(alert.target);
    return false;
  }

  function notifyBrowser(title, body) {
    try {
      if (!("Notification" in global)) return;
      if (Notification.permission === "granted") {
        new Notification(title, { body: body, tag: "nexora-alert" });
      }
    } catch (e) {}
  }

  var listeners = [];
  var timer = null;
  var running = false;

  var Alarm = {
    version: "1.0.0",

    requestPermission: function () {
      if (!("Notification" in global)) {
        return Promise.resolve("unsupported");
      }
      if (Notification.permission === "granted") {
        return Promise.resolve("granted");
      }
      return Notification.requestPermission();
    },

    /**
     * @param {Object} opts
     * @param {string} opts.symbol
     * @param {number} opts.target
     * @param {"above"|"below"} opts.direction
     * @param {string} [opts.note]
     */
    add: function (opts) {
      opts = opts || {};
      var symbol = normalizeSymbol(opts.symbol);
      var target = Number(opts.target);
      var direction = opts.direction === "below" ? "below" : "above";

      if (!symbol || !isFinite(target) || target <= 0) return null;

      var list = loadAll();
      if (list.length >= MAX_ALERTS) {
        console.warn("[Alarm] max alerts reached:", MAX_ALERTS);
        return null;
      }

      var item = {
        id: uid(),
        symbol: symbol,
        target: target,
        direction: direction,
        note: String(opts.note || "").slice(0, 120),
        active: true,
        triggered: false,
        createdAt: Date.now(),
        triggeredAt: null,
        lastPrice: null
      };

      list.push(item);
      saveAll(list);
      this._emit("add", item);
      return item;
    },

    remove: function (id) {
      var list = loadAll();
      var next = list.filter(function (a) {
        return a.id !== id;
      });
      if (next.length === list.length) return false;
      saveAll(next);
      this._emit("remove", { id: id });
      return true;
    },

    setActive: function (id, active) {
      var list = loadAll();
      var found = null;
      list.forEach(function (a) {
        if (a.id === id) {
          a.active = !!active;
          found = a;
        }
      });
      if (!found) return null;
      saveAll(list);
      this._emit("update", found);
      return found;
    },

    resetTriggered: function (id) {
      var list = loadAll();
      list.forEach(function (a) {
        if (!id || a.id === id) {
          a.triggered = false;
          a.triggeredAt = null;
        }
      });
      saveAll(list);
      this._emit("reset", { id: id || null });
    },

    list: function () {
      return loadAll().slice();
    },

    listActive: function () {
      return loadAll().filter(function (a) {
        return a.active && !a.triggered;
      });
    },

    on: function (fn) {
      if (typeof fn === "function") listeners.push(fn);
      return function off() {
        listeners = listeners.filter(function (x) {
          return x !== fn;
        });
      };
    },

    _emit: function (type, payload) {
      listeners.forEach(function (fn) {
        try {
          fn({ type: type, payload: payload, at: Date.now() });
        } catch (e) {}
      });
    },

    check: async function () {
      var list = loadAll();
      var active = list.filter(function (a) {
        return a.active && !a.triggered;
      });
      if (!active.length) {
        this._emit("check", { checked: 0, fired: 0 });
        return { checked: 0, fired: 0 };
      }

      var symbols = [];
      active.forEach(function (a) {
        if (symbols.indexOf(a.symbol) === -1) symbols.push(a.symbol);
      });

      var quotes = {};
      await Promise.all(
        symbols.map(async function (sym) {
          var q = await fetchQuote(sym);
          if (q && q.price != null) quotes[sym] = q;
        })
      );

      var fired = 0;
      var self = this;

      list.forEach(function (a) {
        if (!a.active || a.triggered) return;
        var q = quotes[a.symbol];
        if (!q) return;
        a.lastPrice = q.price;

        if (isTriggered(a, q.price)) {
          a.triggered = true;
          a.triggeredAt = Date.now();
          fired++;

          var dirLabel =
            a.direction === "above" ? "üzerine çıktı" : "altına indi";
          var title = a.symbol + " alarm";
          var body =
            a.symbol +
            " hedef " +
            a.target +
            " " +
            dirLabel +
            " · fiyat " +
            Number(q.price).toFixed(2);

          notifyBrowser(title, body);
          self._emit("trigger", { alert: a, quote: q, message: body });
        }
      });

      saveAll(list);
      this._emit("check", { checked: active.length, fired: fired });
      return { checked: active.length, fired: fired };
    },

    start: function (intervalMs) {
      var ms = intervalMs || DEFAULT_INTERVAL_MS;
      if (running) this.stop();
      running = true;
      var self = this;
      self.check();
      timer = setInterval(function () {
        self.check();
      }, ms);
      this._emit("start", { intervalMs: ms });
    },

    stop: function () {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      running = false;
      this._emit("stop", {});
    },

    isRunning: function () {
      return running;
    }
  };

  global.Alarm = Alarm;

  if (typeof console !== "undefined" && console.info) {
    console.info("[Alarm] v" + Alarm.version + " ready");
  }
})(typeof window !== "undefined" ? window : this);
