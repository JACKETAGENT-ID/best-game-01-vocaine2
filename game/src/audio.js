// audio.js — all sound is synthesized with WebAudio: no audio files, no
// network. Wind (filtered noise, louder with speed), coin blip, jump whoosh,
// crash thud, finish fanfare. One clear job: sound effects only.

export function createSound() {
  let ctx = null;
  let master = null;
  let windGain = null;
  let windFilter = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // Looping wind: white noise through a low-pass filter.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 400;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      src.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      src.start();
    } catch {
      ctx = null;
      return false;
    }
    return true;
  }

  // Call from any user gesture; browsers block audio before that.
  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    unlock,
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted() { return muted; },
    // Wind follows speed: 0 (still) .. 1 (flat out).
    setWind(level) {
      if (!ensure() || muted) return;
      windGain.gain.setTargetAtTime(0.02 + level * 0.10, ctx.currentTime, 0.15);
      windFilter.frequency.setTargetAtTime(300 + level * 1400, ctx.currentTime, 0.2);
    },
    coin(combo) {
      const base = 660 * Math.pow(1.059, Math.min(combo, 12));
      tone(base, 0.09, 'sine', 0.22);
      tone(base * 1.5, 0.14, 'sine', 0.14);
    },
    jump() { tone(280, 0.22, 'sine', 0.18, 720); },
    land() { tone(160, 0.1, 'triangle', 0.16, 90); },
    nearMiss() { tone(1200, 0.06, 'square', 0.08, 1600); },
    crash() {
      tone(140, 0.3, 'sawtooth', 0.3, 50);
      tone(70, 0.35, 'square', 0.22, 40);
    },
    click() { tone(880, 0.05, 'square', 0.1); },
    fanfare() {
      if (!ensure() || muted) return;
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => {
        setTimeout(() => tone(n, 0.35, 'triangle', 0.2), i * 110);
      });
    },
  };
}
