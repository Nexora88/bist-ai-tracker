/**
 * =========================================================
 *  NEXORA AI ENGINE  v1.0
 *  Client-side analysis + Q&A (no external LLM required)
 *  Depends: optional window.API (api.js), data/*.json
 * =========================================================
 */
(function (global) {
  "use strict";

  var STATE = {
    market: "bist",
    stocks: [],
    bySymbol: {},
    lastSymbol: null,
    lastQuote: null,
    lastScore: null
  };

  var WEIGHTS = {
    trend: 0.28,
    technical: 0.42,
    news: 0.12,
    risk: 0.18
  };

  function upper(s) {
    return String(s || "").trim().toUpperCase();
  }

  function ysym(item, market) {
    var sym = upper(item && item.symbol != null ? item.symbol : item);
    if (!sym) return "";
    if (item && typeof item === "object" && item.suffix) {
      return sym.indexOf(".") === -1 ? sym + item.suffix : sym;
    }
    if ((market || STATE.market) === "bist" && sym.indexOf(".") === -1) {
      return sym + ".IS";
    }
    return sym;
  }

  function riskScore(risk) {
    var r = String(risk || "Medium").toLowerCase();
    if (r === "low" || r === "düşük") return 78;
    if (r === "high" || r === "yüksek") return 32;
    return 55;
  }

  function computeScore(meta, quote) {
    var base = meta && meta.aiScore != null ? Number(meta.aiScore) : 55;
    var pct = 0;
    if (quote) {
      pct = Number(quote.pct != null ? quote.pct : quote.changePercent);
      if (!isFinite(pct)) pct = 0;
    }

    var trend = 50 + Math.max(-25, Math.min(25, pct * 4));
    var technical = base;
    var news = 50 + (pct > 1 ? 10 : pct > 0 ? 5 : pct < -1 ? -8 : pct < 0 ? -4 : 0);
    var risk = riskScore(meta && meta.risk);

    var total = Math.round(
      trend * WEIGHTS.trend +
        technical * WEIGHTS.technical +
        news * WEIGHTS.news +
        risk * WEIGHTS.risk
    );
    total = Math.max(5, Math.min(98, total));

    var label = "NÖTR / TUT";
    var tone = "hold";
    if (total >= 72) {
      label = "GÜÇLÜ AL";
      tone = "buy";
    } else if (total >= 58) {
      label = "AL";
      tone = "buy";
    } else if (total <= 35) {
      label = "SAT";
      tone = "sell";
    } else if (total <= 48) {
      label = "ZAYIF";
      tone = "sell";
    }

    return {
      total: total,
      trend: Math.round(trend),
      technical: Math.round(technical),
      news: Math.round(news),
      risk: Math.round(risk),
      label: label,
      tone: tone,
      pct: pct
    };
  }

  function findMeta(symbol) {
    var s = upper(symbol);
    return STATE.bySymbol[s] || null;
  }

  async function getQuote(symbolOrItem) {
    var sym =
      typeof symbolOrItem === "object"
        ? ysym(symbolOrItem, STATE.market)
        : ysym({ symbol: symbolOrItem }, STATE.market);

    if (!global.API || typeof API.getLiveQuote !== "function") {
      return null;
    }
    try {
      return await API.getLiveQuote(sym);
    } catch (e) {
      return null;
    }
  }

  async function loadMarket(marketKey) {
    marketKey = (marketKey || "bist").toLowerCase();
    STATE.market = marketKey;
    var res = await fetch("data/" + marketKey + ".json", { cache: "no-store" });
    if (!res.ok) throw new Error("JSON yüklenemedi: data/" + marketKey + ".json");
    var data = await res.json();
    var stocks = Array.isArray(data) ? data : data.stocks || [];
    var suffix = data.suffix || (marketKey === "bist" ? ".IS" : "");
    var flag = data.flag || "";
    var marketName = data.market || marketKey.toUpperCase();

    STATE.bySymbol = {};
    stocks.forEach(function (s) {
      if (!s.suffix && suffix) s.suffix = suffix;
      if (!s.flag && flag) s.flag = flag;
      if (!s.market) s.market = marketName;
      STATE.bySymbol[upper(s.symbol)] = s;
    });
    STATE.stocks = stocks;
    return stocks.length;
  }

  async function analyze(symbol) {
    var meta = findMeta(symbol);
    if (!meta) {
      meta = {
        symbol: upper(symbol),
        name: upper(symbol),
        market: STATE.market.toUpperCase(),
        sector: "—",
        risk: "Medium",
        aiScore: 55
      };
    }
    var quote = await getQuote(meta);
    var score = computeScore(meta, quote);
    STATE.lastSymbol = meta.symbol;
    STATE.lastQuote = quote;
    STATE.lastScore = score;
    return { meta: meta, quote: quote, score: score };
  }

  function formatPrice(quote) {
    if (!quote || quote.price == null) return "fiyat verisi yok";
    var p = Number(quote.price);
    var pct = Number(quote.pct != null ? quote.pct : quote.changePercent);
    var sign = pct > 0 ? "+" : "";
    return (
      p.toLocaleString("en-US", { maximumFractionDigits: 2 }) +
      (isFinite(pct) ? " (" + sign + pct.toFixed(2) + "%)" : "")
    );
  }

  function verdict(meta, score, quote) {
    return (
      meta.name +
      " (" +
      meta.symbol +
      ") için Nexora skoru **" +
      score.total +
      "/100** → **" +
      score.label +
      "**. " +
      "Trend " +
      score.trend +
      ", teknik " +
      score.technical +
      ", risk bileşeni " +
      score.risk +
      ". " +
      "Güncel: " +
      formatPrice(quote) +
      ". " +
      "Bu yatırım tavsiyesi değildir."
    );
  }

  /** Basit Türkçe niyet + sembol yakalama */
  function extractSymbol(text) {
    var t = String(text || "");
    var m = t.match(/\b([A-Z]{2,6})(?:\.IS)?\b/);
    if (m) {
      var cand = upper(m[1]);
      if (STATE.bySymbol[cand]) return cand;
    }
    var lower = t.toLowerCase();
    var keys = Object.keys(STATE.bySymbol);
    for (var i = 0; i < keys.length; i++) {
      var it = STATE.bySymbol[keys[i]];
      var name = String(it.name || "").toLowerCase();
      if (name && lower.indexOf(name) !== -1) return keys[i];
      if (lower.indexOf(keys[i].toLowerCase()) !== -1) return keys[i];
    }
    return STATE.lastSymbol;
  }

  function intent(text) {
    var t = String(text || "").toLowerCase();
    if (/merhaba|selam|hey|hi\b/.test(t)) return "hello";
    if (/kimsin|nesin|nexora/.test(t)) return "identity";
    if (/skor|analiz|al\b|sat\b|tut|öner/.test(t)) return "analyze";
    if (/fiyat|kaç|ne kadar|price/.test(t)) return "price";
    if (/risk/.test(t)) return "risk";
    if (/sektör|sector/.test(t)) return "sector";
    if (/karşılaştır|vs|versus/.test(t)) return "compare";
    if (/yardım|help|ne yap/.test(t)) return "help";
    return "analyze";
  }

  async function ask(question) {
    var q = String(question || "").trim();
    if (!q) {
      return {
        text: "Bir soru yaz. Örnek: ASELS analiz et, GARAN riski nedir?",
        type: "system"
      };
    }

    var type = intent(q);

    if (type === "hello") {
      return {
        text: "Merhaba — ben **Nexora AI**. Hisse skoru, risk ve kısa yorum üretirim. Bir sembol söylemen yeterli.",
        type: "chat"
      };
    }
    if (type === "identity") {
      return {
        text: "Nexora AI, BIST AI Tracker’ın analiz motoruyum. JSON meta + canlı fiyat + kural tabanlı skor ile çalışırım; yatırım tavsiyesi vermem.",
        type: "chat"
      };
    }
    if (type === "help") {
      return {
        text:
          "Örnekler:\n• ASELS analiz et\n• THYAO fiyatı\n• GARAN riski\n• BIMAS sektörü\n• ASELS ile GARAN karşılaştır",
        type: "chat"
      };
    }

    if (type === "compare") {
      var parts = q.toUpperCase().match(/\b([A-Z]{2,6})\b/g) || [];
      var uniq = [];
      parts.forEach(function (p) {
        if (STATE.bySymbol[p] && uniq.indexOf(p) === -1) uniq.push(p);
      });
      if (uniq.length < 2) {
        return {
          text: "Karşılaştırma için iki sembol yaz. Örn: ASELS GARAN karşılaştır",
          type: "system"
        };
      }
      var a = await analyze(uniq[0]);
      var b = await analyze(uniq[1]);
      return {
        text:
          a.meta.symbol +
          " " +
          a.score.total +
          "/100 (" +
          a.score.label +
          ") · " +
          b.meta.symbol +
          " " +
          b.score.total +
          "/100 (" +
          b.score.label +
          "). " +
          (a.score.total === b.score.total
            ? "Skorlar yakın."
            : a.score.total > b.score.total
            ? a.meta.symbol + " skor olarak önde."
            : b.meta.symbol + " skor olarak önde.") +
          " Tavsiye değildir.",
        type: "compare",
        data: { a: a, b: b }
      };
    }

    var sym = extractSymbol(q);
    if (!sym) {
      return {
        text: "Hangi hisse? Sembol yaz (ör. ASELS) veya listeden seç.",
        type: "system"
      };
    }

    var result = await analyze(sym);
    var meta = result.meta;
    var score = result.score;
    var quote = result.quote;

    if (type === "price") {
      return {
        text:
          meta.symbol +
          " güncel: **" +
          formatPrice(quote) +
          "**" +
          (quote && quote.source ? " · kaynak: " + quote.source : ""),
        type: "price",
        data: result
      };
    }
    if (type === "risk") {
      return {
        text:
          meta.symbol +
          " risk etiketi: **" +
          (meta.risk || "Medium") +
          "** · risk skoru " +
          score.risk +
          "/100. Genel Nexora skoru " +
          score.total +
          ".",
        type: "risk",
        data: result
      };
    }
    if (type === "sector") {
      return {
        text:
          meta.symbol +
          " sektör: **" +
          (meta.sector || "—") +
          "** · piyasa " +
          (meta.market || STATE.market) +
          ".",
        type: "sector",
        data: result
      };
    }

    return {
      text: verdict(meta, score, quote),
      type: "analyze",
      data: result
    };
  }

  var NexoraAI = {
    version: "1.0.0",
    loadMarket: loadMarket,
    analyze: analyze,
    ask: ask,
    findMeta: findMeta,
    getState: function () {
      return {
        market: STATE.market,
        count: STATE.stocks.length,
        lastSymbol: STATE.lastSymbol,
        lastScore: STATE.lastScore
      };
    },
    search: function (q) {
      q = String(q || "").toLowerCase();
      if (!q) return STATE.stocks.slice(0, 20);
      return STATE.stocks
        .filter(function (s) {
          return (
            String(s.symbol).toLowerCase().indexOf(q) !== -1 ||
            String(s.name || "").toLowerCase().indexOf(q) !== -1
          );
        })
        .slice(0, 20);
    }
  };

  global.NexoraAI = NexoraAI;
})(typeof window !== "undefined" ? window : this);
