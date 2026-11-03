// Lässt KI-Züge laufen – für Simulation, Tests und die UI (bis ein Mensch entscheiden muss).
import { currentActorId, isGameOver } from '../legal';
import { applyAction } from '../reducer';
import { createGame } from '../setup';
import type { GameState } from '../types';
import { chooseAction } from './ai';

export function aiStep(s: GameState): GameState {
  return applyAction(s, chooseAction(s));
}

export function isAiTurn(s: GameState): boolean {
  const id = currentActorId(s);
  return !!id && s.players[id].kind === 'ai';
}

/** Spielt eine reine KI-Partie bis zum Ende. */
export function playAiGame(players: number, seed: string, maxSteps = 20000): GameState {
  let s = createGame({
    seed,
    players: Array.from({ length: players }, (_, i) => ({ name: `KI ${i + 1}`, kind: 'ai' as const })),
  });
  for (let i = 0; i < maxSteps && !isGameOver(s); i++) s = aiStep(s);
  if (!isGameOver(s)) throw new Error(`Partie ${seed} endet nicht nach ${maxSteps} Schritten.`);
  return s;
}
