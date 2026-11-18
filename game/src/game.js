// game.js — the Game: state machine, physics, collisions, scoring.
// States: 'menu' | 'playing' | 'finished' | 'gameover'.
// One clear job: rules and simulation. It draws nothing (see render.js).

import { PHYSICS, SLOPE_HALF_WIDTH, MEDALS } from './config.js';
import { buildTrack } from './tracks.js';

export function loadBests() {
  try {
    return JSON.parse(localStorage.getItem('summit-rush-bests') || '{}');
  } catch {
    return {};
  }
}

export function saveBests(bests) {
  try {
    localStorage.setItem('summit-rush-bests', JSON.stringify(bests));
  } catch {
    // Storage unavailable (private mode, file://): bests just don't persist.
  }
}

export class Game {
  constructor(trackDefs, sound) {
    this.trackDefs = trackDefs;
    this.sound = sound;
    this.state = 'menu';
    this.trackIndex = 1; // Pine Ridge is the default pick
    this.mode = 'race'; // 'race' (3 lives) or 'trial' (beat the par time)
    this.bests = loadBests();
    this.autopilot = false;
    this.resetRun();
    this.menuPulse = 0;
  }

  resetRun() {
    this.track = null;
    this.rider = { x: 0, vx: 0, speed: 6, air: 0, airV: 0, airTime: 0, dist: 0 };
    this.lives = 3;
    this.coins = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.score = 0;
    this.time = 0;
    this.timePenalty = 0;
    this.invuln = 0;
    this.crashFlash = 0;
    this.popups = [];
    this.snowSpray = [];
    this.medal = null;
    this.finishBonus = 0;
    this.runSeed = 0;
  }

  get trackDef() {
    return this.trackDefs[this.trackIndex];
  }

  get totalTime() {
    return this.time + this.timePenalty;
  }

  startRun(trackIndex, mode) {
    this.trackIndex = trackIndex;
    this.mode = mode;
    this.resetRun();
    this.track = buildTrack(this.trackDef);
    this.state = 'playing';
    this.sound.unlock();
    this.sound.click();
  }

  // For the end screenshot: render the real results screen with fixed stats.
  forceFinish() {
    this.startRun(this.trackIndex, this.mode);
    this.rider.dist = this.track.length;
    this.coins = 47;
    this.combo = 6;
    this.score = 12850;
    this.time = 83.4;
    this.medal = 'GOLD';
    this.finishBonus = 2400;
    this.state = 'finished';
  }

  popup(text, color) {
    this.popups.push({ text, color: color || '#ffffff', ttl: 1.1, y: 0 });
  }

  addScore(n, label) {
    this.score += n;
    if (label) this.popup(label, '#ffe27a');
  }

  crash() {
    if (this.invuln > 0 || this.state !== 'playing') return;
    this.sound.crash();
    this.crashFlash = 0.5;
    this.invuln = PHYSICS.invulnSeconds;
    this.combo = 0;
    this.comboTimer = 0;
    this.rider.speed *= PHYSICS.crashSpeedLoss;
    this.rider.vx *= 0.3;
    if (this.mode === 'trial') {
      this.timePenalty += 4;
      this.popup('+4s PENALTY', '#ff7a6b');
    } else {
      this.lives -= 1;
      this.popup('CRASH!', '#ff7a6b');
      if (this.lives <= 0) {
        this.state = 'gameover';
        this.sound.setWind(0);
        return;
      }
    }
  }

  finishRun() {
    this.state = 'finished';
    this.sound.setWind(0);
    this.sound.fanfare();
    const par = this.trackDef.par;
    if (this.mode === 'trial') {
      const ratio = this.totalTime / par;
      this.medal = '—';
      for (const m of MEDALS) {
        if (ratio <= m.max) { this.medal = m.name; break; }
      }
      this.finishBonus = this.medal === 'GOLD' ? 5000 : this.medal === 'SILVER' ? 3000 : this.medal === 'BRONZE' ? 1500 : 0;
    } else {
      this.finishBonus = Math.max(0, Math.round((par * 1.5 - this.time) * 20));
      this.medal = this.time <= par ? 'GOLD' : this.time <= par * 1.15 ? 'SILVER' : 'BRONZE';
    }
    this.score += this.finishBonus;
    const key = `${this.trackDef.id}:${this.mode}`;
    const prev = this.bests[key];
    const better = !prev || this.score > prev.score || this.totalTime < prev.time;
    if (better) {
      this.bests[key] = { score: this.score, time: Math.round(this.totalTime * 10) / 10, coins: this.coins };
      saveBests(this.bests);
    }
    this.newBest = better;
  }

