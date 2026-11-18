// random.js — tiny deterministic RNG (mulberry32) so a track built from a seed
// is identical every run. One clear job: seeded randomness, nothing else.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Roll a value in [min, max) from a rng function.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Pick one element of an array.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
