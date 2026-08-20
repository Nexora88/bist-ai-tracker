/**
 * Nexora AI — league.js
 * Sanal lig: bakiye, kademe, 20’lik gruplar, aylık turnuva.
 * Bağımlılık: yok (Store varsa onu kullanır).
 *
 * Kullanım:
 *   League.init()
 *   League.getState()
 *   League.applyTrade({ symbol, side, qty, price })
 *   League.claimDaily()
 *   League.claimHappyHour()
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "nexora_league_v1";
  var STARTING_CASH = 100000;
  var GROUP_SIZE = 20;

  /** Kademeler — alt → üst. promotionCount: gruptan kaç kişi yükselir */
  var TIERS = [
    { id: "tahta", name: "Tahta", minPoints: 0, promotionCount: 5, entryFee: 0 },
    { id: "bronz", name: "Bronz", minPoints: 100, promotionCount: 5, entryFee: 0 },
    { id: "gumus", name: "Gümüş", minPoints: 250, promotionCount: 5, entryFee: 0 },
    { id: "altin", name: "Altın", minPoints: 500, promotionCount: 3, entryFee: 0 },
    { id: "platin", name: "Platin", minPoints: 900, promotionCount: 3, entryFee: 0 },
    { id: "elmas", name: "Elmas", minPoints: 1500, promotionCount: 1, entryFee: 0 },
    { id: "sampiyon", name: "Şampiyon", minPoints: 2500, promotionCount: 0, entryFee: 0 }
  ];

  var DAILY_REWARD = 50;
  var HAPPY_HOUR_REWARD = 200;
  /** Happy Hour pencereleri (yerel saat, 24h) */
  var HAPPY_HOURS = [
    { start: 12, end: 13 },
    { start: 17, end: 18, minuteEnd: 30 }
  ];

  /* ---------- storage ---------- */
  function readRaw() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function writeRaw(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
    /* Store köprüsü */
    try {
      if (global.Store && typeof Store.setGame === "function") {
        Store.setGame({
          cash: state.cash,
          equity: state.equity,
          tier: state.tierId,
          points: state.points,
          nickname: state.nickname
        });
      }
    } catch (e) {}
  }

  function defaultState() {
    return {
      version: 1,
      nickname: "Yatırımcı",
      cash: STARTING_CASH,
      equity: STARTING_CASH,
      positions: {},
      points: 0,
      tierId: "tahta",
      groupId: null,
      groupRank: null,
      seasonId: currentSeasonId(),
      trades: 0,
      wins: 0,
      losses: 0,
      lastDailyClaim: null,
      lastHappyClaim: null,
      tournament: {
        seasonId: currentSeasonId(),
        pnlPct: 0,
        startEquity: STARTING_CASH
      },
      history: []
    };
  }

  function currentSeasonId() {
    var d = new Date();
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    return y + "-" + (m < 10 ? "0" : "") + m;
  }

  /** Ayın 1–22 yarış, 23–29 sonuç, 30/31 ara → yeni ay 1’de reset fikri */
  function tournamentPhase(date) {
    date = date || new Date();
    var day = date.getDate();
    if (day <= 22) return "compete";
    if (day <= 29) return "results";
    return "break";
  }

  function tierById(id) {
    for (var i = 0; i < TIERS.length; i++) {
      if (TIERS[i].id === id) return TIERS[i];
    }
    return TIERS[0];
  }

  function tierIndex(id) {
    for (var i = 0; i < TIERS.length; i++) {
      if (TIERS[i].id === id) return i;
    }
    return 0;
  }

  function pointsToNext(state) {
    var idx = tierIndex(state.tierId);
    if (idx >= TIERS.length - 1) return null;
    var next = TIERS[idx + 1];
    return Math.max(0, next.minPoints - state.points);
  }

  /* ---------- core ---------- */
  var state = null;

  function ensure() {
    if (state) return state;
    var loaded = readRaw();
    if (!loaded || typeof loaded !== "object") {
      state = defaultState();
      writeRaw(state);
      return state;
    }
    /* sezon değişimi */
    var season = currentSeasonId();
    if (loaded.seasonId !== season) {
      loaded.seasonId = season;
      loaded.tournament = {
        seasonId: season,
        pnlPct: 0,
        startEquity: loaded.equity || loaded.cash || STARTING_CASH
      };
    }
    state = Object.assign(defaultState(), loaded);
    recomputeEquity();
    return state;
  }

  function persist() {
    recomputeEquity();
    writeRaw(state);
  }

  function recomputeEquity() {
    var posValue = 0;
    var positions = state.positions || {};
    Object.keys(positions).forEach(function (sym) {
      var p = positions[sym];
      var px = Number(p.lastPrice != null ? p.lastPrice : p.avgPrice) || 0;
      posValue += (Number(p.qty) || 0) * px;
    });
    state.equity = round2((Number(state.cash) || 0) + posValue);
    if (state.tournament && state.tournament.startEquity) {
      var start = Number(state.tournament.startEquity) || STARTING_CASH;
      state.tournament.pnlPct = start
        ? round2(((state.equity - start) / start) * 100)
        : 0;
    }
  }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function isHappyHour(date) {
    date = date || new Date();
    var h = date.getHours();
    var m = date.getMinutes();
    for (var i = 0; i < HAPPY_HOURS.length; i++) {
      var w = HAPPY_HOURS[i];
      var endH = w.end;
      var endM = w.minuteEnd != null ? w.minuteEnd : 0;
      if (h > w.start && h < endH) return true;
      if (h === w.start && (w.minuteStart == null || m >= (w.minuteStart || 0))) return true;
      if (h === endH && m < endM) return true;
      if (h === w.start && endH === w.start + 1 && endM === 0) {
        /* tam saat penceresi 12:00–13:00 */
        if (h === w.start) return true;
      }
    }
    /* Basit: 12:00–12:59 ve 17:30–18:29 */
    if (h === 12) return true;
    if (h === 17 && m >= 30) return true;
    if (h === 18 && m < 30) return true;
    return false;
  }

  /** Kademe yükseltme: puan eşiği */
  function maybePromote() {
    var idx = tierIndex(state.tierId);
    while (idx < TIERS.length - 1) {
      var next = TIERS[idx + 1];
      if (state.points >= next.minPoints) {
        state.tierId = next.id;
        state.history.push({
          t: Date.now(),
          type: "promote",
          tier: next.id,
          points: state.points
        });
        idx++;
      } else break;
    }
  }

  /**
   * İşlem uygula
   * @param {{ symbol: string, side: 'buy'|'sell', qty: number, price: number }} order
   * @returns {{ ok: boolean, error?: string, state?: object }}
   */
  function applyTrade(order) {
    ensure();
    var symbol = String(order.symbol || "").toUpperCase().trim();
    var side = order.side === "sell" ? "sell" : "buy";
    var qty = Number(order.qty);
    var price = Number(order.price);

    if (!symbol) return { ok: false, error: "Sembol gerekli." };
    if (!(qty > 0)) return { ok: false, error: "Adet geçersiz." };
    if (!(price > 0)) return { ok: false, error: "Fiyat geçersiz." };

    var cost = round2(qty * price);
    state.positions = state.positions || {};

    if (side === "buy") {
      if (cost > state.cash + 1e-9) {
        return { ok: false, error: "Yetersiz sanal bakiye." };
      }
      state.cash = round2(state.cash - cost);
      var prev = state.positions[symbol];
      if (prev && prev.qty > 0) {
        var newQty = prev.qty + qty;
        var newAvg = (prev.avgPrice * prev.qty + price * qty) / newQty;
        state.positions[symbol] = {
          qty: newQty,
          avgPrice: round2(newAvg),
          lastPrice: price
        };
      } else {
        state.positions[symbol] = {
          qty: qty,
          avgPrice: price,
          lastPrice: price
        };
      }
      state.trades += 1;
      state.points += 2;
    } else {
      var hold = state.positions[symbol];
      if (!hold || hold.qty < qty) {
        return { ok: false, error: "Yetersiz pozisyon." };
      }
      var proceeds = cost;
      var pnl = round2((price - hold.avgPrice) * qty);
      state.cash = round2(state.cash + proceeds);
      hold.qty = round2(hold.qty - qty);
      hold.lastPrice = price;
      if (hold.qty <= 0) delete state.positions[symbol];
      else state.positions[symbol] = hold;

      state.trades += 1;
      if (pnl >= 0) {
        state.wins += 1;
        state.points += 5 + Math.min(20, Math.floor(Math.abs(pnl) / 1000));
      } else {
        state.losses += 1;
        state.points += 1;
      }
      state.history.push({
        t: Date.now(),
        type: "trade",
        side: side,
        symbol: symbol,
        qty: qty,
        price: price,
        pnl: pnl
      });
    }

    maybePromote();
    persist();
    return { ok: true, state: getPublicState() };
  }

  /** Fiyat güncelle (equity için) */
  function updatePrices(map) {
    ensure();
    if (!map) return getPublicState();
    Object.keys(map).forEach(function (sym) {
      var s = String(sym).toUpperCase();
      if (state.positions[s]) {
        state.positions[s].lastPrice = Number(map[s]) || state.positions[s].lastPrice;
      }
    });
    persist();
    return getPublicState();
  }

  function claimDaily() {
    ensure();
    var key = todayKey();
    if (state.lastDailyClaim === key) {
      return { ok: false, error: "Bugünkü giriş ödülü alındı." };
    }
    state.cash = round2(state.cash + DAILY_REWARD);
    state.points += 3;
    state.lastDailyClaim = key;
    maybePromote();
    persist();
    return { ok: true, amount: DAILY_REWARD, state: getPublicState() };
  }

  function claimHappyHour() {
    ensure();
    if (!isHappyHour()) {
      return { ok: false, error: "Happy Hour dışında (12:00–13:00 veya 17:30–18:30)." };
    }
    var key = todayKey() + "-hh";
    if (state.lastHappyClaim === key) {
      return { ok: false, error: "Bu Happy Hour ödülü alındı." };
    }
    state.cash = round2(state.cash + HAPPY_HOUR_REWARD);
    state.points += 8;
    state.lastHappyClaim = key;
    maybePromote();
    persist();
    return { ok: true, amount: HAPPY_HOUR_REWARD, state: getPublicState() };
  }

  function setNickname(name) {
    ensure();
    name = String(name || "").trim().slice(0, 20);
    if (!name) return { ok: false, error: "Takma ad boş olamaz." };
    state.nickname = name;
    persist();
    return { ok: true, state: getPublicState() };
  }

  function addPoints(n, reason) {
    ensure();
    n = Number(n) || 0;
    if (!n) return getPublicState();
    state.points = Math.max(0, state.points + n);
    state.history.push({ t: Date.now(), type: "points", n: n, reason: reason || "" });
    maybePromote();
    persist();
    return getPublicState();
  }

  /** Demo lider tablosu (statik isimler + oyuncu) */
  function getLeaderboard(limit) {
    ensure();
    limit = limit || 10;
    var bots = [
      { nickname: "Nexora88", pnlPct: 42.5, tierId: "elmas" },
      { nickname: "Ahmet_Yatirim", pnlPct: 31.2, tierId: "platin" },
      { nickname: "SakinEl", pnlPct: 24.8, tierId: "altin" },
      { nickname: "BIST_Hunter", pnlPct: 18.4, tierId: "altin" },
      { nickname: "BlueChip", pnlPct: 12.1, tierId: "gumus" },
      { nickname: "Dipci", pnlPct: 9.6, tierId: "gumus" },
      { nickname: "Volator", pnlPct: 6.2, tierId: "bronz" },
      { nickname: "TemettuSever", pnlPct: 4.1, tierId: "bronz" }
    ];
    var me = {
      nickname: state.nickname,
      pnlPct: state.tournament ? state.tournament.pnlPct : 0,
      tierId: state.tierId,
      isYou: true
    };
    var list = bots.concat([me]);
    list.sort(function (a, b) {
      return b.pnlPct - a.pnlPct;
    });
    return list.slice(0, limit).map(function (row, i) {
      return Object.assign({}, row, {
        rank: i + 1,
        tierName: tierById(row.tierId).name
      });
    });
  }

  function getPublicState() {
    ensure();
    var tier = tierById(state.tierId);
    return {
      nickname: state.nickname,
      cash: state.cash,
      equity: state.equity,
      points: state.points,
      tierId: tier.id,
      tierName: tier.name,
      tierIndex: tierIndex(tier.id),
      pointsToNext: pointsToNext(state),
      promotionCount: tier.promotionCount,
      positions: state.positions,
      trades: state.trades,
      wins: state.wins,
      losses: state.losses,
      seasonId: state.seasonId,
      tournamentPhase: tournamentPhase(),
      tournament: state.tournament,
      lastDailyClaim: state.lastDailyClaim,
      lastHappyClaim: state.lastHappyClaim,
      isHappyHour: isHappyHour(),
      startingCash: STARTING_CASH,
      tiers: TIERS.map(function (t) {
        return { id: t.id, name: t.name, minPoints: t.minPoints, promotionCount: t.promotionCount };
      })
    };
  }

  function resetSeasonDemo() {
    ensure();
    state.cash = STARTING_CASH;
    state.equity = STARTING_CASH;
    state.positions = {};
    state.tournament = {
      seasonId: currentSeasonId(),
      pnlPct: 0,
      startEquity: STARTING_CASH
    };
    state.seasonId = currentSeasonId();
    persist();
    return getPublicState();
  }

  function init() {
    ensure();
    return getPublicState();
  }

  var API = {
    init: init,
    getState: getPublicState,
    applyTrade: applyTrade,
    updatePrices: updatePrices,
    claimDaily: claimDaily,
    claimHappyHour: claimHappyHour,
    setNickname: setNickname,
    addPoints: addPoints,
    getLeaderboard: getLeaderboard,
    resetSeasonDemo: resetSeasonDemo,
    tournamentPhase: tournamentPhase,
    isHappyHour: isHappyHour,
    TIERS: TIERS,
    STARTING_CASH: STARTING_CASH,
    GROUP_SIZE: GROUP_SIZE
  };

  global.League = API;
})(typeof window !== "undefined" ? window : this);
