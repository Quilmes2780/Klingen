// Rätselauslage und Rätsellösen (inkl. gemeinsamer Fluch-Rätsel).
import { BALANCE } from '../config/balance';
import { ITEMS, RIDDLES } from './content';
import { honorFavors } from './favors';
import { beginAction, removeItem } from './items';
import { shuffle } from './rng';
import type { GameState, ItemId, PlayerId, RiddleId } from './types';
import { activeId, addCurse, ensure, getPlayer, locName, log, playersAt } from './util';

export interface RiddleContribution {
  owner: PlayerId;
  itemId: ItemId;
}

function drawRiddle(s: GameState): RiddleId | undefined {
  if (!s.riddleDeck.length && s.riddleDiscard.length) {
    // ANNAHME: Ist der Rätselstapel leer, werden gelöste Rätsel neu gemischt.
    s.riddleDeck = shuffle(s, s.riddleDiscard);
    s.riddleDiscard = [];
  }
  return s.riddleDeck.shift();
}

/** Füllt die Auslage auf und sorgt dafür, dass mindestens ein Fluch-Rätsel offen liegt. */
export function refillRiddles(s: GameState): void {
  while (s.riddleDisplay.length < BALANCE.riddles.displaySize) {
    const r = drawRiddle(s);
    if (!r) break;
    s.riddleDisplay.push(r);
  }
  ensureCurseRiddle(s);
}

export function ensureCurseRiddle(s: GameState): void {
  const openCurse = s.riddleDisplay.filter((r) => RIDDLES[r].curse).length;
  if (openCurse >= BALANCE.riddles.minCurseRiddlesOpen) return;
  let source: 'deck' | 'discard' = 'deck';
  let idx = s.riddleDeck.findIndex((r) => RIDDLES[r].curse);
  if (idx < 0) {
    source = 'discard';
    idx = s.riddleDiscard.findIndex((r) => RIDDLES[r].curse);
  }
  if (idx < 0) return;
  const curseRiddle = source === 'deck' ? s.riddleDeck.splice(idx, 1)[0] : s.riddleDiscard.splice(idx, 1)[0];
  if (s.riddleDisplay.length >= BALANCE.riddles.displaySize) {
    // Das zuletzt aufgedeckte normale Rätsel wandert unter den Stapel.
    for (let i = s.riddleDisplay.length - 1; i >= 0; i--) {
      if (!RIDDLES[s.riddleDisplay[i]].curse) {
        s.riddleDeck.push(s.riddleDisplay.splice(i, 1)[0]);
        break;
      }
    }
  }
  s.riddleDisplay.push(curseRiddle);
}

/**
 * Sucht passende Gegenstände für ein Rätsel. Eigene Gegenstände zuerst (geschenkte bevorzugt,
 * damit Gefälligkeiten greifen); bei Fluch-Rätseln dürfen Mitspielende am selben Ort beitragen.
 * ANNAHME: Die Engine wählt die Gegenstände automatisch; Mitspielende stimmen Fluch-Rätseln stillschweigend zu.
 */
export function findRiddlePlan(s: GameState, playerId: PlayerId, riddleId: RiddleId): RiddleContribution[] | null {
  const riddle = RIDDLES[riddleId];
  const p = s.players[playerId];
  if (!riddle || !p || !s.riddleDisplay.includes(riddleId) || p.location !== riddle.location) return null;
  const helpers = riddle.curse ? playersAt(s, p.location).filter((o) => o.id !== playerId) : [];
  const taken = new Set<string>();
  const plan: RiddleContribution[] = [];
  const favored = new Set(s.favors.filter((f) => f.receiver === playerId).map((f) => f.itemId));
  for (const sym of riddle.symbols) {
    const own = p.items
      .filter((i) => ITEMS[i].symbol === sym && !taken.has(i))
      .sort((a, b) => Number(favored.has(b)) - Number(favored.has(a)));
    let found: RiddleContribution | null = own.length ? { owner: playerId, itemId: own[0] } : null;
    if (!found) {
      for (const h of helpers) {
        const it = h.items.find((i) => ITEMS[i].symbol === sym && !taken.has(i));
        if (it) {
          found = { owner: h.id, itemId: it };
          break;
        }
      }
    }
    if (!found) return null;
    taken.add(found.itemId);
    plan.push(found);
  }
  return plan;
}

export function applySolveRiddle(s: GameState, riddleId: RiddleId): void {
  const solverId = activeId(s);
  const solver = getPlayer(s, solverId);
  const riddle = RIDDLES[riddleId];
  ensure(riddle && s.riddleDisplay.includes(riddleId), 'Dieses Rätsel liegt nicht aus.');
  ensure(solver.location === riddle.location, `Dieses Rätsel wird bei ${locName(riddle.location)} gelöst.`);
  const plan = findRiddlePlan(s, solverId, riddleId);
  ensure(plan, 'Dafür fehlen passende Gegenstände.');
  beginAction(s);

  honorFavors(s, plan);
  for (const c of plan) removeItem(s, c.owner, c.itemId);
  s.riddleDisplay = s.riddleDisplay.filter((r) => r !== riddleId);
  s.riddleDiscard.push(riddleId);
  s.stats.riddlesSolved++;

  if (riddle.curse) {
    s.stats.curseRiddlesSolved++;
    const participants = [solverId, ...new Set(plan.map((c) => c.owner).filter((o) => o !== solverId))];
    const share = Math.floor(BALANCE.fame.curseRiddle / participants.length);
    const rest = BALANCE.fame.curseRiddle - share * participants.length;
    for (const id of participants) s.players[id].fame.riddles += share;
    // ANNAHME: Beim Teilen geht der Rest an die lösende Person.
    solver.fame.riddles += rest;
    const names = participants.map((id) => s.players[id].name).join(', ');
    log(s, 'riddle', `Fluch-Rätsel „${riddle.title}“ gelöst von ${names}! Der Fluch weicht um ${BALANCE.curse.curseRiddleReduction} zurück.`);
    addCurse(s, -BALANCE.curse.curseRiddleReduction);
  } else {
    solver.fame.riddles += riddle.reward.fame;
    log(s, 'riddle', `${solver.name} löst „${riddle.title}“ (+${riddle.reward.fame} Ruhm).`);
  }
  if (riddle.reward.doubloons) solver.doubloons += riddle.reward.doubloons;
  if (riddle.reward.grants === 'klingenZugang' && !solver.klingenZugang) {
    solver.klingenZugang = true;
    log(s, 'trial', `${solver.name} erhält Zugang zur Klingenmeisterin im Herrenhaus.`);
  }
  if (riddle.reward.grants === 'schiff' && !solver.hasShip) {
    solver.hasShip = true;
    log(s, 'trial', `${solver.name} besitzt nun ein Schiff.`);
  }
}
