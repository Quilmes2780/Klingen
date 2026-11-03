// Gegenstände: Durchsuchen, Gelegenheitsarbeit, Einkaufen, Tauschen, Schenken, Handlimit.
import { BALANCE } from '../config/balance';
import { ITEMS, TOPICS } from './content';
import { addFavor } from './favors';
import { randInt } from './rng';
import type { GameState, ItemId, PlayerId, TopicId } from './types';
import { activeId, activePlayer, ensure, getPlayer, itemName, locName, log, topicName } from './util';

export function canActNow(s: GameState): boolean {
  return s.phase === 'playing' && !s.duel && !s.acted;
}

/** Markiert die eine Aktion des Zuges als verbraucht. */
export function beginAction(s: GameState): void {
  ensure(canActNow(s), 'Du hast in diesem Zug bereits eine Aktion ausgeführt.');
  s.acted = true;
  s.moved = true;
}

export function applySearch(s: GameState): void {
  const p = activePlayer(s);
  beginAction(s);
  const deck = s.locationDecks[p.location];
  const item = deck.shift();
  if (!item) {
    p.doubloons += BALANCE.economy.emptySearchDoubloons;
    log(s, 'info', `${p.name} durchsucht ${locName(p.location)}, findet nichts mehr und kratzt ${BALANCE.economy.emptySearchDoubloons} Dublone zusammen.`);
    return;
  }
  p.items.push(item);
  log(s, 'info', `${p.name} durchsucht ${locName(p.location)} und findet: ${itemName(item)}.`);
}

export function applyWork(s: GameState): void {
  const p = activePlayer(s);
  ensure(
    (BALANCE.economy.workLocations as readonly string[]).includes(p.location),
    'Gelegenheitsarbeit gibt es nur in Hafen, Taverne und Werft.',
  );
  beginAction(s);
  p.doubloons += BALANCE.economy.workIncome;
  log(s, 'info', `${p.name} schuftet bei ${locName(p.location)} und verdient ${BALANCE.economy.workIncome} Dublonen.`);
}

/** Füllt die Krämer-Auslage auf. ANNAHME: Nachschub kommt aus dem Ablagestapel, sonst aus dem Krämer-Stapel. */
export function refillShop(s: GameState): void {
  while (s.shop.length < BALANCE.economy.shopSize) {
    if (s.discard.length) {
      const idx = randInt(s, s.discard.length);
      s.shop.push(s.discard.splice(idx, 1)[0]);
    } else if (s.locationDecks.kraemer.length) {
      s.shop.push(s.locationDecks.kraemer.shift()!);
    } else break;
  }
}

export function applyBuyItem(s: GameState, itemId: ItemId): void {
  const p = activePlayer(s);
  ensure(p.location === 'kraemer', 'Gegenstände kauft man beim Krämer.');
  ensure(s.shop.includes(itemId), 'Dieser Gegenstand liegt nicht in der Auslage.');
  ensure(p.doubloons >= BALANCE.economy.shopItemCost, 'Nicht genug Dublonen.');
  beginAction(s);
  p.doubloons -= BALANCE.economy.shopItemCost;
  s.shop = s.shop.filter((i) => i !== itemId);
  p.items.push(itemId);
  refillShop(s);
  log(s, 'info', `${p.name} kauft beim Krämer: ${itemName(itemId)}.`);
}

export function applyBuyCounter(s: GameState, topicId: TopicId): void {
  const p = activePlayer(s);
  ensure(p.location === 'taverne', 'Konter lernt man in der Taverne.');
  ensure(!!TOPICS[topicId], 'Unbekanntes Thema.');
  ensure(!p.counters.includes(topicId), 'Diesen Konter kennst du schon.');
  ensure(p.doubloons >= BALANCE.economy.counterCost, 'Nicht genug Dublonen.');
  beginAction(s);
  p.doubloons -= BALANCE.economy.counterCost;
  p.counters.push(topicId);
  // ANNAHME: In der Taverne darf man sich das Thema des Konters aussuchen.
  log(s, 'info', `${p.name} kauft in der Taverne einen Konter zum Thema „${topicName(topicId)}“.`);
}

