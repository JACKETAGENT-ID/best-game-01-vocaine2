// input.js — keyboard, mouse and touch input in one place.
// Exposes a plain state object the game reads each frame: steer (-1..1),
// tuck, brake, jumpPressed (edge-triggered), plus menu actions.
// One clear job: raw input only; the game decides what it means.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    steer: 0, // -1 left, +1 right (smoothed by the game, raw here)
    tuck: false,
    brake: false,
    jumpQueued: false,
    anyKey: false,
    pointerX: null, // pointer steer target in screen px, or null
    pointerActive: false,
  };

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowDown: 'tuck', KeyS: 'tuck',
    ArrowUp: 'brake', KeyW: 'brake',
    Space: 'jump',
  };

  function recompute() {
    const left = keys.has('left') ? 1 : 0;
    const right = keys.has('right') ? 1 : 0;
    state.steer = right - left;
    state.tuck = keys.has('tuck');
    state.brake = keys.has('brake');
  }

  function onKeyDown(e) {
    const action = KEYMAP[e.code];
    if (action) {
      e.preventDefault();
      if (action === 'jump' && !e.repeat) state.jumpQueued = true;
      keys.add(action);
      state.anyKey = true;
      recompute();
    } else if (e.code === 'KeyM' || e.code === 'KeyR' || e.code === 'Enter' || e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
      state.anyKey = true;
    }
  }

  function onKeyUp(e) {
    const action = KEYMAP[e.code];
    if (action) {
      keys.delete(action);
      recompute();
    }
  }

  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return (e.clientX - rect.left) * (canvas.width / rect.width);
  }

  function onPointerDown(e) {
    state.pointerActive = true;
    state.pointerX = pointerPos(e);
  }

  function onPointerMove(e) {
    if (state.pointerActive) state.pointerX = pointerPos(e);
  }

  function onPointerUp() {
    state.pointerActive = false;
    state.pointerX = null;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { keys.clear(); recompute(); state.pointerActive = false; state.pointerX = null; });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  // The game calls this once per frame to consume the edge-triggered jump.
  state.consumeJump = function consumeJump() {
    const j = state.jumpQueued;
    state.jumpQueued = false;
    return j;
  };

  // Menu helper: was one of these keys pressed since the last check?
  // Implemented with a tiny pressed-set the game polls via callbacks below.
  state._pressed = new Set();
  const pressListener = (e) => {
    if (!e.repeat) state._pressed.add(e.code);
  };
  window.addEventListener('keydown', pressListener);
  state.consumePressed = function consumePressed(code) {
    const hit = state._pressed.has(code);
    if (hit) state._pressed.delete(code);
    return hit;
  };
  state.clearPressed = function clearPressed() {
    state._pressed.clear();
  };

  return state;
}
