// render.js — every pixel Summit Rush draws: sky, mountains, slope, rider,
// obstacles, HUD, menus and results screens. One clear job: drawing only.
// It never changes game state; it reads the Game and the track.

import { VIEW, PX_PER_M, RIDER_SCREEN_Y, SLOPE_HALF_WIDTH } from './config.js';
import { mulberry32 } from './random.js';

const SCALE_X = (VIEW.width / 2 - 60) / (SLOPE_HALF_WIDTH + 18);
const HORIZON = 108;

function screenX(x) {
  return VIEW.width / 2 + x * SCALE_X;
}

function screenY(d, riderDist) {
  return RIDER_SCREEN_Y + (d - riderDist) * PX_PER_M;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

// Seeded decoration: clouds and mountain peaks that never change.
const decoRng = mulberry32(99);
const CLOUDS = Array.from({ length: 7 }, () => ({
  x: decoRng() * VIEW.width, y: 18 + decoRng() * 70, s: 0.6 + decoRng() * 0.9, v: 4 + decoRng() * 8,
}));
const FAR_PEAKS = Array.from({ length: 9 }, (_, i) => ({ x: i * 130 - 60, h: 60 + decoRng() * 70, w: 150 + decoRng() * 90 }));
const NEAR_PEAKS = Array.from({ length: 7 }, (_, i) => ({ x: i * 170 - 80, h: 40 + decoRng() * 50, w: 190 + decoRng() * 80 }));
const FLAKES = Array.from({ length: 70 }, () => ({
  x: decoRng() * VIEW.width, y: decoRng() * VIEW.height, s: 1 + decoRng() * 2.2, v: 12 + decoRng() * 26,
}));

export function drawSky(ctx, pal, t) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 60);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(0.55, pal.skyMid);
  g.addColorStop(1, pal.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, HORIZON + 60);
  // Sun.
  ctx.fillStyle = 'rgba(255, 244, 200, 0.95)';
  ctx.beginPath();
  ctx.arc(830, 52, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 244, 200, 0.25)';
  ctx.beginPath();
  ctx.arc(830, 52, 40, 0, Math.PI * 2);
  ctx.fill();
  // Clouds drift slowly.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const c of CLOUDS) {
    const cx = ((c.x + t * c.v) % (VIEW.width + 120)) - 60;
    ctx.beginPath();
    ctx.ellipse(cx, c.y, 34 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 22 * c.s, c.y + 4, 24 * c.s, 9 * c.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Far mountains (slow parallax), near hills (faster).
  drawRidge(ctx, FAR_PEAKS, pal.far, HORIZON, -t * 2);
  drawRidge(ctx, NEAR_PEAKS, pal.near, HORIZON + 14, -t * 6);
}

function drawRidge(ctx, peaks, color, baseY, offset) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-20, baseY + 30);
  for (const p of peaks) {
    const x = ((p.x + offset) % (VIEW.width + 260)) - 130;
    ctx.lineTo(x, baseY - p.h);
    ctx.lineTo(x + p.w / 2, baseY + 30);
  }
  ctx.lineTo(VIEW.width + 20, baseY + 30);
  ctx.closePath();
  ctx.fill();
  // Snow caps on the far ridge.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const p of peaks) {
    const x = ((p.x + offset) % (VIEW.width + 260)) - 130;
    ctx.beginPath();
    ctx.moveTo(x - 16, baseY - p.h + 22);
    ctx.lineTo(x, baseY - p.h);
    ctx.lineTo(x + 16, baseY - p.h + 22);
    ctx.lineTo(x + 7, baseY - p.h + 16);
    ctx.lineTo(x, baseY - p.h + 22);
    ctx.lineTo(x - 7, baseY - p.h + 16);
    ctx.closePath();
    ctx.fill();
  }
}

