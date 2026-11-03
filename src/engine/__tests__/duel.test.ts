import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { autoAdvance, createDuel, duelCounter, duelPick, unusedTopics } from '../duel';
import { getLegalActions } from '../legal';
import { applyAction } from '../reducer';
import type { DuelState, GameState } from '../types';
import { newGame, run, tweak } from './helpers';

const rng = () => ({ rng: 42 });

function pirateDuel(strength: number): DuelState {
  return createDuel('pirate', [{ kind: 'player', playerId: 'p1' }, { kind: 'pirate', pirateId: 'p1x', strength }], 'hafen');
}

describe('Wortgefecht-Kern', () => {
  it('schwacher Pirat (pariert nie): 3 Treffer gewinnen', () => {
    const d = pirateDuel(0);
    const h = rng();
    duelPick(d, 'geruch', h);
    duelPick(d, 'schiff', h);
    expect(d.hits).toEqual([2, 0]);
    duelPick(d, 'tanz', h);
    expect(d.stage).toBe('over');
    expect(d.winner).toBe(0);
  });

  it('jedes Thema nur einmal pro Duell', () => {
    const d = pirateDuel(0);
    duelPick(d, 'geruch', rng());
    expect(() => duelPick(d, 'geruch', rng())).toThrow();
  });

  it('pariert der Pirat, wechselt der Angriff und der Konter wird gehört', () => {
    const d = pirateDuel(6); // W6 <= 6: pariert immer
    const h = rng();
    duelPick(d, 'geruch', h);
    expect(d.heard[0]).toEqual(['geruch']);
    expect(d.attacker).toBe(1);
    expect(d.stage).toBe('counter');
    expect(d.topic).not.toBeNull();
    expect(d.topic).not.toBe('geruch');
  });

  it('passender Konter pariert, fehlender kassiert Treffer', () => {
    const d = pirateDuel(6);
    const h = rng();
    duelPick(d, 'geruch', h);
    const t = d.topic!;
    duelCounter(d, t, () => true, h);
    expect(d.hits).toEqual([0, 0]);
    expect(d.attacker).toBe(0);
    duelPick(d, 'schiff', h);
    duelCounter(d, null, () => true, h);
    expect(d.hits).toEqual([0, 1]);
    // Pirat greift nach einem Treffer erneut an.
    expect(d.attacker).toBe(1);
    expect(d.stage).toBe('counter');
  });

  it('nur besessene Konter dürfen gespielt werden', () => {
    const d = pirateDuel(6);
    duelPick(d, 'geruch', rng());
    expect(() => duelCounter(d, d.topic, () => false, rng())).toThrow();
  });

  it('Meisterin greift nur an: Konter = Treffer für Person, sonst für sie', () => {
    const d = createDuel('master', [{ kind: 'player', playerId: 'p1' }, { kind: 'master' }], 'herrenhaus');
    const h = rng();
    autoAdvance(d, h);
    expect(d.stage).toBe('counter');
    duelCounter(d, d.topic, () => true, h);
    expect(d.hits).toEqual([1, 0]);
    expect(d.attacker).toBe(1);
    duelCounter(d, null, () => true, h);
    expect(d.hits).toEqual([1, 1]);
    duelCounter(d, d.topic, () => true, h);
    duelCounter(d, d.topic, () => true, h);
    expect(d.winner).toBe(0);
    expect(d.used.length).toBe(4);
    expect(unusedTopics(d)).toHaveLength(12);
  });
});

function boardDuel(strength: number, location: GameState['players'][string]['location'] = 'hafen'): GameState {
  return tweak(newGame(2), (d) => {
    d.pirates = [{ id: 'p1', location }];
    d.pirateDeck = ['p2'];
    d.players.p1.location = location;
    d.players.p2.location = 'werft';
    d.players.p1.counters = [];
    // Stärke über die Inhaltsdaten ist fest; für Tests wird die Duellseite gesetzt.
    void strength;
  });
}

function forceStrength(s: GameState, strength: number): GameState {
  return tweak(s, (d) => {
    if (d.duel && d.duel.sides[1].kind === 'pirate') d.duel.sides[1].strength = strength;
  });
}

