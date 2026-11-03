import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { ITEMS } from '../content';
import { applyAction } from '../reducer';
import type { GameState } from '../types';
import { newGame, run, tweak } from './helpers';

const FRAGMENTS = ['i28', 'i34', 'i40', 'i43'];
const SHOVEL = 'i23';

function karteReady(): GameState {
  return tweak(newGame(2), (d) => {
    d.treasureLocation = 'werft';
    d.players.p1.location = 'werft';
    d.players.p1.items = [...FRAGMENTS, SHOVEL];
    for (const l of Object.keys(d.locationDecks) as (keyof typeof d.locationDecks)[]) {
      d.locationDecks[l] = d.locationDecks[l].filter((i) => !FRAGMENTS.includes(i));
    }
  });
}

describe('Prüfung der Karte', () => {
  it('4 Fragmente + Schaufel am Schatzort: bestanden, +3 Dublonen, Fragmente neu verteilt', () => {
    const s = applyAction(karteReady(), { type: 'TRIAL', trial: 'karte' });
    const p = s.players.p1;
    expect(p.trials.karte).toBe(true);
    expect(p.fame.trials).toBe(BALANCE.fame.trial);
    expect(p.doubloons).toBe(BALANCE.start.doubloons + BALANCE.economy.treasureDoubloons);
    expect(p.items).toEqual([SHOVEL]);
    const inDecks = Object.values(s.locationDecks).flat().filter((i) => ITEMS[i].kind === 'fragment');
    expect(inDecks.sort()).toEqual([...FRAGMENTS].sort());
    expect(s.treasureLocation).not.toBe('werft');
  });

  it('am falschen Ort, ohne Schaufel oder mit zu wenigen Fragmenten nicht möglich', () => {
    expect(() => applyAction(tweak(karteReady(), (d) => (d.treasureLocation = 'hafen')), { type: 'TRIAL', trial: 'karte' })).toThrow(/Schatz/);
    expect(() => applyAction(tweak(karteReady(), (d) => (d.players.p1.items = [...FRAGMENTS])), { type: 'TRIAL', trial: 'karte' })).toThrow(/Schaufel/);
    expect(() => applyAction(tweak(karteReady(), (d) => d.players.p1.items.shift()), { type: 'TRIAL', trial: 'karte' })).toThrow(/Kartenfragmente/);
  });

  it('nur einmal bestehbar', () => {
    const s = tweak(karteReady(), (d) => (d.players.p1.trials.karte = true));
    expect(() => applyAction(s, { type: 'TRIAL', trial: 'karte' })).toThrow();
  });
});

describe('Prüfung des Kahns', () => {
  const ready = () =>
    tweak(newGame(2), (d) => {
      d.players.p1.hasShip = true;
      d.players.p1.crew = ['p1', 'p2', 'p3'];
    });

  it('Schiff + 3 Mannschaftskarten im Hafen', () => {
    const s = applyAction(ready(), { type: 'TRIAL', trial: 'kahn' });
    expect(s.players.p1.trials.kahn).toBe(true);
    // Die Mannschaft heuert danach ab und kehrt als Piraten zurück.
    expect(s.players.p1.crew).toHaveLength(0);
    expect([...s.pirateDeck, ...s.pirates.map((p) => p.id)]).toEqual(expect.arrayContaining(['p1', 'p2', 'p3']));
  });

  it('ohne Schiff, ohne Mannschaft oder außerhalb des Hafens nicht', () => {
    expect(() => applyAction(tweak(ready(), (d) => (d.players.p1.hasShip = false)), { type: 'TRIAL', trial: 'kahn' })).toThrow();
    expect(() => applyAction(tweak(ready(), (d) => d.players.p1.crew.pop()), { type: 'TRIAL', trial: 'kahn' })).toThrow();
    expect(() => applyAction(tweak(ready(), (d) => (d.players.p1.location = 'werft')), { type: 'TRIAL', trial: 'kahn' })).toThrow();
  });
});

