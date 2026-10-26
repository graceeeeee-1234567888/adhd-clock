/* Decorative particles are isolated from the timer and reward canvas. */
(() => {
  'use strict';
  const background = document.createElement('canvas');
  const bursts = document.createElement('canvas');
  background.className = 'ambient-particles';
  bursts.className = 'burst-particles';
  for (const canvas of [background, bursts]) {
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
  }
  const ctx = background.getContext('2d');
  const fx = bursts.getContext('2d');
  if (!ctx || !fx) return;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mini particle-toggle';
  document.querySelector('.sub-row').appendChild(toggle);
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = true;
  try { enabled = localStorage.getItem('piano_particles') !== 'off'; } catch {}
  let width = 0, height = 0, points = [], sparks = [], frame = 0, previous = 0;
  const pointer = { x: -1000, y: -1000 };
  const colors = ['#b4ff39', '#ff42ae', '#d7ffc0'];
  const allowed = () => enabled && !preference.matches;
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    for (const canvas of [background, bursts]) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    points = Array.from({ length: Math.min(90, Math.round(width * height / 16000)) }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      vx: (Math.random() - .5) * 13, vy: -5 - Math.random() * 12,
      radius: .8 + Math.random() * 1.7, color: colors[Math.floor(Math.random() * colors.length)]
    }));
  }
  function draw(now) {
    frame = 0;
    if (!allowed() || document.hidden) return;
    const dt = previous ? Math.min((now - previous) / 1000, .05) : 0;
    previous = now;
    const calm = document.body.classList.contains('zen');
    ctx.clearRect(0, 0, width, height);
    fx.clearRect(0, 0, width, height);
    for (const p of points) {
      p.x = (p.x + p.vx * dt * (calm ? .25 : 1) + width) % width;
      p.y = (p.y + p.vy * dt * (calm ? .25 : 1) + height) % height;
      const distance = Math.hypot(p.x - pointer.x, p.y - pointer.y);
      if (distance < 150 && !calm) {
        ctx.globalAlpha = (1 - distance / 150) * .35;
        ctx.strokeStyle = p.color; ctx.lineWidth = .7;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
      }
      ctx.globalAlpha = calm ? .15 : .5;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
    }
    sparks = sparks.filter(p => p.life > 0);
    for (const p of sparks) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.exp(-1.6 * dt); p.vy *= Math.exp(-1.6 * dt);
      fx.globalAlpha = Math.max(0, p.life / p.duration);
      fx.fillStyle = p.color;
      fx.beginPath(); fx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); fx.fill();
    }
    frame = requestAnimationFrame(draw);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    toggle.textContent = preference.matches ? '✦ 粒子已静止' : allowed() ? '✦ 粒子开' : '✦ 粒子关';
    toggle.setAttribute('aria-pressed', String(allowed()));
    toggle.disabled = preference.matches;
    toggle.title = preference.matches ? '已遵循系统减少动态效果设置' : '切换背景粒子与启动粒子效果';
    if (allowed() && !document.hidden) frame = requestAnimationFrame(draw);
    else {
      sparks = [];
      ctx.clearRect(0, 0, width, height); fx.clearRect(0, 0, width, height);
    }
  }
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem('piano_particles', enabled ? 'on' : 'off'); } catch {}
    sync();
  });
  document.getElementById('startBtn').addEventListener('click', () => {
    if (!allowed() || document.body.classList.contains('zen') || !document.getElementById('timeText').classList.contains('ticking')) return;
    const box = document.querySelector('.ring-wrap').getBoundingClientRect();
    const radius = box.width * .44;
    sparks = Array.from({ length: 64 }, (_, i) => {
      const angle = i / 64 * Math.PI * 2;
      const speed = 50 + Math.random() * 110;
      const duration = .7 + Math.random() * .7;
      return { x: box.x + box.width / 2 + Math.cos(angle) * radius,
        y: box.y + box.height / 2 + Math.sin(angle) * radius,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: duration, duration, radius: 1 + Math.random() * 2.5, color: colors[i % colors.length] };
    });
  });
  addEventListener('pointermove', e => { if (e.pointerType !== 'touch') { pointer.x = e.clientX; pointer.y = e.clientY; } }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.x = pointer.y = -1000; });
  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', sync);
  resize(); sync();
})();