describe('Wortgefecht auf dem Brett', () => {
  it('Sieg: +1 Ruhm, Pirat wird Mannschaft, neuer Pirat erscheint', () => {
    let s = forceStrength(applyAction(boardDuel(0), { type: 'DUEL_PIRATE', pirateId: 'p1' }), 0);
    expect(s.acted).toBe(true);
    s = run(s, { type: 'DUEL_PICK', topicId: 'geruch' }, { type: 'DUEL_PICK', topicId: 'schiff' }, { type: 'DUEL_PICK', topicId: 'tanz' });
    expect(s.duel).toBeNull();
    expect(s.players.p1.fame.duels).toBe(BALANCE.fame.duelWin);
    expect(s.players.p1.crew).toEqual(['p1']);
    expect(s.pirates.map((p) => p.id)).toEqual(['p2']);
  });

  it('Sieg auf dem Friedhof senkt den Fluch um 1', () => {
    let s = tweak(boardDuel(0, 'friedhof'), (d) => (d.curse = 5));
    s = forceStrength(applyAction(s, { type: 'DUEL_PIRATE', pirateId: 'p1' }), 0);
    s = run(s, { type: 'DUEL_PICK', topicId: 'geruch' }, { type: 'DUEL_PICK', topicId: 'schiff' }, { type: 'DUEL_PICK', topicId: 'tanz' });
    expect(s.curse).toBe(4);
  });

  it('Niederlage kostet 1 Dublone; gehörte Konter werden gelernt', () => {
    let s = forceStrength(applyAction(boardDuel(6), { type: 'DUEL_PIRATE', pirateId: 'p1' }), 6);
    s = applyAction(s, { type: 'DUEL_PICK', topicId: 'geruch' }); // pariert → Pirat greift an
    for (let i = 0; i < 3 && s.duel; i++) s = applyAction(s, { type: 'DUEL_COUNTER', topicId: null });
    expect(s.duel).toBeNull();
    expect(s.lastDuel?.winner).toBe(1);
    expect(s.players.p1.doubloons).toBe(BALANCE.start.doubloons - BALANCE.economy.duelLossPenalty);
    expect(s.players.p1.counters).toEqual(['geruch']);
    expect(s.lastDuel?.learned[0]).toEqual(['geruch']);
    expect(s.players.p1.crew).toEqual([]);
  });

  it('nur mit Piraten am selben Ort', () => {
    const s = tweak(boardDuel(3), (d) => (d.pirates[0].location = 'werft'));
    expect(() => applyAction(s, { type: 'DUEL_PIRATE', pirateId: 'p1' })).toThrow();
  });

  it('legale Aktionen im Duell: nur Themenwahl bzw. Konter', () => {
    const s = applyAction(boardDuel(3), { type: 'DUEL_PIRATE', pirateId: 'p1' });
    const legal = getLegalActions(s);
    expect(legal.every((a) => a.type === 'DUEL_PICK')).toBe(true);
    expect(legal).toHaveLength(16);
    expect(() => applyAction(s, { type: 'END_TURN' })).toThrow();
  });

  it('Duell zwischen Personen: Sieger +1 Ruhm, Verlierer zahlt 1 Dublone', () => {
    let s = tweak(newGame(2), (d) => {
      d.players.p1.counters = [];
      d.players.p2.counters = [];
    });
    s = applyAction(s, { type: 'DUEL_PLAYER', playerId: 'p2' });
    s = run(
      s,
      { type: 'DUEL_PICK', topicId: 'geruch' },
      { type: 'DUEL_COUNTER', topicId: null },
      { type: 'DUEL_PICK', topicId: 'schiff' },
      { type: 'DUEL_COUNTER', topicId: null },
      { type: 'DUEL_PICK', topicId: 'tanz' },
      { type: 'DUEL_COUNTER', topicId: null },
    );
    expect(s.duel).toBeNull();
    expect(s.players.p1.fame.duels).toBe(1);
    expect(s.players.p1.doubloons).toBe(BALANCE.start.doubloons + 1);
    expect(s.players.p2.doubloons).toBe(BALANCE.start.doubloons - 1);
  });

  it('Duell zwischen Personen: Parade wechselt den Angriff, Angreifer lernt den Konter', () => {
    let s = tweak(newGame(2), (d) => {
      d.players.p1.counters = [];
      d.players.p2.counters = ['geruch'];
    });
    s = run(s, { type: 'DUEL_PLAYER', playerId: 'p2' }, { type: 'DUEL_PICK', topicId: 'geruch' }, { type: 'DUEL_COUNTER', topicId: 'geruch' });
    expect(s.duel!.attacker).toBe(1);
    expect(s.duel!.heard[0]).toEqual(['geruch']);
  });
});

describe('Protokoll', () => {
  it('ein falscher Konter wird als „passt nicht“ protokolliert', () => {
    let s = tweak(newGame(2), (d) => {
      d.players.p1.counters = [];
      d.players.p2.counters = ['tanz'];
    });
    s = run(s, { type: 'DUEL_PLAYER', playerId: 'p2' }, { type: 'DUEL_PICK', topicId: 'geruch' }, { type: 'DUEL_COUNTER', topicId: 'tanz' });
    expect(s.log.at(-1)?.text).toContain('kontert mit „Tanz“ – passt nicht');
  });
});
