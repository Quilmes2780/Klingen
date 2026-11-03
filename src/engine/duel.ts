// Wortgefechte. Der Kern (createDuel/duelPick/duelCounter) ist unabhängig vom Brettspiel und
// wird auch vom Schnellmodus genutzt. Darunter folgen die Brettspiel-Anbindungen.
import { BALANCE } from '../config/balance';
import { PIRATES, TOPICS, TOPIC_IDS } from './content';
import { spawnPirate } from './board';
import { beginAction } from './items';
import { pick, rollDie, type RngHolder } from './rng';
import { passTrial } from './trials';
import type { DuelKind, DuelSide, DuelState, GameState, LocationId, PirateId, PlayerId, TopicId } from './types';
import { activePlayer, addCurse, ensure, getPlayer, locName, log, pirateName, topicName } from './util';

export type OwnsFn = (side: 0 | 1, topic: TopicId) => boolean;

export function createDuel(kind: DuelKind, sides: [DuelSide, DuelSide], location: LocationId): DuelState {
  return {
    kind,
    sides,
    hits: [0, 0],
    // Gegen die Meisterin greift nur sie an.
    attacker: kind === 'master' ? 1 : 0,
    stage: 'pick',
    topic: null,
    used: [],
    heard: [[], []],
    exchanges: [],
    winner: null,
    location,
    learned: [[], []],
  };
}

export function unusedTopics(d: DuelState): TopicId[] {
  return TOPIC_IDS.filter((t) => !d.used.includes(t));
}

function other(side: 0 | 1): 0 | 1 {
  return side === 0 ? 1 : 0;
}

function scoreHit(d: DuelState, side: 0 | 1): void {
  d.hits[side]++;
  if (d.hits[side] >= BALANCE.duel.hitsToWin) {
    d.winner = side;
    d.stage = 'over';
  }
}

function exhaust(d: DuelState): void {
  // ANNAHME: Gehen die Themen aus, gewinnt die Seite mit mehr Treffern; bei Gleichstand die verteidigende Seite (Pirat/Gegner).
  d.winner = d.hits[0] > d.hits[1] ? 0 : 1;
  d.stage = 'over';
}

/** Lässt Piraten und Meisterin automatisch handeln, bis eine Person entscheiden muss. */
export function autoAdvance(d: DuelState, h: RngHolder): void {
  for (let guard = 0; guard < 100 && d.stage !== 'over'; guard++) {
    const attackerSide = d.sides[d.attacker];
    const defender = other(d.attacker);
    const defenderSide = d.sides[defender];
    if (d.stage === 'pick') {
      if (!unusedTopics(d).length) return exhaust(d);
      if (attackerSide.kind === 'player') return;
      // Pirat oder Meisterin ziehen ein zufälliges, noch unbenutztes Thema.
      const t = pick(h, unusedTopics(d));
      d.topic = t;
      d.used.push(t);
      d.stage = 'counter';
      continue;
    }
    // stage === 'counter'
    if (defenderSide.kind !== 'pirate') return;
    const topic = d.topic!;
    const parried = rollDie(h, BALANCE.duel.dieSides) <= defenderSide.strength;
    d.exchanges.push({ attacker: d.attacker, topic, counter: parried ? topic : null, parried });
    d.topic = null;
    if (parried) {
      // Der Pirat pariert mit dem passenden Konter – die angreifende Seite hört ihn.
      d.heard[d.attacker].push(topic);
      d.attacker = defender;
    } else {
      scoreHit(d, d.attacker);
    }
    if ((d.stage as DuelState['stage']) !== 'over') d.stage = 'pick';
  }
}

export function duelPick(d: DuelState, topic: TopicId, h: RngHolder): void {
  ensure(d.stage === 'pick', 'Jetzt wird kein Thema gewählt.');
  ensure(d.sides[d.attacker].kind === 'player', 'Die angreifende Seite wählt selbst.');
  ensure(!!TOPICS[topic], 'Unbekanntes Thema.');
  ensure(!d.used.includes(topic), 'Jedes Thema nur einmal pro Duell.');
  d.topic = topic;
  d.used.push(topic);
  d.stage = 'counter';
  autoAdvance(d, h);
}

