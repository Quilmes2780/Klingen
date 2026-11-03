// Finale: Der Geisterkapitän erscheint im Hafen. Gemeinsames Wortgefecht aller Anwesenden.
import { BALANCE } from '../config/balance';
import { CONTENT, CURSE_INSULTS } from './content';
import { shuffle } from './rng';
import type { GameState, PlayerId, TopicId } from './types';
import { ensure, log, topicName } from './util';

export function triggerFinale(s: GameState, triggeredBy: PlayerId): void {
  const idx = s.turnOrder.indexOf(triggeredBy);
  const n = s.turnOrder.length;
  // ANNAHME: Alle haben noch einen Zug – auch die auslösende Person (als letzte).
  const countdown: PlayerId[] = [];
  for (let k = 1; k <= n; k++) countdown.push(s.turnOrder[(idx + k) % n]);
  s.finale = {
    stage: 'countdown',
    triggeredBy,
    countdown,
    participants: [],
    insultDeck: shuffle(s, CONTENT.curseInsults.map((c) => c.id)),
    current: null,
    attackNo: 0,
    askIdx: 0,
    counters: 0,
    hits: 0,
    exchanges: [],
    won: null,
  };
  log(s, 'curse', 'Der Geisterkapitän erscheint im Hafen! Alle haben noch einen Zug, um dorthin zu gelangen.');
}

export function startBattle(s: GameState): void {
  const f = s.finale!;
  const idx = s.turnOrder.indexOf(f.triggeredBy);
  const n = s.turnOrder.length;
  const order: PlayerId[] = [];
  for (let k = 0; k < n; k++) order.push(s.turnOrder[(idx + k) % n]);
  f.participants = order.filter((id) => s.players[id].location === 'hafen');
  f.stage = 'battle';
  s.phase = 'finale';
  if (!f.participants.length) {
    // ANNAHME: Ist niemand im Hafen, ist das Finale verloren.
    endFinale(s, false, 'Niemand stellte sich dem Geisterkapitän.');
    return;
  }
  log(s, 'curse', `Das Finale beginnt! Im Hafen stehen: ${f.participants.map((id) => s.players[id].name).join(', ')}.`);
  nextAttack(s);
}

function nextAttack(s: GameState): void {
  const f = s.finale!;
  const insult = f.insultDeck.shift();
  if (!insult) {
    endFinale(s, false, 'Dem Geisterkapitän gehen die Sprüche nie aus.');
    return;
  }
  f.current = insult;
  f.askIdx = 0;
  log(s, 'curse', `Geisterkapitän: „${CURSE_INSULTS[insult].text}“`);
}

/** Wer im Finale gerade antworten darf. ANNAHME: Die Reihenfolge rotiert je Angriff. */
export function finaleActorId(s: GameState): PlayerId | null {
  const f = s.finale;
  if (!f || f.stage !== 'battle' || !f.current) return null;
  const n = f.participants.length;
  return f.participants[(f.attackNo + f.askIdx) % n];
}

export function applyFinaleRespond(s: GameState, topic: TopicId | null): void {
  const f = s.finale;
  ensure(f && f.stage === 'battle' && f.current, 'Es läuft kein Finale.');
  const actor = finaleActorId(s)!;
  const p = s.players[actor];
  ensure(topic === null || p.counters.includes(topic), 'Diesen Konter besitzt du nicht.');
  const insult = CURSE_INSULTS[f.current];
  if (topic !== null && topic === insult.topic) {
    f.counters++;
    p.fame.finale += BALANCE.fame.finaleFirstCounter;
    f.exchanges.push({ insult: f.current, counteredBy: actor });
    log(s, 'curse', `${p.name} kontert („${topicName(topic)}“) – +${BALANCE.fame.finaleFirstCounter} Ruhm! (${f.counters}/${BALANCE.finale.countersNeeded})`);
    return afterExchange(s);
  }
  if (topic !== null) log(s, 'curse', `${p.name} versucht es mit „${topicName(topic)}“ – passt nicht.`);
  // ANNAHME: Ein falscher Konter zählt wie Passen; die nächste Person darf es versuchen.
  f.askIdx++;
  if (f.askIdx >= f.participants.length) {
    f.hits++;
    f.exchanges.push({ insult: f.current, counteredBy: null });
    log(s, 'curse', `Niemand kontert – Treffer für den Geisterkapitän! (${f.hits}/${BALANCE.finale.hitsToLose})`);
    afterExchange(s);
  }
}

function afterExchange(s: GameState): void {
  const f = s.finale!;
  f.current = null;
  if (f.counters >= BALANCE.finale.countersNeeded) return endFinale(s, true, '');
  if (f.hits >= BALANCE.finale.hitsToLose) return endFinale(s, false, 'Der Geisterkapitän hat das Wortgefecht gewonnen.');
  f.attackNo++;
  nextAttack(s);
}

function endFinale(s: GameState, won: boolean, reason: string): void {
  const f = s.finale!;
  f.stage = 'over';
  f.current = null;
  f.won = won;
  if (won) {
    s.phase = 'won';
    s.curse = 0;
    log(s, 'curse', 'Der Geisterkapitän löst sich in Nebel auf. Der Fluch ist gebrochen – zur Wertung!');
  } else {
    s.phase = 'lost';
    s.lostReason = reason;
    log(s, 'curse', `${reason} Alle haben verloren.`);
  }
}
