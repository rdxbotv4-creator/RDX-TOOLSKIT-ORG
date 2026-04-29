/* ===== Mouse-tracked spotlight ===== */
(function () {
  if (matchMedia("(hover: none)").matches) return;
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.appendChild(glow);
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  function loop() {
    x += (tx - x) * 0.18;
    y += (ty - y) * 0.18;
    glow.style.left = x + "px";
    glow.style.top = y + "px";
    requestAnimationFrame(loop);
  }
  document.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  loop();
})();

/* ===== Subtle 3D tilt on tool cards ===== */
(function () {
  const cards = document.querySelectorAll(".tool-card, .feat");
  cards.forEach((card) => {
    let raf = 0;
    function onMove(e) {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (0.5 - py) * 8;
      const ry = (px - 0.5) * 10;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform =
          `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      });
    }
    function onLeave() {
      cancelAnimationFrame(raf);
      card.style.transform = "";
    }
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);
  });
})();

/* ===== Scroll-reveal observer ===== */
(function () {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();

/* ===== Animated counters ===== */
(function () {
  const els = document.querySelectorAll("[data-count]");
  if (!els.length) return;
  const animate = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const dur = 1500;
    const start = performance.now();
    function tick(t) {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = target * eased;
      el.textContent = (Number.isInteger(target) ? Math.round(v) : v.toFixed(1)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    els.forEach((el) => io.observe(el));
  } else { els.forEach(animate); }
})();

/* ===== Active nav-link on scroll ===== */
(function () {
  const links = document.querySelectorAll(".nav-links a[href^='#']");
  if (!links.length) return;
  const map = {};
  links.forEach((a) => {
    const id = a.getAttribute("href").slice(1);
    const sec = document.getElementById(id);
    if (sec) map[id] = a;
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const a = map[e.target.id];
      if (!a) return;
      if (e.isIntersecting) {
        links.forEach((l) => l.classList.remove("active"));
        a.classList.add("active");
      }
    });
  }, { rootMargin: "-40% 0px -50% 0px" });
  Object.keys(map).forEach((id) => io.observe(document.getElementById(id)));
})();
