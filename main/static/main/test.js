(() => {
    const $ = (id) => document.getElementById(id);

    const questions = [...document.querySelectorAll(".question")];
    const dots = [...document.querySelectorAll(".question-dot")];
    const previousButton = $("previous-button");
    const nextButton = $("next-button");
    const finishButton = $("finish-button");
    const counter = $("question-counter");
    const answeredCounter = $("answered-counter");
    const progressBar = $("progress-bar");
    const form = $("test-form");
    const resultPanel = $("result-panel");
    const resultMessage = $("result-message");

    if (!questions.length) return;

    let currentIndex = 0;
    let finished = false;

    /* ============ To'liq ekran rejimi ============ */
    const gate = $("fs-gate");
    const root = document.documentElement;
    const fsSupported = !!(root.requestFullscreen || root.webkitRequestFullscreen);
    const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    let started = false;

    function syncGate() {
        // Test tugagach yoki brauzer to'liq ekranni qo'llamasa (iPhone) modal qaytmaydi
        const show = !finished && (fsSupported ? !isFullscreen() : !started);
        gate.hidden = !show;
        document.querySelectorAll("header, main").forEach((el) => { el.inert = show; });

        if (show) {
            if (started) {  // Esc bilan chiqilgan
                $("fs-text").innerHTML =
                    "To‘liq ekrandan chiqdingiz.<br>Davom etish uchun to‘liq ekranga qayting.";
                $("fs-start").textContent = "Davom etish";
            }
            $("fs-start").focus();
        }
    }

    $("fs-start").addEventListener("click", () => {
        const request = root.requestFullscreen || root.webkitRequestFullscreen;
        if (request) {
            try {
                const result = request.call(root);
                if (result && result.catch) result.catch(() => {});
            } catch (_) {}
        }
        started = true;
        syncGate();
    });

    document.addEventListener("fullscreenchange", syncGate);
    document.addEventListener("webkitfullscreenchange", syncGate);

    /* ============ Savollarni nusxalashni bloklash ============ */
    const content = $("test-content");
    ["copy", "cut", "contextmenu", "dragstart", "selectstart"].forEach((type) => {
        content.addEventListener(type, (e) => e.preventDefault());
    });

    /* ============ Test mantig'i ============ */
    function getAnsweredCount() {
        return questions.filter((q) => q.querySelector('input[type="radio"]:checked')).length;
    }

    function showQuestion(index) {
        if (finished) return;

        currentIndex = Math.max(0, Math.min(index, questions.length - 1));

        questions.forEach((question, i) => { question.hidden = i !== currentIndex; });

        dots.forEach((dot, i) => {
            dot.classList.toggle("current", i === currentIndex);
            dot.classList.toggle("answered", Boolean(questions[i].querySelector('input[type="radio"]:checked')));
        });

        counter.textContent = `${currentIndex + 1} / ${questions.length}-savol`;
        answeredCounter.textContent = `${getAnsweredCount()} ta javob belgilandi`;
        progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;

        previousButton.disabled = currentIndex === 0;
        nextButton.hidden = currentIndex === questions.length - 1;
    }

    function finishTest() {
        if (finished) return;

        const answered = getAnsweredCount();
        const unanswered = questions.length - answered;

        const message = unanswered > 0
            ? `${unanswered} ta savol javobsiz qolgan.\nHaqiqatan ham testni yakunlamoqchimisiz?`
            : "Testni yakunlashni tasdiqlaysizmi?";

        if (!confirm(message)) return;

        finished = true;
        syncGate();

        content.hidden = true;
        document.querySelector(".sidebar").hidden = true;
        resultPanel.hidden = false;

        resultMessage.textContent =
            `Siz ${questions.length} ta savoldan ${answered} tasiga javob belgiladingiz.`;
    }

    previousButton.addEventListener("click", () => showQuestion(currentIndex - 1));
    nextButton.addEventListener("click", () => showQuestion(currentIndex + 1));
    dots.forEach((dot) => dot.addEventListener("click", () => showQuestion(Number(dot.dataset.goTo))));

    form.addEventListener("change", (event) => {
        if (event.target.matches('input[type="radio"]')) showQuestion(currentIndex);
    });

    finishButton.addEventListener("click", finishTest);

    showQuestion(0);
    syncGate();
})();
