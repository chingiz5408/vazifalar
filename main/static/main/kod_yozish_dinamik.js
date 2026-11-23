(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // Asosiy elementlar
  const runButton = $("submit-code");
  const runButtonText = $("submit-button-text");
  const textarea = $("source-code");
  const form = $("code-form");
  const lineNumbers = $("line-numbers");
  const taskSlugInput = $("task-slug");
  const starterCodeInput = $("starter-code");

  const tabProblem = $("tab-problem");
  const tabAttempts = $("tab-attempts");
  const paneProblem = $("pane-problem");
  const paneAttempts = $("pane-attempts");
  const attemptsCount = $("attempts-count");
  const attemptList = $("attempt-list");
  const attemptsEmpty = $("attempts-empty");

  const hintToggle = $("hint-toggle");
  const hintContent = $("hint-content");
  const hintIcon = $("hint-icon");
  const helpButton = $("help-button");

  const fontSizeBtn = $("font-size-button");
  const resetCodeBtn = $("reset-code");
  const saveIndicator = $("save-indicator");
  const lastSavedText = $("last-saved");
  const terminalText = $("terminal-text");
  const statusDot = $("status-dot");
  const completeBadgeWrap = $("complete-badge-wrap");

  const taskSlug = taskSlugInput ? taskSlugInput.value.trim() : "";
  const csrfInput = form ? form.querySelector('input[name="csrfmiddlewaretoken"]') : null;
  const csrf = csrfInput ? csrfInput.value : "";
  const url = form ? form.getAttribute("action") : "/kod_run/";
  const storageKey = "sputnik_editor_code_" + (taskSlug || "general");

  /* ============ 1. To'liq ekran (Imtihon / Nazorat muhiti) ============ */
  const gate = $("fs-gate");
  const fsStartBtn = $("fs-start");
  const fsText = $("fs-text");
  const root = document.documentElement;
  const fsSupported = !!(root.requestFullscreen || root.webkitRequestFullscreen || root.mozRequestFullScreen || root.msRequestFullscreen);
  const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  let started = false;

  function syncGate() {
    if (!gate) return;
    const show = fsSupported ? !isFullscreen() : !started;
    gate.hidden = !show;

    // To'liq ekranda bo'lmaganda sahifaning asosiy elementlarini muzlatish
    document.querySelectorAll(".ide-header, .ide-main, .action-bar").forEach((el) => {
      el.inert = show;
    });

    if (show) {
      if (started) {
        if (fsText) {
          fsText.innerHTML = "To‘liq ekrandan chiqdingiz!<br>Topshiriqni davom ettirish uchun to‘liq ekranga qayting.";
        }
        if (fsStartBtn) {
          fsStartBtn.textContent = "To‘liq ekranga qaytish";
        }
      }
      if (fsStartBtn) fsStartBtn.focus();
    }
  }

  if (fsStartBtn) {
    fsStartBtn.addEventListener("click", () => {
      const request = root.requestFullscreen || root.webkitRequestFullscreen || root.mozRequestFullScreen || root.msRequestFullscreen;
      if (request) {
        try {
          const result = request.call(root);
          if (result && result.catch) result.catch(() => {});
        } catch (_) {}
      }
      started = true;
      if (window.ExamGuard) ExamGuard.start();
      syncGate();
    });
  }

  document.addEventListener("fullscreenchange", syncGate);
  document.addEventListener("webkitfullscreenchange", syncGate);
  document.addEventListener("mozfullscreenchange", syncGate);
  document.addEventListener("MSFullscreenChange", syncGate);
  syncGate();

  /* ============ 2. Masala shartini nusxalashni bloklash (Anti-cheat) ============ */
  const problemPanel = $("problem-panel");
  if (problemPanel) {
    ["copy", "cut", "contextmenu", "dragstart", "selectstart"].forEach((type) => {
      problemPanel.addEventListener(type, (e) => {
        e.preventDefault();
      });
    });
  }

  /* ============ 3. Vaqt hisoblagich (Timer) ============ */
  const elapsedTimeEl = $("elapsed-time");
  let elapsedSeconds = 0;
  if (elapsedTimeEl) {
    setInterval(() => {
      elapsedSeconds++;
      const m = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
      const s = String(elapsedSeconds % 60).padStart(2, "0");
      elapsedTimeEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  /* ============ 4. Tablarni almashtirish ============ */
  function switchTab(target) {
    if (target === "attempts") {
      tabProblem.classList.remove("is-active");
      tabProblem.setAttribute("aria-selected", "false");
      tabAttempts.classList.add("is-active");
      tabAttempts.setAttribute("aria-selected", "true");

      paneProblem.hidden = true;
      paneAttempts.hidden = false;
    } else {
      tabAttempts.classList.remove("is-active");
      tabAttempts.setAttribute("aria-selected", "false");
      tabProblem.classList.add("is-active");
      tabProblem.setAttribute("aria-selected", "true");

      paneAttempts.hidden = true;
      paneProblem.hidden = false;
    }
  }

  if (tabProblem) tabProblem.addEventListener("click", () => switchTab("problem"));
  if (tabAttempts) tabAttempts.addEventListener("click", () => switchTab("attempts"));

  /* ============ 5. Maslahat (Hint) ============ */
  if (hintToggle && hintContent) {
    hintToggle.addEventListener("click", () => {
      const isHidden = hintContent.hidden;
      hintContent.hidden = !isHidden;
      hintToggle.setAttribute("aria-expanded", String(isHidden));
      if (hintIcon) hintIcon.textContent = isHidden ? "⌃" : "⌄";
    });
  }

  if (helpButton) {
    helpButton.addEventListener("click", () => {
      switchTab("problem");
      if (hintContent) {
        hintContent.hidden = false;
        if (hintToggle) hintToggle.setAttribute("aria-expanded", "true");
        if (hintIcon) hintIcon.textContent = "⌃";
        hintContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  /* ============ 6. Shrift o'lchami va Kodni tiklash ============ */
  const fontSizes = [13, 15, 17];
  let fontIndex = 0;
  if (fontSizeBtn && textarea && lineNumbers) {
    fontSizeBtn.addEventListener("click", () => {
      fontIndex = (fontIndex + 1) % fontSizes.length;
      const size = fontSizes[fontIndex];
      textarea.style.fontSize = size + "px";
      lineNumbers.style.fontSize = size + "px";
    });
  }

  if (resetCodeBtn && textarea) {
    resetCodeBtn.addEventListener("click", () => {
      const starter = starterCodeInput ? starterCodeInput.value : "# Kodingizni shu yerda yozing\n";
      Swal.fire({
        title: "Kodni tiklash",
        text: "Kodingiz boshlang‘ich holatiga qaytarilsinmi?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ha, tiklansin",
        cancelButtonText: "Bekor qilish",
        confirmButtonColor: "#B91C1C",
        cancelButtonColor: "#6B7280"
      }).then((result) => {
        if (result.isConfirmed) {
          textarea.value = starter;
          updateLines();
          triggerAutoSave();
          setTerminalStatus("Boshlang‘ich kod tiklandi", "#2563EB");
        }
      });
    });
  }

  /* ============ 7. Brauzerda avto-saqlash (localStorage) ============ */
  let saveTimer = null;
  function triggerAutoSave() {
    if (!saveIndicator) return;
    saveIndicator.classList.add("is-unsaved");
    saveIndicator.querySelector("span").textContent = "Saqlanmoqda...";

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, textarea.value);
        saveIndicator.classList.remove("is-unsaved");
        saveIndicator.querySelector("span").textContent = "Saqlangan";

        const now = new Date();
        const timeStr = now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
        if (lastSavedText) lastSavedText.textContent = `Saqlandi: ${timeStr}`;
      } catch (e) {
        saveIndicator.querySelector("span").textContent = "Xotira xatosi";
      }
    }, 400);
  }

  if (textarea) {
    const savedCode = localStorage.getItem(storageKey);
    if (savedCode && (!textarea.value.trim() || textarea.value.trim().startsWith("# Kodingizni"))) {
      textarea.value = savedCode;
    }
  }

  /* ============ 8. Qator raqamlari va Tab/Indent ============ */
  function updateLines() {
    if (!textarea || !lineNumbers) return;
    const lines = textarea.value.split("\n").length;
    lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
  }

  if (textarea) {
    textarea.addEventListener("input", () => {
      updateLines();
      triggerAutoSave();
    });

    textarea.addEventListener("scroll", () => {
      if (lineNumbers) lineNumbers.scrollTop = textarea.scrollTop;
    });

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.setRangeText("    ", start, end, "end");
        updateLines();
        triggerAutoSave();
      } else if (e.key === "Enter") {
        const start = textarea.selectionStart;
        const currentLine = textarea.value.substring(0, start).split("\n").pop();
        const match = currentLine.match(/^(\s+)/);
        if (match) {
          e.preventDefault();
          const indent = match[1];
          const extra = currentLine.trim().endsWith(":") ? "    " : "";
          const insertText = "\n" + indent + extra;
          textarea.setRangeText(insertText, start, textarea.selectionEnd, "end");
          updateLines();
          triggerAutoSave();
        }
      }
    });

    updateLines();
  }

  /* ============ 9. Terminal holati ============ */
  function setTerminalStatus(text, dotColor = "#0b8b5b") {
    if (terminalText) terminalText.textContent = text;
    if (statusDot) statusDot.style.background = dotColor;
  }

  /* ============ 10. Kodni yuborish va baholash ============ */
  const STATUS_LABELS = {
    accepted: "✅ O‘tdi",
    wrong_answer: "❌ Noto‘g‘ri javob",
    runtime_error: "⚠️ Dastur xatosi",
    error: "⚠️ Tizim xatosi"
  };

  function buildDetailsHtml(details) {
    if (!details || !details.length) return "";
    const items = details.map((d) => {
      const statusText = STATUS_LABELS[d.status] || d.status;
      const isOk = d.status === "accepted";
      const badgeStyle = isOk
        ? "background:#D1FAE5;color:#065F46;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:600;"
        : "background:#FEE2E2;color:#991B1B;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:600;";
      
      let extra = "";
      if (d.error) {
        extra = `<pre style="margin:4px 0 0;padding:6px;background:#f8fafc;border-radius:6px;font-size:11px;color:#b91c1c;text-align:left;white-space:pre-wrap;">${escapeHtml(d.error)}</pre>`;
      } else if (d.input !== undefined && !isOk) {
        extra = `<div style="margin-top:4px;font-size:11px;text-align:left;color:#475569;">
          <div><b>Kirish:</b> ${escapeHtml(d.input)}</div>
          <div><b>Kutilgan:</b> ${escapeHtml(d.expected)}</div>
          <div><b>Chiqarilgan:</b> ${escapeHtml(d.actual)}</div>
        </div>`;
      }

      return `<div style="margin:8px 0;padding:8px;border:1px solid #e2e8f0;border-radius:8px;text-align:left;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <b>Test #${d.test}</b>
          <span style="${badgeStyle}">${statusText}</span>
        </div>
        ${extra}
      </div>`;
    }).join("");

    return `<div style="max-height:260px;overflow-y:auto;margin-top:14px;">${items}</div>`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function addAttemptToHistory(attempt) {
    if (!attempt) return;
    if (attemptsEmpty) attemptsEmpty.hidden = true;
    if (attemptList) {
      attemptList.hidden = false;
      const li = document.createElement("li");
      li.className = "attempt-item";
      li.innerHTML = `
        <strong>#${attempt.number}</strong>
        <span>${escapeHtml(attempt.language || "Python")}</span>
        <span class="attempt-status is-${attempt.status}">${escapeHtml(attempt.status_label || attempt.status)}</span>
        <time>${escapeHtml(attempt.created || "Hozir")}</time>
      `;
      attemptList.prepend(li);
    }
    if (attemptsCount) {
      const current = parseInt(attemptsCount.textContent.replace(/\D/g, "") || "0", 10);
      attemptsCount.textContent = `(${current + 1})`;
    }
  }

  async function runCode() {
    if (!textarea) return;
    const code = textarea.value;

    if (!code.trim() || code.trim() === "# Kodingizni shu yerda yozing") {
      Swal.fire({
        icon: "warning",
        title: "Kod yozilmagan",
        text: "Iltimos, avval topshiriq yechimi kodini yozing.",
        confirmButtonText: "Tushundim",
        confirmButtonColor: "#2F5D8A"
      });
      return;
    }

    if (runButton) {
      runButton.disabled = true;
      if (runButtonText) runButtonText.textContent = "Tekshirilmoqda...";
    }
    setTerminalStatus("Kodingiz testlardan o‘tkazilmoqda...", "#eab308");

    Swal.fire({
      title: "Tekshirilmoqda...",
      text: "Kodingiz testlar orqali tekshirilmoqda",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const body = new URLSearchParams();
      body.set("task", taskSlug);
      body.set("task_slug", taskSlug);
      body.set("code", code);

      const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": csrf,
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: body.toString()
      });

      let data = {};
      try {
        data = await response.json();
      } catch (_) {}

      if (!response.ok) {
        const errorMsg = data.output || data.error || ("Xatolik yuz berdi: HTTP " + response.status);
        setTerminalStatus("Xatolik yuz berdi", "#ef4444");
        Swal.fire({
          icon: "error",
          title: response.status === 502 ? "Code Runner xizmati xatosi" : "Xatolik",
          text: errorMsg,
          confirmButtonText: "Yopish",
          confirmButtonColor: "#B91C1C"
        });
        return;
      }

      if (data.attempt) {
        addAttemptToHistory(data.attempt);
      }

      if (data.status === "accepted") {
        setTerminalStatus("Barcha testlardan muvaffaqiyatli o‘tdi! 🎉", "#059669");
        if (completeBadgeWrap && !completeBadgeWrap.querySelector(".status-badge-complete")) {
          completeBadgeWrap.innerHTML = `<span class="status-badge-complete"><span aria-hidden="true">✔</span> Bajarilgan</span>`;
        }

        Swal.fire({
          icon: "success",
          title: "Ajoyib! 🎉",
          html: `<p>Barcha testlar muvaffaqiyatli bajarildi: <b>${data.passed}/${data.total}</b></p>${buildDetailsHtml(data.details)}`,
          confirmButtonText: "Davom etish",
          confirmButtonColor: "#059669"
        });
      } else if (data.status === "runtime_error") {
        setTerminalStatus("Dasturda xatolik mavjud (Runtime Error)", "#ef4444");
        Swal.fire({
          icon: "error",
          title: "Dastur xatosi!",
          html: `<p>Kodingizda xatolik yuz berdi. Natija: <b>${data.passed || 0}/${data.total || 0}</b></p>${buildDetailsHtml(data.details)}`,
          confirmButtonText: "Kodni tuzatish",
          confirmButtonColor: "#B91C1C"
        });
      } else {
        setTerminalStatus("Noto‘g‘ri javob (Wrong Answer)", "#eab308");
        Swal.fire({
          icon: "warning",
          title: "Deyarli to‘g‘ri!",
          html: `<p>Natija: <b>${data.passed || 0}/${data.total || 0}</b> ta test to‘g‘ri bajarildi.</p>${buildDetailsHtml(data.details)}`,
          confirmButtonText: "Qayta urinish",
          confirmButtonColor: "#2F5D8A"
        });
      }

    } catch (err) {
      setTerminalStatus("Serverga ulanishda xatolik", "#ef4444");
      Swal.fire({
        icon: "error",
        title: "Ulanishda xatolik",
        text: "Server bilan aloqa uzildi. Iltimos, internet aloqasini tekshiring.",
        confirmButtonText: "Yaxshi",
        confirmButtonColor: "#B91C1C"
      });
    } finally {
      if (runButton) {
        runButton.disabled = false;
        if (runButtonText) runButtonText.textContent = "Ishga tushirish";
      }
    }
  }

  if (runButton) runButton.addEventListener("click", runCode);
  if (form) form.addEventListener("submit", (e) => e.preventDefault());

})();
