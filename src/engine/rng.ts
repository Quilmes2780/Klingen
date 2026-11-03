// Seedbarer Zufallsgenerator (mulberry32). Der Zustand ist eine einzige Zahl im GameState,
// damit Spielstände serialisierbar und Partien reproduzierbar sind.

export interface RngHolder {
  rng: number;
}

/** Wandelt einen beliebigen Seed-Text in einen 32-Bit-Startwert um. */
export function seedToNumber(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Erzeugt einen zufälligen, gut lesbaren Seed für die UI. */
export function randomSeed(): string {
  const words = ['Anker', 'Möwe', 'Nebel', 'Klinge', 'Rum', 'Kompass', 'Muschel', 'Laterne', 'Haken', 'Sturm'];
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

/** Liefert eine Zahl in [0, 1) und schreibt den neuen Zustand zurück. */
export function rand(h: RngHolder): number {
  h.rng = (h.rng + 0x6d2b79f5) | 0;
  let t = h.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(h: RngHolder, n: number): number {
  return Math.floor(rand(h) * n);
}

export function rollDie(h: RngHolder, sides = 6): number {
  return randInt(h, sides) + 1;
}

export function pick<T>(h: RngHolder, list: readonly T[]): T {
  return list[randInt(h, list.length)];
}

export function shuffle<T>(h: RngHolder, list: readonly T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(h, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
