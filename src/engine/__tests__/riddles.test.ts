import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { RIDDLES } from '../content';
import { applyAction } from '../reducer';
import { refillRiddles } from '../riddles';
import { endRound, newGame, quietEvents, run, tweak } from './helpers';

// r14 „Der Möwenstreik“ (Hafen): fisch + muschel
// r01 Fluch-Rätsel (Hafen): laterne + seil + glocke

describe('Rätsel', () => {
  const base = () =>
    tweak(newGame(3), (d) => {
      quietEvents(d);
      d.riddleDisplay = ['r14', 'r01', 'r16', 'r22', 'r28'];
    });

  it('lösen kostet die Gegenstände und bringt Ruhm laut Karte', () => {
    const s0 = tweak(base(), (d) => (d.players.p1.items = ['i02', 'i05', 'i01']));
    const s = applyAction(s0, { type: 'SOLVE_RIDDLE', riddleId: 'r14' });
    expect(s.players.p1.items).toEqual(['i01']);
    expect(s.players.p1.fame.riddles).toBe(RIDDLES.r14.reward.fame);
    expect(s.discard).toEqual(expect.arrayContaining(['i02', 'i05']));
    expect(s.riddleDisplay).not.toContain('r14');
    expect(s.acted).toBe(true);
  });

  it('nur am richtigen Ort und mit passenden Symbolen', () => {
    const wrongPlace = tweak(base(), (d) => {
      d.players.p1.items = ['i02', 'i05'];
      d.players.p1.location = 'taverne';
    });
    expect(() => applyAction(wrongPlace, { type: 'SOLVE_RIDDLE', riddleId: 'r14' })).toThrow();
    const missing = tweak(base(), (d) => (d.players.p1.items = ['i02']));
    expect(() => applyAction(missing, { type: 'SOLVE_RIDDLE', riddleId: 'r14' })).toThrow();
  });

  it('normale Rätsel: keine Gegenstände von Mitspielenden', () => {
    const s = tweak(base(), (d) => {
      d.players.p1.items = ['i02'];
      d.players.p2.items = ['i05'];
    });
    expect(() => applyAction(s, { type: 'SOLVE_RIDDLE', riddleId: 'r14' })).toThrow();
  });

  it('Fluch-Rätsel: Gegenstände mehrerer Personen am Ort, Fluch −2, Ruhm geteilt', () => {
    const s0 = tweak(base(), (d) => {
      d.curse = 6;
      d.players.p1.items = ['i13']; // laterne
      d.players.p2.items = ['i01']; // seil
      d.players.p3.items = ['i04']; // glocke
    });
    const s = applyAction(s0, { type: 'SOLVE_RIDDLE', riddleId: 'r01' });
    expect(s.curse).toBe(6 - BALANCE.curse.curseRiddleReduction);
    expect(s.players.p1.fame.riddles).toBe(1);
    expect(s.players.p2.fame.riddles).toBe(1);
    expect(s.players.p3.fame.riddles).toBe(1);
    expect(s.players.p2.items).toEqual([]);
  });

  it('Fluch-Rätsel allein: volle 3 Ruhm; Rest beim Teilen an die lösende Person', () => {
    const solo = applyAction(tweak(base(), (d) => (d.players.p1.items = ['i13', 'i01', 'i04'])), { type: 'SOLVE_RIDDLE', riddleId: 'r01' });
    expect(solo.players.p1.fame.riddles).toBe(3);
    const duo = applyAction(
      tweak(base(), (d) => {
        d.players.p1.items = ['i13', 'i01'];
        d.players.p2.items = ['i04'];
      }),
      { type: 'SOLVE_RIDDLE', riddleId: 'r01' },
    );
    expect(duo.players.p1.fame.riddles).toBe(2);
    expect(duo.players.p2.fame.riddles).toBe(1);
  });

  it('Fluch-Rätsel: Personen an anderen Orten helfen nicht', () => {
    const s = tweak(base(), (d) => {
      d.players.p1.items = ['i13', 'i01'];
      d.players.p2.items = ['i04'];
      d.players.p2.location = 'werft';
    });
    expect(() => applyAction(s, { type: 'SOLVE_RIDDLE', riddleId: 'r01' })).toThrow();
  });

  it('Auslage wird in der Fluchphase auf 5 aufgefüllt, mindestens ein Fluch-Rätsel offen', () => {
    const s0 = tweak(base(), (d) => {
      d.players.p1.items = ['i13', 'i01', 'i04'];
    });
    const s = endRound(applyAction(s0, { type: 'SOLVE_RIDDLE', riddleId: 'r01' }));
    expect(s.riddleDisplay).toHaveLength(5);
    expect(s.riddleDisplay.some((r) => RIDDLES[r].curse)).toBe(true);
  });

  it('ensureCurseRiddle tauscht ein normales Rätsel aus', () => {
    const s = tweak(base(), (d) => {
      d.riddleDisplay = ['r14', 'r15', 'r16', 'r17', 'r18'];
      refillRiddles(d);
    });
    expect(s.riddleDisplay).toHaveLength(5);
    expect(s.riddleDisplay.filter((r) => RIDDLES[r].curse)).toHaveLength(1);
  });

  it('Rätsel mit Zugang zur Meisterin bzw. Schiff', () => {
    const s0 = tweak(base(), (d) => {
      d.riddleDisplay = ['r13', 'r01'];
      d.players.p1.items = ['i04', 'i02', 'i06'];
    });
    const s = applyAction(s0, { type: 'SOLVE_RIDDLE', riddleId: 'r13' });
    expect(s.players.p1.hasShip).toBe(true);
  });
});