function drawSlope(ctx, pal, game) {
  const g = ctx.createLinearGradient(0, HORIZON, 0, VIEW.height);
  g.addColorStop(0, pal.snow);
  g.addColorStop(1, pal.snowShade);
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON, VIEW.width, VIEW.height - HORIZON);
  // Carve lines: faint diagonal grooves that scroll with distance.
  ctx.strokeStyle = 'rgba(120, 150, 180, 0.10)';
  ctx.lineWidth = 2;
  const off = (game.rider.dist * PX_PER_M) % 64;
  for (let i = -2; i < 16; i++) {
    const y = HORIZON + i * 64 - off;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW.width, y + 70);
    ctx.stroke();
  }
  // Snow drifts: soft bumps that scroll past, seeded per 50 m band.
  const firstBand = Math.floor(game.rider.dist / 50) * 50;
  for (let d = firstBand; d < game.rider.dist + 45; d += 50) {
    const rr = mulberry32(d + 5);
    for (let k = 0; k < 3; k++) {
      const dx = (rr() * 2 - 1) * (SLOPE_HALF_WIDTH + 8);
      const dy = screenY(d + rr() * 40, game.rider.dist);
      if (dy < HORIZON + 8 || dy > VIEW.height) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(screenX(dx), dy, 26 + rr() * 30, 7 + rr() * 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Slope edges.
  ctx.strokeStyle = pal.edge;
  ctx.lineWidth = 5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(screenX(side * SLOPE_HALF_WIDTH), HORIZON);
    ctx.lineTo(screenX(side * (SLOPE_HALF_WIDTH + 2)), VIEW.height);
    ctx.stroke();
  }
  // Distance markers every 100 m.
  ctx.fillStyle = 'rgba(90, 110, 130, 0.7)';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const startMark = Math.ceil(game.rider.dist / 100) * 100;
  for (let d = startMark; d < game.rider.dist + 45; d += 100) {
    const y = screenY(d, game.rider.dist);
    if (y < HORIZON + 10 || y > VIEW.height - 6) continue;
    ctx.fillText(`${d}m`, screenX(-SLOPE_HALF_WIDTH - 4), y + 4);
    ctx.fillText(`${d}m`, screenX(SLOPE_HALF_WIDTH + 4), y + 4);
  }
}

function drawPine(ctx, x, y, s, pal) {
  ctx.fillStyle = pal.treeDark;
  ctx.fillRect(x - s * 0.09, y - s * 0.25, s * 0.18, s * 0.25);
  ctx.fillStyle = pal.tree;
  for (let i = 0; i < 3; i++) {
    const w = s * (0.9 - i * 0.24);
    const ty = y - s * 0.2 - i * s * 0.32;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, ty);
    ctx.lineTo(x, ty - s * 0.42);
    ctx.lineTo(x + w / 2, ty);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.18, y - s * 0.62);
  ctx.lineTo(x, y - s * 0.95);
  ctx.lineTo(x + s * 0.18, y - s * 0.62);
  ctx.closePath();
  ctx.fill();
}

