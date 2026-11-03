// Endwertung.
import { BALANCE } from '../config/balance';
import type { GameState, PlayerId } from './types';

export interface ScoreRow {
  playerId: PlayerId;
  name: string;
  trials: number;
  riddles: number;
  duels: number;
  ious: number;
  finale: number;
  bonus: number;
  doubloonFame: number;
  doubloons: number;
  total: number;
  rank: number;
}

export function computeScores(s: GameState): ScoreRow[] {
  const rows: ScoreRow[] = s.turnOrder.map((id) => {
    const p = s.players[id];
    const doubloonFame = Math.floor(p.doubloons / BALANCE.fame.doubloonsPerFame);
    const f = p.fame;
    return {
      playerId: id,
      name: p.name,
      trials: f.trials,
      riddles: f.riddles,
      duels: f.duels,
      ious: f.ious,
      finale: f.finale,
      bonus: f.bonus,
      doubloonFame,
      doubloons: p.doubloons,
      total: f.trials + f.riddles + f.duels + f.ious + f.finale + f.bonus + doubloonFame,
      rank: 0,
    };
  });
  // Gleichstand: mehr Dublonen gewinnt.
  rows.sort((a, b) => b.total - a.total || b.doubloons - a.doubloons);
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    r.rank = prev && prev.total === r.total && prev.doubloons === r.doubloons ? prev.rank : i + 1;
  });
  return rows;
}
