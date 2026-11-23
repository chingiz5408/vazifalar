/* ==========================================================================
 * ExamGuard.js — Imtihon/nazorat hodisalarini aniqlash
 *
 * Vazifasi:
 *   1. To'liq ekrandan chiqish
 *   2. Boshqa tab/oynaga o'tish (sahifa yashirilishi)
 *   3. Brauzer oynasi fokusni yo'qotishi
 *   4. Taqiqlangan klavish kombinatsiyalari (nusxalash, DevTools, F12)
 *
 * Ishlatish (HTML ichida):
 *   <script src="{% static 'main/ExamGuard.js' %}"></script>
 *   ... ExamGuard.start();   <- kuzatuvni boshlash
 *
 * API:
 *   ExamGuard.start()            kuzatuvni boshlaydi
 *   ExamGuard.stop()             to'xtatadi
 *   ExamGuard.isStarted()        boshlanganmi
 *   ExamGuard.record(code, msg)  qo'lda hodisa yozish
 *   ExamGuard.getEvents()        barcha hodisalar (massiv)
 *   ExamGuard.clear()            ro'yxatni tozalash
 * ========================================================================== */
(function () {
  "use strict";

  var started = false;
  var events = [];
  var logBox = null;
  var logList = null;
  var badge = null;
  var MAX_EVENTS = 500;
  var uidSeq = 0;

  function newUid() {
    uidSeq += 1;
    return (
      Date.now().toString(36) +
      "-" + uidSeq +
      "-" + Math.random().toString(36).slice(2, 8)
    );
  }

  /* ---------------------------------------------------------------- utils */
  function now() {
    try {
      return new Date().toLocaleTimeString();
    } catch (_) {
      return new Date().toISOString().slice(11, 19);
    }
  }

  /* ------------------------------------------------------------ log panel */
  function ensurePanel() {
    if (logBox) return logBox;

    var style = document.createElement("style");
    style.textContent = [
      "#exam-guard{position:fixed;right:8px;bottom:8px;z-index:990;",
      "width:min(340px,calc(100vw - 16px));font:11px/1.5 ui-monospace,",
      "Consolas,monospace;color:#e5edf7;background:rgba(9,17,31,.92);",
      "border:1px solid rgba(140,170,210,.35);border-radius:8px;",
      "box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none;",
      "overflow:hidden;transition:opacity .2s}",
      "#exam-guard[hidden]{display:none}",
      "#eg-head{display:flex;align-items:center;gap:6px;padding:5px 8px;",
      "background:rgba(47,93,138,.55);font-weight:700;letter-spacing:.03em}",
      "#eg-dot{width:7px;height:7px;border-radius:50%;background:#7ee787;",
      "box-shadow:0 0 6px #7ee787;flex:none}",
      "#eg-count{margin-left:auto;opacity:.85}",
      "#eg-list{margin:0;padding:5px 8px;list-style:none;max-height:24vh;",
      "overflow-y:auto;overscroll-behavior:contain}",
      "#eg-list li{padding:2px 0;border-bottom:1px dashed rgba(140,170,210,.18)}",
      "#eg-list li:last-child{border-bottom:0}",
      "#eg-list .eg-t{color:#8fb8e0}",
      "#eg-list .eg-code{color:#ffb86c;font-weight:700}",
      "#eg-list .eg-msg{color:#e5edf7}",
      "#eg-list li.eg-warn .eg-code{color:#ff7b72}",
      "#eg-empty{opacity:.55;font-style:italic}",
      "@media (max-width:520px){#eg-list{max-height:16vh}}"
    ].join("");
    document.head.appendChild(style);

    logBox = document.createElement("div");
    logBox.id = "exam-guard";
    logBox.setAttribute("role", "log");
    logBox.setAttribute("aria-live", "polite");
    logBox.hidden = true;

    var head = document.createElement("div");
    head.id = "eg-head";

    var dot = document.createElement("span");
    dot.id = "eg-dot";
    head.appendChild(dot);

    var title = document.createElement("span");
    title.textContent = "NAZORAT";
    head.appendChild(title);

    var count = document.createElement("span");
    count.id = "eg-count";
    count.textContent = "0";
    head.appendChild(count);

    logList = document.createElement("ul");
    logList.id = "eg-list";

    var empty = document.createElement("li");
    empty.id = "eg-empty";
    empty.textContent = "Hodisalar aniqlanmadi";
    logList.appendChild(empty);

    logBox.appendChild(head);
    logBox.appendChild(logList);
    document.body.appendChild(logBox);

    badge = count;
    return logBox;
  }

  function render() {
    if (!logBox) return;
    if (badge) badge.textContent = String(events.length);
    logBox.hidden = events.length === 0;
  }

  /* --------------------------------------------------------------- record */
  function recordEvent(code, message) {
    if (!started) return; // Kuzatuv boshlangunga qadar ortiqcha yozmaslik uchun

    if (typeof code !== "string") return;
    if (typeof message !== "string") message = "";

    var time = now();
    var entry = { t: time, code: code, message: message, uid: newUid() };
    events.push(entry);
    if (events.length > MAX_EVENTS) events.shift();

    // Serverga yuborish uchun navbatga qo'yamiz
    if (cfg.url && !blocked) {
      pending.push(entry);
      if (pending.length > MAX_EVENTS) pending.shift();
      schedule(1200);
    }

    try {
      console.log("[" + time + "] [" + code + "] " + message);
    } catch (_) {}

    if (logBox && logList) {
      var empty = logList.querySelector("#eg-empty");
      if (empty) empty.remove();

      var li = document.createElement("li");
      if (code.indexOf("BLOCKED") === 0 || code.indexOf("1_FULLSCREEN") === 0) {
        li.className = "eg-warn";
      }

      var t = document.createElement("span");
      t.className = "eg-t";
      t.textContent = "[" + time + "] ";

      var c = document.createElement("span");
      c.className = "eg-code";
      c.textContent = "[" + code + "] ";

      var m = document.createElement("span");
      m.className = "eg-msg";
      m.textContent = message;

      li.appendChild(t);
      li.appendChild(c);
      li.appendChild(m);
      logList.appendChild(li);

      // Faqat oxirgi 100 ta qatorni DOM'da saqlaymiz
      while (logList.children.length > 100) {
        logList.removeChild(logList.firstElementChild);
      }
      logList.scrollTop = logList.scrollHeight;
    }

    render();
  }

  /* --------------------------------------------------------------- start */
  function start() {
    if (started) return;
    started = true;
    config();
    ensurePanel();
    render();
    initBlocked();
    if (!blocked && pending.length) schedule(600);
    try {
      console.log("[ExamGuard] Kuzatuv boshlandi.");
    } catch (_) {}
  }

  function stop() {
    started = false;
  }

  function isStarted() {
    return started;
  }

  function getEvents() {
    return events.slice();
  }

  function clear() {
    events = [];
    if (logList) logList.innerHTML = "";
    render();
  }

  /* -------------------------------------------------- server bilan aloqa */

  var cfg = {};
  var blocked = false;
  var blockedShown = false;
  var pending = [];
  var sending = false;
  var timer = null;

  function config() {
    cfg = window.ExamGuardConfig || {};
    return cfg;
  }

  function csrf() {
    var m = document.querySelector('[name="csrfmiddlewaretoken"]');
    if (m && m.value) return m.value;
    var app = document.querySelector("[data-csrf]");
    if (app && app.getAttribute("data-csrf")) return app.getAttribute("data-csrf");
    var m2 = (document.cookie || "").match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return m2 ? decodeURIComponent(m2[1]) : "";
  }

  function schedule(ms) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      upload();
    }, ms || 1200);
  }

  function upload() {
    if (sending) return;
    if (!cfg.url) return;
    if (blocked || !pending.length) {
      pending = [];
      return;
    }

    var batch = pending.slice();
    pending = [];
    sending = true;

    fetch(cfg.url, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrf(),
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json"
      },
      body: JSON.stringify({ events: batch })
    })
      .then(function (res) {
        return res.json().catch(function () { return null; });
      })
      .then(function (data) {
        if (data && data.ok) applyState(data);
      })
      .catch(function () {
        // Yuborilmadi — keyingi safar qayta yuboramiz
        pending = batch.concat(pending).slice(0, 100);
      })
      .then(function () {
        sending = false;
        if (pending.length && !blocked) schedule(3000);
      });
  }

  function applyState(data) {
    if (data.bloklangan) blockNow(data);
  }

  var SUBMIT_IDS = ["finish-button", "submit-code", "run-submit", "submit-button"];

  function blockNow(data) {
    var first = !blocked;
    blocked = true;
    pending = [];

    // Topshirish tugmalarini o'chirish
    SUBMIT_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.disabled = true;
    });

    if (first) {
      var msg = (data && data.error) ||
        "Nazorat chegarasi oshdi — bu topshiriqni topshira olmaysiz.";
      showAlert(msg);
      if (badge) badge.style.color = "#ff7b72";
    }
  }

  function showAlert(message) {
    if (blockedShown) return;
    blockedShown = true;
    try {
      if (window.AppAlert && AppAlert.error) {
        AppAlert.error("Topshirish bloklandi", message);
        return;
      }
      if (window.Swal) {
        Swal.fire({
          icon: "error",
          title: "Topshirish bloklandi",
          text: message,
          confirmButtonText: "Yopish",
          confirmButtonColor: "#B91C1C"
        });
        return;
      }
      window.alert(message);
    } catch (_) {}
  }

  function initBlocked() {
    if (cfg.blocked) blockNow(cfg);
  }

  /* ------------------------------------------------------------- hodisalar */

  // 1. To'liq ekrandan chiqish (Esc, kichiklashtirish yoki boshqa sabab)
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);
  document.addEventListener("mozfullscreenchange", onFullscreenChange);
  document.addEventListener("MSFullscreenChange", onFullscreenChange);

  function onFullscreenChange() {
    var el = document.fullscreenElement ||
             document.webkitFullscreenElement ||
             document.mozFullScreenElement ||
             document.msFullscreenElement;
    if (!el && started) {
      recordEvent("1_FULLSCREEN_EXIT", "To'liq ekran rejimidan chiqildi!");
    }
  }

  // 2. Boshqa tabga o'tish, oynani minimallashtirish yoki ustini yopish
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      recordEvent("2_VISIBILITY_HIDDEN",
        "Sahifa yashirildi (boshqa tab, minimallashtirish yoki boshqa ilova)!");
    } else if (started) {
      recordEvent("2_VISIBILITY_VISIBLE", "Sahifaga qaytilindi.");
    }
  });

  // 3. Brauzer oynasi fokusni yo'qotishi (boshqa ilova/oynaga o'tish)
  window.addEventListener("blur", function () {
    recordEvent("3_WINDOW_BLUR",
      "Brauzer oynasi fokusni yo'qotdi (boshqa ilova yoki oynaga o'tilgan bo'lishi mumkin)!");
  });

  // 4. Taqiqlangan klavish kombinatsiyalari
  document.addEventListener("keydown", function (event) {
    if (!started) return;

    var key = (event.key || "").toLowerCase();
    var ctrlOrMeta = event.ctrlKey || event.metaKey;

    // 4.1 Nusxalish, kesish, joylashtirish, belgilash, saqlash, chop etish, manba
    if (ctrlOrMeta && !event.altKey &&
        ["c", "x", "v", "a", "s", "p", "u"].indexOf(key) !== -1) {
      event.preventDefault();
      recordEvent(
        "BLOCKED_SHORTCUT",
        "Kombinatsiya bloklandi: " + (event.ctrlKey ? "Ctrl" : "Cmd") +
        " + " + key.toUpperCase()
      );
      return;
    }

    // 4.2 DevTools kombinatsiyalari (Ctrl+Shift+I / J / C / R)
    if (ctrlOrMeta && event.shiftKey &&
        ["i", "j", "c", "r"].indexOf(key) !== -1) {
      event.preventDefault();
      recordEvent("BLOCKED_DEVTOOLS",
        "DevTools kombinatsiyasi bloklandi: " + key.toUpperCase());
      return;
    }

    // 4.3 F12 tugmasi
    if (event.key === "F12") {
      event.preventDefault();
      recordEvent("BLOCKED_DEVTOOLS", "F12 tugmasi bloklandi");
      return;
    }

    // 4.4 Boshqa DevTools yo'llari: Ctrl+Shift+K, Cmd+Opt+I
    if (ctrlOrMeta && event.shiftKey && key === "k") {
      event.preventDefault();
      recordEvent("BLOCKED_DEVTOOLS", "DevTools kombinatsiyasi bloklandi: Ctrl + Shift + K");
    }
  }, true);

  // 5. O'ng tugma menyusini yopish (nusxalash/inspekt qilish uchun)
  document.addEventListener("contextmenu", function (event) {
    if (!started) return;
    event.preventDefault();
    recordEvent("BLOCKED_CONTEXT_MENU", "O'ng tugma menyusi bloklandi");
  });

  /* ---------------------------------------------------------------- export */
  window.ExamGuard = {
    start: start,
    stop: stop,
    isStarted: isStarted,
    record: recordEvent,
    getEvents: getEvents,
    clear: clear,
    isBlocked: function () { return blocked; },
    sync: upload
  };
})();
