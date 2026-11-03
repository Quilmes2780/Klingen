import { BALANCE } from '../config/balance';
import { CONTENT, LOCATION_IDS, TOPIC_IDS } from './content';
import { initialPirates } from './board';
import { refillShop } from './items';
import { refillRiddles } from './riddles';
import { pick, seedToNumber, shuffle } from './rng';
import type { GameConfig, GameState, ItemId, LocationId, PlayerState } from './types';
import { log } from './util';

export function createGame(config: GameConfig): GameState {
  const n = config.players.length;
  if (n < BALANCE.players.min || n > BALANCE.players.max) {
    throw new Error(`Es werden ${BALANCE.players.min}–${BALANCE.players.max} Personen benötigt.`);
  }
  const mode = n === 1 ? 'solo' : 'multi';
  const holder = { rng: seedToNumber(config.seed) };

  const locationDecks = {} as Record<LocationId, ItemId[]>;
  for (const l of LOCATION_IDS) {
    locationDecks[l] = shuffle(holder, CONTENT.items.filter((i) => i.location === l).map((i) => i.id));
  }

  const players: Record<string, PlayerState> = {};
  const turnOrder: string[] = [];
  config.players.forEach((ps, i) => {
    const id = `p${i + 1}`;
    turnOrder.push(id);
    players[id] = {
      id,
      name: ps.name.trim() || `Person ${i + 1}`,
      kind: ps.kind,
      location: BALANCE.start.location,
      doubloons: mode === 'solo' ? BALANCE.solo.startDoubloons : BALANCE.start.doubloons,
      items: [],
      counters: shuffle(holder, TOPIC_IDS).slice(0, BALANCE.start.counters),
      crew: [],
      hasShip: false,
      klingenZugang: false,
      trials: { klinge: false, karte: false, kahn: false },
      fame: { trials: 0, riddles: 0, duels: 0, ious: 0, finale: 0, bonus: 0 },
    };
  });

  const s: GameState = {
    version: 1,
    seed: config.seed,
    rng: holder.rng,
    mode,
    round: 1,
    turnOrder,
    activeIdx: 0,
    moved: false,
    acted: false,
    countdownTurn: false,
    players,
    curse: 0,
    cursePhasesDone: 0,
    pirates: [],
    pirateDeck: shuffle(holder, CONTENT.pirates.map((p) => p.id)),
    locationDecks,
    discard: [],
    shop: [],
    eventDeck: shuffle(holder, CONTENT.events.map((e) => e.id)),
    eventDiscard: [],
    riddleDeck: shuffle(holder, CONTENT.riddles.map((r) => r.id)),
    riddleDiscard: [],
    riddleDisplay: [],
    // ANNAHME: Der Schatz liegt nie im Hafen-Startfeld.
    treasureLocation: pick(holder, LOCATION_IDS.filter((l) => l !== 'hafen')),
    favors: [],
    duel: null,
    lastDuel: null,
    finale: null,
    phase: 'playing',
    lostReason: null,
    lastEvents: [],
    log: [],
    stats: { klingeCounters: [], curseRiddlesSolved: 0, riddlesSolved: 0, duelsFought: 0 },
  };
  s.rng = holder.rng;
  initialPirates(s);
  refillRiddles(s);
  refillShop(s);
  log(s, 'system', `Neue Partie mit Seed „${config.seed}“. ${mode === 'solo' ? 'Solo gegen den Fluch.' : `${n} Personen auf der Insel.`}`);
  return s;
}
