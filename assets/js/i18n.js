/* Nexora i18n — TR / EN
 * Kullanım:
 *   <script src="assets/js/i18n.js"></script>
 *   HTML: <span data-i18n="nav.home">Ana</span>
 *   JS:   NexoraI18n.t("nav.home")
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "nexora_lang";

  var dict = {
    tr: {
      "nav.home": "Ana",
      "nav.stocks": "Hisseler",
      "nav.search": "Ara",
      "nav.portfolio": "Portföy",
      "nav.chart": "Grafik",
      "nav.radar": "Pusula",
      "nav.ai": "AI",
      "nav.league": "Lig",
      "nav.alarms": "Alarm",
      "nav.premium": "Premium",
      "nav.about": "Hakkımızda",

      "stock.title": "Hisse Kartları",
      "stock.lead": "BIST, NASDAQ ve NYSE. Aynı sembol yalnızca bir kez görünür; borsa kapalıyken son kapanış kalır.",
      "stock.badge": "Canlı kartlar · her hisse bir kez",
      "stock.search_ph": "ASELS, Aselsan, MCD…",
      "stock.refresh": "Fiyatları yenile",
      "stock.count": "hisse",
      "stock.price_note": "Fiyatlar gecikmeli olabilir · kapalı piyasada son kapanış",
      "stock.chart": "Grafik",
      "stock.ai": "AI",
      "stock.watch": "Takibe al",
      "stock.watching": "Takiptesin",
      "stock.sector": "Sektör",
      "stock.risk": "Risk",
      "stock.risk_low": "Düşük",
      "stock.risk_medium": "Orta",
      "stock.risk_high": "Yüksek",
      "stock.last_close": "Son kapanış",
      "stock.empty": "Sonuç yok",
      "stock.empty_hint": "Farklı bir arama veya piyasa dene",
      "stock.loading": "Yükleniyor…",
      "stock.prev": "← Önceki",
      "stock.next": "Sonraki →",
      "stock.legal": "Buradaki skorlar ve fiyatlar bilgilendirme amaçlıdır; yatırım tavsiyesi değildir. Veriler gecikmeli olabilir.",

      "search.title": "Hisse ara",
      "search.lead": "Sembol veya şirket adı yaz. Aynı hisse birden fazla listelenmez.",
      "search.badge": "Hızlı arama · tek sonuç",
      "search.ph": "ASELS, Aselsan, AAPL…",
      "search.go": "Ara",
      "search.all": "Tüm piyasalar",
      "search.ready": "Aramaya hazır",
      "search.ready_hint": "Popüler sembollerden birini seç veya kutuya yazmaya başla.",
      "search.none": "Eşleşme bulunamadı",
      "search.none_hint": "Yazımı kontrol et veya piyasayı değiştir.",
      "search.results": "sonuç",
      "search.searching": "Aranıyor…",

      "portfolio.title": "Portföy & Takip",
      "portfolio.lead": "Alış fiyatı ve adet gir; güncel fiyat otomatik gelir.",
      "portfolio.watch_title": "Takip listem",
      "portfolio.add": "Ekle",
      "portfolio.watch_add": "Takibe al",
      "portfolio.remove": "Sil",
      "portfolio.unwatch": "Çıkar",
      "portfolio.refresh": "Yenile",

      "common.free": "ücretsiz",
      "common.loading": "Yükleniyor…",
      "lang.tr": "TR",
      "lang.en": "EN"
    },

    en: {
      "nav.home": "Home",
      "nav.stocks": "Stocks",
      "nav.search": "Search",
      "nav.portfolio": "Portfolio",
      "nav.chart": "Chart",
      "nav.radar": "Radar",
      "nav.ai": "AI",
      "nav.league": "League",
      "nav.alarms": "Alerts",
      "nav.premium": "Premium",
      "nav.about": "About",

      "stock.title": "Stock Cards",
      "stock.lead": "BIST, NASDAQ and NYSE. Each symbol appears once; last close is kept when markets are shut.",
      "stock.badge": "Live cards · one card per symbol",
      "stock.search_ph": "AAPL, NVDA, ASELS…",
      "stock.refresh": "Refresh prices",
      "stock.count": "stocks",
      "stock.price_note": "Prices may be delayed · last close when market is closed",
      "stock.chart": "Chart",
      "stock.ai": "AI",
      "stock.watch": "Watch",
      "stock.watching": "Watching",
      "stock.sector": "Sector",
      "stock.risk": "Risk",
      "stock.risk_low": "Low",
      "stock.risk_medium": "Medium",
      "stock.risk_high": "High",
      "stock.last_close": "Last close",
      "stock.empty": "No results",
      "stock.empty_hint": "Try another query or market",
      "stock.loading": "Loading…",
      "stock.prev": "← Prev",
      "stock.next": "Next →",
      "stock.legal": "Scores and prices are for information only and are not investment advice. Data may be delayed.",

      "search.title": "Search stocks",
      "search.lead": "Type a symbol or company name. Duplicates are removed.",
      "search.badge": "Fast search · one result per symbol",
      "search.ph": "AAPL, ASELS, Tesla…",
      "search.go": "Search",
      "search.all": "All markets",
      "search.ready": "Ready to search",
      "search.ready_hint": "Pick a popular symbol or start typing.",
      "search.none": "No matches",
      "search.none_hint": "Check spelling or switch market.",
      "search.results": "results",
      "search.searching": "Searching…",

      "portfolio.title": "Portfolio & Watchlist",
      "portfolio.lead": "Enter buy price and quantity; live price fills in automatically.",
      "portfolio.watch_title": "Watchlist",
      "portfolio.add": "Add",
      "portfolio.watch_add": "Watch",
      "portfolio.remove": "Remove",
      "portfolio.unwatch": "Unwatch",
      "portfolio.refresh": "Refresh",

      "common.free": "free",
      "common.loading": "Loading…",
      "lang.tr": "TR",
      "lang.en": "EN"
    }
  };

  function detect() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "tr" || saved === "en") return saved;
    } catch (e) {}
    var nav = (navigator.language || "tr").toLowerCase();
    return nav.indexOf("tr") === 0 ? "tr" : "en";
  }

  var lang = detect();

  function t(key) {
    var pack = dict[lang] || dict.tr;
    if (pack[key] != null) return pack[key];
    if (dict.tr[key] != null) return dict.tr[key];
    return key;
  }

  function setLang(next) {
    if (next !== "tr" && next !== "en") return;
    lang = next;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
    // settings ile uyum
    try {
      if (global.Store && Store.getSettings && Store.setSettings) {
        var s = Store.getSettings();
        s.lang = lang;
        Store.setSettings(s);
      }
    } catch (e) {}
    apply();
    try {
      document.documentElement.lang = lang === "tr" ? "tr" : "en";
    } catch (e) {}
  }

  function apply(root) {
    root = root || document;
    var nodes = root.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute("data-i18n");
      if (!key) continue;
      var val = t(key);
      var attr = el.getAttribute("data-i18n-attr");
      if (attr) {
        el.setAttribute(attr, val);
      } else {
        el.textContent = val;
      }
    }
    // placeholder
    var ph = root.querySelectorAll("[data-i18n-placeholder]");
    for (var j = 0; j < ph.length; j++) {
      ph[j].setAttribute(
        "placeholder",
        t(ph[j].getAttribute("data-i18n-placeholder"))
      );
    }
    // dil butonları
    var btns = root.querySelectorAll("[data-set-lang]");
    for (var k = 0; k < btns.length; k++) {
      var b = btns[k];
      var L = b.getAttribute("data-set-lang");
      if (L === lang) b.classList.add("on");
      else b.classList.remove("on");
    }
  }

  function getLang() {
    return lang;
  }

  // Dil seçici tıklamaları
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-set-lang]");
    if (!b) return;
    setLang(b.getAttribute("data-set-lang"));
  });

  global.NexoraI18n = {
    t: t,
    setLang: setLang,
    getLang: getLang,
    apply: apply,
    dict: dict
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      apply();
    });
  } else {
    apply();
  }
})(typeof window !== "undefined" ? window : this);
