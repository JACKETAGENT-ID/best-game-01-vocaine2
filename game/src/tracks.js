// tracks.js — builds one track from its definition: the pitch profile, the
// obstacles, coin lines, ramps and ice patches, all from a seeded RNG so the
// same track is the same every run. One clear job: track generation only.

import { mulberry32, range, pick } from './random.js';
import { SLOPE_HALF_WIDTH } from './config.js';

const KINDS = ['rock', 'pine', 'log'];

// Pitch profile: a few smooth steep sections per track. steepnessAt(d) returns
// a multiplier around 1 (gentle) to ~1.6 (plunging).
function makePitch(rng, steep) {
  const sections = [];
  let d = 0;
  while (d < 2200) {
    const len = range(rng, 120, 260);
    sections.push({ from: d, to: d + len, value: range(rng, 0.65, 1.55) });
    d += len;
  }
  return function steepnessAt(dist) {
    for (const s of sections) {
      if (dist >= s.from && dist < s.to) return s.value * steep;
    }
    return steep;
  };
}

export function buildTrack(def) {
  const rng = mulberry32(def.seed * 1000 + 7);
  const steepnessAt = makePitch(rng, def.steep);
  const obstacles = [];
  const coins = [];
  const ramps = [];
  const ice = [];
  const sideTrees = [];

  const half = SLOPE_HALF_WIDTH;
  let d = 60; // first 60 m are clean so the player gets up to speed
  let lastRamp = -999;

  while (d < def.length - 40) {
    const step = range(rng, 13, 24) / Math.max(0.6, def.density);
    d += step;
    const roll = rng();

    if (roll < 0.42 * def.density) {
      // Obstacle cluster: 1-3 hazards with a gap left open on purpose.
      const gapX = range(rng, -half + 8, half - 8);
      const count = rng() < 0.45 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        let x = range(rng, -half + 4, half - 4);
        if (Math.abs(x - gapX) < 7) x = gapX + (x < gapX ? -9 : 9);
        x = Math.max(-half + 3, Math.min(half - 3, x));
        obstacles.push({
          d: d + i * range(rng, 4, 9),
          x,
          kind: pick(rng, KINDS),
          size: range(rng, 1.6, 3.0),
          passed: false,
          nearMissed: false,
        });
      }
    } else if (roll < 0.68) {
      // Coin line: 4-7 coins the rider can sweep through.
      const cx = range(rng, -half + 6, half - 6);
      const n = 4 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        coins.push({ d: d + i * 5, x: cx + Math.sin(i * 0.7) * 2.5, taken: false });
      }
    } else if (roll < 0.76 && d - lastRamp > 220) {
      // A ramp with a coin arc over it: jump and get paid for the air.
      const rx = range(rng, -half + 8, half - 8);
      ramps.push({ d, x: rx, used: false });
      for (let i = -2; i <= 2; i++) {
        coins.push({ d: d + 6 + Math.abs(i) * 3.2, x: rx + i * 1.6, taken: false });
      }
      lastRamp = d;
    } else if (roll < 0.83 && def.id === 'glacier') {
      // Ice patch: slick steering for a stretch.
      const ix = range(rng, -half + 10, half - 10);
      ice.push({ d0: d, d1: d + range(rng, 30, 55), x0: ix - 9, x1: ix + 9 });
    }
    // else: open snow, a breather.
  }

  // Finish gate: two flags and a final coin shower.
  for (let i = 0; i < 5; i++) {
    coins.push({ d: def.length - 30 + i * 5, x: Math.sin(i * 1.1) * 6, taken: false });
  }

  // Decorative pines lining both edges of the slope, denser on Pine Ridge.
  const treeEvery = def.id === 'pine' ? 9 : 14;
  for (let td = 20; td < def.length; td += treeEvery + rng() * 10) {
    sideTrees.push({ d: td, x: -half - range(rng, 3, 16), s: range(rng, 2.5, 5) });
    sideTrees.push({ d: td + range(rng, 2, 8), x: half + range(rng, 3, 16), s: range(rng, 2.5, 5) });
  }

  return {
    def,
    length: def.length,
    steepnessAt,
    obstacles,
    coins,
    ramps,
    ice,
    sideTrees,
  };
}
