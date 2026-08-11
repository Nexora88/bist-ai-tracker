/**
 * =========================================================
 *  NEXORA BUBBLE  v1.0
 *  Sağ alt sohbet balonu — NexoraAI varsa ona bağlanır
 *
 *  Kullanım (sayfa sonu):
 *    <script src="assets/js/secrets.js"></script>
 *    <script src="assets/js/api.js"></script>
 *    <script src="assets/js/nexora-ai.js"></script>  <!-- opsiyonel -->
 *    <script src="assets/js/nexora-bubble.js"></script>
 * =========================================================
 */
(function (global) {
  "use strict";

  if (global.__NEXORA_BUBBLE__) return;
  global.__NEXORA_BUBBLE__ = true;

  var MARKET = "bist";
  var ready = false;
  var open = false;

  /* ---------- stiller ---------- */
  var CSS = [
    "#nxb-root{position:fixed;right:16px;bottom:16px;z-index:9999;font-family:Inter,system-ui,sans-serif}",
    "#nxb-btn{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;",
    "background:linear-gradient(135deg,#10b981,#059669);color:#022c22;font-weight:900;font-size:18px;",
    "box-shadow:0 10px 30px rgba(16,185,129,.35);display:flex;align-items:center;justify-content:center;",
    "transition:transform .15s}",
    "#nxb-btn:hover{transform:scale(1.05)}",
    "#nxb-panel{display:none;position:absolute;right:0;bottom:68px;width:min(360px,calc(100vw - 24px));",
    "height:440px;background:#0b1220;border:1px solid rgba(148,163,184,.15);border-radius:18px;",
    "box-shadow:0 24px 60px rgba(0,0,0,.45);flex-direction:column;overflow:hidden}",
    "#nxb-panel.open{display:flex}",
    "#nxb-head{padding:12px 14px;border-bottom:1px solid rgba(148,163,184,.12);",
    "display:flex;align-items:center;justify-content:space-between;gap:8px}",
    "#nxb-head strong{font-size:14px;color:#f1f5f9}",
    "#nxb-head span{display:block;font-size:11px;color:#64748b;font-weight:500}",
    "#nxb-close{background:transparent;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1}",
    "#nxb-msgs{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}",
    ".nxb-msg{max-width:92%;padding:10px 12px;border-radius:12px;font-size:13px;line-height:1.55;white-space:pre-wrap}",
    ".nxb-bot{align-self:flex-start;background:rgba(30,41,59,.95);color:#e2e8f0;border:1px solid rgba(148,163,184,.1)}",
    ".nxb-user{align-self:flex-end;background:rgba(16,185,129,.18);color:#d1fae5;border:1px solid rgba(16,185,129,.25)}",
    "#nxb-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}",
    "#nxb-chips button{font-size:11px;font-weight:700;padding:6px 10px;border-radius:999px;cursor:pointer;",
    "background:rgba(30,41,59,.9);color:#94a3b8;border:1px solid rgba(148,163,184,.12)}",
    "#nxb-chips button:hover{color:#f1f5f9;border-color:rgba(16,185,129,.35)}",
    "#nxb-form{display:flex;gap:8px;padding:10px 12px;border-top:1px solid rgba(148,163,184,.12)}",
    "#nxb-form input{flex:1;background:rgba(30,41,59,.9);border:1px solid rgba(148,163,184,.12);",
    "border-radius:10px;padding:10px 12px;color:#f1f5f9;font-size:13px;outline:none}",
    "#nxb-form input:focus{border-color:rgba(16,185,129,.45)}",
    "#nxb-form button{background:linear-gradient(135deg,#10b981,#059669);color:#022c22;border:none;",
    "border-radius:10px;padding:0 14px;font-weight:800;font-size:13px;cursor:pointer}",
    "#nxb-foot{padding:6px 12px 10px;font-size:10px;color:#64748b;line-height:1.4}",
    "@media(max-width:420px){#nxb-panel{height:min(70vh,480px)}}"
  ].join("");

  function injectStyle() {
    var s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") n.className = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    if (html != null) n.innerHTML = html;
    return n;
  }

  function addMsg(box, text, who) {
    var d = el("div", { className: "nxb-msg nxb-" + who });
    d.textContent = text;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }

  function fallbackAnswer(q) {
    var t = String(q || "").toLowerCase();
    if (/merhaba|selam|hey/.test(t)) {
      return "Merhaba — Nexora asistanıyım. Örn: ASELS analiz et, THYAO fiyatı, portföyüm.";
    }
    if (/yardım|help|ne yap/.test(t)) {
      return "Komutlar: [SEMBOL] analiz · [SEMBOL] fiyat · risk · oyun · hisseler · premium";
    }
    if (/oyun|sanal|kağıt/.test(t)) {
      return "Sanal portföy: oyun.html — 100.000 ₺ sahte bakiye ile al/sat.";
    }
    if (/premium|pro|elite|plan/.test(t)) {
      return "Planlar: Free / Pro ($5) / Elite ($15). Detay: premium.html";
    }
    if (/portföy|portfolio/.test(t)) {
      return "Gerçek takip: portfolio.html · Oyun: oyun.html";
    }
    if (/ısı|heatmap|harita/.test(t)) {
      return "Günlük getiri haritası: heatmap.html";
    }
    var m = q.toUpperCase().match(/\b([A-Z]{2,6})\b/);
    if (m) {
      return (
        m[1] +
        " için detay: stock.html?symbol=" +
        m[1] +
        " · AI: ai-analiz.html?symbol=" +
        m[1] +
        " (nexora-ai.js yüklü değilse tam skor burada üretilmez)"
      );
    }
    return "Anladım. Hisse sembolü yaz (ASELS) veya: yardım · oyun · premium · ısı";
  }

  async function answer(q) {
    if (global.NexoraAI && typeof NexoraAI.ask === "function") {
      try {
        if (!ready) {
          await NexoraAI.loadMarket(MARKET);
          ready = true;
        }
        var res = await NexoraAI.ask(q);
        return (res && res.text) || fallbackAnswer(q);
      } catch (e) {
        return fallbackAnswer(q);
      }
    }
    return fallbackAnswer(q);
  }

  function mount() {
    injectStyle();

    var root = el("div", { id: "nxb-root" });
    var btn = el("button", { id: "nxb-btn", type: "button", title: "Nexora AI" }, "N");
    var panel = el("div", { id: "nxb-panel" });

    var head = el("div", { id: "nxb-head" });
    head.appendChild(
      el("div", null, "<strong>Nexora AI</strong><span>Soru sor · sembol yaz</span>")
    );
    var close = el("button", { id: "nxb-close", type: "button" }, "×");
    head.appendChild(close);

    var msgs = el("div", { id: "nxb-msgs" });
    var chips = el("div", { id: "nxb-chips" });
    ["ASELS analiz", "THYAO fiyat", "Oyun", "Premium", "Yardım"].forEach(function (label) {
      var b = el("button", { type: "button" }, label);
      b.addEventListener("click", function () {
        input.value = label.indexOf(" ") >= 0 ? label : label;
        send();
      });
      chips.appendChild(b);
    });

    var form = el("form", { id: "nxb-form" });
    var input = el("input", {
      type: "text",
      placeholder: "ASELS analiz et…",
      autocomplete: "off"
    });
    var go = el("button", { type: "submit" }, "Gönder");
    form.appendChild(input);
    form.appendChild(go);

    var foot = el(
      "div",
      { id: "nxb-foot" },
      "Yatırım tavsiyesi değildir · Veriler gecikmeli olabilir"
    );

    panel.appendChild(head);
    panel.appendChild(msgs);
    panel.appendChild(chips);
    panel.appendChild(form);
    panel.appendChild(foot);
    root.appendChild(panel);
    root.appendChild(btn);
    document.body.appendChild(root);

    addMsg(
      msgs,
      "Merhaba! Ben Nexora. Örnek: ASELS analiz et, GARAN riski, oyun, premium.",
      "bot"
    );

    function toggle(force) {
      open = force != null ? force : !open;
      panel.classList.toggle("open", open);
      if (open) input.focus();
    }

    btn.addEventListener("click", function () {
      toggle();
    });
    close.addEventListener("click", function () {
      toggle(false);
    });

    async function send() {
      var q = (input.value || "").trim();
      if (!q) return;
      input.value = "";
      addMsg(msgs, q, "user");
      addMsg(msgs, "…", "bot");
      var last = msgs.lastChild;
      try {
        var text = await answer(q);
        last.textContent = text.replace(/\*\*/g, "");
      } catch (e) {
        last.textContent = "Bir hata oluştu. Sonra tekrar dene.";
      }
      msgs.scrollTop = msgs.scrollHeight;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      send();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})(typeof window !== "undefined" ? window : this);
