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
  const pointer = { x: -1000, y: -1000, active: false };
  let trail = [];
  let webPulse = 0;
  const colors = ['#579c80', '#c568a0', '#dfa94b', '#709bd3'];
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
    points = Array.from({ length: Math.min(96, Math.max(42, Math.round(width * height / 17000))) }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      vx: (Math.random() - .5) * 13, vy: -5 - Math.random() * 12,
      kind: Math.floor(Math.random() * 4), radius: 2 + Math.random() * 2.5, color: colors[Math.floor(Math.random() * colors.length)]
    }));
  }
  // Tiny toy-like stars, pearly bubbles, and notes fit the garden desktop.
  function drawMotif(surface, p, radius) {
    surface.save();
    surface.translate(p.x, p.y);
    surface.fillStyle = p.color;
    surface.strokeStyle = p.color;
    surface.lineWidth = .8;
    if (p.kind === 1) {
      surface.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = i * Math.PI / 5 - Math.PI / 2;
        const r = i % 2 ? radius * .45 : radius * 1.6;
        if (i === 0) surface.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else surface.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      surface.closePath(); surface.fill();
      surface.fillStyle = '#fff9ed';
      surface.beginPath(); surface.arc(-radius * .25, -radius * .4, radius * .3, 0, Math.PI * 2); surface.fill();
    } else if (p.kind === 2) {
      surface.font = Math.round(radius * 4.3) + 'px Georgia, serif';
      surface.fillText('♪', -radius, radius);
    } else {
      surface.beginPath(); surface.arc(0, 0, radius * 1.3, 0, Math.PI * 2); surface.stroke();
      surface.strokeStyle = '#fffdf4';
      surface.beginPath(); surface.arc(-radius * .2, -radius * .2, radius * .75, Math.PI, Math.PI * 1.5); surface.stroke();
    }
    surface.restore();
  }
  function draw(now) {
    frame = 0;
    if (!allowed() || document.hidden) return;
    const dt = previous ? Math.min((now - previous) / 1000, .05) : 0;
    previous = now;
    const calm = document.body.classList.contains('zen');
    ctx.clearRect(0, 0, width, height);
    fx.clearRect(0, 0, width, height);
    const speed = calm ? .28 : 1;
    for (const p of points) {
      p.x = (p.x + p.vx * dt * speed + width) % width;
      p.y = (p.y + p.vy * dt * speed + height) % height;
    }
    // A permanent, faint triangular mesh gives the screen-print dots structure.
    const reach = width < 600 ? 86 : 118;
    ctx.lineWidth = .65;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      let links = 0;
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const distance2 = dx * dx + dy * dy;
        if (distance2 >= reach * reach || links >= 2) continue;
        links++;
        const distance = Math.sqrt(distance2);
        const nearPointer = pointer.active &&
          (Math.hypot(a.x - pointer.x, a.y - pointer.y) < 190 ||
           Math.hypot(b.x - pointer.x, b.y - pointer.y) < 190);
        ctx.globalAlpha = (1 - distance / reach) * (calm ? .035 : nearPointer ? .2 : .075);
        ctx.strokeStyle = nearPointer && (i + j) % 5 === 0 ? '#c568a0' : '#579c80';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    // Multiple nearby nodes follow the pointer to form a bright spiderweb.
    if (pointer.active && !calm) {
      const neighbors = points.map(p => ({ p, d: Math.hypot(p.x - pointer.x, p.y - pointer.y) }))
        .filter(item => item.d < 175).sort((a, b) => a.d - b.d).slice(0, 7);
      ctx.lineWidth = .8;
      ctx.shadowBlur = 3; ctx.shadowColor = '#579c80';
      for (const { p, d } of neighbors) {
        ctx.globalAlpha = (1 - d / 175) * .4;
        ctx.strokeStyle = '#579c80';
        ctx.beginPath(); ctx.moveTo(pointer.x, pointer.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      webPulse = Math.max(0, webPulse - dt * 2.8);
      const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 90 + webPulse * 45);
      glow.addColorStop(0, `rgba(108,170,207,${.055 + webPulse * .08})`);
      glow.addColorStop(1, 'rgba(108,170,207,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 90 + webPulse * 45, 0, Math.PI * 2); ctx.fill();
      trail = trail.filter(item => now - item.time < 260);
      if (trail.length > 1) {
        ctx.lineWidth = .8; ctx.strokeStyle = '#c568a0';
        for (let i = 1; i < trail.length; i++) {
          ctx.globalAlpha = (1 - (now - trail[i].time) / 260) * .25;
          ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
        }
      }
    } else trail = [];
    ctx.shadowBlur = 3;
    for (const p of points) {
      const close = !calm && pointer.active && Math.hypot(p.x - pointer.x, p.y - pointer.y) < 175;
      ctx.globalAlpha = calm ? .25 : close ? .75 : .52;
      ctx.fillStyle = p.color; ctx.shadowColor = p.color;
      drawMotif(ctx, p, close ? p.radius * 1.25 : p.radius);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    sparks = sparks.filter(p => p.life > 0);
    for (const p of sparks) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.exp(-1.6 * dt); p.vy *= Math.exp(-1.6 * dt);
      fx.globalAlpha = Math.max(0, p.life / p.duration);
      fx.fillStyle = p.color;
      drawMotif(fx, p, p.radius);
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
      sparks = []; trail = []; webPulse = 0;
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
        life: duration, duration, kind: i % 3, radius: 2 + Math.random() * 2.5, color: colors[i % colors.length] };
    });
  });
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    if (allowed() && !document.body.classList.contains('zen')) {
      trail.push({ x: e.clientX, y: e.clientY, time: performance.now() });
      if (trail.length > 12) trail.shift();
    }
  }, { passive: true });
  addEventListener('pointerdown', e => {
    if (!allowed() || e.pointerType === 'touch') return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; webPulse = 1;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; trail = []; });
  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', sync);
  resize(); sync();
})();
