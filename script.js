(function () {
    const game = document.getElementById("adivina-game");
    const fullscreenButton = document.getElementById("adivina-fullscreen");
    const form = document.getElementById("adivina-form");
    const input = document.getElementById("adivina-input");
    const result = document.getElementById("adivina-result");
    const resultPanel = result.closest(".adivina-result");
    const resultReel = document.getElementById("adivina-result-reel");
    const submitButton = document.getElementById("adivina-submit");
    const guessCount = document.getElementById("adivina-guess-count");
    const guessWord = document.getElementById("adivina-guess-word");
    const lowValue = document.getElementById("adivina-low-value");
    const highValue = document.getElementById("adivina-high-value");
    const lowCircle = document.getElementById("adivina-low-circle");
    const highCircle = document.getElementById("adivina-high-circle");
    const lowReel = document.getElementById("adivina-low-reel");
    const highReel = document.getElementById("adivina-high-reel");
    const resetButton = document.getElementById("adivina-reset");
    const settingsButton = document.getElementById("adivina-settings");
    const backdrop = document.getElementById("adivina-settings-backdrop");
    const closeButton = document.getElementById("adivina-close");
    const cancelButton = document.getElementById("adivina-cancel");
    const applyButton = document.getElementById("adivina-apply");
    const levelSelect = document.getElementById("adivina-level");
    const languageSelect = document.getElementById("adivina-language");
    const languageLabel = document.getElementById("adivina-language-label");
    const levelLabel = document.getElementById("adivina-level-label");
    const settingsTitle = document.getElementById("adivina-settings-title");
    const smallNote = document.getElementById("adivina-small-note");
    const copyright = document.getElementById("adivina-copyright");
    const confetti = document.getElementById("adivina-confetti");

    const state = {
      range: 50,
      target: 0,
      guesses: 0,
      closestLow: null,
      closestHigh: null,
      guessedNumbers: new Set(),
      solved: false,
      language: "es",
      lastMessageKey: "result",
      lastMessageValue: null,
      lastMessageVariant: "",
    };

    const labels = {
      es: {
        result: "Adivina el número",
        guess: "Adivina",
        guesses: "intentos",
        reset: "Reiniciar",
        settings: "Ajustes",
        language: "Idioma",
        level: "Elige nivel",
        apply: "Aplicar",
        cancel: "Cancelar",
        note: "Cambiar el nivel empieza una partida nueva con otro número secreto.",
        copyright: "Creado por Shaun Daubney.",
        close: "Cerrar ajustes",
        input: "Ingresa un número",
        fullscreenEnter: "Pantalla completa",
        fullscreenExit: "Salir de pantalla completa",
        alreadyTried: "Ya probado",
        correct: "¡Correcto!",
        tooLow: "▲ Arriba ▲",
        tooHigh: "▼ Abajo ▼",
        range: (max) => `1 – ${max}`,
        levels: {
          50: "Normal — 1 a 50",
          100: "Difícil — 1 a 100",
          1000: "Súper — 1 a 1.000",
          9999: "Extremo — 1 a 9.999",
        },
      },
      en: {
        result: "Guess the number",
        guess: "Guess",
        guesses: "guesses",
        reset: "Reset",
        settings: "Settings",
        language: "Language",
        level: "Choose level",
        apply: "Apply",
        cancel: "Cancel",
        note: "Changing level starts a fresh game with a new secret number.",
        copyright: "Created by Shaun Daubney.",
        close: "Close settings",
        input: "Enter a number",
        fullscreenEnter: "Fullscreen",
        fullscreenExit: "Exit fullscreen",
        alreadyTried: "Tried already",
        correct: "Correct!",
        tooLow: "▲ Higher ▲",
        tooHigh: "▼ Lower ▼",
        range: (max) => `1 – ${max}`,
        levels: {
          50: "Normal — 1 to 50",
          100: "Hard — 1 to 100",
          1000: "Super — 1 to 1,000",
          9999: "Extreme — 1 to 9,999",
        },
      },
    };

    function randomTarget(max) {
      return Math.floor(Math.random() * max) + 1;
    }

    function formatNumber(number) {
      const value = String(Math.trunc(Number(number)));
      const separator = state.language === "es" ? "." : ",";
      return value.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    }

    function t(key) {
      return labels[state.language][key];
    }

    function translateInterface() {
      const text = labels[state.language];

      submitButton.textContent = text.guess;
      guessWord.textContent = text.guesses;
      resetButton.textContent = text.reset;
      settingsButton.textContent = text.settings;
      settingsTitle.textContent = text.settings;
      languageLabel.textContent = text.language;
      levelLabel.textContent = text.level;
      applyButton.textContent = text.apply;
      cancelButton.textContent = text.cancel;
      smallNote.textContent = text.note;
      copyright.textContent = text.copyright;
      closeButton.setAttribute("aria-label", text.close);
      input.setAttribute("aria-label", text.input);
      fullscreenButton.setAttribute("aria-label", document.fullscreenElement ? text.fullscreenExit : text.fullscreenEnter);

      Array.from(levelSelect.options).forEach((option) => {
        option.textContent = text.levels[option.value];
      });
    }

    function messageFromKey(key, value) {
      if (key === "range") return t("range")(formatNumber(value));
      return t(key);
    }

    function setBodyLock() {
      document.body.classList.add("adivina-body-lock");
    }

    function restartAnimation(element, className) {
      element.classList.remove(className);
      void element.offsetWidth;
      element.classList.add(className);
    }

    function escapeHTML(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function makeReelItems(finalText, alternatives) {
      const items = alternatives.concat([finalText]);
      return '<div class="adivina-reel-strip">' + items.map((text, index) => {
        const className = index === items.length - 1 ? 'adivina-reel-item final' : 'adivina-reel-item';
        return '<div class="' + className + '">' + escapeHTML(text) + '</div>';
      }).join('') + '</div>';
    }

    function playReel(container, reel, finalText, alternatives, direction = "down") {
      const stripStart = direction === "up" ? "44%" : "-44%";
      const fast = direction === "up" ? "-22%" : "22%";
      const overshoot = direction === "up" ? "6%" : "-6%";
      const settle = direction === "up" ? "-3%" : "3%";

      reel.innerHTML = makeReelItems(finalText, alternatives);
      const strip = reel.querySelector(".adivina-reel-strip");
      strip.style.setProperty("--reel-start", stripStart);
      strip.style.setProperty("--reel-fast", fast);
      strip.style.setProperty("--reel-overshoot", overshoot);
      strip.style.setProperty("--reel-settle", settle);

      container.classList.remove("is-reeling");
      void container.offsetWidth;
      container.classList.add("is-reeling");

      window.setTimeout(() => {
        container.classList.remove("is-reeling");
        reel.innerHTML = "";
      }, 1030);
    }

    function buildResultAlternatives(finalText) {
      const text = labels[state.language];
      return [
        text.tooLow,
        text.tooHigh,
        text.alreadyTried,
        text.range(formatNumber(state.range)),
        text.result,
        finalText,
        text.tooHigh,
        text.tooLow,
      ];
    }

    function buildNumberAlternatives(finalText) {
      const values = [];

      for (let i = 0; i < 8; i += 1) {
        values.push(formatNumber(Math.floor(Math.random() * state.range) + 1));
      }

      values.push(finalText);
      return values;
    }

    function updateDisplay(messageKey = "result", variant = "", messageValue = null) {
      state.lastMessageKey = messageKey;
      state.lastMessageValue = messageValue;
      state.lastMessageVariant = variant;

      translateInterface();

      const nextLow = state.closestLow === null ? "" : formatNumber(state.closestLow);
      const nextHigh = state.closestHigh === null ? "" : formatNumber(state.closestHigh);
      const lowChanged = lowValue.textContent !== nextLow && nextLow !== "";
      const highChanged = highValue.textContent !== nextHigh && nextHigh !== "";

      lowValue.textContent = nextLow;
      highValue.textContent = nextHigh;
      lowValue.setAttribute("data-roll-text", nextLow);
      highValue.setAttribute("data-roll-text", nextHigh);
      lowValue.setAttribute("data-film", nextLow);
      highValue.setAttribute("data-film", nextHigh);
      lowCircle.classList.toggle("has-number", state.closestLow !== null);
      highCircle.classList.toggle("has-number", state.closestHigh !== null);

      guessCount.textContent = formatNumber(state.guesses);
      result.textContent = messageFromKey(messageKey, messageValue);
      result.setAttribute("data-roll-text", result.textContent);
      result.setAttribute("data-film", result.textContent);
      result.classList.toggle("correct", variant === "correct");
      resultPanel.classList.toggle("is-correct", variant === "correct");
      resultPanel.classList.toggle("is-too-low", messageKey === "tooLow");
      resultPanel.classList.toggle("is-too-high", messageKey === "tooHigh");

      const resultDirection = messageKey === "tooLow" ? "up" : "down";
      resultPanel.classList.toggle("roll-up", resultDirection === "up");
      resultPanel.classList.toggle("roll-down", resultDirection !== "up");
      resultPanel.classList.remove("is-reeling");
      restartAnimation(resultPanel, "is-rolling");
      restartAnimation(result, "is-rolling");

      if (lowChanged) {
        lowCircle.classList.add("roll-up");
        lowCircle.classList.remove("roll-down", "is-reeling");
        restartAnimation(lowCircle, "is-rolling");
        restartAnimation(lowValue, "is-rolling");
      }

      if (highChanged) {
        highCircle.classList.add("roll-down");
        highCircle.classList.remove("roll-up", "is-reeling");
        restartAnimation(highCircle, "is-rolling");
        restartAnimation(highValue, "is-rolling");
      }
      input.max = state.range;
      input.min = 1;
      input.disabled = state.solved;
    }

    function resetGame(newRange = state.range) {
      state.range = Number(newRange);
      state.target = randomTarget(state.range);
      state.guesses = 0;
      state.closestLow = null;
      state.closestHigh = null;
      state.guessedNumbers = new Set();
      state.solved = false;

      levelSelect.value = String(state.range);
      input.value = "";
      updateDisplay("result");
      input.focus({ preventScroll: true });
    }

    async function toggleFullscreen() {
      try {
        if (!document.fullscreenElement) {
          await game.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (error) {
        game.classList.toggle("is-faux-fullscreen");
      }

      translateInterface();
    }

    function openSettings() {
      backdrop.classList.add("is-open");
      levelSelect.value = String(state.range);
      languageSelect.value = state.language;
      closeButton.focus({ preventScroll: true });
    }

    function closeSettings() {
      backdrop.classList.remove("is-open");
      settingsButton.focus({ preventScroll: true });
    }

    function celebrate() {
      confetti.innerHTML = "";

      const colours = ["#ffffff", "#ffe4f0", "#e62163", "#c51f73", "#622181", "#8b35c9"];
      const shapes = ["square", "circle", "ribbon"];
      const viewport = Math.max(window.innerWidth, window.innerHeight);
      const totalPieces = 260;

      for (let i = 0; i < totalPieces; i += 1) {
        const piece = document.createElement("span");
        const angle = Math.random() * Math.PI * 2;
        const distance = viewport * (0.34 + Math.random() * 0.72);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance - viewport * (0.18 + Math.random() * 0.18);
        const delay = Math.random() * 170;
        const duration = 1700 + Math.random() * 1250;
        const scale = 0.85 + Math.random() * 1.7;
        const spin = (Math.random() > 0.5 ? 1 : -1) * (720 + Math.random() * 1500);
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const width = shape === "ribbon" ? 8 + Math.random() * 10 : 10 + Math.random() * 14;
        const height = shape === "circle" ? width : shape === "ribbon" ? 28 + Math.random() * 28 : 12 + Math.random() * 20;

        if (shape !== "square") piece.classList.add(shape);
        piece.style.setProperty("--burst-x", x.toFixed(0) + "px");
        piece.style.setProperty("--burst-y", y.toFixed(0) + "px");
        piece.style.setProperty("--piece-spin", spin.toFixed(0) + "deg");
        piece.style.setProperty("--piece-scale", scale.toFixed(2));
        piece.style.setProperty("--piece-delay", delay.toFixed(0) + "ms");
        piece.style.setProperty("--piece-duration", duration.toFixed(0) + "ms");
        piece.style.setProperty("--piece-colour", colours[i % colours.length]);
        piece.style.setProperty("--piece-width", width.toFixed(0) + "px");
        piece.style.setProperty("--piece-height", height.toFixed(0) + "px");
        piece.style.setProperty("--piece-radius", shape === "square" ? (Math.random() > 0.45 ? "3px" : "999px") : "999px");
        confetti.appendChild(piece);
      }

      window.setTimeout(() => {
        confetti.innerHTML = "";
      }, 3200);
    }

    function handleGuess(event) {
      event.preventDefault();

      if (state.solved) return;

      const guess = Number(input.value);

      if (!Number.isInteger(guess) || guess < 1 || guess > state.range) {
        updateDisplay("range", "", state.range);
        input.select();
        return;
      }

      if (state.guessedNumbers.has(guess)) {
        updateDisplay("alreadyTried");
        input.select();
        return;
      }

      state.guessedNumbers.add(guess);
      state.guesses += 1;

      if (guess < state.target) {
        state.closestLow = state.closestLow === null ? guess : Math.max(state.closestLow, guess);
        updateDisplay("tooLow");
      } else if (guess > state.target) {
        state.closestHigh = state.closestHigh === null ? guess : Math.min(state.closestHigh, guess);
        updateDisplay("tooHigh");
      } else {
        state.closestLow = guess;
        state.closestHigh = guess;
        state.solved = true;
        updateDisplay("correct", "correct");
        celebrate();
      }

      input.value = "";
      input.focus({ preventScroll: true });
    }

    form.addEventListener("submit", handleGuess);
    fullscreenButton.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", translateInterface);
    resetButton.addEventListener("click", () => resetGame());
    settingsButton.addEventListener("click", openSettings);
    closeButton.addEventListener("click", closeSettings);
    cancelButton.addEventListener("click", closeSettings);
    applyButton.addEventListener("click", () => {
      state.language = languageSelect.value;
      resetGame(levelSelect.value);
      closeSettings();
    });

    languageSelect.addEventListener("change", () => {
      state.language = languageSelect.value;
      updateDisplay(state.lastMessageKey, state.lastMessageVariant, state.lastMessageValue);
    });

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeSettings();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && backdrop.classList.contains("is-open")) {
        closeSettings();
      }
    });

    setBodyLock();
    resetGame(50);
  })();
