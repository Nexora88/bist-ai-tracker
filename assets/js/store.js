/* Nexora Store — ortak localStorage şeması
 * Tüm sayfalar aynı anahtarları kullanır; çakışma / silinme riski azalır.
 * Kullanım: <script src="assets/js/store.js"></script>
 */
(function (global) {
  "use strict";

  var Store = {};

  /** Tek yerde anahtar listesi */
  Store.KEYS = {
    portfolio: "nexora_portfolio_v1",
    game: "nexora_game_v2",
    alarms: "nexora_alarms_v1",
    profile: "nexora_profile_v1",
    arena: "nexora_arena_v1",
    academy: "nexora_academy_v1",
    watchlist: "nexora_watchlist_v1",
    settings: "nexora_settings_v1",
    signals: "nexora_signals_v1"
  };

  function canUse() {
    try {
      var k = "__nexora_t__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  Store.available = canUse();

  /** Güvenli oku */
  Store.get = function (key, fallback) {
    if (fallback === undefined) fallback = null;
    if (!Store.available) return fallback;
    try {
      var raw = localStorage.getItem(key);
      if (raw == null || raw === "") return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  };

  /** Güvenli yaz */
  Store.set = function (key, value) {
    if (!Store.available) return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("[Nexora Store] yazılamadı", key, e);
      return false;
    }
  };

  /** Sil */
  Store.remove = function (key) {
    if (!Store.available) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  };

  /** Kısayollar —— Portföy */
  Store.getPortfolio = function () {
    var d = Store.get(Store.KEYS.portfolio, { positions: [], updatedAt: null });
    if (!d || !Array.isArray(d.positions)) {
      return { positions: [], updatedAt: null };
    }
    return d;
  };

  Store.setPortfolio = function (data) {
    data = data || { positions: [] };
    data.updatedAt = Date.now();
    return Store.set(Store.KEYS.portfolio, data);
  };

  /** Lig / oyun */
  Store.getGame = function () {
    var d = Store.get(Store.KEYS.game, null);
    if (!d || typeof d !== "object") {
      return {
        balance: 100000,
        equity: 100000,
        positions: [],
        league: "Tahta",
        lastDaily: null,
        lastHappy: null,
        createdAt: Date.now()
      };
    }
    return d;
  };

  Store.setGame = function (data) {
    data = data || Store.getGame();
    data.updatedAt = Date.now();
    return Store.set(Store.KEYS.game, data);
  };

  /** Alarmlar */
  Store.getAlarms = function () {
    var d = Store.get(Store.KEYS.alarms, []);
    return Array.isArray(d) ? d : [];
  };

  Store.setAlarms = function (list) {
    return Store.set(Store.KEYS.alarms, Array.isArray(list) ? list : []);
  };

  /** Takip listesi */
  Store.getWatchlist = function () {
    var d = Store.get(Store.KEYS.watchlist, []);
    return Array.isArray(d) ? d : [];
  };

  Store.setWatchlist = function (list) {
    return Store.set(Store.KEYS.watchlist, Array.isArray(list) ? list : []);
  };

  Store.toggleWatch = function (symbol, market) {
    symbol = String(symbol || "").toUpperCase().trim();
    market = String(market || "bist").toLowerCase();
    if (!symbol) return Store.getWatchlist();
    var list = Store.getWatchlist();
    var i = list.findIndex(function (x) {
      return x.symbol === symbol && String(x.market || "").toLowerCase() === market;
    });
    if (i >= 0) list.splice(i, 1);
    else list.push({ symbol: symbol, market: market, addedAt: Date.now() });
    Store.setWatchlist(list);
    return list;
  };

  /** Profil (avatar / çerçeve) */
  Store.getProfile = function () {
    return (
      Store.get(Store.KEYS.profile, {
        displayName: "",
        avatar: "default",
        frame: "none",
        nameStyle: "plain",
        points: 0
      }) || {}
    );
  };

  Store.setProfile = function (data) {
    return Store.set(Store.KEYS.profile, data || {});
  };

  /** Ayarlar */
  Store.getSettings = function () {
    return (
      Store.get(Store.KEYS.settings, {
        theme: "dark",
        lang: "tr",
        notify: true,
        refreshSec: 60
      }) || {}
    );
  };

  Store.setSettings = function (data) {
    return Store.set(Store.KEYS.settings, data || {});
  };

  /** Arena / akademi ham okuma */
  Store.getArena = function () {
    return Store.get(Store.KEYS.arena, { lastDate: null, pick: null, settled: false });
  };

  Store.setArena = function (data) {
    return Store.set(Store.KEYS.arena, data || {});
  };

  Store.getAcademy = function () {
    return Store.get(Store.KEYS.academy, { done: [], points: 0 });
  };

  Store.setAcademy = function (data) {
    return Store.set(Store.KEYS.academy, data || {});
  };

  /** Teşhis */
  Store.debug = function () {
    var out = {};
    Object.keys(Store.KEYS).forEach(function (k) {
      out[k] = Store.get(Store.KEYS[k], null);
    });
    console.log("[Nexora Store]", out);
    return out;
  };

  global.NexoraStore = Store;
  global.Store = Store;
})(typeof window !== "undefined" ? window : this);