export function applyBuyShip(s: GameState): void {
  const p = activePlayer(s);
  // ANNAHME: Das Schiff wird auf der Werft gekauft und zählt als Einkaufen-Aktion.
  ensure(p.location === 'werft', 'Schiffe gibt es auf der Werft.');
  ensure(!p.hasShip, 'Du hast bereits ein Schiff.');
  ensure(p.doubloons >= BALANCE.economy.shipCost, 'Nicht genug Dublonen für ein Schiff.');
  beginAction(s);
  p.doubloons -= BALANCE.economy.shipCost;
  p.hasShip = true;
  log(s, 'trial', `${p.name} kauft auf der Werft ein Schiff.`);
}

function ensureFreeExchange(s: GameState, a: PlayerId, b: PlayerId): void {
  ensure(s.phase === 'playing' && !s.duel, 'Jetzt kann nicht getauscht werden.');
  ensure(a !== b, 'Mit sich selbst tauschen geht nicht.');
  const pa = getPlayer(s, a);
  const pb = getPlayer(s, b);
  ensure(pa.location === pb.location, 'Tauschen und Schenken nur am selben Ort.');
  // ANNAHME: Tauschen/Schenken nur, wenn eine der beiden Personen gerade am Zug ist.
  ensure(a === activeId(s) || b === activeId(s), 'Eine der beiden Personen muss am Zug sein.');
}

export function applyGive(s: GameState, from: PlayerId, to: PlayerId, itemId: ItemId): void {
  ensureFreeExchange(s, from, to);
  const giver = getPlayer(s, from);
  const receiver = getPlayer(s, to);
  ensure(giver.items.includes(itemId), 'Diesen Gegenstand besitzt die gebende Person nicht.');
  // ANNAHME: Ein Geschenk darf das Handlimit des Empfängers nicht überschreiten.
  ensure(receiver.items.length < BALANCE.handLimit, `${receiver.name} kann nichts mehr tragen.`);
  giver.items.splice(giver.items.indexOf(itemId), 1);
  receiver.items.push(itemId);
  addFavor(s, from, to, itemId);
  log(s, 'info', `${giver.name} schenkt ${receiver.name}: ${itemName(itemId)}.`);
}

export function applyTrade(s: GameState, a: PlayerId, itemA: ItemId, b: PlayerId, itemB: ItemId): void {
  ensureFreeExchange(s, a, b);
  const pa = getPlayer(s, a);
  const pb = getPlayer(s, b);
  ensure(pa.items.includes(itemA) && pb.items.includes(itemB), 'Beide müssen ihren Gegenstand besitzen.');
  pa.items[pa.items.indexOf(itemA)] = itemB;
  pb.items[pb.items.indexOf(itemB)] = itemA;
  log(s, 'info', `${pa.name} tauscht ${itemName(itemA)} gegen ${itemName(itemB)} von ${pb.name}.`);
}

export function applyDiscard(s: GameState, playerId: PlayerId, itemId: ItemId): void {
  const p = getPlayer(s, playerId);
  ensure(p.items.includes(itemId), 'Diesen Gegenstand besitzt du nicht.');
  ensure(p.items.length > BALANCE.handLimit, 'Abwerfen ist nur über dem Handlimit nötig.');
  removeItem(s, p.id, itemId);
  log(s, 'info', `${p.name} wirft ab: ${itemName(itemId)}.`);
}

/** Entfernt einen Gegenstand aus der Hand. Kartenfragmente wandern zurück auf die Insel, alles andere in die Ablage. */
export function removeItem(s: GameState, playerId: PlayerId, itemId: ItemId): void {
  const p = getPlayer(s, playerId);
  p.items.splice(p.items.indexOf(itemId), 1);
  s.favors = s.favors.filter((f) => !(f.receiver === playerId && f.itemId === itemId));
  if (ITEMS[itemId].kind === 'fragment') returnFragment(s, itemId);
  else s.discard.push(itemId);
}

/** Mischt ein Kartenfragment zufällig in einen Ortsstapel ein. */
export function returnFragment(s: GameState, itemId: ItemId): void {
  const locs = Object.keys(s.locationDecks) as (keyof typeof s.locationDecks)[];
  const loc = locs[randInt(s, locs.length)];
  const deck = s.locationDecks[loc];
  deck.splice(randInt(s, deck.length + 1), 0, itemId);
}
