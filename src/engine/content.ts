// Lädt alle Spieltexte aus /src/content und stellt Nachschlage-Tabellen bereit.
import locations from '../content/locations.json';
import symbols from '../content/symbols.json';
import items from '../content/items.json';
import riddles from '../content/riddles.json';
import topics from '../content/topics.json';
import curseInsults from '../content/curseInsults.json';
import pirates from '../content/pirates.json';
import events from '../content/events.json';
import type {
  Content,
  CurseInsultDef,
  EventDef,
  ItemDef,
  LocationDef,
  LocationId,
  PirateDef,
  RiddleDef,
  SymbolDef,
  TopicDef,
} from './types';

export const CONTENT: Content = {
  locations: locations as LocationDef[],
  symbols: symbols as SymbolDef[],
  items: items as ItemDef[],
  riddles: riddles as RiddleDef[],
  topics: topics as TopicDef[],
  curseInsults: curseInsults as CurseInsultDef[],
  pirates: pirates as PirateDef[],
  events: events as EventDef[],
};

function index<T extends { id: string }>(list: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const e of list) out[e.id] = e;
  return out;
}

export const LOCATIONS = index(CONTENT.locations) as Record<LocationId, LocationDef>;
export const LOCATION_IDS = CONTENT.locations.map((l) => l.id);
export const SYMBOLS = index(CONTENT.symbols);
export const ITEMS = index(CONTENT.items);
export const RIDDLES = index(CONTENT.riddles);
export const TOPICS = index(CONTENT.topics);
export const TOPIC_IDS = CONTENT.topics.map((t) => t.id);
export const CURSE_INSULTS = index(CONTENT.curseInsults);
export const PIRATES = index(CONTENT.pirates);
export const EVENTS = index(CONTENT.events);

/** Prüft die Inhalte auf Vollständigkeit und gültige Querverweise. Liefert Fehlermeldungen. */
export function validateContent(c: Content): string[] {
  const errors: string[] = [];
  const locIds = new Set(c.locations.map((l) => l.id));
  const symIds = new Set(c.symbols.map((s) => s.id));
  const topicIds = new Set(c.topics.map((t) => t.id));
  const unique = (name: string, list: { id: string }[]) => {
    const seen = new Set<string>();
    for (const e of list) {
      if (seen.has(e.id)) errors.push(`${name}: doppelte ID ${e.id}`);
      seen.add(e.id);
    }
  };
  unique('Orte', c.locations);
  unique('Symbole', c.symbols);
  unique('Gegenstände', c.items);
  unique('Rätsel', c.riddles);
  unique('Themen', c.topics);
  unique('Fluch-Beleidigungen', c.curseInsults);
  unique('Piraten', c.pirates);
  unique('Ereignisse', c.events);

  if (c.locations.length !== 8) errors.push('Es müssen genau 8 Orte sein.');
  for (const l of c.locations) {
    for (const n of l.neighbors) {
      if (!locIds.has(n)) errors.push(`Ort ${l.id}: unbekannter Nachbar ${n}`);
      const other = c.locations.find((o) => o.id === n);
      if (other && !other.neighbors.includes(l.id)) errors.push(`Ort ${l.id}–${n}: Verbindung nicht beidseitig`);
    }
  }
  for (const i of c.items) {
    if (!locIds.has(i.location)) errors.push(`Gegenstand ${i.id}: unbekannter Ort`);
    if (!symIds.has(i.symbol)) errors.push(`Gegenstand ${i.id}: unbekanntes Symbol ${i.symbol}`);
  }
  for (const r of c.riddles) {
    if (!locIds.has(r.location)) errors.push(`Rätsel ${r.id}: unbekannter Ort`);
    if (r.symbols.length < 2 || r.symbols.length > 3) errors.push(`Rätsel ${r.id}: braucht 2–3 Symbole`);
    for (const s of r.symbols) if (!symIds.has(s)) errors.push(`Rätsel ${r.id}: unbekanntes Symbol ${s}`);
  }
  for (const f of c.curseInsults) {
    if (!topicIds.has(f.topic)) errors.push(`Fluch-Beleidigung ${f.id}: unbekanntes Thema`);
  }
  for (const p of c.pirates) {
    if (!locIds.has(p.startLocation)) errors.push(`Pirat ${p.id}: unbekannter Startort`);
    if (p.strength < 2 || p.strength > 5) errors.push(`Pirat ${p.id}: Stärke muss 2–5 sein`);
  }
  if (!c.riddles.some((r) => r.curse)) errors.push('Es gibt kein Fluch-Rätsel.');
  if (c.items.filter((i) => i.kind === 'fragment').length < 4) errors.push('Zu wenige Kartenfragmente.');
  if (!c.items.some((i) => i.kind === 'schaufel')) errors.push('Keine Schaufel vorhanden.');
  return errors;
}
