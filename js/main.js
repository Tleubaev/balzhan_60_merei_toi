/* =========================================================================
 * Мерейтойға шақыру — скрипты страницы
 * ========================================================================= */

/* ---------- Таймер обратного отсчёта ---------- */
(function () {
  var EVENT_TIME = new Date("2026-10-05T17:30:00+05:00").getTime();
  var LABELS = ["Күн", "Сағат", "Минут", "Секунд"];

  // число стоит в элементе прямо перед подписью «Күн», «Сағат» и т.д.
  var valueEls = {};
  document.querySelectorAll(".sh-component--timer div").forEach(function (el) {
    var text = el.textContent.trim();
    if (el.children.length === 0 && LABELS.indexOf(text) > -1 && el.previousElementSibling) {
      valueEls[text] = el.previousElementSibling;
    }
  });

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function update() {
    var left = Math.max(0, Math.floor((EVENT_TIME - Date.now()) / 1000));
    var values = [
      Math.floor(left / 86400),
      Math.floor((left % 86400) / 3600),
      Math.floor((left % 3600) / 60),
      left % 60,
    ];
    LABELS.forEach(function (label, i) {
      if (valueEls[label])
        valueEls[label].textContent = i === 0 ? String(values[0]) : pad(values[i]);
    });
  }

  update();
  setInterval(update, 1000);
})();

/* ---------- Адаптив холста ----------
 * Вёрстка — абсолютные слои на макете шириной 430px:
 *   < 375px   — макет 375px, уменьшенный под экран
 *   375–429   — макет по ширине экрана (боковые украшения обрезаются)
 *   430–768   — макет 430px, увеличенный (максимум в 1.5 раза) и по центру
 *   > 768     — без изменений: макет телефона на тёмном фоне
 */
(function () {
  var canvas = document.querySelector(".sh-block--public");
  if (!canvas) return;

  function fit() {
    var w = document.documentElement.clientWidth;
    var zoom = 1;
    var width = "100%";
    if (w <= 768) {
      if (w < 375) {
        width = "375px";
        zoom = w / 375;
      } else if (w < 430) {
        width = w + "px";
      } else {
        width = "430px";
        zoom = Math.min(w / 430, 1.5);
      }
    }
    canvas.style.width = width;
    canvas.style.zoom = zoom === 1 ? "" : String(zoom);
  }

  fit();
  window.addEventListener("resize", fit);
})();

/* ---------- Конверт, музыка, автопрокрутка ---------- */
(function () {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  var audio = document.querySelector("audio");
  var musicButton = document.querySelector(".audio-player-button");

  // кнопка «Әуен қосу»: вкл/выкл музыки, иконка паузы, когда играет
  function syncMusicButton() {
    if (musicButton && audio) musicButton.classList.toggle("is-playing", !audio.paused);
  }
  if (audio && musicButton) {
    musicButton.addEventListener("click", function () {
      if (audio.paused) audio.play();
      else audio.pause();
    });
    audio.addEventListener("play", syncMusicButton);
    audio.addEventListener("pause", syncMusicButton);
  }

  // появление блоков при прокрутке: slideIn запускается, когда блок доходит до экрана
  // (всё, что уже выше нижней кромки экрана, тоже показываем, чтобы быстрый свайп ничего не пропустил)
  function armReveal() {
    var layers = document.querySelectorAll(".animation-layer:not(.animation-spin)");
    var waiting = [].slice.call(layers).filter(function (layer) {
      if (layer.getBoundingClientRect().top > window.innerHeight * 0.9) {
        layer.classList.add("anim-wait");
        return true;
      }
      return false;
    });

    function check() {
      waiting = waiting.filter(function (layer) {
        if (layer.getBoundingClientRect().top < window.innerHeight * 0.85) {
          layer.classList.remove("anim-wait");
          return false;
        }
        return true;
      });
      if (!waiting.length) {
        window.removeEventListener("scroll", check, true);
        window.removeEventListener("resize", check);
      }
    }

    if (waiting.length) {
      window.addEventListener("scroll", check, { capture: true, passive: true });
      window.addEventListener("resize", check);
    }
  }

  // медленная автопрокрутка вниз (как в приглашении Куаныша):
  // касание экрана — пауза, через 4 с после последнего касания едем дальше с того места, куда долистал гость;
  // колесо мыши — остановка насовсем; внизу страницы — остановка
  var AUTO_SPEED = 54; // px в секунду (= 0.9 px за кадр при 60 к/с)
  var TOUCH_RESUME = 4000; // мс

  function autoScroll() {
    var scroller = document.scrollingElement || document.documentElement;
    // на десктопе (макет телефона) прокручивается body, на мобильных — документ
    if (
      scroller.scrollHeight <= scroller.clientHeight + 1 &&
      document.body.scrollHeight > document.body.clientHeight + 1
    ) {
      scroller = document.body;
    }

    var pos = scroller.scrollTop;
    var written = pos;
    var lastTime = 0;
    var stopped = false;
    var paused = false;
    var resumeTimer = null;

    function onTouch() {
      paused = true;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () {
        paused = false;
      }, TOUCH_RESUME);
    }

    function stop() {
      stopped = true;
      clearTimeout(resumeTimer);
      window.removeEventListener("touchstart", onTouch, true);
      window.removeEventListener("wheel", stop, true);
    }

    window.addEventListener("touchstart", onTouch, { capture: true, passive: true });
    window.addEventListener("wheel", stop, { capture: true, passive: true });

    function step(time) {
      if (stopped) return;
      var dt = lastTime ? Math.min(time - lastTime, 100) : 0;
      lastTime = time;
      if (!paused && dt) {
        // гость листал сам — продолжаем оттуда
        if (Math.abs(scroller.scrollTop - written) > 2) pos = scroller.scrollTop;
        pos += (AUTO_SPEED * dt) / 1000;
        var max = scroller.scrollHeight - scroller.clientHeight;
        if (pos >= max - 4) {
          scroller.scrollTop = max;
          stop();
          return;
        }
        scroller.scrollTop = pos;
        written = scroller.scrollTop;
      }
      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  var overlay = document.getElementById("envelope");
  if (!overlay) {
    armReveal();
    return;
  }

  document.documentElement.classList.add("envelope-lock");
  var seal = overlay.querySelector(".envelope-button-wrap");
  var opened = false;

  function openEnvelope() {
    if (opened) return; // защита от двойного клика
    opened = true;

    // музыку запускаем синхронно в обработчике клика, иначе браузер заблокирует автозапуск
    if (audio) {
      try {
        var playing = audio.play();
        if (playing && playing.catch) playing.catch(function () {});
      } catch (e) {}
    }

    armReveal();
    document.body.classList.remove("envelope-closed");
    overlay.classList.add("is-opening");
    overlay.querySelector(".envelope-flap-top").classList.add("slide-up");
    overlay.querySelector(".envelope-flap-bottom").classList.add("slide-down");
    seal.classList.add("slide-up");
    overlay.querySelector(".envelope-bg").classList.add("fade-out");
    overlay.querySelector(".envelope-bg-panels").classList.add("fade-out");
    overlay.querySelector(".envelope-content").classList.add("fade-out");

    var reducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // страница поехала вниз сразу, пока конверт раскрывается (при «уменьшении движения» не едем)
    document.documentElement.classList.remove("envelope-lock");
    if (!reducedMotion) autoScroll();

    setTimeout(
      function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.body.classList.remove("envelope-hide-buttons");
        syncMusicButton();
      },
      reducedMotion ? 450 : 1400,
    );
  }

  seal.addEventListener("click", openEnvelope);
  seal.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEnvelope();
    }
  });
})();
