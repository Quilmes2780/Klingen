import { applyAction } from '../reducer';
import { createGame } from '../setup';
import type { Action, GameState, PlayerKind } from '../types';

export function newGame(players = 2, seed = 'test', kind: PlayerKind = 'human'): GameState {
  return createGame({
    seed,
    players: Array.from({ length: players }, (_, i) => ({ name: `S${i + 1}`, kind })),
  });
}

/** Mutiert einen Klon für Testaufbauten. */
export function tweak(s: GameState, fn: (d: GameState) => void): GameState {
  const d = structuredClone(s);
  fn(d);
  return d;
}

export function run(s: GameState, ...actions: Action[]): GameState {
  return actions.reduce(applyAction, s);
}

/** Ereignisstapel nur mit „Stille Nacht“ – keine Nebenwirkungen in der Fluchphase. */
export function quietEvents(d: GameState): void {
  d.eventDeck = Array(30).fill('e03');
  d.eventDiscard = [];
}

export function endRound(s: GameState): GameState {
  let cur = s;
  const n = cur.turnOrder.length;
  for (let i = cur.activeIdx; i < n; i++) cur = applyAction(cur, { type: 'END_TURN' });
  return cur;
}
