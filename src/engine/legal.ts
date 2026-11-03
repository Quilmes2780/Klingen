// Welche Aktionen sind gerade erlaubt, und wer muss entscheiden? Einzige Quelle für UI und KI.
import { BALANCE } from '../config/balance';
import { boatTargets, canMoveNow, neighbors } from './board';
import { duelActorId, unusedTopics } from './duel';
import { finaleActorId } from './finale';
import { canActNow } from './items';
import { findRiddlePlan } from './riddles';
import { TOPIC_IDS } from './content';
import { trialBlocker } from './trials';
import { TRIALS, type Action, type GameState, type PlayerId } from './types';
import { activeId, activePlayer, playersAt } from './util';

export function currentActorId(s: GameState): PlayerId | null {
  if (s.phase === 'won' || s.phase === 'lost') return null;
  if (s.duel) return duelActorId(s);
  if (s.phase === 'finale') return finaleActorId(s);
  return activeId(s);
}

export function isGameOver(s: GameState): boolean {
  return s.phase === 'won' || s.phase === 'lost';
}

export function getLegalActions(s: GameState): Action[] {
  const actor = currentActorId(s);
  if (!actor) return [];
  const me = s.players[actor];
  const out: Action[] = [];

  if (s.duel) {
    if (s.duel.stage === 'pick') for (const t of unusedTopics(s.duel)) out.push({ type: 'DUEL_PICK', topicId: t });
    else {
      for (const t of me.counters) out.push({ type: 'DUEL_COUNTER', topicId: t });
      out.push({ type: 'DUEL_COUNTER', topicId: null });
    }
    return out;
  }
  if (s.phase === 'finale') {
    for (const t of me.counters) out.push({ type: 'FINALE_RESPOND', topicId: t });
    out.push({ type: 'FINALE_RESPOND', topicId: null });
    return out;
  }

  const p = activePlayer(s);
  if (canMoveNow(s)) {
    for (const to of neighbors(p.location)) out.push({ type: 'MOVE', to });
    if (p.doubloons >= BALANCE.economy.boatCost) for (const to of boatTargets(p.location)) out.push({ type: 'BOAT', to });
  }
  if (canActNow(s)) {
    out.push({ type: 'SEARCH' });
    if ((BALANCE.economy.workLocations as readonly string[]).includes(p.location)) out.push({ type: 'WORK' });
    for (const r of s.riddleDisplay) if (findRiddlePlan(s, p.id, r)) out.push({ type: 'SOLVE_RIDDLE', riddleId: r });
    for (const pi of s.pirates) if (pi.location === p.location) out.push({ type: 'DUEL_PIRATE', pirateId: pi.id });
    for (const o of playersAt(s, p.location)) if (o.id !== p.id) out.push({ type: 'DUEL_PLAYER', playerId: o.id });
    if (p.location === 'kraemer' && p.doubloons >= BALANCE.economy.shopItemCost)
      for (const it of s.shop) out.push({ type: 'BUY_ITEM', itemId: it });
    if (p.location === 'taverne' && p.doubloons >= BALANCE.economy.counterCost)
      for (const t of TOPIC_IDS) if (!p.counters.includes(t)) out.push({ type: 'BUY_COUNTER', topicId: t });
    if (p.location === 'werft' && !p.hasShip && p.doubloons >= BALANCE.economy.shipCost) out.push({ type: 'BUY_SHIP' });
    for (const t of TRIALS) if (!trialBlocker(s, p, t)) out.push({ type: 'TRIAL', trial: t });
  }
  for (const o of playersAt(s, p.location)) {
    if (o.id === p.id) continue;
    if (o.items.length < BALANCE.handLimit) for (const it of p.items) out.push({ type: 'GIVE', from: p.id, to: o.id, itemId: it });
    if (p.items.length < BALANCE.handLimit) for (const it of o.items) out.push({ type: 'GIVE', from: o.id, to: p.id, itemId: it });
  }
  if (p.items.length > BALANCE.handLimit) for (const it of p.items) out.push({ type: 'DISCARD', playerId: p.id, itemId: it });
  else out.push({ type: 'END_TURN' });
  return out;
}
