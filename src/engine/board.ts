// Inselgraph, Bewegung der Spieler und der Inselpiraten.
import { BALANCE } from '../config/balance';
import { LOCATIONS, LOCATION_IDS, PIRATES } from './content';
import { pick } from './rng';
import type { GameState, LocationId } from './types';
import { activePlayer, locName, log, pirateName, ensure } from './util';

export function neighbors(loc: LocationId): LocationId[] {
  return LOCATIONS[loc].neighbors;
}

export function isCoastal(loc: LocationId): boolean {
  return LOCATIONS[loc].coastal;
}

export const COASTAL: LocationId[] = LOCATION_IDS.filter((l) => LOCATIONS[l].coastal);

/** Küstenorte, die per Boot erreichbar sind. ANNAHME: Bootsfahrten starten nur an einem Küstenort. */
export function boatTargets(from: LocationId): LocationId[] {
  if (!isCoastal(from)) return [];
  return COASTAL.filter((l) => l !== from);
}

/** Kürzeste Wegstrecke zu Fuß (Anzahl Kanten). */
export function distance(a: LocationId, b: LocationId): number {
  if (a === b) return 0;
  const seen = new Set<LocationId>([a]);
  let frontier: LocationId[] = [a];
  let d = 0;
  while (frontier.length) {
    d++;
    const next: LocationId[] = [];
    for (const l of frontier) {
      for (const n of neighbors(l)) {
        if (n === b) return d;
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}

/** Entfernung in Zügen, wenn auch Bootsfahrten erlaubt sind (eine Bootsfahrt = ein Zug). */
export function travelTurns(a: LocationId, b: LocationId): number {
  let best = distance(a, b);
  for (const c1 of [a, ...neighbors(a)]) {
    if (!isCoastal(c1)) continue;
    const toCoast = distance(a, c1);
    for (const c2 of COASTAL) {
      if (c2 === c1) continue;
      best = Math.min(best, toCoast + 1 + distance(c2, b));
    }
  }
  return best;
}

export function canMoveNow(s: GameState): boolean {
  return s.phase === 'playing' && !s.duel && !s.moved && !s.acted;
}

export function applyMove(s: GameState, to: LocationId): void {
  const p = activePlayer(s);
  ensure(canMoveNow(s), 'Bewegung ist jetzt nicht erlaubt.');
  ensure(neighbors(p.location).includes(to), `${locName(to)} ist kein Nachbarort.`);
  p.location = to;
  s.moved = true;
  log(s, 'info', `${p.name} geht zu: ${locName(to)}.`);
}

export function applyBoat(s: GameState, to: LocationId): void {
  const p = activePlayer(s);
  ensure(canMoveNow(s), 'Bewegung ist jetzt nicht erlaubt.');
  ensure(boatTargets(p.location).includes(to), `Per Boot geht es nur von Küste zu Küste.`);
  ensure(p.doubloons >= BALANCE.economy.boatCost, 'Nicht genug Dublonen für das Boot.');
  p.doubloons -= BALANCE.economy.boatCost;
  p.location = to;
  s.moved = true;
  log(s, 'info', `${p.name} fährt per Boot nach: ${locName(to)}.`);
}

export function movePirates(s: GameState): void {
  for (const pirate of s.pirates) {
    const to = pick(s, neighbors(pirate.location));
    pirate.location = to;
  }
  if (s.pirates.length) log(s, 'curse', 'Die Inselpiraten ziehen weiter.');
}

/** Holt den nächsten Piraten aus dem Stapel auf seinen Startort. */
export function spawnPirate(s: GameState): boolean {
  const id = s.pirateDeck.shift();
  if (!id) return false;
  const loc = PIRATES[id].startLocation;
  s.pirates.push({ id, location: loc });
  log(s, 'info', `${pirateName(id)} (Stärke ${PIRATES[id].strength}) taucht bei ${locName(loc)} auf.`);
  return true;
}

export function initialPirates(s: GameState): void {
  for (let i = 0; i < BALANCE.pirates.activeOnBoard; i++) spawnPirate(s);
}
