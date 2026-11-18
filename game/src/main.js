// main.js — bootstrap and frame loop for Summit Rush.
// One clear job: wire input, sound, game and rendering together, own the
// animation loop, and provide the ?shot= modes the screenshots are taken in.

import { VIEW, TRACKS } from './config.js';
import { createInput } from './input.js';
import { createSound } from './audio.js';
import { Game } from './game.js';
import { drawGame } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

// Keep the 16:10 playfield undistorted at any window size: letterbox it.
function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  const w = Math.floor(VIEW.width * scale);
  const h = Math.floor(VIEW.height * scale);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.style.left = `${Math.floor((window.innerWidth - w) / 2)}px`;
  canvas.style.top = `${Math.floor((window.innerHeight - h) / 2)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();
const statusEl = document.getElementById('status');

const input = createInput(canvas);
const sound = createSound();
const game = new Game(TRACKS, sound);

// Debug/testing hook: lets a headless run read the live state.
window.__summit = { game };

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '0');

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function describeState() {
  if (game.state === 'menu') {
    setStatus(`Summit Rush menu. Track: ${game.trackDef.name}, mode: ${game.mode}. Press Enter to ride.`);
  } else if (game.state === 'playing') {
    setStatus(`Riding ${game.trackDef.name}: ${Math.round(game.rider.speed * 3.6)} km/h, ${game.coins} coins, score ${game.score}.`);
  } else if (game.state === 'finished') {
    setStatus(`Finished ${game.trackDef.name} in ${game.totalTime.toFixed(1)} seconds. Score ${game.score}. Press R to ride again.`);
  } else if (game.state === 'gameover') {
    setStatus(`Wipeout after ${Math.floor(game.rider.dist)} metres. Score ${game.score}. Press R to retry.`);
  }
}

function startSelected() {
  game.startRun(game.trackIndex, game.mode);
  describeState();
}

function backToMenu() {
  game.state = 'menu';
  game.resetRun();
  input.clearPressed();
  describeState();
}

// --- menu / results keys ----------------------------------------------------
function handleMenuKeys() {
  if (input.consumePressed('Digit1')) { game.trackIndex = 0; sound.click(); }
  if (input.consumePressed('Digit2')) { game.trackIndex = 1; sound.click(); }
  if (input.consumePressed('Digit3')) { game.trackIndex = 2; sound.click(); }
  if (input.consumePressed('KeyT')) {
    game.mode = game.mode === 'race' ? 'trial' : 'race';
    sound.click();
  }
  if (input.consumePressed('Enter') || input.consumePressed('Space')) startSelected();
}

function handleResultsKeys() {
  if (input.consumePressed('KeyR') || input.consumePressed('Enter')) {
    game.startRun(game.trackIndex, game.mode);
    describeState();
  } else if (input.consumePressed('Escape')) backToMenu();
}

// --- screenshot modes ---------------------------------------------------------
// ?shot=start  -> the title menu (default)
// ?shot=play   -> mid-run on Pine Ridge, autopilot riding, pre-simulated 6 s
// ?shot=end    -> the results screen with fixed stats
// These render the game's own code paths; they exist so the screenshots the
// dossier carries are real renders of the game.
if (shot === 'play') {
  game.autopilot = true;
  game.startRun(1, 'race');
  const fake = {
    steer: 0, tuck: false, brake: false,
    pointerActive: false, pointerX: null,
    consumeJump() { return false; },
  };
  for (let i = 0; i < 360; i++) game.step(1 / 60, fake);
  game.autopilot = true;
  describeState();
} else if (shot === 'end') {
  game.trackIndex = 1;
  game.mode = 'trial';
  game.forceFinish();
  describeState();
} else {
  describeState();
}

// --- pointer: click starts from menu, restarts from results -------------------
canvas.addEventListener('pointerdown', () => {
  sound.unlock();
  if (game.state === 'menu') startSelected();
  else if (game.state === 'finished' || game.state === 'gameover') {
    game.startRun(game.trackIndex, game.mode);
    describeState();
  }
});
window.addEventListener('keydown', () => sound.unlock());

// --- frame loop ----------------------------------------------------------------
let last = performance.now();
let lastStatusState = game.state;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;

  if (input.consumePressed('KeyM')) {
    sound.setMuted(!sound.isMuted());
  }

  if (game.state === 'menu') handleMenuKeys();
  else if (game.state === 'finished' || game.state === 'gameover') handleResultsKeys();

  game._tuckVisual = input.tuck || game.autopilot;
  game.step(dt, input);
  drawGame(ctx, game, now / 1000);

  if (game.state !== lastStatusState) {
    lastStatusState = game.state;
    describeState();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
