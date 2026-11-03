import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { CURSE_INSULTS } from '../content';
import { applyEvent } from '../curse';
import { EVENTS } from '../content';
import { getLegalActions } from '../legal';
import { applyAction } from '../reducer';
import { computeScores } from '../scoring';
import type { GameState } from '../types';
import { endRound, newGame, run, tweak } from './helpers';

describe('Fluchphase', () => {
  it('Geistererscheinung: Fluch +2 statt +1', () => {
    const s = endRound(tweak(newGame(2), (d) => (d.eventDeck = ['e01', 'e03'])));
    expect(s.curse).toBe(BALANCE.curse.ghostApparition);
  });

  it('ab Feld 10 zwei Ereigniskarten', () => {
    const s = endRound(
      tweak(newGame(2), (d) => {
        d.curse = 10;
        d.eventDeck = ['e03', 'e05', 'e04'];
      }),
    );
    expect(s.lastEvents).toEqual(['e03', 'e05']);
    expect(s.players.p1.doubloons).toBe(BALANCE.start.doubloons + 1);
    expect(s.curse).toBe(11);
  });

  it('unter Feld 10 nur eine Ereigniskarte', () => {
    const s = endRound(tweak(newGame(2), (d) => (d.eventDeck = ['e03', 'e05'])));
    expect(s.lastEvents).toEqual(['e03']);
  });

  it('Ereignisse: Steuereintreiber trifft den reichsten', () => {
    const s = tweak(newGame(2), (d) => {
      d.players.p1.doubloons = 8;
      applyEvent(d, EVENTS.e06);
    });
    expect(s.players.p1.doubloons).toBe(6);
    expect(s.players.p2.doubloons).toBe(BALANCE.start.doubloons);
  });

  it('Ereignisse: Fluch-Ereignis kann direkt verlieren lassen', () => {
    const s = tweak(newGame(2), (d) => {
      d.curse = 14;
      applyEvent(d, EVENTS.e19);
    });
    expect(s.phase).toBe('lost');
  });

  it('Ereignisstapel wird neu gemischt, wenn er leer ist', () => {
    const s = endRound(tweak(newGame(2), (d) => ((d.eventDeck = []), (d.eventDiscard = ['e03']))));
    expect(s.lastEvents).toEqual(['e03']);
  });
});

function finaleReady(): GameState {
  return tweak(newGame(3), (d) => {
    d.players.p1.trials = { klinge: true, karte: true, kahn: false };
    d.players.p1.hasShip = true;
    d.players.p1.crew = ['p1', 'p2', 'p3'];
    d.players.p3.location = 'friedhof';
  });
}

describe('Finale', () => {
  it('jede Person hat noch genau einen Zug, dann beginnt das Wortgefecht im Hafen', () => {
    let s = applyAction(finaleReady(), { type: 'TRIAL', trial: 'kahn' });
    s = applyAction(s, { type: 'END_TURN' }); // Zug von p1 endet, p2 hat letzten Zug
    expect(s.turnOrder[s.activeIdx]).toBe('p2');
    expect(s.countdownTurn).toBe(true);
    s = applyAction(s, { type: 'END_TURN' });
    expect(s.turnOrder[s.activeIdx]).toBe('p3');
    s = run(s, { type: 'END_TURN' });
    expect(s.turnOrder[s.activeIdx]).toBe('p1');
    s = applyAction(s, { type: 'END_TURN' });
    expect(s.phase).toBe('finale');
    expect(s.finale?.participants).toEqual(['p1', 'p2']);
    expect(s.finale?.current).not.toBeNull();
    // keine Fluchphase im Countdown
    expect(s.curse).toBe(0);
  });

  function battle(): GameState {
    let s = applyAction(finaleReady(), { type: 'TRIAL', trial: 'kahn' });
    for (let i = 0; i < 4; i++) s = applyAction(s, { type: 'END_TURN' });
    return s;
  }

  it('erster passender Konter je Angriff: +2 Ruhm; 5 Konter gewinnen', () => {
    let s = tweak(battle(), (d) => {
      const all = Object.values(CURSE_INSULTS).map((c) => c.topic);
      d.players.p1.counters = all;
      d.players.p2.counters = all;
    });
    let guard = 0;
    while (s.phase === 'finale' && guard++ < 20) {
      const topic = CURSE_INSULTS[s.finale!.current!].topic;
      s = applyAction(s, { type: 'FINALE_RESPOND', topicId: topic });
    }
    expect(s.phase).toBe('won');
    const total = s.players.p1.fame.finale + s.players.p2.fame.finale;
    expect(total).toBe(BALANCE.finale.countersNeeded * BALANCE.fame.finaleFirstCounter);
    // Reihenfolge rotiert: beide kommen zum Zug
    expect(s.players.p1.fame.finale).toBeGreaterThan(0);
    expect(s.players.p2.fame.finale).toBeGreaterThan(0);
    expect(computeScores(s)[0].total).toBeGreaterThan(0);
  });

  it('3 Treffer vor 5 Kontern: alle verlieren', () => {
    let s = tweak(battle(), (d) => {
      d.players.p1.counters = [];
      d.players.p2.counters = [];
    });
    let guard = 0;
    while (s.phase === 'finale' && guard++ < 20) s = applyAction(s, { type: 'FINALE_RESPOND', topicId: null });
    expect(s.phase).toBe('lost');
    expect(s.finale?.hits).toBe(BALANCE.finale.hitsToLose);
  });

  it('kann nur die nächste Person kontern, wenn die erste passt', () => {
    let s = battle();
    const first = s.finale!.participants[0];
    expect(getLegalActions(s).every((a) => a.type === 'FINALE_RESPOND')).toBe(true);
    s = applyAction(s, { type: 'FINALE_RESPOND', topicId: null });
    expect(s.finale!.askIdx).toBe(1);
    expect(s.finale!.participants[1]).not.toBe(first);
  });

  it('niemand im Hafen: verloren', () => {
    let s = applyAction(finaleReady(), { type: 'TRIAL', trial: 'kahn' });
    s = tweak(s, (d) => Object.values(d.players).forEach((p) => (p.location = 'werft')));
    for (let i = 0; i < 4; i++) s = applyAction(s, { type: 'END_TURN' });
    expect(s.phase).toBe('lost');
  });
});

describe('Wertung', () => {
  it('summiert alle Quellen, 1 Ruhm je 5 Dublonen, Gleichstand nach Dublonen', () => {
    const s = tweak(newGame(3), (d) => {
      d.players.p1.fame = { trials: 5, riddles: 3, duels: 1, ious: 1, finale: 2, bonus: 0 };
      d.players.p1.doubloons = 11;
      d.players.p2.fame = { trials: 10, riddles: 2, duels: 0, ious: 0, finale: 0, bonus: 0 };
      d.players.p2.doubloons = 4;
      d.players.p3.fame = { trials: 10, riddles: 2, duels: 0, ious: 0, finale: 0, bonus: 0 };
      d.players.p3.doubloons = 9;
    });
    const rows = computeScores(s);
    expect(rows.map((r) => r.playerId)).toEqual(['p1', 'p3', 'p2']);
    expect(rows[0].total).toBe(5 + 3 + 1 + 1 + 2 + 2);
    expect(rows[1].total).toBe(13);
    expect(rows[2].total).toBe(12);
    expect(rows[0].rank).toBe(1);
  });

  it('echter Gleichstand teilt den Rang', () => {
    const s = tweak(newGame(2), (d) => {
      d.players.p1.fame.riddles = 4;
      d.players.p2.fame.riddles = 4;
    });
    const rows = computeScores(s);
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(1);
  });
});