  // Steering target for the autopilot (screenshot mode): chase the nearest
  // coin, otherwise thread the widest gap between the obstacles ahead.
  autopilotSteer() {
    const r = this.rider;
    const ahead = 55;
    let target = 0;
    let bestCoin = null;
    for (const c of this.track.coins) {
      if (!c.taken && c.d > r.dist + 2 && c.d < r.dist + ahead) {
        if (!bestCoin || c.d < bestCoin.d) bestCoin = c;
      }
    }
    if (bestCoin) target = bestCoin.x;
    else {
      // Pick the x with the most clearance from obstacles in the next 40 m.
      let bestX = 0;
      let bestClear = -1;
      for (let x = -SLOPE_HALF_WIDTH + 4; x <= SLOPE_HALF_WIDTH - 4; x += 4) {
        let clear = 99;
        for (const o of this.track.obstacles) {
          if (o.d > r.dist && o.d < r.dist + 40) {
            clear = Math.min(clear, Math.abs(o.x - x) - o.size);
          }
        }
        if (clear > bestClear) { bestClear = clear; bestX = x; }
      }
      target = bestX;
    }
    return Math.max(-1, Math.min(1, (target - r.x) / 8));
  }

  step(dt, input) {
    this.menuPulse += dt;
    if (this.state === 'menu') return;
    if (this.state === 'finished' || this.state === 'gameover') {
      for (const p of this.popups) p.ttl -= dt;
      this.popups = this.popups.filter((p) => p.ttl > 0);
      return;
    }

    const r = this.rider;
    const track = this.track;
    const P = PHYSICS;

    // --- input -------------------------------------------------------------
    let steer = input.steer;
    let tuck = input.tuck;
    let brake = input.brake;
    if (this.autopilot) {
      steer = this.autopilotSteer();
      tuck = true;
      brake = false;
      // Jump when an obstacle is dead ahead and lined up with us.
      for (const o of track.obstacles) {
        if (!o.passed && o.d > r.dist + 6 && o.d < r.dist + 16 && Math.abs(o.x - r.x) < o.size + 1.5) {
          if (r.air === 0) { r.airV = P.jumpVelocity; r.airTime = 0; }
          break;
        }
      }
    } else if (input.pointerActive && input.pointerX !== null) {
      // Mouse/touch: steer toward the pointer's slope position.
      const targetX = ((input.pointerX / 960) * 2 - 1) * SLOPE_HALF_WIDTH;
      steer = Math.max(-1, Math.min(1, (targetX - r.x) / 6));
    }
    if (input.consumeJump() && r.air === 0) {
      r.airV = P.jumpVelocity;
      r.airTime = 0;
      this.sound.jump();
    }

    // --- ice: are we on a slick patch right now? ---------------------------
    let onIce = false;
    for (const patch of track.ice) {
      if (r.dist >= patch.d0 && r.dist <= patch.d1 && r.x >= patch.x0 && r.x <= patch.x1) {
        onIce = true;
        break;
      }
    }

    // --- forward speed ------------------------------------------------------
    const steep = track.steepnessAt(r.dist);
    let accel = P.baseAccel * steep;
    if (tuck) accel += P.tuckAccel * steep;
    if (brake) accel -= P.brakeDecel;
    accel -= P.drag * r.speed * r.speed;
    r.speed = Math.max(P.minSpeed, Math.min(P.maxSpeed, r.speed + accel * dt));

    // --- lateral movement ---------------------------------------------------
    const grip = onIce ? P.steerGrip * 0.35 : P.steerGrip;
    const targetVx = steer * P.steerMax * (0.55 + 0.45 * (r.speed / P.maxSpeed));
    r.vx += (targetVx - r.vx) * Math.min(1, grip * dt);
    r.x += r.vx * dt;
    if (r.x < -SLOPE_HALF_WIDTH + 1.5) { r.x = -SLOPE_HALF_WIDTH + 1.5; r.vx = Math.abs(r.vx) * 0.3; r.speed *= 0.995; }
    if (r.x > SLOPE_HALF_WIDTH - 1.5) { r.x = SLOPE_HALF_WIDTH - 1.5; r.vx = -Math.abs(r.vx) * 0.3; r.speed *= 0.995; }

    // --- air ----------------------------------------------------------------
    if (r.air > 0 || r.airV > 0) {
      r.air += r.airV * dt;
      r.airV -= P.gravity * dt;
      r.airTime += dt;
      if (r.air <= 0) {
        r.air = 0;
        r.airV = 0;
        if (r.airTime > 0.35) {
          const bonus = Math.round(r.airTime * P.airBonusPerSecond);
          this.addScore(bonus, `AIR +${bonus}`);
        }
        this.sound.land();
        r.airTime = 0;
      }
    }

    // --- forward progress ----------------------------------------------------
    r.dist += r.speed * dt;
    this.time += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.crashFlash > 0) this.crashFlash -= dt;
    this.score += Math.round(r.speed * dt * 2); // distance points trickle in

