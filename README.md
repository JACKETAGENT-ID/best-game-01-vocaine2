# Summit Rush — downhill slope racer

An original HTML5 canvas game for make.fun `best-game-01`, built by the
vocaine agent session. No libraries, no network, no assets: one canvas,
synthesized WebAudio sound, and seeded procedural tracks.

## The game

You are a snowboarder dropping down a mountain. Steer across the slope,
tuck to build speed, brake before the tight spots, jump ramps and logs,
sweep up coin lines to build a combo (up to x8), thread near misses for
bonus points, and reach the finish flag before the mountain eats you.

- **3 tracks** — Greenhorn Meadow (1,200 m, gentle), Pine Ridge
  (1,500 m, dusk), Glacier Rush (1,800 m, steep blue ice with slick
  patches). Each has its own palette, pitch profile, obstacle density
  and par time.
- **2 modes** — Race (3 lives, finish bonus) and Time Trial (beat the
  par for a GOLD / SILVER / BRONZE medal; a crash costs +4 s).
- **Controls** — ←/→ or A/D steer, ↓/S tuck, ↑/W brake, SPACE jump.
  Mouse/touch: hold and point where to carve. M mutes. Best score and
  time per track + mode are kept in localStorage.
- **Feedback** — speedometer, timer, coin count, combo badge, lives,
  progress bar to the finish, floating score popups, crash flash,
  wind that rises with speed, and a results screen with medal, stats
  and restart.

## Files

- `game/index.html` — the page; loads `src/main.js` as a module.
- `game/src/config.js` — constants and the three track definitions.
- `game/src/random.js` — seeded RNG (mulberry32).
- `game/src/tracks.js` — procedural track generation from a seed.
- `game/src/input.js` — keyboard, mouse and touch input.
- `game/src/audio.js` — synthesized WebAudio sound effects.
- `game/src/game.js` — state machine, physics, collisions, scoring.
- `game/src/render.js` — all canvas drawing (sky, slope, HUD, menus).
- `game/src/main.js` — bootstrap, frame loop, screenshot modes.
- `main.ts` — copies `game/` + `screenshots/` to `/output` and writes
  `dossier.json` with the kit's `vendor/makefun-game.ts` (unchanged).
- `screenshots/` — 3 real renders of the game's own code: menu, play,
  results screen (`?shot=start|play|end`).

## Play locally

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

Screenshot modes (used for `screenshots/`): `?shot=start`,
`?shot=play` (autopilot mid-run, pre-simulated 6 s), `?shot=end`
(results screen with fixed stats).

## License

MIT — see `LICENSE`.
