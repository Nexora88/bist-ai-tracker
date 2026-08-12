/**
 * Nexora Guard — istemci tarafı savuma yardımcıları
 * - Bot / otomasyon skoru
 * - Honeypot alan (görünmez form alanı)
 * - Basit hız sınırı
 * - Şüpheli girdi taraması
 *
 * Not: Asıl koruma sunucu / Cloudflare tarafındadır.
 * Bu katman otomasyonu yavaşlatır ve sahte başarı üretebilir.
 */
(function (global) {
  "use strict";

  if (global.NexoraGuard) return;

  var START = Date.now();
  var hits = [];
  var flagged = false;

  var SUSPECT = [
    /('|--|;|\bunion\b|\bselect\b|\bdrop\b|\binsert\b|\bupdate\b|\bexec\b)/i,
    /(<script|javascript:|onerror\s*=|onload\s*=|svg\s+onload)/i,
    /(\.\.\/|etc\/passwd|cmd\.exe|powershell|base64_decode)/i,
    /(\bor\b\s+\d+\s*=\s*\d+)/i,
    /(\$\{|\{%|<%)/
  ];

  function now() {
    return Date.now();
  }

  function looksHostile(s) {
    s = String(s || "");
    if (s.length > 4000) return true;
    for (var i = 0; i < SUSPECT.length; i++) {
      if (SUSPECT[i].test(s)) return true;
    }
    return false;
  }

  /** Son penceredeki olay sayısı */
  function ratePush(limit, windowMs) {
    var t = now();
    hits = hits.filter(function (x) {
      return t - x < windowMs;
    });
    hits.push(t);
    return hits.length <= limit;
  }

  /**
   * Basit bot skoru 0–100 (yüksek = şüpheli)
   * Kesin değil; sinyaller birleşince artar.
   */
  function botScore() {
    var score = 0;
    try {
      if (!global.navigator) score += 30;
      if (navigator.webdriver) score += 45;
      if (!navigator.languages || !navigator.languages.length) score += 10;
      if (navigator.plugins && navigator.plugins.length === 0) score += 8;
      if (global.callPhantom || global._phantom || global.__nightmare) score += 40;
      if (document.documentElement && document.documentElement.getAttribute("webdriver"))
        score += 20;
    } catch (e) {
      score += 15;
    }
    // insan genelde birkaç saniye etkileşir
    if (now() - START < 400 && hits.length > 3) score += 15;
    if (flagged) score += 25;
    return Math.min(100, score);
  }

  /** Görünmez honeypot alanı — botlar doldurursa yakalanır */
  function attachHoneypot(form) {
    if (!form || form.querySelector("[data-nxg-hp]")) return;
    var wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.cssText =
      "position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;";
    var input = document.createElement("input");
    input.type = "text";
    input.name = "company_fax";
    input.tabIndex = -1;
    input.autocomplete = "off";
    input.setAttribute("data-nxg-hp", "1");
    wrap.appendChild(input);
    form.appendChild(wrap);
  }

  function honeypotFilled(form) {
    if (!form) return false;
    var hp = form.querySelector("[data-nxg-hp]");
    return !!(hp && String(hp.value || "").trim());
  }

  /**
   * Gönderim kontrolü
   * return { ok:true } veya { ok:false, silent:true, reason }
   * silent: UI’da “başarılı” gösterip işlem yapma (tuzak)
   */
  function checkSubmit(form, fields) {
    if (!ratePush(8, 10000)) {
      flagged = true;
      return { ok: false, silent: true, reason: "rate" };
    }
    if (honeypotFilled(form)) {
      flagged = true;
      return { ok: false, silent: true, reason: "honeypot" };
    }
    if (botScore() >= 70) {
      flagged = true;
      return { ok: false, silent: true, reason: "bot" };
    }
    fields = fields || [];
    for (var i = 0; i < fields.length; i++) {
      if (looksHostile(fields[i])) {
        flagged = true;
        return { ok: false, silent: true, reason: "payload" };
      }
    }
    return { ok: true };
  }

  /** Metin kaçışı — XSS yüzeyi küçültür */
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Sahte “200 OK” mesajı — saldırgana boş başarı */
  function silentOk(targetEl, ms) {
    ms = ms || 1200 + Math.floor(Math.random() * 1500);
    return new Promise(function (resolve) {
      if (targetEl) {
        targetEl.textContent = "OK";
      }
      setTimeout(resolve, ms);
    });
  }

  // Genel tıklama / yazma hızı izleme (hafif)
  ["click", "input", "keydown"].forEach(function (ev) {
    document.addEventListener(
      ev,
      function () {
        ratePush(40, 3000);
      },
      true
    );
  });

  global.NexoraGuard = {
    version: "1.0",
    botScore: botScore,
    looksHostile: looksHostile,
    attachHoneypot: attachHoneypot,
    checkSubmit: checkSubmit,
    escapeHtml: escapeHtml,
    silentOk: silentOk,
    isFlagged: function () {
      return flagged;
    }
  };
})(typeof window !== "undefined" ? window : this);
