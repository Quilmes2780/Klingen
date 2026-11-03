// KI-Mitspieler: Heuristik mit zwei Zielen – eigener Ruhm und Fluchrisiko.
// Je höher der Fluch, desto stärker zählen Fluch-Rätsel und Gefälligkeiten.
import { BALANCE } from '../../config/balance';
import { boatTargets, neighbors, travelTurns } from '../board';
import { CURSE_INSULTS, ITEMS, LOCATIONS, PIRATES, RIDDLES } from '../content';
import { visibleTop } from '../items';
import { findRiddlePlan } from '../riddles';
import { currentActorId, getLegalActions } from '../legal';
import { TRIAL_NAMES } from '../trials';
import type { Action, GameState, LocationId, PlayerState } from '../types';
import { itemName } from '../util';
import {
  curseRelief,
  doubloonValue,
  trialProgress,
  curseWeight,
  itemValue,
  masterWinChance,
  missingSymbols,
  pirateWinChance,
  positionValue,
  riddleValue,
  wantsCounters,
  wantsCrew,
} from './heuristics';

interface Scored {
  action: Action;
  score: number;
  reason: string;
}

const DOUBLOON = 1 / BALANCE.fame.doubloonsPerFame;

export function chooseAction(s: GameState): Action {
  const actorId = currentActorId(s);
  if (!actorId) throw new Error('Niemand ist am Zug.');
  const me = s.players[actorId];

  if (s.duel) return duelChoice(s, me);
  if (s.phase === 'finale') {
    const topic = CURSE_INSULTS[s.finale!.current!].topic;
    return { type: 'FINALE_RESPOND', topicId: me.counters.includes(topic) ? topic : null };
  }

  // Handlimit: wertlosesten Gegenstand abwerfen.
  if (me.items.length > BALANCE.handLimit) {
    const worst = [...me.items].sort((a, b) => itemValue(s, me, a) - itemValue(s, me, b))[0];
    return { type: 'DISCARD', playerId: me.id, itemId: worst };
  }

  const gift = giftChoice(s, me);
  if (gift) return gift;

  if (!s.acted) {
    if (!s.moved) {
      const plan = bestPlan(s, me);
      if (plan.dest !== me.location) {
        const action: Action = neighbors(me.location).includes(plan.dest)
          ? { type: 'MOVE', to: plan.dest }
          : { type: 'BOAT', to: plan.dest };
        return { ...action, note: plan.reason };
      }
    }
    const best = bestActionHere(s, me);
    if (best && best.score > 0) return { ...best.action, note: best.reason };
  }
  return { type: 'END_TURN' };
}

// ---------------------------------------------------------------- Zugplanung

function hypothetical(s: GameState, me: PlayerState, loc: LocationId): GameState {
  return { ...s, moved: true, players: { ...s.players, [me.id]: { ...me, location: loc } } };
}

function bestPlan(s: GameState, me: PlayerState): { dest: LocationId; reason: string } {
  const options: { dest: LocationId; cost: number }[] = [{ dest: me.location, cost: 0 }];
  for (const n of neighbors(me.location)) options.push({ dest: n, cost: 0 });
  if (me.doubloons >= BALANCE.economy.boatCost) {
    for (const b of boatTargets(me.location)) {
      if (!options.some((o) => o.dest === b)) options.push({ dest: b, cost: BALANCE.economy.boatCost * DOUBLOON + 0.15 });
    }
  }
  let best = { dest: me.location, score: -Infinity, reason: '' };
  for (const o of options) {
    const hyp = hypothetical(s, me, o.dest);
    const action = bestActionHere(hyp, hyp.players[me.id]);
    const actScore = action ? Math.max(0, action.score) : 0;
    const pos = positionValue(hyp, hyp.players[me.id], o.dest);
    const total = actScore + pos - o.cost + (o.dest === me.location ? 0.01 : 0);
    if (total > best.score) {
      const why = action && action.score >= pos ? action.reason : 'nähert sich einem Ziel';
      best = { dest: o.dest, score: total, reason: `${o.cost ? 'Bootsfahrt' : 'Weg'} nach ${LOCATIONS[o.dest].name} – ${why}` };
    }
  }
  return best;
}

function bestActionHere(s: GameState, me: PlayerState): Scored | null {
  let best: Scored | null = null;
  for (const a of getLegalActions(s)) {
    const sc = scoreAction(s, me, a);
    if (sc && (!best || sc.score > best.score)) best = sc;
  }
  return best;
}

