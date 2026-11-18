// config.js — every tunable number and the three tracks of Summit Rush.
// One clear job: constants and track definitions. No logic lives here.

export const VIEW = { width: 960, height: 600 };

// World: the slope is WIDTH metres across; the rider descends DISTANCE metres.
// 1 metre = PX_PER_M on screen. The rider sits at a fixed screen spot and the
// mountain scrolls past, so speed feels like speed.
export const SLOPE_HALF_WIDTH = 34; // metres, half the rideable width
export const PX_PER_M = 5;
export const RIDER_SCREEN_Y = 400;

export const PHYSICS = {
  baseAccel: 3.2, // m/s^2 gained from gravity on a normal pitch
  tuckAccel: 4.6, // extra while tucking (Down / S)
  brakeDecel: 9.0, // while braking (Up / W)
  drag: 0.012, // quadratic drag, caps top speed
  maxSpeed: 26, // m/s, hard cap (~94 km/h)
  minSpeed: 4,
  steerAccel: 55, // lateral m/s^2
  steerMax: 20, // lateral m/s
  steerGrip: 6.5, // how fast lateral velocity settles (lower = icier)
  jumpVelocity: 8.5, // m/s of air height impulse
  gravity: 18, // m/s^2 pulling the rider back to the snow
  crashSpeedLoss: 0.45, // fraction of speed kept after a crash
  invulnSeconds: 2.0,
  comboWindow: 2.5, // seconds between coins before the combo resets
  nearMissBonus: 50,
  coinScore: 100,
  airBonusPerSecond: 120,
};

export const TRACKS = [
  {
    id: 'meadow',
    name: 'Greenhorn Meadow',
    tagline: 'Gentle rollers, wide lines, learn the mountain.',
    length: 1200, // metres to the finish flag
    par: 65, // seconds: time-trial par for GOLD
    density: 0.55, // obstacle density multiplier
    steep: 0.85, // slope steepness multiplier
    seed: 11,
    palette: {
      skyTop: '#7ec8f2', skyMid: '#cfeefb', skyBot: '#eef9ff',
      far: '#8fb8d8', near: '#5d8fb0',
      snow: '#f4faff', snowShade: '#d9ecf7', edge: '#ffffff',
      tree: '#2e7d4f', treeDark: '#1f5c39', rock: '#8a97a3', rockDark: '#5f6b76',
      log: '#7a5230', ice: '#aee6f5',
    },
  },
  {
    id: 'pine',
    name: 'Pine Ridge',
    tagline: 'Dusk light, tighter trees, real speed.',
    length: 1500,
    par: 85,
    density: 0.85,
    steep: 1.0,
    seed: 23,
    palette: {
      skyTop: '#3d5a8a', skyMid: '#e08a4c', skyBot: '#ffd9a0',
      far: '#6a5a8a', near: '#4a3f66',
      snow: '#f2e9f4', snowShade: '#d5c6e2', edge: '#fff6ea',
      tree: '#1d5c3a', treeDark: '#123f27', rock: '#7d7468', rockDark: '#57503f',
      log: '#6b4423', ice: '#bfe3ee',
    },
  },
  {
    id: 'glacier',
    name: 'Glacier Rush',
    tagline: 'Steep blue ice. Fast, slick, unforgiving.',
    length: 1800,
    par: 95,
    density: 1.15,
    steep: 1.25,
    seed: 37,
    palette: {
      skyTop: '#274b73', skyMid: '#5f9cc4', skyBot: '#cfe9f7',
      far: '#7fb2d9', near: '#4d84ad',
      snow: '#e8f6ff', snowShade: '#bcdcf0', edge: '#ffffff',
      tree: '#1e6f6a', treeDark: '#134a46', rock: '#7f93a8', rockDark: '#54657a',
      log: '#5d4028', ice: '#8fd8ef',
    },
  },
];

export const MEDALS = [
  { name: 'GOLD', max: 1.0, color: '#f5c542' },
  { name: 'SILVER', max: 1.12, color: '#cfd6dd' },
  { name: 'BRONZE', max: 1.3, color: '#d08a4b' },
];
