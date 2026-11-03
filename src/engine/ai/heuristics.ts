// Bewertungsfunktionen der KI. Einheit: ungefähr „Ruhmpunkte“.
import { BALANCE } from '../../config/balance';
import { travelTurns } from '../board';
import { ITEMS, PIRATES, RIDDLES } from '../content';
import type { GameState, ItemId, LocationId, PlayerState, RiddleDef } from '../types';
import { visibleTop } from '../items';
import { countKind, playersAt } from '../util';

/** 0 … 1: wie bedrohlich der Fluch gerade ist. */
export function curseWeight(s: GameState): number {
  return Math.min(1, s.curse / BALANCE.curse.max);
}

/** Wert einer gelösten Fluch-Rätsel-Karte (Fluch −2) aus Sicht der Gruppe; steigt mit dem Fluch. */
export function curseRelief(s: GameState): number {
  const w = curseWeight(s);
  return 1 + 8 * w * w + (s.curse >= 10 ? 3 : 0);
}

export function riddleValue(s: GameState, p: PlayerState, r: RiddleDef, participants = 1): number {
  let v = r.curse ? BALANCE.fame.curseRiddle / participants + curseRelief(s) : r.reward.fame;
  if (r.reward.doubloons) v += r.reward.doubloons / BALANCE.fame.doubloonsPerFame;
  if (r.reward.grants === 'klingenZugang' && !p.klingenZugang && !p.trials.klinge) v += 5.5;
  if (r.reward.grants === 'schiff' && !p.hasShip && !p.trials.kahn) v += 6.5;
  return v;
}

/** Fehlende Symbole eines Rätsels für eine Person (nur eigene Gegenstände). */
export function missingSymbols(p: PlayerState, r: RiddleDef, items: ItemId[] = p.items): string[] {
  const pool = items.map((i) => ITEMS[i].symbol);
  const missing: string[] = [];
  for (const sym of r.symbols) {
    const idx = pool.indexOf(sym);
    if (idx >= 0) pool.splice(idx, 1);
    else missing.push(sym);
  }
  return missing;
}

/** Wert einer Dublone: höher, solange auf ein Schiff gespart wird. */
export function doubloonValue(p: PlayerState): number {
  if (!p.hasShip && !p.trials.kahn) return 0.6;
  if (wantsCounters(p)) return 0.35;
  return 1 / BALANCE.fame.doubloonsPerFame;
}

/** Fortschritt Richtung „drei Prüfungen“ – bestimmt, wen die Gruppe unterstützt. */
export function trialProgress(p: PlayerState): number {
  let v = 0;
  for (const passed of Object.values(p.trials)) if (passed) v += 3;
  if (!p.trials.karte) v += 0.5 * Math.min(4, countKind(p, 'fragment')) + (countKind(p, 'schaufel') ? 0.5 : 0);
  if (!p.trials.kahn) v += (p.hasShip ? 1.5 : Math.min(1, p.doubloons / BALANCE.economy.shipCost)) + 0.4 * Math.min(3, p.crew.length);
  if (!p.trials.klinge) v += (p.klingenZugang ? 1 : 0) + p.counters.length / 16;
  return v;
}

const GRANT_RIDDLES = Object.values(RIDDLES).filter((r) => r.reward.grants);

/** Wie wertvoll ist ein Gegenstand für diese Person? */
export function itemValue(s: GameState, p: PlayerState, item: ItemId): number {
  const def = ITEMS[item];
  if (def.kind === 'fragment') {
    if (p.trials.karte) return 0.1;
    const have = countKind(p, 'fragment') - (p.items.includes(item) ? 1 : 0);
    return 2 + 0.6 * have;
  }
  if (def.kind === 'schaufel') {
    if (p.trials.karte || countKind(p, 'schaufel') > (p.items.includes(item) ? 1 : 0)) return 0.1;
    return 1.6 + 0.4 * countKind(p, 'fragment');
  }
  const others = p.items.filter((i) => i !== item);
  let best = 0.15;
  for (const rid of s.riddleDisplay) {
    const r = RIDDLES[rid];
    if (!r.symbols.includes(def.symbol)) continue;
    const missing = missingSymbols(p, r, others);
    if (!missing.includes(def.symbol)) continue;
    const v = riddleValue(s, p, r) / missing.length;
    best = Math.max(best, v);
  }
  // Zugangs- und Schiffsrätsel kommen wieder: passende Gegenstände lohnt es sich aufzuheben.
  for (const r of GRANT_RIDDLES) {
    if (s.riddleDisplay.includes(r.id) || !r.symbols.includes(def.symbol)) continue;
    if (r.reward.grants === 'klingenZugang' && (p.klingenZugang || p.trials.klinge)) continue;
    if (r.reward.grants === 'schiff' && (p.hasShip || p.trials.kahn)) continue;
    const missing = missingSymbols(p, r, others);
    if (missing.includes(def.symbol)) best = Math.max(best, (0.35 * riddleValue(s, p, r)) / missing.length);
  }
  return best;
}

