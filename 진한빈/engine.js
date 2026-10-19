(function () {
  const W = 960;
  const H = 540;

  async function loadConfig() {
    try {
      const res = await fetch("game.config.json", { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch (err) {
      /* 파일을 직접 열면 fetch가 막힌다. game.config.js 를 쓴다. */
    }
    return window.GAME_CONFIG || {};
  }

  function createInput() {
    const down = new Set();
    const edge = new Set();
    const alias = {
      a: "ArrowLeft", d: "ArrowRight", w: "ArrowUp", s: "ArrowDown",
      A: "ArrowLeft", D: "ArrowRight", W: "ArrowUp", S: "ArrowDown",
      j: " ", J: " "
    };
    function press(key) {
      const name = alias[key] || key;
      if (!down.has(name)) edge.add(name);
      down.add(name);
    }
    function release(key) {
      down.delete(alias[key] || key);
    }
    window.addEventListener("keydown", (event) => {
      press(event.key);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
    });
    window.addEventListener("keyup", (event) => release(event.key));
    const map = { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", action: " " };
    document.querySelectorAll("#touch button").forEach((btn) => {
      const key = map[btn.dataset.act];
      if (!key) return;
      btn.addEventListener("pointerdown", (event) => { event.preventDefault(); press(key); });
      const up = () => release(key);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointercancel", up);
    });
    return {
      held: (key) => down.has(key),
      hit: (key) => edge.has(key),
      endFrame() { edge.clear(); }
    };
  }

  function start(setup) {
    loadConfig().then((cfg) => boot(cfg, setup)).catch((err) => {
      const text = document.getElementById("overlay-text");
      if (text) text.textContent = "게임을 열지 못했어. " + err.message;
    });
  }

  function boot(cfg, setup) {
    cfg.texts = cfg.texts || {};
    cfg.rules = cfg.rules || {};
    cfg.map = cfg.map || {};
    cfg.player = cfg.player || {};
    cfg.special = Array.isArray(cfg.special) ? cfg.special : [];
    const title = cfg.title || "게임";
    document.title = title;
    document.getElementById("title").textContent = title;
    document.getElementById("credit").textContent = "기획·디자인: " + (cfg.creator || "참가자");
    const canvas = document.getElementById("view");
    const ctx = canvas.getContext("2d");
    const input = createInput();
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayText = document.getElementById("overlay-text");
    const action = document.getElementById("action");
    const scoreEl = document.getElementById("score");
    const extraEl = document.getElementById("extra");
    let mode = "start";
    let sprite = null;
    if (cfg.player.sprite) {
      sprite = new Image();
      sprite.src = cfg.player.sprite;
    }
    const api = {
      cfg, input, canvas, ctx, W, H,
      mode: () => mode,
      setScore(text) { scoreEl.textContent = text; },
      setExtra(text) { extraEl.textContent = text; },
      buttons(list) {
        document.querySelectorAll("#touch button").forEach((btn) => {
          const found = (list || []).find((item) => item.act === btn.dataset.act);
          btn.hidden = !found;
          if (found) btn.textContent = found.label;
        });
      },
      show(head, text, label) {
        overlay.hidden = false;
        overlayTitle.textContent = head;
        overlayText.textContent = text;
        action.textContent = label;
      },
      hide() { overlay.hidden = true; },
      win() {
        if (mode !== "play") return;
        mode = "win";
        api.show(cfg.texts.win || "성공!", "한 번 더 해 볼까?", "다시 하기");
      },
      lose() {
        if (mode !== "play") return;
        mode = "lose";
        api.show(cfg.texts.lose || "실패!", "다시 도전해 보자.", "다시 하기");
      },
      has(name) { return cfg.special.includes(name); },
      color() { return cfg.player.color || "#7ee0ff"; },
      background() { return cfg.map.background || "#24165a"; },
      accent() { return cfg.map.accent || "#ffe566"; },
      drawActor(x, y, w, h) {
        if (sprite && sprite.complete && sprite.naturalWidth) ctx.drawImage(sprite, x, y, w, h);
        else {
          ctx.fillStyle = api.color();
          ctx.fillRect(x, y, w, h);
        }
      },
      pointer(event) {
        const rect = canvas.getBoundingClientRect();
        return {
          x: (event.clientX - rect.left) * (canvas.width / rect.width),
          y: (event.clientY - rect.top) * (canvas.height / rect.height)
        };
      }
    };
    const game = setup(api) || {};
    if (game.reset) game.reset();
    function begin() {
      mode = "play";
      overlay.hidden = true;
      if (game.reset) game.reset();
    }
    action.addEventListener("click", begin);
    api.show(title, cfg.texts.start || "시작을 눌러 봐.", "시작");
    let last = 0;
    function frame(now) {
      const dt = Math.min(0.034, last ? (now - last) / 1000 : 0.016);
      last = now;
      if (mode !== "play" && (input.hit(" ") || input.hit("Enter"))) begin();
      else if (mode === "play" && game.update) game.update(dt);
      ctx.fillStyle = api.background();
      ctx.fillRect(0, 0, W, H);
      if (game.draw) game.draw();
      input.endFrame();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.TemplateEngine = { start };
})();