function drawRock(ctx, x, y, s, pal) {
  ctx.fillStyle = pal.rockDark;
  ctx.beginPath();
  ctx.moveTo(x - s * 5, y);
  ctx.lineTo(x - s * 3, -s * 5);
  ctx.lineTo(x + s * 1, -s * 7);
  ctx.lineTo(x + s * 5, -s * 2);
  ctx.lineTo(x + s * 4, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pal.rock;
  ctx.beginPath();
  ctx.moveTo(x - s * 3, -s * 5);
  ctx.lineTo(x + s * 1, -s * 7);
  ctx.lineTo(x + s * 5, -s * 2);
  ctx.lineTo(x + s * 2, -s * 1);
  ctx.lineTo(x - s * 2, -s * 2);
  ctx.closePath();
  ctx.fill();
}

function drawEntities(ctx, game) {
  const pal = game.trackDef.palette;
  const r = game.rider;
  const visible = (d) => {
    const y = screenY(d, r.dist);
    return y > HORIZON - 40 && y < VIEW.height + 40 ? y : null;
  };

  // Ice patches first (under everything).
  ctx.fillStyle = 'rgba(160, 220, 245, 0.55)';
  for (const p of game.track.ice) {
    const y0 = visible(p.d0);
    const y1 = visible(p.d1);
    if (y0 === null && y1 === null) continue;
    const top = Math.max(HORIZON, y0 ?? HORIZON);
    const bot = Math.min(VIEW.height, y1 ?? VIEW.height);
    if (bot <= top) continue;
    ctx.fillRect(screenX(p.x0), top, screenX(p.x1) - screenX(p.x0), bot - top);
  }

  // Side pines lining the slope.
  for (const t of game.track.sideTrees) {
    const y = visible(t.d);
    if (y === null) continue;
    drawPine(ctx, screenX(t.x), y, t.s * 4, pal);
  }

  // Ramps.
  for (const ramp of game.track.ramps) {
    const y = visible(ramp.d);
    if (y === null) continue;
    const x = screenX(ramp.x);
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x + 16, y);
    ctx.lineTo(x + 16, y - 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(x - 16, y - 2);
    ctx.lineTo(x + 16, y - 2);
    ctx.lineTo(x + 16, y - 14);
    ctx.lineTo(x - 10, y - 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RAMP', x, y - 20);
  }

  // Obstacles.
  for (const o of game.track.obstacles) {
    if (o.passed && o.d < r.dist - 6) continue;
    const y = visible(o.d);
    if (y === null) continue;
    const x = screenX(o.x);
    if (o.kind === 'rock') drawRock(ctx, x, y, o.size, pal);
    else if (o.kind === 'pine') drawPine(ctx, x, y, o.size * 5, pal);
    else {
      ctx.fillStyle = pal.log;
      roundRect(ctx, x - o.size * 5, y - o.size * 1.6, o.size * 10, o.size * 3.2, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x - o.size * 5, y - o.size * 1.6, o.size * 10, 2);
    }
  }

  // Coins: spinning gold discs.
  for (const c of game.track.coins) {
    if (c.taken) continue;
    const y = visible(c.d);
    if (y === null) continue;
    const x = screenX(c.x);
    const spin = Math.abs(Math.cos((c.d * 0.4 + r.dist * 0.15)));
    const w = 4 + spin * 8;
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.ellipse(x, y - 8, w, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.beginPath();
    ctx.ellipse(x, y - 8, w * 0.55, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', x, y - 5);
  }

  // Finish gate.
  const fy = visible(game.track.length);
  if (fy !== null) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX(-SLOPE_HALF_WIDTH), fy);
    ctx.lineTo(screenX(SLOPE_HALF_WIDTH), fy);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 12; i++) {
      if (i % 2 === 0) ctx.fillRect(screenX(-SLOPE_HALF_WIDTH) + i * ((screenX(SLOPE_HALF_WIDTH) - screenX(-SLOPE_HALF_WIDTH)) / 12), fy - 16, (screenX(SLOPE_HALF_WIDTH) - screenX(-SLOPE_HALF_WIDTH)) / 12, 8);
      else ctx.fillRect(screenX(-SLOPE_HALF_WIDTH) + i * ((screenX(SLOPE_HALF_WIDTH) - screenX(-SLOPE_HALF_WIDTH)) / 12), fy - 8, (screenX(SLOPE_HALF_WIDTH) - screenX(-SLOPE_HALF_WIDTH)) / 12, 8);
    }
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(screenX(-SLOPE_HALF_WIDTH), fy - 34);
    ctx.lineTo(screenX(-SLOPE_HALF_WIDTH), fy);
    ctx.moveTo(screenX(SLOPE_HALF_WIDTH), fy - 34);
    ctx.lineTo(screenX(SLOPE_HALF_WIDTH), fy);
    ctx.stroke();
    ctx.fillStyle = '#e33';
    ctx.beginPath();
    ctx.moveTo(screenX(-SLOPE_HALF_WIDTH), fy - 34);
    ctx.lineTo(screenX(-SLOPE_HALF_WIDTH) + 26, fy - 28);
    ctx.lineTo(screenX(-SLOPE_HALF_WIDTH), fy - 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e33';
    ctx.beginPath();
    ctx.moveTo(screenX(SLOPE_HALF_WIDTH), fy - 34);
    ctx.lineTo(screenX(SLOPE_HALF_WIDTH) - 26, fy - 28);
    ctx.lineTo(screenX(SLOPE_HALF_WIDTH), fy - 22);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRider(ctx, game, t) {
  const r = game.rider;
  const x = screenX(r.x);
  const airLift = r.air * 16;
  const y = RIDER_SCREEN_Y - airLift;
  const lean = Math.max(-0.5, Math.min(0.5, r.vx * 0.02));
  const invulnBlink = game.invuln > 0 && Math.floor(t * 12) % 2 === 0;

  // Shadow on the snow.
  ctx.fillStyle = 'rgba(20, 40, 60, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, RIDER_SCREEN_Y + 12, 26 - airLift * 0.3, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Snow spray when carving.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (const s of game.snowSpray) {
    const sy = screenY(s.d, r.dist);
    ctx.beginPath();
    ctx.arc(screenX(s.x) + s.vx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (invulnBlink) return; // blink while invulnerable after a crash
  ctx.save();
  ctx.translate(x, y);
  if (game.crashFlash > 0) ctx.rotate(Math.sin(t * 40) * 0.35);
  else ctx.rotate(lean);
  const tuck = game._tuckVisual;
  // Board.
  ctx.fillStyle = '#e63946';
  roundRect(ctx, -26, 6, 52, 7, 3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(-18, 8, 36, 2);
  // Legs.
  ctx.strokeStyle = '#22384f';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.lineTo(-14, -12 - (tuck ? 6 : 0));
  ctx.moveTo(10, 4);
  ctx.lineTo(12, -12 - (tuck ? 6 : 0));
  ctx.stroke();
  // Body: jacket + helmet, crouched when tucking.
  const crouch = tuck ? 8 : 0;
  ctx.fillStyle = '#2a9d8f';
  roundRect(ctx, -13, -30 + crouch, 26, 22, 8);
  ctx.fill();
  // Arms out for balance.
  ctx.strokeStyle = '#2a9d8f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-10, -24 + crouch);
  ctx.lineTo(-26, -14 + crouch);
  ctx.moveTo(10, -24 + crouch);
  ctx.lineTo(26, -14 + crouch);
  ctx.stroke();
  // Helmet + goggles.
  ctx.fillStyle = '#f4a261';
  ctx.beginPath();
  ctx.arc(0, -36 + crouch, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#264653';
  ctx.fillRect(-2, -39 + crouch, 12, 5);
  // Scarf flapping behind.
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-4, -30 + crouch);
  ctx.quadraticCurveTo(-18 - Math.sin(t * 9) * 5, -26 + crouch, -28, -20 + Math.sin(t * 9) * 4);
  ctx.stroke();
  ctx.restore();
}

function drawHud(ctx, game) {
  const r = game.rider;
  const track = game.track;
  ctx.fillStyle = 'rgba(10, 30, 48, 0.72)';
  roundRect(ctx, 12, 10, VIEW.width - 24, 52, 10);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText(`${Math.round(r.speed * 3.6)}`, 28, 40);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#bcd8ea';
  ctx.fillText('km/h', 78, 40);

  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`⏱ ${fmtTime(game.totalTime)}`, 150, 39);
  ctx.fillStyle = '#ffe27a';
  ctx.fillText(`◉ ${game.coins}`, 290, 39);
  if (game.combo >= 2) {
    ctx.fillStyle = '#ff9f43';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`COMBO x${Math.min(game.combo, 8)}`, 380, 39);
  }

  // Lives (race) or par target (trial).
  ctx.textAlign = 'right';
  ctx.font = 'bold 17px system-ui, sans-serif';
  if (game.mode === 'race') {
    ctx.fillStyle = '#ff6b81';
    ctx.fillText('♥'.repeat(Math.max(0, game.lives)) + '♡'.repeat(Math.max(0, 3 - game.lives)), VIEW.width - 28, 39);
  } else {
    ctx.fillStyle = '#bcd8ea';
    ctx.fillText(`PAR ${fmtTime(game.trackDef.par)}`, VIEW.width - 28, 39);
  }

  // Progress bar to the finish.
  const bx = 12, by = 68, bw = VIEW.width - 24, bh = 8;
  ctx.fillStyle = 'rgba(10, 30, 48, 0.55)';
  roundRect(ctx, bx, by, bw, bh, 4);
  ctx.fill();
  const prog = Math.max(0, Math.min(1, r.dist / track.length));
  ctx.fillStyle = '#2a9d8f';
  roundRect(ctx, bx, by, bw * prog, bh, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.floor(r.dist)}m / ${track.length}m`, bx + 2, by + 20);
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${game.score.toLocaleString('en-US')}`, VIEW.width - 14, by + 20);

  // Floating score popups.
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px system-ui, sans-serif';
  for (const p of game.popups) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.ttl));
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, screenX(r.x), RIDER_SCREEN_Y - 70 - p.y);
  }
  ctx.globalAlpha = 1;

  // Crash flash.
  if (game.crashFlash > 0) {
    ctx.fillStyle = `rgba(230, 57, 70, ${game.crashFlash * 0.5})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}

function drawSnowfall(ctx, t) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const f of FLAKES) {
    const y = (f.y + t * f.v) % (VIEW.height + 10);
    const x = (f.x + Math.sin(t * 0.8 + f.y) * 12 + VIEW.width) % VIEW.width;
    ctx.beginPath();
    ctx.arc(x, y, f.s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 26, 42, 0.88)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawMenu(ctx, game, t) {
  const pal = game.trackDef.palette;
  drawSky(ctx, pal, t);
  drawSlope(ctx, pal, game);
  // A rider idling at the start line for the cover shot.
  ctx.fillStyle = 'rgba(20, 40, 60, 0.25)';
  ctx.beginPath();
  ctx.ellipse(VIEW.width / 2, RIDER_SCREEN_Y + 12, 26, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  panel(ctx, 130, 26, 700, 548);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText('SUMMIT RUSH', VIEW.width / 2, 92);
  ctx.fillStyle = '#8fd8ef';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('Downhill slope racer — tuck, carve, jump, don\'t eat a pine.', VIEW.width / 2, 120);

  // Track cards.
  game.trackDefs.forEach((def, i) => {
    const x = 160 + i * 226;
    const y = 148;
    const sel = i === game.trackIndex;
    ctx.fillStyle = sel ? 'rgba(42, 157, 143, 0.9)' : 'rgba(255,255,255,0.12)';
    roundRect(ctx, x, y, 206, 128, 10);
    ctx.fill();
    if (sel) {
      ctx.strokeStyle = '#ffe27a';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(def.name, x + 103, y + 28);
    ctx.fillStyle = '#d7e9f5';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`${def.length}m  •  par ${fmtTime(def.par)}`, x + 103, y + 52);
    ctx.fillText(def.tagline, x + 103, y + 74, 190);
    const best = game.bests[`${def.id}:${game.mode}`];
    ctx.fillStyle = '#ffe27a';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(best ? `BEST ${best.score.toLocaleString('en-US')} pts • ${fmtTime(best.time)}` : 'No run yet — be the first.', x + 103, y + 102);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(`[${i + 1}]`, x + 103, y + 120);
  });

  // Mode toggle.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  const modeLabel = game.mode === 'race' ? 'RACE — 3 lives, finish for a big bonus' : 'TIME TRIAL — beat the par, earn a medal';
  ctx.fillText(`MODE: ${modeLabel}   [T]`, VIEW.width / 2, 312);
  ctx.fillStyle = '#bcd8ea';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('← → / A D steer    ↓ / S tuck for speed    ↑ / W brake    SPACE jump', VIEW.width / 2, 344);
  ctx.fillText('Mouse or touch: hold and point where to carve.  M mute.', VIEW.width / 2, 368);
  ctx.fillText('Coins build a combo (up to x8). Near misses pay +50. Ramps launch you — air time pays.', VIEW.width / 2, 392);
  ctx.fillText('Rocks, pines and logs end runs. 3 crashes ends a Race; a crash in Time Trial costs +4s.', VIEW.width / 2, 414);

  const pulse = 0.65 + Math.sin(t * 4) * 0.35;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('ENTER or CLICK to ride!', VIEW.width / 2, 470);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#8fa8bb';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Summit Rush — an original game. No network, no assets, just snow.', VIEW.width / 2, 540);
}

export function drawResults(ctx, game, won) {
  const pal = game.trackDef.palette;
  drawSky(ctx, pal, 0);
  drawSlope(ctx, pal, game);
  panel(ctx, 230, 110, 500, 380);
  ctx.textAlign = 'center';
  if (won) {
    const medalColor = game.medal === 'GOLD' ? '#f5c542' : game.medal === 'SILVER' ? '#cfd6dd' : game.medal === 'BRONZE' ? '#d08a4b' : '#bcd8ea';
    ctx.fillStyle = medalColor;
    ctx.font = 'bold 46px system-ui, sans-serif';
    ctx.fillText(game.medal === '—' ? 'FINISHED!' : `${game.medal} MEDAL!`, VIEW.width / 2, 178);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`${game.trackDef.name} — ${game.mode === 'trial' ? 'Time Trial' : 'Race'} complete`, VIEW.width / 2, 214);
  } else {
    ctx.fillStyle = '#ff7a6b';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('WIPEOUT!', VIEW.width / 2, 178);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(`Three crashes on ${game.trackDef.name}. The mountain wins this one.`, VIEW.width / 2, 212);
  }
  ctx.fillStyle = '#d7e9f5';
  ctx.font = '19px system-ui, sans-serif';
  const rows = won
    ? [
        [`Time`, `${fmtTime(game.totalTime)}  (par ${fmtTime(game.trackDef.par)})`],
        [`Coins`, `${game.coins}`],
        [`Distance`, `${Math.floor(game.rider.dist)}m`],
        [`Finish bonus`, `+${game.finishBonus.toLocaleString('en-US')}`],
      ]
    : [
        [`Distance`, `${Math.floor(game.rider.dist)}m of ${game.track.length}m`],
        [`Coins`, `${game.coins}`],
        [`Time`, fmtTime(game.totalTime)],
      ];
  let y = 252;
  for (const [k, v] of rows) {
    ctx.textAlign = 'left';
    ctx.fillText(k, 300, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.fillText(v, 660, y);
    ctx.fillStyle = '#d7e9f5';
    y += 30;
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`SCORE  ${game.score.toLocaleString('en-US')}`, VIEW.width / 2, y + 18);
  if (game.newBest) {
    ctx.fillStyle = '#7dff9b';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('★ NEW BEST on this track ★', VIEW.width / 2, y + 46);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('R — ride again      ESC — menu', VIEW.width / 2, 452);
}

export function drawGame(ctx, game, t) {
  game._tuckVisual = game._tuckVisual || false;
  const pal = game.trackDef.palette;
  if (game.state === 'menu') {
    drawMenu(ctx, game, t);
    drawSnowfall(ctx, t);
    return;
  }
  drawSky(ctx, pal, t);
  drawSlope(ctx, pal, game);
  drawEntities(ctx, game);
  drawRider(ctx, game, t);
  drawSnowfall(ctx, t);
  drawHud(ctx, game);
  if (game.state === 'finished') drawResults(ctx, game, true);
  else if (game.state === 'gameover') drawResults(ctx, game, false);
}
