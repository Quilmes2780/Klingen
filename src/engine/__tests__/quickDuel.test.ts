import { describe, expect, it } from 'vitest';
import { PIRATES } from '../content';
import { createQuickDuel, quickCounter, quickPick, startingCounters } from '../quickDuel';

describe('Schnellmodus', () => {
  it('startet ein Duell gegen einen Piraten, die Person greift zuerst an', () => {
    const q = createQuickDuel('s', ['geruch'], 'p1');
    expect(q.duel.sides[1]).toMatchObject({ kind: 'pirate', strength: PIRATES.p1.strength });
    expect(q.duel.stage).toBe('pick');
    expect(q.duel.attacker).toBe(0);
  });

  it('ist rein: der alte Zustand bleibt unverändert', () => {
    const q = createQuickDuel('s', [], 'p1');
    const copy = structuredClone(q);
    quickPick(q, 'geruch');
    expect(q).toEqual(copy);
  });

  it('läuft bis zum Ende, zählt Siege/Niederlagen und lernt gehörte Konter', () => {
    let q = createQuickDuel('lernen', [], 'p8'); // Stärke 5: pariert oft
    for (let i = 0; i < 60 && q.duel.stage !== 'over'; i++) {
      if (q.duel.stage === 'pick') {
        const free = ['geruch', 'schiff', 'fechtkunst', 'mannschaft', 'verstand', 'aussehen', 'mut', 'gesang', 'kochkunst', 'reichtum', 'kraft', 'navigation', 'kleidung', 'papagei', 'ruhm', 'tanz'].find((t) => !q.duel.used.includes(t))!;
        q = quickPick(q, free);
      } else q = quickCounter(q, null);
    }
    expect(q.duel.stage).toBe('over');
    expect(q.wins + q.losses).toBe(1);
    expect(q.counters).toEqual(expect.arrayContaining([...new Set(q.duel.heard[0])]));
    expect(q.learned.length).toBe(new Set(q.duel.heard[0]).size);
  });

  it('unbekannte Konter dürfen nicht gespielt werden', () => {
    let q = createQuickDuel('x', [], 'p8');
    for (let i = 0; i < 10 && q.duel.stage === 'pick'; i++) q = quickPick(q, ['geruch', 'schiff', 'tanz', 'mut', 'ruhm'][i]);
    if (q.duel.stage === 'counter') expect(() => quickCounter(q, 'geruch')).toThrow();
  });

  it('Startkonter sind seedbar', () => {
    expect(startingCounters('a')).toEqual(startingCounters('a'));
    expect(startingCounters('a')).toHaveLength(3);
  });
});