describe('Prüfung der Klinge', () => {
  const ready = () =>
    tweak(newGame(2), (d) => {
      d.players.p1.klingenZugang = true;
      d.players.p1.location = 'herrenhaus';
      d.players.p1.counters = [...Array.from({ length: 16 }, (_, i) => i)].map((i) => ['geruch', 'schiff', 'fechtkunst', 'mannschaft', 'verstand', 'aussehen', 'mut', 'gesang', 'kochkunst', 'reichtum', 'kraft', 'navigation', 'kleidung', 'papagei', 'ruhm', 'tanz'][i]);
    });

  it('braucht Zugang über ein Rätsel', () => {
    expect(() => applyAction(tweak(ready(), (d) => (d.players.p1.klingenZugang = false)), { type: 'TRIAL', trial: 'klinge' })).toThrow(/Zugang/);
  });

  it('Meisterin greift an; mit passenden Kontern besteht man nach 3 Treffern', () => {
    let s = applyAction(ready(), { type: 'TRIAL', trial: 'klinge' });
    expect(s.duel?.kind).toBe('master');
    expect(s.duel?.stage).toBe('counter');
    for (let i = 0; i < 3; i++) s = applyAction(s, { type: 'DUEL_COUNTER', topicId: s.duel!.topic });
    expect(s.duel).toBeNull();
    expect(s.players.p1.trials.klinge).toBe(true);
    expect(s.stats.klingeCounters).toEqual([16]);
  });

  it('ohne Konter verliert man und darf es später erneut versuchen', () => {
    let s = applyAction(ready(), { type: 'TRIAL', trial: 'klinge' });
    for (let i = 0; i < 3; i++) s = applyAction(s, { type: 'DUEL_COUNTER', topicId: null });
    expect(s.players.p1.trials.klinge).toBe(false);
    expect(s.lastDuel?.winner).toBe(1);
  });
});

describe('Dritte Prüfung', () => {
  it('bringt +3 Bonus und ruft den Geisterkapitän', () => {
    const s0 = tweak(newGame(3), (d) => {
      d.players.p1.trials.klinge = true;
      d.players.p1.trials.karte = true;
      d.players.p1.fame.trials = 10;
      d.players.p1.hasShip = true;
      d.players.p1.crew = ['p1', 'p2', 'p3'];
    });
    const s = applyAction(s0, { type: 'TRIAL', trial: 'kahn' });
    expect(s.players.p1.fame.trials).toBe(15);
    expect(s.players.p1.fame.bonus).toBe(BALANCE.fame.thirdTrialBonus);
    expect(s.finale?.stage).toBe('countdown');
    expect(s.finale?.countdown).toEqual(['p2', 'p3', 'p1']);
  });
});

describe('Schiffskauf', () => {
  it('nur auf der Werft', () => {
    const s = tweak(newGame(2), (d) => (d.players.p1.doubloons = 20));
    expect(() => applyAction(s, { type: 'BUY_SHIP' })).toThrow();
    expect(run(s, { type: 'MOVE', to: 'werft' }, { type: 'BUY_SHIP' }).players.p1.hasShip).toBe(true);
  });
});

describe('Fragmente und Schaufeln (ANNAHME: offen oben auf dem Stapel)', () => {
  it('liegen zu Spielbeginn oben auf ihrem Ortsstapel', () => {
    const s = newGame(2, 'frag');
    for (const deck of Object.values(s.locationDecks)) {
      const specials = deck.filter((i) => ITEMS[i].kind !== 'normal').length;
      for (let k = 0; k < specials; k++) expect(ITEMS[deck[k]].kind).not.toBe('normal');
    }
  });

  it('nach dem Schatzheben liegen die Fragmente oben auf zufälligen Stapeln', () => {
    const s = applyAction(karteReady(), { type: 'TRIAL', trial: 'karte' });
    const tops = Object.values(s.locationDecks).flatMap((d) => d.slice(0, 4).filter((i) => ITEMS[i].kind === 'fragment'));
    expect(tops.sort()).toEqual([...FRAGMENTS].sort());
  });

  it('nach der Kahn-Prüfung kehren Mannschaftskarten als Piraten zurück', () => {
    const s = applyAction(
      tweak(newGame(2), (d) => {
        d.players.p1.hasShip = true;
        d.players.p1.crew = ['p6', 'p7', 'p8'];
        d.pirates = [];
        d.pirateDeck = [];
      }),
      { type: 'TRIAL', trial: 'kahn' },
    );
    expect(s.pirates.map((p) => p.id).sort()).toEqual(['p6', 'p7', 'p8']);
  });
});
