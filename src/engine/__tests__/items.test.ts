import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { applyAction } from '../reducer';
import { newGame, run, tweak } from './helpers';

describe('Durchsuchen', () => {
  it('zieht den obersten Gegenstand des Ortsstapels', () => {
    const s0 = newGame(2);
    const top = s0.locationDecks.hafen[0];
    const s = applyAction(s0, { type: 'SEARCH' });
    expect(s.players.p1.items).toEqual([top]);
    expect(s.locationDecks.hafen).toHaveLength(s0.locationDecks.hafen.length - 1);
  });

  it('leerer Stapel bringt 1 Dublone', () => {
    const s = applyAction(tweak(newGame(2), (d) => (d.locationDecks.hafen = [])), { type: 'SEARCH' });
    expect(s.players.p1.doubloons).toBe(BALANCE.start.doubloons + BALANCE.economy.emptySearchDoubloons);
  });
});

describe('Gelegenheitsarbeit', () => {
  it('bringt 2 Dublonen in Hafen, Taverne und Werft', () => {
    const s = applyAction(newGame(2), { type: 'WORK' });
    expect(s.players.p1.doubloons).toBe(BALANCE.start.doubloons + 2);
    const t = run(newGame(2), { type: 'MOVE', to: 'werft' }, { type: 'WORK' });
    expect(t.players.p1.doubloons).toBe(BALANCE.start.doubloons + 2);
  });

  it('nicht beim Krämer', () => {
    const s = applyAction(newGame(2), { type: 'MOVE', to: 'kraemer' });
    expect(() => applyAction(s, { type: 'WORK' })).toThrow();
  });
});

describe('Einkaufen', () => {
  it('Krämer: Gegenstand für 2 Dublonen, Auslage wird aufgefüllt', () => {
    const s0 = applyAction(newGame(2), { type: 'MOVE', to: 'kraemer' });
    const item = s0.shop[0];
    const s = applyAction(s0, { type: 'BUY_ITEM', itemId: item });
    expect(s.players.p1.items).toContain(item);
    expect(s.players.p1.doubloons).toBe(BALANCE.start.doubloons - 2);
    expect(s.shop).not.toContain(item);
    expect(s.shop).toHaveLength(BALANCE.economy.shopSize);
  });

  it('Taverne: Konter für 3 Dublonen', () => {
    const s0 = applyAction(newGame(2), { type: 'MOVE', to: 'taverne' });
    const topic = ['geruch', 'schiff', 'tanz'].find((t) => !s0.players.p1.counters.includes(t))!;
    const s = applyAction(s0, { type: 'BUY_COUNTER', topicId: topic });
    expect(s.players.p1.counters).toContain(topic);
    expect(s.players.p1.doubloons).toBe(BALANCE.start.doubloons - BALANCE.economy.counterCost);
  });

  it('Konter nicht doppelt und nicht ohne Geld', () => {
    const s0 = applyAction(newGame(2), { type: 'MOVE', to: 'taverne' });
    expect(() => applyAction(s0, { type: 'BUY_COUNTER', topicId: s0.players.p1.counters[0] })).toThrow();
    const poor = tweak(s0, (d) => (d.players.p1.doubloons = 2));
    expect(() => applyAction(poor, { type: 'BUY_COUNTER', topicId: 'tanz' })).toThrow();
  });

  it('Werft: Schiff für 10 Dublonen', () => {
    const s0 = tweak(applyAction(newGame(2), { type: 'MOVE', to: 'werft' }), (d) => (d.players.p1.doubloons = 10));
    const s = applyAction(s0, { type: 'BUY_SHIP' });
    expect(s.players.p1.hasShip).toBe(true);
    expect(s.players.p1.doubloons).toBe(0);
  });
});

describe('Tauschen und Schenken', () => {
  const withItems = () =>
    tweak(newGame(3), (d) => {
      d.players.p1.items = ['i01'];
      d.players.p2.items = ['i02'];
      d.players.p3.location = 'werft';
      d.players.p3.items = ['i03'];
    });

  it('Schenken am selben Ort ist frei (keine Aktion)', () => {
    const s = applyAction(withItems(), { type: 'GIVE', from: 'p1', to: 'p2', itemId: 'i01' });
    expect(s.players.p2.items).toEqual(['i02', 'i01']);
    expect(s.acted).toBe(false);
  });

  it('nicht an andere Orte', () => {
    expect(() => applyAction(withItems(), { type: 'GIVE', from: 'p1', to: 'p3', itemId: 'i01' })).toThrow();
  });

  it('Tauschen', () => {
    const s = applyAction(withItems(), { type: 'TRADE', a: 'p1', itemA: 'i01', b: 'p2', itemB: 'i02' });
    expect(s.players.p1.items).toEqual(['i02']);
    expect(s.players.p2.items).toEqual(['i01']);
  });
});

describe('Handlimit', () => {
  it('über 6 Gegenständen muss vor Zugende abgeworfen werden', () => {
    const s0 = tweak(newGame(2), (d) => (d.players.p1.items = ['i07', 'i08', 'i09', 'i10', 'i11', 'i12']));
    const s = applyAction(s0, { type: 'SEARCH' });
    expect(s.players.p1.items).toHaveLength(7);
    expect(() => applyAction(s, { type: 'END_TURN' })).toThrow(/Handlimit/);
    const t = applyAction(s, { type: 'DISCARD', playerId: 'p1', itemId: 'i07' });
    expect(t.discard).toContain('i07');
    expect(() => applyAction(t, { type: 'END_TURN' })).not.toThrow();
  });

  it('Geschenke dürfen das Limit nicht sprengen', () => {
    const s = tweak(newGame(2), (d) => {
      d.players.p1.items = ['i01'];
      d.players.p2.items = ['i07', 'i08', 'i09', 'i10', 'i11', 'i12'];
    });
    expect(() => applyAction(s, { type: 'GIVE', from: 'p1', to: 'p2', itemId: 'i01' })).toThrow();
  });
});
