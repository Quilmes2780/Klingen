// Datenmodell der Spiel-Engine. Alles hier ist serialisierbar (JSON), damit der
// Spielstand in localStorage gespeichert und Partien per Seed reproduziert werden können.

export type LocationId =
  | 'hafen'
  | 'taverne'
  | 'kraemer'
  | 'werft'
  | 'dschungel'
  | 'friedhof'
  | 'herrenhaus'
  | 'leuchtturm';

export type PlayerId = string;
export type ItemId = string;
export type RiddleId = string;
export type TopicId = string;
export type PirateId = string;
export type EventId = string;
export type SymbolId = string;
export type CurseInsultId = string;
export type TrialId = 'klinge' | 'karte' | 'kahn';

export const TRIALS: TrialId[] = ['klinge', 'karte', 'kahn'];

// ---------------------------------------------------------------- Inhalte (JSON)

export interface LocationDef {
  id: LocationId;
  name: string;
  description: string;
  coastal: boolean;
  neighbors: LocationId[];
  x: number;
  y: number;
}

export interface SymbolDef {
  id: SymbolId;
  name: string;
}

export type ItemKind = 'normal' | 'fragment' | 'schaufel';

export interface ItemDef {
  id: ItemId;
  name: string;
  symbol: SymbolId;
  location: LocationId;
  kind: ItemKind;
  flavor: string;
}

export interface RiddleReward {
  fame: number;
  doubloons?: number;
  grants?: 'klingenZugang' | 'schiff';
}

export interface RiddleDef {
  id: RiddleId;
  title: string;
  text: string;
  location: LocationId;
  symbols: SymbolId[];
  curse: boolean;
  reward: RiddleReward;
}

export interface TopicDef {
  id: TopicId;
  name: string;
  insult: string;
  counter: string;
  masterInsult: string;
}

export interface CurseInsultDef {
  id: CurseInsultId;
  topic: TopicId;
  text: string;
}

export interface PirateDef {
  id: PirateId;
  name: string;
  strength: number;
  startLocation: LocationId;
  taunt: string;
}

export type EventEffect =
  | { type: 'curse'; amount: number }
  | { type: 'ghost' }
  | { type: 'doubloons'; amount: number; who: 'all' | 'richest' | 'poorest' | 'atLocation'; location?: LocationId }
  | { type: 'discardRandom'; who: 'all' | 'fullHands'; threshold?: number }
  | { type: 'movePirates' }
  | { type: 'spawnPirate' }
  | { type: 'learnCounter'; who: 'all' | 'poorest' }
  | { type: 'relocate'; from: LocationId; to: LocationId }
  | { type: 'refreshRiddles' }
  | { type: 'restockShop' }
  | { type: 'none' };

export interface EventDef {
  id: EventId;
  title: string;
  text: string;
  effect: EventEffect;
}

export interface Content {
  locations: LocationDef[];
  symbols: SymbolDef[];
  items: ItemDef[];
  riddles: RiddleDef[];
  topics: TopicDef[];
  curseInsults: CurseInsultDef[];
  pirates: PirateDef[];
  events: EventDef[];
}

// ---------------------------------------------------------------- Spielzustand

export interface FameBreakdown {
  trials: number;
  riddles: number;
  duels: number;
  ious: number;
  finale: number;
  bonus: number;
}

export type PlayerKind = 'human' | 'ai';

export interface PlayerState {
  id: PlayerId;
  name: string;
  kind: PlayerKind;
  location: LocationId;
  doubloons: number;
  items: ItemId[];
  counters: TopicId[];
  crew: PirateId[];
  hasShip: boolean;
  klingenZugang: boolean;
  trials: Record<TrialId, boolean>;
  fame: FameBreakdown;
}

export interface ActivePirate {
  id: PirateId;
  location: LocationId;
}

export interface Favor {
  giver: PlayerId;
  receiver: PlayerId;
  itemId: ItemId;
  /** Wie viele Zugenden des Empfängers die Gefälligkeit noch überlebt. */
  turnsLeft: number;
}

export type DuelSide =
  | { kind: 'player'; playerId: PlayerId }
  | { kind: 'pirate'; pirateId: PirateId; strength: number }
  | { kind: 'master' };

export type DuelKind = 'pirate' | 'player' | 'master';

export interface DuelExchange {
  attacker: 0 | 1;
  topic: TopicId;
  /** Vom Verteidiger gespielter Konter (null = keiner). Bei Piraten: das Thema, falls pariert. */
  counter: TopicId | null;
  parried: boolean;
}

