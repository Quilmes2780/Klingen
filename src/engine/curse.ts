// Fluchphase nach jeder vollen Runde: Ereignis(se), Fluch steigt, Piraten ziehen, Rätsel auffüllen.
import { BALANCE } from '../config/balance';
import { EVENTS, TOPIC_IDS } from './content';
import { movePirates, spawnPirate } from './board';
import { refillShop, removeItem } from './items';
import { refillRiddles, rotateRiddles } from './riddles';
import { pick, randInt, shuffle } from './rng';
import type { EventDef, GameState, PlayerState } from './types';
import { addCurse, addDoubloons, itemName, locName, log, topicName } from './util';

function drawEvent(s: GameState): EventDef | null {
  if (!s.eventDeck.length) {
    s.eventDeck = shuffle(s, s.eventDiscard);
    s.eventDiscard = [];
  }
  const id = s.eventDeck.shift();
  if (!id) return null;
  s.eventDiscard.push(id);
  return EVENTS[id];
}

function players(s: GameState): PlayerState[] {
  return s.turnOrder.map((id) => s.players[id]);
}

/** Wendet ein Ereignis an. Liefert true, wenn es eine Geistererscheinung war. */
export function applyEvent(s: GameState, ev: EventDef): boolean {
  log(s, 'event', `Ereignis: ${ev.title} – ${ev.text}`);
  const e = ev.effect;
  switch (e.type) {
    case 'ghost':
      return true;
    case 'curse':
      addCurse(s, e.amount);
      break;
    case 'doubloons': {
      let targets = players(s);
      if (e.who === 'richest' || e.who === 'poorest') {
        const vals = targets.map((p) => p.doubloons);
        const v = e.who === 'richest' ? Math.max(...vals) : Math.min(...vals);
        targets = targets.filter((p) => p.doubloons === v);
      } else if (e.who === 'atLocation') {
        targets = targets.filter((p) => p.location === e.location);
      }
      for (const p of targets) addDoubloons(p, e.amount);
      break;
    }
    case 'discardRandom':
      for (const p of players(s)) {
        if (e.who === 'fullHands' && p.items.length < (e.threshold ?? 0)) continue;
        if (!p.items.length) continue;
        const it = p.items[randInt(s, p.items.length)];
        removeItem(s, p.id, it);
        log(s, 'event', `${p.name} verliert: ${itemName(it)}.`);
      }
      break;
    case 'movePirates':
      movePirates(s);
      break;
    case 'spawnPirate':
      if (!spawnPirate(s)) log(s, 'event', 'Doch kein weiterer Pirat ist mehr übrig.');
      break;
    case 'learnCounter': {
      let targets = players(s);
      if (e.who === 'poorest') {
        const v = Math.min(...targets.map((p) => p.doubloons));
        targets = targets.filter((p) => p.doubloons === v);
      }
      for (const p of targets) {
        const options = TOPIC_IDS.filter((t) => !p.counters.includes(t));
        if (!options.length) continue;
        const t = pick(s, options);
        p.counters.push(t);
        log(s, 'event', `${p.name} lernt den Konter „${topicName(t)}“.`);
      }
      break;
    }
    case 'relocate':
      for (const p of players(s)) {
        if (p.location === e.from) {
          p.location = e.to;
          log(s, 'event', `${p.name} landet bei ${locName(e.to)}.`);
        }
      }
      break;
    case 'refreshRiddles':
      s.riddleDeck.push(...s.riddleDisplay);
      s.riddleDisplay = [];
      break;
    case 'restockShop':
      s.discard.push(...s.shop);
      s.shop = [];
      refillShop(s);
      break;
    case 'none':
      break;
  }
  return false;
}

export function runCursePhase(s: GameState): void {
  log(s, 'curse', `— Fluchphase nach Runde ${s.round} —`);
  const events = s.curse >= BALANCE.curse.extraEventFrom ? 2 : 1;
  let ghost = false;
  s.lastEvents = [];
  for (let i = 0; i < events && s.phase === 'playing'; i++) {
    const ev = drawEvent(s);
    if (!ev) continue;
    s.lastEvents.push(ev.id);
    if (applyEvent(s, ev)) ghost = true;
  }
  if (s.phase !== 'playing') return;

  let rise = ghost ? BALANCE.curse.ghostApparition : BALANCE.curse.perRound;
  if (s.mode === 'solo' && s.cursePhasesDone < BALANCE.solo.curseGraceRounds) rise -= 1;
  if (rise > 0) {
    log(s, 'curse', `Der Fluch steigt um ${rise}.`);
    addCurse(s, rise);
  }
  s.cursePhasesDone++;
  if (s.phase !== 'playing') return;

  movePirates(s);
  rotateRiddles(s);
  refillRiddles(s);
  refillShop(s);
}