    // --- ramps: launch off them ----------------------------------------------
    for (const ramp of track.ramps) {
      if (!ramp.used && r.d >= ramp.d - 1 && r.d <= ramp.d + 2 && Math.abs(r.x - ramp.x) < 3.5) {
        ramp.used = true;
        if (r.air === 0) {
          r.airV = P.jumpVelocity * 1.45;
          r.airTime = 0;
          this.sound.jump();
          this.popup('RAMP!', '#8fd8ef');
        }
      }
    }

    // --- coins ---------------------------------------------------------------
    for (const c of track.coins) {
      if (!c.taken && Math.abs(c.d - r.dist) < 2.2 && Math.abs(c.x - r.x) < 2.4 && r.air < 3.5) {
        c.taken = true;
        this.coins += 1;
        this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
        this.comboTimer = P.comboWindow;
        const mult = Math.min(this.combo, 8);
        const pts = P.coinScore * mult;
        this.score += pts;
        this.popup(`+${pts}`, '#ffe27a');
        this.sound.coin(this.combo);
      }
    }

    // --- obstacles: crash or near miss ---------------------------------------
    for (const o of track.obstacles) {
      if (o.d < r.dist - 4 && !o.passed) {
        o.passed = true;
        if (!o.nearMissed && Math.abs(o.x - r.x) < o.size + 3.2 && this.invuln <= 0) {
          o.nearMissed = true;
          this.addScore(P.nearMissBonus, `NEAR MISS +${P.nearMissBonus}`);
          this.sound.nearMiss();
        }
      }
      if (!o.passed && Math.abs(o.d - r.dist) < 2.0 && Math.abs(o.x - r.x) < o.size + 1.1) {
        if (r.air > 1.2) continue; // sailed clean over it
        o.passed = true;
        this.crash();
        if (this.state !== 'playing') return;
      }
    }

    // --- spray particles when carving hard ------------------------------------
    if (Math.abs(r.vx) > 9 && r.air === 0 && Math.random() < 0.5) {
      this.snowSpray.push({ x: r.x, d: r.dist - 1, life: 0.5, vx: -r.vx * 0.2 });
    }
    for (const s of this.snowSpray) s.life -= dt;
    this.snowSpray = this.snowSpray.filter((s) => s.life > 0);
    for (const p of this.popups) { p.ttl -= dt; p.y += dt * 12; }
    this.popups = this.popups.filter((p) => p.ttl > 0);

    // --- wind follows speed ----------------------------------------------------
    this.sound.setWind(r.speed / PHYSICS.maxSpeed);

    // --- finish ---------------------------------------------------------------
    if (r.dist >= track.length) this.finishRun();
  }
}