export interface DuelState {
  kind: DuelKind;
  sides: [DuelSide, DuelSide];
  hits: [number, number];
  attacker: 0 | 1;
  /** pick = Angreifer wählt Thema, counter = Verteidiger antwortet, over = beendet */
  stage: 'pick' | 'counter' | 'over';
  topic: TopicId | null;
  used: TopicId[];
  heard: [TopicId[], TopicId[]];
  exchanges: DuelExchange[];
  winner: 0 | 1 | null;
  location: LocationId;
  /** Nach dem Duell gelernte Konter je Seite (für Anzeige). */
  learned: [TopicId[], TopicId[]];
}

export interface FinaleExchange {
  insult: CurseInsultId;
  counteredBy: PlayerId | null;
}

export interface FinaleState {
  stage: 'countdown' | 'battle' | 'over';
  triggeredBy: PlayerId;
  /** Spieler, die ihren letzten Zug noch nicht gemacht haben (in Reihenfolge). */
  countdown: PlayerId[];
  participants: PlayerId[];
  insultDeck: CurseInsultId[];
  current: CurseInsultId | null;
  attackNo: number;
  askIdx: number;
  counters: number;
  hits: number;
  exchanges: FinaleExchange[];
  won: boolean | null;
}

export type Phase = 'playing' | 'finale' | 'won' | 'lost';
export type GameMode = 'multi' | 'solo';

export type LogKind = 'info' | 'ai' | 'event' | 'curse' | 'duel' | 'system' | 'riddle' | 'trial';

export interface LogEntry {
  round: number;
  kind: LogKind;
  text: string;
}

export interface GameStats {
  klingeCounters: number[];
  curseRiddlesSolved: number;
  riddlesSolved: number;
  duelsFought: number;
}

export interface GameState {
  version: 1;
  seed: string;
  rng: number;
  mode: GameMode;
  round: number;
  turnOrder: PlayerId[];
  activeIdx: number;
  moved: boolean;
  acted: boolean;
  /** Läuft gerade der letzte Zug vor dem Finale? */
  countdownTurn: boolean;
  players: Record<PlayerId, PlayerState>;
  curse: number;
  cursePhasesDone: number;
  pirates: ActivePirate[];
  pirateDeck: PirateId[];
  locationDecks: Record<LocationId, ItemId[]>;
  discard: ItemId[];
  shop: ItemId[];
  eventDeck: EventId[];
  eventDiscard: EventId[];
  riddleDeck: RiddleId[];
  riddleDiscard: RiddleId[];
  riddleDisplay: RiddleId[];
  treasureLocation: LocationId;
  favors: Favor[];
  duel: DuelState | null;
  lastDuel: DuelState | null;
  finale: FinaleState | null;
  phase: Phase;
  lostReason: string | null;
  lastEvents: EventId[];
  log: LogEntry[];
  stats: GameStats;
}

// ---------------------------------------------------------------- Aktionen

interface Noted {
  /** Optionaler Kommentar (z. B. Begründung der KI), wird ins Protokoll geschrieben. */
  note?: string;
}

export type Action = Noted &
  (
    | { type: 'MOVE'; to: LocationId }
    | { type: 'BOAT'; to: LocationId }
    | { type: 'SEARCH' }
    | { type: 'WORK' }
    | { type: 'SOLVE_RIDDLE'; riddleId: RiddleId }
    | { type: 'DUEL_PIRATE'; pirateId: PirateId }
    | { type: 'DUEL_PLAYER'; playerId: PlayerId }
    | { type: 'BUY_ITEM'; itemId: ItemId }
    | { type: 'BUY_COUNTER'; topicId: TopicId }
    | { type: 'BUY_SHIP' }
    | { type: 'TRIAL'; trial: TrialId }
    | { type: 'GIVE'; from: PlayerId; to: PlayerId; itemId: ItemId }
    | { type: 'TRADE'; a: PlayerId; itemA: ItemId; b: PlayerId; itemB: ItemId }
    | { type: 'DISCARD'; playerId: PlayerId; itemId: ItemId }
    | { type: 'END_TURN' }
    | { type: 'DUEL_PICK'; topicId: TopicId }
    | { type: 'DUEL_COUNTER'; topicId: TopicId | null }
    | { type: 'FINALE_RESPOND'; topicId: TopicId | null }
  );

export type ActionType = Action['type'];

export interface PlayerSetup {
  name: string;
  kind: PlayerKind;
}

export interface GameConfig {
  players: PlayerSetup[];
  seed: string;
}

export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleError';
  }
}
