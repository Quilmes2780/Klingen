// Einziger Einstiegspunkt für Zustandsänderungen: (state, action) -> newState.
import { applyBoat, applyMove } from './board';
import { applyDuelCounter, applyDuelPick, applyDuelPirate, applyDuelPlayer } from './duel';
import { applyFinaleRespond } from './finale';
import { applyBuyCounter, applyBuyItem, applyBuyShip, applyDiscard, applyGive, applySearch, applyTrade, applyWork } from './items';
import { applySolveRiddle } from './riddles';
import { applyTrial } from './trials';
import { applyEndTurn } from './turn';
import type { Action, GameState } from './types';
import { currentActorId } from './legal';
import { draft, ensure, log } from './util';

export function applyAction(state: GameState, action: Action): GameState {
  ensure(state.phase === 'playing' || state.phase === 'finale', 'Die Partie ist beendet.');
  const s = draft(state);
  if (action.note) {
    const actor = currentActorId(s);
    log(s, 'ai', `${actor ? s.players[actor].name : 'KI'} (KI): ${action.note}`);
  }
  switch (action.type) {
    case 'MOVE':
      applyMove(s, action.to);
      break;
    case 'BOAT':
      applyBoat(s, action.to);
      break;
    case 'SEARCH':
      applySearch(s);
      break;
    case 'WORK':
      applyWork(s);
      break;
    case 'SOLVE_RIDDLE':
      applySolveRiddle(s, action.riddleId);
      break;
    case 'DUEL_PIRATE':
      applyDuelPirate(s, action.pirateId);
      break;
    case 'DUEL_PLAYER':
      applyDuelPlayer(s, action.playerId);
      break;
    case 'BUY_ITEM':
      applyBuyItem(s, action.itemId);
      break;
    case 'BUY_COUNTER':
      applyBuyCounter(s, action.topicId);
      break;
    case 'BUY_SHIP':
      applyBuyShip(s);
      break;
    case 'TRIAL':
      applyTrial(s, action.trial);
      break;
    case 'GIVE':
      applyGive(s, action.from, action.to, action.itemId);
      break;
    case 'TRADE':
      applyTrade(s, action.a, action.itemA, action.b, action.itemB);
      break;
    case 'DISCARD':
      applyDiscard(s, action.playerId, action.itemId);
      break;
    case 'END_TURN':
      applyEndTurn(s);
      break;
    case 'DUEL_PICK':
      applyDuelPick(s, action.topicId);
      break;
    case 'DUEL_COUNTER':
      applyDuelCounter(s, action.topicId);
      break;
    case 'FINALE_RESPOND':
      applyFinaleRespond(s, action.topicId);
      break;
    default: {
      const never: never = action;
      throw new Error(`Unbekannte Aktion ${(never as Action).type}`);
    }
  }
  return s;
}