/** Siegchance gegen einen Piraten (Markow-Kette über Trefferstände). */
const duelCache = new Map<string, number>();
export function pirateWinChance(strength: number, counters: number): number {
  const key = `${strength}:${counters}`;
  const cached = duelCache.get(key);
  if (cached !== undefined) return cached;
  const a = Math.max(0, (BALANCE.duel.dieSides - strength) / BALANCE.duel.dieSides); // eigener Treffer
  const b = Math.min(1, counters / 16); // eigene Parade
  const H = BALANCE.duel.hitsToWin;
  // P[h0][h1][att]: Siegchance, att 0 = ich greife an
  const P = Array.from({ length: H + 1 }, () => Array.from({ length: H + 1 }, () => [0, 0]));
  for (let h1 = 0; h1 <= H; h1++) {
    P[H][h1] = [1, 1];
  }
  for (let iter = 0; iter < 80; iter++) {
    for (let h0 = H - 1; h0 >= 0; h0--) {
      for (let h1 = H - 1; h1 >= 0; h1--) {
        const mine = a * P[h0 + 1][h1][0] + (1 - a) * P[h0][h1][1];
        const theirs = b * P[h0][h1][0] + (1 - b) * (h1 + 1 >= H ? 0 : P[h0][h1 + 1][1]);
        P[h0][h1] = [mine, theirs];
      }
    }
  }
  const res = P[0][0][0];
  duelCache.set(key, res);
  return res;
}

/** Siegchance gegen die Klingenmeisterin: 3 passende Konter vor 3 fehlenden. */
export function masterWinChance(counters: number): number {
  const p = Math.min(1, counters / 16);
  const q = 1 - p;
  return p ** 3 * (1 + 3 * q + 6 * q * q);
}

export function wantsCrew(p: PlayerState): boolean {
  return !p.trials.kahn && p.crew.length < BALANCE.trials.crewNeeded;
}

export function wantsCounters(p: PlayerState): boolean {
  return p.klingenZugang && !p.trials.klinge;
}

export interface Goal {
  location: LocationId;
  value: number;
  label: string;
  /** Zählt schon das bloße Dasein (z. B. Hafen vor dem Finale), nicht erst eine Aktion. */
  presence?: boolean;
}

/** Ziele, auf die sich das Hinlaufen lohnt. */
export function goals(s: GameState, p: PlayerState): Goal[] {
  const out: Goal[] = [];
  for (const rid of s.riddleDisplay) {
    const r = RIDDLES[rid];
    const missing = missingSymbols(p, r);
    if (!missing.length) {
      out.push({ location: r.location, value: riddleValue(s, p, r), label: `Rätsel „${r.title}“` });
    } else if (r.curse) {
      // Fluch-Rätsel: Gegenstände von Personen, die schon dort stehen, zählen mit.
      const helpers = playersAt(s, r.location).filter((o) => o.id !== p.id);
      const pool = [...p.items, ...helpers.flatMap((h) => h.items)];
      if (!missingSymbols(p, r, pool).length) {
        out.push({ location: r.location, value: riddleValue(s, p, r, 1 + Math.min(2, helpers.length)), label: `Fluch-Rätsel „${r.title}“` });
      }
    }
  }
  for (const loc of Object.keys(s.locationDecks) as LocationId[]) {
    const top = visibleTop(s, loc);
    if (top) out.push({ location: loc, value: itemValue(s, p, top), label: ITEMS[top].name });
  }
  if (!p.trials.karte && countKind(p, 'fragment') >= BALANCE.trials.fragmentsNeeded && countKind(p, 'schaufel') > 0) {
    out.push({ location: s.treasureLocation, value: 12, label: 'Schatz heben' });
  }
  if (!p.trials.kahn && p.hasShip && p.crew.length >= BALANCE.trials.crewNeeded) {
    out.push({ location: 'hafen', value: 12, label: 'Prüfung des Kahns' });
  }
  if (p.klingenZugang && !p.trials.klinge) {
    const chance = masterWinChance(p.counters.length);
    if (chance > 0.3) out.push({ location: 'herrenhaus', value: 12 * chance, label: 'Klingenmeisterin' });
    else if (p.doubloons >= BALANCE.economy.counterCost) out.push({ location: 'taverne', value: 1.2, label: 'Konter lernen' });
  }
  if (!p.hasShip && !p.trials.kahn && p.doubloons >= BALANCE.economy.shipCost) {
    out.push({ location: 'werft', value: 4, label: 'Schiff kaufen' });
  }
  if (wantsCrew(p)) {
    for (const pi of s.pirates) {
      const chance = pirateWinChance(PIRATES[pi.id].strength, p.counters.length);
      out.push({ location: pi.location, value: chance * (p.hasShip ? 3.5 : 2.5), label: `Pirat ${PIRATES[pi.id].name}` });
    }
  }
  // Finale in Sicht (jemand anderes hat schon zwei Prüfungen): Hafen in Reichweite halten.
  if (s.finale?.stage === 'countdown') out.push({ location: 'hafen', value: 30, label: 'Hafen (Finale)', presence: true });
  else if (Object.values(s.players).some((o) => o.id !== p.id && Object.values(o.trials).filter(Boolean).length >= 2))
    out.push({ location: 'hafen', value: 1.2, label: 'Hafen (Finale)', presence: true });
  // Wer schon zwei Prüfungen hat, drängt auf die dritte.
  if (Object.values(p.trials).filter(Boolean).length >= 2) for (const g of out) if (g.label !== 'Hafen (Finale)') g.value *= 1.5;
  return out;
}

/** Wert, sich (nach der Aktion) an diesem Ort zu befinden. */
export function positionValue(s: GameState, p: PlayerState, loc: LocationId): number {
  let best = 0;
  for (const g of goals(s, p)) {
    const d = travelTurns(loc, g.location);
    if (d === 0 && !g.presence) continue; // vor Ort wird die Aktion direkt bewertet
    best = Math.max(best, g.value * 0.55 ** d);
  }
  return best;
}