function scoreAction(s: GameState, me: PlayerState, a: Action): Scored | null {
  const w = curseWeight(s);
  switch (a.type) {
    case 'SOLVE_RIDDLE': {
      const r = RIDDLES[a.riddleId];
      const plan = findRiddlePlan(s, me.id, a.riddleId) ?? [];
      const participants = new Set(plan.map((c) => c.owner).concat(me.id)).size;
      const cost = plan.filter((c) => c.owner === me.id).reduce((sum, c) => sum + 0.1 * itemValue(s, me, c.itemId), 0);
      const v = riddleValue(s, me, r, participants) - cost + 1;
      const reason = r.curse
        ? `Fluch steht auf ${s.curse} – Fluch-Rätsel „${r.title}“ hat Vorrang`
        : `löst „${r.title}“ für ${r.reward.fame} Ruhm`;
      return { action: a, score: v, reason };
    }
    case 'TRIAL': {
      if (a.trial === 'klinge') {
        const chance = masterWinChance(me.counters.length);
        return { action: a, score: 12 * chance - 1.5, reason: `wagt die ${TRIAL_NAMES.klinge} (${me.counters.length} Konter)` };
      }
      return { action: a, score: 14, reason: `legt die ${TRIAL_NAMES[a.trial]} ab` };
    }
    case 'DUEL_PIRATE': {
      const pd = PIRATES[a.pirateId];
      const chance = pirateWinChance(pd.strength, me.counters.length);
      let gain = BALANCE.fame.duelWin + (wantsCrew(me) ? (me.hasShip ? 3.5 : 2.5) : 0);
      if (me.location === 'friedhof') gain += curseRelief(s) / 2;
      const learn = (wantsCounters(me) ? 0.6 : 0.25) * Math.min(3, pd.strength / 2);
      const v = chance * gain - (1 - chance) * doubloonValue(me) + learn;
      return { action: a, score: v, reason: `fordert ${pd.name} heraus (Chance ${Math.round(chance * 100)} %)` };
    }
    case 'DUEL_PLAYER':
      return null; // ANNAHME: Die KI fordert keine Mitspielenden heraus (semi-kooperativ).
    case 'SEARCH': {
      const deck = s.locationDecks[me.location];
      if (!deck.length) return { action: a, score: BALANCE.economy.emptySearchDoubloons * doubloonValue(me), reason: 'durchsucht den leeren Ort nach Münzen' };
      // Volle Taschen: Der Fund verdrängt den wertlosesten Gegenstand.
      const displaced = me.items.length >= BALANCE.handLimit ? Math.min(...me.items.map((i) => itemValue(s, me, i))) : 0;
      const top = visibleTop(s, me.location);
      if (top) return { action: a, score: 0.3 + itemValue(s, me, top) - displaced, reason: `holt sich ${itemName(top)}` };
      const values = deck.map((i) => itemValue(s, me, i));
      const avg = values.reduce((x, y) => x + y, 0) / values.length;
      return { action: a, score: 0.3 + avg + 0.3 * Math.max(...values) - displaced, reason: `durchsucht ${LOCATIONS[me.location].name}` };
    }
    case 'WORK': {
      let v = BALANCE.economy.workIncome * doubloonValue(me) + 0.1;
      if (me.doubloons < 2) v += 0.3;
      return { action: a, score: v, reason: me.hasShip ? 'verdient sich ein paar Dublonen' : 'spart auf ein Schiff' };
    }
    case 'BUY_ITEM': {
      const v = itemValue(s, me, a.itemId) - BALANCE.economy.shopItemCost * doubloonValue(me) - 0.2;
      return { action: a, score: v, reason: `kauft ${itemName(a.itemId)}` };
    }
    case 'BUY_COUNTER': {
      let v = 0.35 - BALANCE.economy.counterCost * doubloonValue(me);
      if (wantsCounters(me)) v += 1.4;
      if (s.finale || w > 0.5) v += 0.4;
      return { action: a, score: v, reason: 'lernt in der Taverne einen Konter' };
    }
    case 'BUY_SHIP':
      return { action: a, score: me.trials.kahn ? -1 : 7, reason: 'kauft ein Schiff' };
    default:
      return null;
  }
}

// ---------------------------------------------------------------- Gefälligkeiten

