import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { RIDDLES } from '../content';
import { applyAction } from '../reducer';
import { createGame } from '../setup';
import { endRound, newGame, quietEvents, tweak } from './helpers';

describe('Spielaufbau', () => {
  it('ist mit gleichem Seed identisch, mit anderem verschieden', () => {
    expect(newGame(3, 'abc')).toEqual(newGame(3, 'abc'));
    expect(newGame(3, 'abc').riddleDisplay).not.toEqual(newGame(3, 'xyz').riddleDisplay);
  });

  it('setzt Startwerte', () => {
    const s = newGame(4);
    expect(s.turnOrder).toHaveLength(4);
    for (const p of Object.values(s.players)) {
      expect(p.location).toBe('hafen');
      expect(p.doubloons).toBe(BALANCE.start.doubloons);
      expect(p.counters).toHaveLength(BALANCE.start.counters);
      expect(p.items).toHaveLength(0);
    }
    expect(s.curse).toBe(0);
    expect(s.round).toBe(1);
    expect(s.pirates).toHaveLength(BALANCE.pirates.activeOnBoard);
    expect(s.riddleDisplay).toHaveLength(5);
    expect(s.riddleDisplay.some((r) => RIDDLES[r].curse)).toBe(true);
    expect(s.shop).toHaveLength(BALANCE.economy.shopSize);
  });

  it('lehnt ungültige Spielerzahlen ab', () => {
    expect(() => createGame({ seed: 'x', players: [] })).toThrow();
    expect(() => createGame({ seed: 'x', players: Array(6).fill({ name: 'a', kind: 'human' }) })).toThrow();
  });

  it('Solo-Modus mit einer Person', () => {
    const s = newGame(1);
    expect(s.mode).toBe('solo');
    expect(s.players.p1.doubloons).toBe(BALANCE.solo.startDoubloons);
  });
});

describe('Rundenablauf', () => {
  it('wechselt reihum und löst nach voller Runde die Fluchphase aus', () => {
    let s = tweak(newGame(3), quietEvents);
    s = applyAction(s, { type: 'END_TURN' });
    expect(s.activeIdx).toBe(1);
    expect(s.curse).toBe(0);
    s = applyAction(s, { type: 'END_TURN' });
    s = applyAction(s, { type: 'END_TURN' });
    expect(s.activeIdx).toBe(0);
    expect(s.round).toBe(2);
    expect(s.curse).toBe(BALANCE.curse.perRound);
  });

  it('erlaubt genau eine Aktion pro Zug', () => {
    let s = newGame(2);
    s = applyAction(s, { type: 'WORK' });
    expect(() => applyAction(s, { type: 'WORK' })).toThrow(/bereits eine Aktion/);
  });

  it('Feld 15 bedeutet: alle verlieren', () => {
    let s = tweak(newGame(2), (d) => {
      quietEvents(d);
      d.curse = 14;
    });
    s = endRound(s);
    expect(s.curse).toBe(15);
    expect(s.phase).toBe('lost');
    expect(() => applyAction(s, { type: 'END_TURN' })).toThrow();
  });

  it('Solo: Schonfrist in den ersten Fluchphasen', () => {
    let s = tweak(newGame(1), quietEvents);
    for (let i = 0; i < BALANCE.solo.curseGraceRounds; i++) s = endRound(s);
    expect(s.curse).toBe(0);
    s = endRound(s);
    expect(s.curse).toBe(1);
  });

  it('Zustand bleibt unverändert (reine Funktion)', () => {
    const s = newGame(2);
    const copy = structuredClone(s);
    applyAction(s, { type: 'WORK' });
    expect(s).toEqual(copy);
  });
});
