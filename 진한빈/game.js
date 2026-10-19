TemplateEngine.start((api) => {
  let x, y, score, lives, hurtCool, auraCool, swing, spawn, elapsed, monsters;
  const kinds = [
    { id: "slime", color: "#6dff78", w: 36, h: 26, hp: 1, speed: 62 },
    { id: "bat", color: "#c084fc", w: 40, h: 22, hp: 1, speed: 118 },
    { id: "ghost", color: "#d7e7ff", w: 32, h: 38, hp: 2, speed: 74 },
    { id: "skeleton", color: "#f4efe4", w: 24, h: 44, hp: 2, speed: 86 },
    { id: "golem", color: "#c47a45", w: 46, h: 46, hp: 3, speed: 46 }
  ];

  const actorSize = 128;
  let cutout = null;
  if (api.cfg.player.sprite) {
    const raw = new Image();
    raw.onload = () => {
      const board = document.createElement("canvas");
      board.width = raw.naturalWidth;
      board.height = raw.naturalHeight;
      const pen = board.getContext("2d");
      pen.drawImage(raw, 0, 0);
      const image = pen.getImageData(0, 0, board.width, board.height);
      const pixels = image.data;
      for (let i = 0; i < pixels.length; i += 4) {
        const max = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
        if (max < 26) pixels[i + 3] = 0;
        else if (max < 46) pixels[i + 3] = Math.round(((max - 26) / 20) * 255);
      }
      pen.putImageData(image, 0, 0);
      cutout = board;
    };
    raw.src = api.cfg.player.sprite;
  }

  api.canvas.addEventListener("pointerdown", (event) => {
    if (api.mode() !== "play") return;
    event.preventDefault();
    swing = 0.18;
  });

  function reset() {
    x = 450;
    y = 250;
    score = 0;
    lives = Number(api.cfg.rules.lives) || 5;
    hurtCool = 0;
    auraCool = 0;
    swing = 0;
    spawn = 0.4;
    elapsed = 0;
    monsters = [];
    api.setScore("처치 0");
    api.setExtra("목숨 " + lives);
    api.buttons([
      { act: "left", label: "왼쪽" },
      { act: "right", label: "오른쪽" },
      { act: "up", label: "위" },
      { act: "down", label: "아래" },
      { act: "action", label: "공격" }
    ]);
  }

  function update(dt) {
    const speed = 220 * (Number(api.cfg.rules.speed) || 1);
    const goal = Number(api.cfg.rules.timeSec) || 25;
    if (api.input.held("ArrowLeft")) x -= speed * dt;
    if (api.input.held("ArrowRight")) x += speed * dt;
    if (api.input.held("ArrowUp")) y -= speed * dt;
    if (api.input.held("ArrowDown")) y += speed * dt;
    x = Math.max(24, Math.min(960 - actorSize - 24, x));
    y = Math.max(24, Math.min(540 - actorSize - 24, y));
    elapsed += dt;
    hurtCool = Math.max(0, hurtCool - dt);
    auraCool = Math.max(0, auraCool - dt);
    swing = Math.max(0, swing - dt);
    const left = Math.max(0, Math.ceil(goal - elapsed));
    api.setExtra("남은 " + left + "초 · 목숨 " + lives);
    if (elapsed >= goal) { api.win(); return; }
    if (api.input.hit(" ")) swing = 0.18;
    if (api.has("aura") && auraCool <= 0) {
      monsters.forEach((monster) => {
        if (Math.hypot(monster.x - x, monster.y - y) < 90) monster.hp -= 1;
      });
      auraCool = 0.45;
    }
    spawn -= dt;
    if (spawn <= 0) {
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const edge = Math.random() < 0.5;
      monsters.push({
        x: edge ? (Math.random() < 0.5 ? 0 : 940) : Math.random() * 960,
        y: edge ? Math.random() * 540 : (Math.random() < 0.5 ? 0 : 520),
        hp: kind.hp,
        w: kind.w,
        h: kind.h,
        color: kind.color,
        speed: kind.speed,
        id: kind.id,
        hit: false
      });
      spawn = Math.max(0.38, 1.05 - elapsed * 0.012);
    }
    monsters.forEach((monster) => {
      if (swing <= 0) monster.hit = false;
      const px = x + actorSize / 2;
      const py = y + actorSize * 0.62;
      const mx = monster.x + monster.w / 2;
      const my = monster.y + monster.h / 2;
      const dx = px - mx;
      const dy = py - my;
      const dist = Math.hypot(dx, dy) || 1;
      monster.x += (dx / dist) * monster.speed * dt;
      monster.y += (dy / dist) * monster.speed * dt;
      const reach = 78;
      if (swing > 0 && !monster.hit && dist < reach) {
        monster.hp -= 1;
        monster.hit = true;
      }
      const touch = 54;
      if (dist < touch && hurtCool <= 0) {
        lives -= 1;
        hurtCool = 0.8;
        api.setExtra("남은 " + left + "초 · 목숨 " + lives);
        if (lives <= 0) api.lose();
      }
    });
    const before = monsters.length;
    monsters = monsters.filter((monster) => monster.hp > 0);
    score += before - monsters.length;
    api.setScore("처치 " + score);
  }

  function drawMonster(ctx, monster) {
    const mx = monster.x;
    const my = monster.y;
    ctx.fillStyle = monster.color;
    if (monster.id === "slime") {
      ctx.beginPath();
      ctx.ellipse(mx + monster.w / 2, my + monster.h * 0.62, monster.w / 2, monster.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#143018";
      ctx.fillRect(mx + 8, my + 10, 5, 5);
      ctx.fillRect(mx + monster.w - 14, my + 10, 5, 5);
    } else if (monster.id === "bat") {
      ctx.beginPath();
      ctx.moveTo(mx, my + monster.h);
      ctx.lineTo(mx + monster.w * 0.28, my);
      ctx.lineTo(mx + monster.w * 0.5, my + monster.h * 0.7);
      ctx.lineTo(mx + monster.w * 0.72, my);
      ctx.lineTo(mx + monster.w, my + monster.h);
      ctx.closePath();
      ctx.fill();
    } else if (monster.id === "ghost") {
      ctx.globalAlpha = 0.82;
      ctx.beginPath();
      ctx.arc(mx + monster.w / 2, my + monster.h * 0.42, monster.w / 2, Math.PI, 0);
      ctx.lineTo(mx + monster.w, my + monster.h);
      ctx.lineTo(mx + monster.w * 0.66, my + monster.h * 0.78);
      ctx.lineTo(mx + monster.w * 0.33, my + monster.h);
      ctx.lineTo(mx, my + monster.h * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (monster.id === "skeleton") {
      ctx.fillRect(mx + 6, my, 12, 12);
      ctx.fillRect(mx + 9, my + 14, 6, 16);
      ctx.fillRect(mx, my + 16, monster.w, 5);
      ctx.fillRect(mx + 4, my + 30, 5, 14);
      ctx.fillRect(mx + 15, my + 30, 5, 14);
    } else {
      ctx.fillRect(mx, my, monster.w, monster.h);
      ctx.fillStyle = "#6b3a22";
      ctx.fillRect(mx + 8, my + 12, 8, 8);
      ctx.fillRect(mx + monster.w - 16, my + 12, 8, 8);
    }
  }

  function draw() {
    const ctx = api.ctx;
    ctx.fillStyle = "#241812";
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 12; col += 1) {
        if ((row + col) % 2 === 0) ctx.fillRect(col * 80, row * 60, 76, 56);
      }
    }
    ctx.fillStyle = "#0d0a08";
    ctx.fillRect(0, 0, 960, 26);
    ctx.fillRect(0, 514, 960, 26);
    ctx.fillRect(0, 0, 26, 540);
    ctx.fillRect(934, 0, 26, 540);
    [[78, 78, 54], [882, 84, 46], [110, 456, 40], [850, 448, 58]].forEach((torch) => {
      ctx.fillStyle = "rgba(231, 168, 74, 0.18)";
      ctx.beginPath();
      ctx.arc(torch[0], torch[1], torch[2], 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e7a84a";
      ctx.fillRect(torch[0] - 4, torch[1] - 16, 8, 22);
    });
    if (api.has("aura")) {
      ctx.strokeStyle = api.accent();
      ctx.strokeRect(x - 20, y - 20, actorSize + 40, actorSize + 40);
    }
    monsters.forEach((monster) => drawMonster(ctx, monster));
    if (cutout) ctx.drawImage(cutout, x, y, actorSize, actorSize);
    else api.drawActor(x, y, actorSize, actorSize);
    if (swing > 0) {
      ctx.strokeStyle = api.accent();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + actorSize / 2, y + actorSize * 0.62, 62, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  return { reset, update, draw };
});
