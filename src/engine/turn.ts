// Zugende, Rundenwechsel, letzte Züge vor dem Finale.
import { BALANCE } from '../config/balance';
import { runCursePhase } from './curse';
import { tickFavors } from './favors';
import { startBattle } from './finale';
import type { GameState } from './types';
import { activeId, activePlayer, ensure, log } from './util';

export function applyEndTurn(s: GameState): void {
  ensure(s.phase === 'playing', 'Die Partie läuft nicht.');
  ensure(!s.duel, 'Erst das Wortgefecht beenden.');
  const p = activePlayer(s);
  // ANNAHME: Über dem Handlimit wird erst am Zugende abgeworfen (Person wählt).
  ensure(p.items.length <= BALANCE.handLimit, `Handlimit ${BALANCE.handLimit}: ${p.name} muss erst Gegenstände abwerfen.`);
  tickFavors(s, p.id);

  // ANNAHME: Während der letzten Züge vor dem Finale gibt es keine Fluchphase mehr.
  if (s.finale && s.finale.stage === 'countdown') {
    if (s.countdownTurn) s.finale.countdown.shift();
    if (!s.finale.countdown.length) {
      s.countdownTurn = false;
      startBattle(s);
      return;
    }
    s.activeIdx = s.turnOrder.indexOf(s.finale.countdown[0]);
    s.countdownTurn = true;
    resetTurn(s);
    log(s, 'system', `Letzter Zug für ${activePlayer(s).name}.`);
    return;
  }

  s.activeIdx++;
  if (s.activeIdx >= s.turnOrder.length) {
    s.activeIdx = 0;
    runCursePhase(s);
    if (s.phase !== 'playing') return;
    s.round++;
  }
  resetTurn(s);
  log(s, 'system', `${s.players[activeId(s)].name} ist am Zug.`);
}

function resetTurn(s: GameState): void {
  s.moved = false;
  s.acted = false;
}
