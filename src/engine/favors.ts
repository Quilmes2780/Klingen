// Gefälligkeiten: Wer einen Gegenstand schenkt, der beim Empfänger im selben oder nächsten Zug
// ein Rätsel löst, erhält einen Schuldschein (1 Ruhm).
import { BALANCE } from '../config/balance';
import type { GameState, ItemId, PlayerId } from './types';
import { activeId, itemName, log } from './util';

export function addFavor(s: GameState, giver: PlayerId, receiver: PlayerId, itemId: ItemId): void {
  // Ist der Empfänger gerade am Zug, zählt dieser Zug mit – plus sein nächster.
  const turnsLeft = BALANCE.favor.receiverTurns + (receiver === activeId(s) ? 1 : 0);
  s.favors = s.favors.filter((f) => !(f.receiver === receiver && f.itemId === itemId));
  s.favors.push({ giver, receiver, itemId, turnsLeft });
}

/** Wird aufgerufen, bevor beim Rätsellösen Gegenstände abgegeben werden. */
export function honorFavors(s: GameState, used: { owner: PlayerId; itemId: ItemId }[]): void {
  for (const u of used) {
    const idx = s.favors.findIndex((f) => f.receiver === u.owner && f.itemId === u.itemId);
    if (idx < 0) continue;
    const f = s.favors[idx];
    s.favors.splice(idx, 1);
    if (f.giver === f.receiver) continue;
    const giver = s.players[f.giver];
    giver.fame.ious += BALANCE.fame.iou;
    log(s, 'riddle', `${giver.name} erhält einen Schuldschein: Das Geschenk (${itemName(u.itemId)}) hat ${s.players[f.receiver].name} geholfen.`);
  }
}

/** Am Zugende des Empfängers verfallen Gefälligkeiten. */
export function tickFavors(s: GameState, endingPlayer: PlayerId): void {
  for (const f of s.favors) if (f.receiver === endingPlayer) f.turnsLeft--;
  s.favors = s.favors.filter((f) => f.turnsLeft > 0);
}
