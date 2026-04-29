/* ===== Matrix rain canvas — RDX Tools ===== */
(function () {
  const canvas = document.getElementById("matrix");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=<>{}[]/\\|RDX";
  const charArr = chars.split("");
  let cols, drops, fontSize, w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    fontSize = Math.max(13, Math.floor(w / 110));
    cols = Math.ceil(w / fontSize);
    drops = new Array(cols).fill(0).map(() => Math.random() * -100);
  }
  resize();
  window.addEventListener("resize", resize);

  let last = 0;
  const FPS = 24;
  function loop(t) {
    requestAnimationFrame(loop);
    if (t - last < 1000 / FPS) return;
    last = t;
    /* fade trail */
    ctx.fillStyle = "rgba(1, 4, 13, 0.08)";
    ctx.fillRect(0, 0, w, h);
    ctx.font = fontSize + "px 'Share Tech Mono', monospace";
    for (let i = 0; i < cols; i++) {
      const ch = charArr[Math.floor(Math.random() * charArr.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      const head = Math.random() > 0.97;
      ctx.fillStyle = head ? "#ffffff" : "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = head ? 12 : 6;
      ctx.fillText(ch, x, y);
      if (y > h && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    ctx.shadowBlur = 0;
  }
  requestAnimationFrame(loop);
})();