function giftChoice(s: GameState, me: PlayerState): Action | null {
  const w = curseWeight(s);
  const leaderGift = supportLeader(s, me, w);
  if (leaderGift) return leaderGift;
  for (const other of Object.values(s.players)) {
    if (other.id === me.id || other.location !== me.location || other.items.length >= BALANCE.handLimit) continue;
    for (const item of me.items) {
      const sym = ITEMS[item].symbol;
      for (const rid of s.riddleDisplay) {
        const r = RIDDLES[rid];
        if (!r.symbols.includes(sym)) continue;
        const missing = missingSymbols(other, r);
        if (missing.length !== 1 || missing[0] !== sym) continue;
        // Kann der Empfänger das Rätsel in seinem nächsten Zug erreichen?
        if (travelTurns(other.location, r.location) > 1) continue;
        const myLoss = itemValue(s, me, item);
        // Je höher der Fluch, desto großzügiger – bei Fluch-Rätseln immer.
        const generosity = 0.6 + 2.5 * w + (r.curse ? 3 : 0);
        if (myLoss > generosity) continue;
        return {
          type: 'GIVE',
          from: me.id,
          to: other.id,
          itemId: item,
          note: `schenkt ${other.name} ${itemName(item)} für „${r.title}“ (Gefälligkeit)`,
        };
      }
    }
  }
  return null;
}

/**
 * Semi-kooperativ: Nur wer drei Prüfungen schafft, ruft das Finale herbei. Mit steigendem Fluch
 * überlässt die KI Kartenfragmente und Schaufel der Person, die am weitesten ist.
 */
function supportLeader(s: GameState, me: PlayerState, w: number): Action | null {
  const others = Object.values(s.players).filter((o) => o.id !== me.id && o.location === me.location);
  const pooled = poolMapPieces(me, others);
  if (pooled) return pooled;
  if (w < 0.25) return null;
  const leader = others.sort((a, b) => trialProgress(b) - trialProgress(a))[0];
  if (!leader || leader.trials.karte || leader.items.length >= BALANCE.handLimit) return null;
  if (trialProgress(leader) < trialProgress(me) + 1.5 - 2 * w) return null;
  const leaderNeedsShovel = !leader.items.some((i) => ITEMS[i].kind === 'schaufel');
  const item = me.items.find((i) => ITEMS[i].kind === 'fragment' || (ITEMS[i].kind === 'schaufel' && leaderNeedsShovel));
  if (!item) return null;
  return {
    type: 'GIVE',
    from: me.id,
    to: leader.id,
    itemId: item,
    note: `überlässt ${leader.name} ${itemName(item)} – der Fluch drängt, ${leader.name} ist der Karte am nächsten`,
  };
}

/** Kartenfragmente nützen nur gebündelt: Wer weniger hat, gibt ab. Unabhängig vom Fluch. */
function poolMapPieces(me: PlayerState, others: PlayerState[]): Action | null {
  const frags = (p: PlayerState) => p.items.filter((i) => ITEMS[i].kind === 'fragment').length;
  const hasShovel = (p: PlayerState) => p.items.some((i) => ITEMS[i].kind === 'schaufel');
  const mine = frags(me);
  for (const o of others) {
    if (o.trials.karte || o.items.length >= BALANCE.handLimit) continue;
    const theirs = frags(o);
    const fragment = me.items.find((i) => ITEMS[i].kind === 'fragment');
    const iAmDone = me.trials.karte;
    const theyLead =
      theirs > mine || (theirs === mine && theirs > 0 && (trialProgress(o) > trialProgress(me) || (trialProgress(o) === trialProgress(me) && o.id < me.id)));
    if (fragment && (iAmDone || theyLead)) {
      return { type: 'GIVE', from: me.id, to: o.id, itemId: fragment, note: `bündelt die Kartenfragmente bei ${o.name}` };
    }
    const shovel = me.items.find((i) => ITEMS[i].kind === 'schaufel');
    if (shovel && !hasShovel(o) && theirs >= 2 && (iAmDone || mine === 0)) {
      return { type: 'GIVE', from: me.id, to: o.id, itemId: shovel, note: `leiht ${o.name} die Schaufel für den Schatz` };
    }
  }
  return null;
}

// ---------------------------------------------------------------- Wortgefecht

function duelChoice(s: GameState, me: PlayerState): Action {
  const d = s.duel!;
  if (d.stage === 'pick') {
    const options = getLegalActions(s).filter((a): a is Extract<Action, { type: 'DUEL_PICK' }> => a.type === 'DUEL_PICK');
    // Themen bevorzugen, deren Konter noch fehlt – pariert der Gegner, lernt man ihn.
    const unknown = options.filter((o) => !me.counters.includes(o.topicId));
    const pool = unknown.length ? unknown : options;
    // Deterministisch, aber nicht immer gleich: Index aus Zustand ableiten.
    return pool[(d.used.length * 7 + s.round) % pool.length];
  }
  const topic = d.topic!;
  return { type: 'DUEL_COUNTER', topicId: me.counters.includes(topic) ? topic : null };
}
