// Schnellmodus: Wortgefecht gegen einen KI-Piraten, ohne Brettspiel.
// Gelernte Konter bleiben zwischen den Duellen erhalten (Lernen durch Verlieren).
import { BALANCE } from '../config/balance';
import { CONTENT, PIRATES, TOPIC_IDS } from './content';
import { createDuel, duelCounter, duelPick } from './duel';
import { pick, seedToNumber, shuffle } from './rng';
import type { DuelState, PirateId, TopicId } from './types';
import { ensure } from './util';

export interface QuickDuelState {
  rng: number;
  counters: TopicId[];
  pirateId: PirateId;
  duel: DuelState;
  wins: number;
  losses: number;
  /** In diesem Duell gelernt (nach Ende gefüllt). */
  learned: TopicId[];
}

export function startingCounters(seed: string): TopicId[] {
  return shuffle({ rng: seedToNumber(seed) }, TOPIC_IDS).slice(0, BALANCE.start.counters);
}

export function createQuickDuel(seed: string, counters: TopicId[], pirateId?: PirateId, record = { wins: 0, losses: 0 }): QuickDuelState {
  const h = { rng: seedToNumber(seed) };
  const pid = pirateId ?? pick(h, CONTENT.pirates.map((p) => p.id));
  const duel = createDuel(
    'pirate',
    [
      { kind: 'player', playerId: 'du' },
      { kind: 'pirate', pirateId: pid, strength: PIRATES[pid].strength },
    ],
    PIRATES[pid].startLocation,
  );
  return { rng: h.rng, counters: [...counters], pirateId: pid, duel, wins: record.wins, losses: record.losses, learned: [] };
}

function finish(q: QuickDuelState): void {
  if (q.duel.stage !== 'over') return;
  if (q.duel.winner === 0) q.wins++;
  else q.losses++;
  for (const t of new Set(q.duel.heard[0])) {
    if (!q.counters.includes(t)) {
      q.counters.push(t);
      q.learned.push(t);
    }
  }
  q.duel.learned[0] = [...q.learned];
}

export function quickPick(state: QuickDuelState, topic: TopicId): QuickDuelState {
  const q = structuredClone(state);
  duelPick(q.duel, topic, q);
  finish(q);
  return q;
}

export function quickCounter(state: QuickDuelState, topic: TopicId | null): QuickDuelState {
  const q = structuredClone(state);
  ensure(topic === null || q.counters.includes(topic), 'Diesen Konter kennst du noch nicht.');
  duelCounter(q.duel, topic, (side, t) => side === 0 && q.counters.includes(t), q);
  finish(q);
  return q;
}
