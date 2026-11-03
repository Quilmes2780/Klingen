import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { boatTargets, distance, neighbors, travelTurns } from '../board';
import { applyAction } from '../reducer';
import { endRound, newGame, quietEvents, tweak } from './helpers';

describe('Inselgraph', () => {
  it('ist zusammenhängend', () => {
    for (const a of ['hafen', 'leuchtturm', 'friedhof'] as const) {
      for (const b of ['herrenhaus', 'werft', 'taverne'] as const) expect(distance(a, b)).toBeLessThan(Infinity);
    }
  });

  it('Bootsfahrt verkürzt Wege', () => {
    expect(distance('hafen', 'friedhof')).toBe(3);
    expect(travelTurns('hafen', 'friedhof')).toBe(1);
  });

  it('Boot nur von Küstenorten', () => {
    expect(boatTargets('taverne')).toEqual([]);
    expect(boatTargets('hafen')).toEqual(expect.arrayContaining(['werft', 'friedhof', 'leuchtturm']));
  });
});

describe('Bewegung', () => {
  it('zu einem Nachbarort', () => {
    const s = applyAction(newGame(2), { type: 'MOVE', to: 'taverne' });
    expect(s.players.p1.location).toBe('taverne');
    expect(neighbors('hafen')).toContain('taverne');
  });

  it('nicht zu einem Nicht-Nachbarn', () => {
    expect(() => applyAction(newGame(2), { type: 'MOVE', to: 'friedhof' })).toThrow();
  });

  it('nur einmal pro Zug und nicht nach der Aktion', () => {
    const s = applyAction(newGame(2), { type: 'MOVE', to: 'taverne' });
    expect(() => applyAction(s, { type: 'MOVE', to: 'kraemer' })).toThrow();
    const t = applyAction(newGame(2), { type: 'WORK' });
    expect(() => applyAction(t, { type: 'MOVE', to: 'taverne' })).toThrow();
  });

  it('per Boot für 1 Dublone zu beliebigem Küstenort', () => {
    const s = applyAction(newGame(2), { type: 'BOAT', to: 'friedhof' });
    expect(s.players.p1.location).toBe('friedhof');
    expect(s.players.p1.doubloons).toBe(BALANCE.start.doubloons - BALANCE.economy.boatCost);
  });

  it('Boot ohne Geld nicht möglich', () => {
    const s = tweak(newGame(2), (d) => (d.players.p1.doubloons = 0));
    expect(() => applyAction(s, { type: 'BOAT', to: 'werft' })).toThrow();
  });

  it('Inselpiraten ziehen in der Fluchphase einen Ort weiter', () => {
    const s = tweak(newGame(2), quietEvents);
    const before = s.pirates.map((p) => ({ ...p }));
    const after = endRound(s);
    after.pirates.forEach((p, i) => expect(neighbors(before[i].location)).toContain(p.location));
  });
});
