// Die drei Prüfungen: Klinge, Karte, Kahn.
import { BALANCE } from '../config/balance';
import { ITEMS, LOCATION_IDS } from './content';
import { startMasterDuel } from './duel';
import { triggerFinale } from './finale';
import { beginAction, returnFragment } from './items';
import { pick } from './rng';
import type { GameState, PlayerId, PlayerState, TrialId } from './types';
import { activePlayer, countKind, ensure, locName, log, trialsPassed } from './util';

export const TRIAL_NAMES: Record<TrialId, string> = {
  klinge: 'Prüfung der Klinge',
  karte: 'Prüfung der Karte',
  kahn: 'Prüfung des Kahns',
};

export function passTrial(s: GameState, playerId: PlayerId, trial: TrialId): void {
  const p = s.players[playerId];
  if (p.trials[trial]) return;
  p.trials[trial] = true;
  p.fame.trials += BALANCE.fame.trial;
  log(s, 'trial', `${p.name} besteht die ${TRIAL_NAMES[trial]} (+${BALANCE.fame.trial} Ruhm).`);
  if (trialsPassed(p) === 3) {
    p.fame.bonus += BALANCE.fame.thirdTrialBonus;
    log(s, 'trial', `${p.name} hat alle drei Prüfungen bestanden (+${BALANCE.fame.thirdTrialBonus} Bonus)!`);
    if (!s.finale) triggerFinale(s, playerId);
  }
}

/** Warum eine Prüfung (noch) nicht möglich ist – null, wenn sie jetzt abgelegt werden kann. */
export function trialBlocker(s: GameState, p: PlayerState, trial: TrialId): string | null {
  if (p.trials[trial]) return 'Bereits bestanden.';
  switch (trial) {
    case 'klinge':
      if (!p.klingenZugang) return 'Zugang zur Meisterin fehlt (über ein Rätsel).';
      if (p.location !== 'herrenhaus') return `Die Meisterin wartet bei ${locName('herrenhaus')}.`;
      return null;
    case 'karte':
      if (countKind(p, 'fragment') < BALANCE.trials.fragmentsNeeded)
        return `Es fehlen Kartenfragmente (${countKind(p, 'fragment')}/${BALANCE.trials.fragmentsNeeded}).`;
      if (countKind(p, 'schaufel') < 1) return 'Eine Schaufel fehlt.';
      if (p.location !== s.treasureLocation) return 'Hier liegt der Schatz nicht.';
      return null;
    case 'kahn':
      if (!p.hasShip) return 'Du brauchst ein Schiff.';
      if (p.crew.length < BALANCE.trials.crewNeeded) return `Es fehlt Mannschaft (${p.crew.length}/${BALANCE.trials.crewNeeded}).`;
      if (p.location !== 'hafen') return `Der Kahn legt im ${locName('hafen')} ab.`;
      return null;
  }
}

export function applyTrial(s: GameState, trial: TrialId): void {
  const p = activePlayer(s);
  const blocker = trialBlocker(s, p, trial);
  ensure(!blocker, blocker ?? '');
  beginAction(s);
  if (trial === 'klinge') {
    startMasterDuel(s);
    return;
  }
  if (trial === 'karte') {
    const fragments = p.items.filter((i) => ITEMS[i].kind === 'fragment').slice(0, BALANCE.trials.fragmentsNeeded);
    p.items = p.items.filter((i) => !fragments.includes(i));
    // Die Fragmente werden neu auf der Insel verteilt, der Schatz liegt danach woanders.
    for (const f of fragments) returnFragment(s, f);
    const old = s.treasureLocation;
    s.treasureLocation = pick(s, LOCATION_IDS.filter((l) => l !== old));
    p.doubloons += BALANCE.economy.treasureDoubloons;
    log(s, 'trial', `${p.name} hebt den Schatz bei ${locName(old)} (+${BALANCE.economy.treasureDoubloons} Dublonen). Die Kartenfragmente verstreuen sich neu.`);
    passTrial(s, p.id, 'karte');
    return;
  }
  log(s, 'trial', `${p.name} sticht mit Schiff und ${p.crew.length} Mann Besatzung in See.`);
  passTrial(s, p.id, 'kahn');
}