export function duelCounter(d: DuelState, counter: TopicId | null, owns: OwnsFn, h: RngHolder): void {
  ensure(d.stage === 'counter', 'Jetzt wird nicht gekontert.');
  const defender = other(d.attacker);
  ensure(d.sides[defender].kind === 'player', 'Nur Personen kontern selbst.');
  ensure(counter === null || owns(defender, counter), 'Diesen Konter besitzt du nicht.');
  const topic = d.topic!;
  const parried = counter === topic;
  d.exchanges.push({ attacker: d.attacker, topic, counter, parried });
  d.topic = null;
  if (d.kind === 'master') {
    // Gegen die Meisterin: passender Konter = Treffer für die Person, fehlender = Treffer für sie.
    scoreHit(d, parried ? defender : d.attacker);
  } else if (parried) {
    d.heard[d.attacker].push(topic);
    d.attacker = defender;
  } else {
    scoreHit(d, d.attacker);
  }
  if ((d.stage as DuelState['stage']) !== 'over') d.stage = 'pick';
  autoAdvance(d, h);
}

/** Wer muss im Duell gerade entscheiden? */
export function duelDecider(d: DuelState): 0 | 1 | null {
  if (d.stage === 'over') return null;
  const side = d.stage === 'pick' ? d.attacker : other(d.attacker);
  return d.sides[side].kind === 'player' ? side : null;
}

export function sideName(s: GameState | null, side: DuelSide): string {
  if (side.kind === 'player') return s?.players[side.playerId]?.name ?? 'Du';
  if (side.kind === 'pirate') return pirateName(side.pirateId);
  return 'Die Klingenmeisterin';
}

/** Text der Beleidigung für einen Wortwechsel (Meisterin nutzt eigene Sprüche). */
export function insultText(d: DuelState, attacker: 0 | 1, topic: TopicId): string {
  return d.sides[attacker].kind === 'master' ? TOPICS[topic].masterInsult : TOPICS[topic].insult;
}

// ---------------------------------------------------------------- Brettspiel-Anbindung

function ownsFor(s: GameState, d: DuelState): OwnsFn {
  return (side, topic) => {
    const sd = d.sides[side];
    return sd.kind === 'player' && s.players[sd.playerId].counters.includes(topic);
  };
}

export function applyDuelPirate(s: GameState, pirateId: PirateId): void {
  const p = activePlayer(s);
  const pirate = s.pirates.find((x) => x.id === pirateId);
  ensure(pirate, 'Dieser Pirat ist nicht auf der Insel.');
  ensure(pirate.location === p.location, 'Der Pirat ist nicht an deinem Ort.');
  beginAction(s);
  const def = PIRATES[pirateId];
  s.duel = createDuel(
    'pirate',
    [
      { kind: 'player', playerId: p.id },
      { kind: 'pirate', pirateId, strength: def.strength },
    ],
    p.location,
  );
  s.stats.duelsFought++;
  log(s, 'duel', `${p.name} fordert ${def.name} (Stärke ${def.strength}) zum Wortgefecht. „${def.taunt}“`);
}

export function applyDuelPlayer(s: GameState, targetId: PlayerId): void {
  const p = activePlayer(s);
  const target = getPlayer(s, targetId);
  ensure(target.id !== p.id, 'Du kannst dich nicht selbst herausfordern.');
  ensure(target.location === p.location, 'Die Person ist nicht an deinem Ort.');
  beginAction(s);
  s.duel = createDuel(
    'player',
    [
      { kind: 'player', playerId: p.id },
      { kind: 'player', playerId: target.id },
    ],
    p.location,
  );
  s.stats.duelsFought++;
  log(s, 'duel', `${p.name} fordert ${target.name} zum Wortgefecht.`);
}

export function startMasterDuel(s: GameState): void {
  const p = activePlayer(s);
  s.duel = createDuel('master', [{ kind: 'player', playerId: p.id }, { kind: 'master' }], p.location);
  autoAdvance(s.duel, s);
  log(s, 'duel', `${p.name} tritt im Herrenhaus gegen die Klingenmeisterin an.`);
}

/** Person, die im laufenden Duell entscheiden muss (für UI und KI). */
export function duelActorId(s: GameState): PlayerId | null {
  if (!s.duel) return null;
  const side = duelDecider(s.duel);
  if (side === null) return null;
  const sd = s.duel.sides[side];
  return sd.kind === 'player' ? sd.playerId : null;
}

export function applyDuelPick(s: GameState, topic: TopicId): void {
  ensure(s.duel, 'Es läuft kein Wortgefecht.');
  const before = s.duel.exchanges.length;
  duelPick(s.duel, topic, s);
  afterDuelStep(s, before);
}

