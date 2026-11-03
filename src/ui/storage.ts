// Spielstand in localStorage. Alle Zugriffe abgesichert (privater Modus, volle Quote …).
import type { GameState, TopicId } from '../engine/types';

const GAME_KEY = 'kk-spielstand-v1';
const QUICK_KEY = 'kk-schnellmodus-v1';
const PREFS_KEY = 'kk-einstellungen-v1';

export function saveGame(s: GameState): void {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(s));
  } catch {
    /* Speichern nicht möglich – Spiel läuft trotzdem weiter. */
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s && s.version === 1 ? s : null;
  } catch {
    return null;
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(GAME_KEY);
  } catch {
    /* egal */
  }
}

export interface QuickRecord {
  counters: TopicId[];
  wins: number;
  losses: number;
}

export function loadQuick(): QuickRecord | null {
  try {
    const raw = localStorage.getItem(QUICK_KEY);
    return raw ? (JSON.parse(raw) as QuickRecord) : null;
  } catch {
    return null;
  }
}

export function saveQuick(r: QuickRecord): void {
  try {
    localStorage.setItem(QUICK_KEY, JSON.stringify(r));
  } catch {
    /* egal */
  }
}

export function clearQuick(): void {
  try {
    localStorage.removeItem(QUICK_KEY);
  } catch {
    /* egal */
  }
}

export interface Prefs {
  speech: boolean;
  aiDelay: number;
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { speech: false, aiDelay: 600, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    /* Standard */
  }
  return { speech: false, aiDelay: 600 };
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* egal */
  }
}
