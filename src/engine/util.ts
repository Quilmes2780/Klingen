import { BALANCE } from '../config/balance';
import { ITEMS, LOCATIONS, PIRATES, TOPICS } from './content';
import type { GameState, LocationId, LogKind, PlayerId, PlayerState } from './types';
import { RuleError } from './types';

export function log(s: GameState, kind: LogKind, text: string): void {
  s.log.push({ round: s.round, kind, text });
  if (s.log.length > BALANCE.log.maxEntries) s.log.splice(0, s.log.length - BALANCE.log.maxEntries);
}

export function activeId(s: GameState): PlayerId {
  return s.turnOrder[s.activeIdx];
}

export function activePlayer(s: GameState): PlayerState {
  return s.players[activeId(s)];
}

export function getPlayer(s: GameState, id: PlayerId): PlayerState {
  const p = s.players[id];
  if (!p) throw new RuleError(`Unbekannter Spieler ${id}`);
  return p;
}

export function playersAt(s: GameState, loc: LocationId): PlayerState[] {
  return s.turnOrder.map((id) => s.players[id]).filter((p) => p.location === loc);
}

export function locName(loc: LocationId): string {
  return LOCATIONS[loc].name;
}

export function itemName(id: string): string {
  return ITEMS[id]?.name ?? id;
}

export function topicName(id: string): string {
  return TOPICS[id]?.name ?? id;
}

export function pirateName(id: string): string {
  return PIRATES[id]?.name ?? id;
}

export function countKind(p: PlayerState, kind: 'fragment' | 'schaufel'): number {
  return p.items.filter((i) => ITEMS[i].kind === kind).length;
}

export function fameTotal(p: PlayerState): number {
  const f = p.fame;
  return f.trials + f.riddles + f.duels + f.ious + f.finale + f.bonus + Math.floor(p.doubloons / BALANCE.fame.doubloonsPerFame);
}

export function trialsPassed(p: PlayerState): number {
  return Object.values(p.trials).filter(Boolean).length;
}

export function addDoubloons(p: PlayerState, amount: number): number {
  const before = p.doubloons;
  p.doubloons = Math.max(0, p.doubloons + amount);
  return p.doubloons - before;
}

export function ensure(cond: unknown, message: string): asserts cond {
  if (!cond) throw new RuleError(message);
}

export function addCurse(s: GameState, amount: number): void {
  s.curse = Math.max(0, Math.min(BALANCE.curse.max, s.curse + amount));
  if (s.curse >= BALANCE.curse.max && s.phase !== 'won') {
    s.phase = 'lost';
    s.lostReason = 'Der Fluch hat die Insel verschlungen.';
    s.duel = null;
    log(s, 'curse', 'Die Fluchleiste erreicht Feld 15 – der Fluch verschlingt die Insel. Alle haben verloren.');
  }
}

/** Ein frischer Klon, auf dem die Reducer gefahrlos mutieren dürfen. */
export function draft(s: GameState): GameState {
  return structuredClone(s);
}