describe('Gefälligkeiten', () => {
  const setup = () =>
    tweak(newGame(2), (d) => {
      quietEvents(d);
      d.riddleDisplay = ['r14', 'r01'];
      d.players.p1.items = ['i05']; // muschel
      d.players.p2.items = ['i02']; // fisch
    });

  it('Geschenk, das im nächsten Zug des Empfängers ein Rätsel löst, bringt einen Schuldschein', () => {
    let s = applyAction(setup(), { type: 'GIVE', from: 'p1', to: 'p2', itemId: 'i05' });
    s = applyAction(s, { type: 'END_TURN' });
    s = applyAction(s, { type: 'SOLVE_RIDDLE', riddleId: 'r14' });
    expect(s.players.p1.fame.ious).toBe(BALANCE.fame.iou);
  });

  it('Geschenk im eigenen Zug des Empfängers zählt sofort', () => {
    let s = applyAction(setup(), { type: 'END_TURN' });
    s = run(s, { type: 'GIVE', from: 'p1', to: 'p2', itemId: 'i05' }, { type: 'SOLVE_RIDDLE', riddleId: 'r14' });
    expect(s.players.p1.fame.ious).toBe(1);
  });

  it('verfällt nach dem nächsten Zug des Empfängers', () => {
    let s = applyAction(setup(), { type: 'GIVE', from: 'p1', to: 'p2', itemId: 'i05' });
    s = run(s, { type: 'END_TURN' }, { type: 'END_TURN' }, { type: 'END_TURN' });
    // Jetzt ist p2 im übernächsten Zug.
    expect(s.favors).toHaveLength(0);
    // Rätsel wieder auslegen (die Fluchphase kann es rotiert haben).
    s = tweak(s, (d) => (d.riddleDisplay = ['r14', 'r01']));
    s = applyAction(s, { type: 'SOLVE_RIDDLE', riddleId: 'r14' });
    expect(s.players.p1.fame.ious).toBe(0);
  });
});

describe('Rätselrotation (ANNAHME)', () => {
  it('in der Fluchphase verlässt das älteste normale Rätsel die Auslage', () => {
    const s0 = tweak(newGame(2), (d) => {
      quietEvents(d);
      d.riddleDisplay = ['r14', 'r01', 'r16', 'r22', 'r28'];
    });
    const s = endRound(s0);
    expect(s.riddleDisplay).not.toContain('r14');
    expect(s.riddleDisplay).toContain('r01');
    expect(s.riddleDisplay).toHaveLength(5);
  });
});
