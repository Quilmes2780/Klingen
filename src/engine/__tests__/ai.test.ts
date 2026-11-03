import { describe, expect, it } from 'vitest';
import { chooseAction } from '../ai/ai';
import { playAiGame } from '../ai/autoplay';
import { masterWinChance, pirateWinChance } from '../ai/heuristics';
import { CURSE_INSULTS } from '../content';
import { getLegalActions, isGameOver } from '../legal';
import { applyAction } from '../reducer';
import type { Action, GameState } from '../types';
import { newGame, tweak } from './helpers';

const sameAction = (a: Action, b: Action) => {
  const { note: _n1, ...x } = a;
  const { note: _n2, ...y } = b;
  return JSON.stringify(x) === JSON.stringify(y);
};

describe('KI', () => {
  it('wählt in ganzen Partien immer eine legale Aktion', () => {
    let s = newGame(4, 'ki-legal', 'ai');
    for (let i = 0; i < 3000 && !isGameOver(s); i++) {
      const a = chooseAction(s);
      expect(getLegalActions(s).some((l) => sameAction(l, a))).toBe(true);
      s = applyAction(s, a);
    }
  });

  it('Partien enden für 2–5 Personen', () => {
    for (let n = 2; n <= 5; n++) expect(isGameOver(playAiGame(n, `ende-${n}`))).toBe(true);
  });

  it('ist deterministisch bei gleichem Seed', () => {
    expect(playAiGame(3, 'det').log).toEqual(playAiGame(3, 'det').log);
  });

  it('kommentiert Züge im Protokoll', () => {
    const s = playAiGame(2, 'notes');
    expect(s.log.some((l) => l.kind === 'ai')).toBe(true);
  });

  it('bei hohem Fluch hat ein lösbares Fluch-Rätsel Vorrang vor einem normalen', () => {
    const s = tweak(newGame(2, 'x', 'ai'), (d) => {
      d.curse = 12;
      d.riddleDisplay = ['r14', 'r01'];
      d.players.p1.items = ['i02', 'i05', 'i41', 'i01', 'i04'];
    });
    const a = chooseAction(s);
    expect(a).toMatchObject({ type: 'SOLVE_RIDDLE', riddleId: 'r01' });
  });

  it('macht Gefälligkeiten: schenkt, was einem Mitspieler zum Rätsel fehlt', () => {
    const s = tweak(newGame(2, 'x', 'ai'), (d) => {
      d.curse = 9;
      d.riddleDisplay = ['r14', 'r01'];
      d.players.p1.items = ['i05'];
      d.players.p2.items = ['i02'];
    });
    expect(chooseAction(s)).toMatchObject({ type: 'GIVE', from: 'p1', to: 'p2', itemId: 'i05' });
  });

  it('bündelt Kartenfragmente bei der Person mit den meisten', () => {
    const s = tweak(newGame(2, 'x', 'ai'), (d) => {
      d.players.p1.items = ['i28'];
      d.players.p2.items = ['i34', 'i40'];
    });
    expect(chooseAction(s)).toMatchObject({ type: 'GIVE', from: 'p1', to: 'p2', itemId: 'i28' });
  });

  it('kontert im Duell mit dem passenden Konter', () => {
    let s: GameState = tweak(newGame(2, 'x', 'ai'), (d) => {
      d.pirates = [{ id: 'p1', location: 'hafen' }];
      d.players.p1.counters = ['geruch', 'schiff', 'fechtkunst', 'mannschaft', 'verstand', 'aussehen', 'mut', 'gesang', 'kochkunst', 'reichtum', 'kraft', 'navigation', 'kleidung', 'papagei', 'ruhm', 'tanz'];
    });
    s = applyAction(s, { type: 'DUEL_PIRATE', pirateId: 'p1' });
    for (let i = 0; i < 40 && s.duel; i++) {
      const a = chooseAction(s);
      if (s.duel.stage === 'counter') expect(a).toEqual({ type: 'DUEL_COUNTER', topicId: s.duel.topic });
      s = applyAction(s, a);
    }
    expect(s.lastDuel?.hits[1]).toBe(0);
  });

  it('antwortet im Finale nur mit passendem Konter', () => {
    const s = tweak(newGame(2, 'x', 'ai'), (d) => {
      d.phase = 'finale';
      d.finale = {
        stage: 'battle',
        triggeredBy: 'p1',
        countdown: [],
        participants: ['p1'],
        insultDeck: [],
        current: 'f1',
        attackNo: 0,
        askIdx: 0,
        counters: 0,
        hits: 0,
        exchanges: [],
        won: null,
      };
      d.players.p1.counters = [CURSE_INSULTS.f1.topic];
    });
    expect(chooseAction(s)).toEqual({ type: 'FINALE_RESPOND', topicId: CURSE_INSULTS.f1.topic });
    const without = tweak(s, (d) => (d.players.p1.counters = []));
    expect(chooseAction(without)).toEqual({ type: 'FINALE_RESPOND', topicId: null });
  });

  it('Siegchancen-Schätzungen sind plausibel', () => {
    expect(pirateWinChance(2, 8)).toBeGreaterThan(pirateWinChance(5, 8));
    expect(pirateWinChance(3, 16)).toBeGreaterThan(pirateWinChance(3, 0));
    expect(masterWinChance(16)).toBeCloseTo(1);
    expect(masterWinChance(8)).toBeCloseTo(0.5);
  });
});