export function applyDuelCounter(s: GameState, topic: TopicId | null): void {
  ensure(s.duel, 'Es läuft kein Wortgefecht.');
  const before = s.duel.exchanges.length;
  duelCounter(s.duel, topic, ownsFor(s, s.duel), s);
  afterDuelStep(s, before);
}

function afterDuelStep(s: GameState, before: number): void {
  const d = s.duel!;
  for (const ex of d.exchanges.slice(before)) {
    const a = sideName(s, d.sides[ex.attacker]);
    const b = sideName(s, d.sides[ex.attacker === 0 ? 1 : 0]);
    const res = d.kind === 'master' ? (ex.parried ? 'Treffer für ' + b : 'Treffer für ' + a) : ex.parried ? 'pariert' : 'Treffer für ' + a;
    log(s, 'duel', `${a} greift mit „${topicName(ex.topic)}“ an – ${b}: ${ex.counter ? 'kontert' : 'bleibt stumm'} (${res}).`);
  }
  if (d.stage === 'over') resolveDuel(s);
}

function learn(s: GameState, d: DuelState, side: 0 | 1): void {
  const sd = d.sides[side];
  if (sd.kind !== 'player') return;
  const p = s.players[sd.playerId];
  for (const t of new Set(d.heard[side])) {
    if (!p.counters.includes(t)) {
      p.counters.push(t);
      d.learned[side].push(t);
    }
  }
  if (d.learned[side].length) {
    log(s, 'duel', `${p.name} lernt aus dem Duell: ${d.learned[side].map(topicName).join(', ')}.`);
  }
}

function resolveDuel(s: GameState): void {
  const d = s.duel!;
  const winner = d.winner!;
  if (d.kind === 'pirate') {
    const p = s.players[(d.sides[0] as { playerId: PlayerId }).playerId];
    const pirateId = (d.sides[1] as { pirateId: PirateId }).pirateId;
    if (winner === 0) {
      p.fame.duels += BALANCE.fame.duelWin;
      p.crew.push(pirateId);
      s.pirates = s.pirates.filter((x) => x.id !== pirateId);
      log(s, 'duel', `${p.name} besiegt ${pirateName(pirateId)}! Der Pirat heuert als Mannschaft an (+${BALANCE.fame.duelWin} Ruhm).`);
      if (d.location === 'friedhof') {
        log(s, 'curse', `Ein Sieg auf dem Friedhof schwächt den Fluch um ${BALANCE.curse.graveyardPirateReduction}.`);
        addCurse(s, -BALANCE.curse.graveyardPirateReduction);
      }
      // ANNAHME: Für jeden besiegten Piraten erscheint der nächste aus dem Stapel.
      spawnPirate(s);
    } else {
      p.doubloons = Math.max(0, p.doubloons - BALANCE.economy.duelLossPenalty);
      log(s, 'duel', `${p.name} verliert gegen ${pirateName(pirateId)} und büßt ${BALANCE.economy.duelLossPenalty} Dublone ein.`);
    }
    learn(s, d, 0);
  } else if (d.kind === 'player') {
    const w = s.players[(d.sides[winner] as { playerId: PlayerId }).playerId];
    const l = s.players[(d.sides[winner === 0 ? 1 : 0] as { playerId: PlayerId }).playerId];
    w.fame.duels += BALANCE.fame.duelWin;
    // ANNAHME: Im Duell zwischen Personen zahlt die unterlegene Person 1 Dublone an die siegreiche.
    const paid = Math.min(l.doubloons, BALANCE.economy.duelLossPenalty);
    l.doubloons -= paid;
    w.doubloons += paid;
    log(s, 'duel', `${w.name} gewinnt das Wortgefecht gegen ${l.name}.`);
    learn(s, d, 0);
    learn(s, d, 1);
  } else {
    const p = s.players[(d.sides[0] as { playerId: PlayerId }).playerId];
    if (winner === 0) {
      s.stats.klingeCounters.push(p.counters.length);
      log(s, 'trial', `${p.name} bezwingt die Klingenmeisterin!`);
      passTrial(s, p.id, 'klinge');
    } else {
      log(s, 'trial', `Die Klingenmeisterin schickt ${p.name} nach Hause. Bei ${locName('herrenhaus')} darf man es erneut versuchen.`);
    }
  }
  s.lastDuel = d;
  s.duel = null;
}
