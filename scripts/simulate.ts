// Simuliert reine KI-Partien und wertet sie aus: npm run sim [-- <Partien je Spielerzahl>]
import { playAiGame } from '../src/engine/ai/autoplay';
import type { FameBreakdown } from '../src/engine/types';

const GAMES = Number(process.argv[2] ?? 200);
const SOURCES: (keyof FameBreakdown | 'doubloons')[] = ['trials', 'riddles', 'duels', 'ious', 'finale', 'bonus', 'doubloons'];
const LABELS: Record<string, string> = {
  trials: 'Prüfungen',
  riddles: 'Rätsel',
  duels: 'Duelle',
  ious: 'Schuldscheine',
  finale: 'Finale',
  bonus: 'Bonus',
  doubloons: 'Dublonen',
};

const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const summary: Record<string, unknown> = {};
for (let n = 2; n <= 5; n++) {
  let won = 0;
  const rounds: number[] = [];
  const klinge: number[] = [];
  const fame: Record<string, number[]> = Object.fromEntries(SOURCES.map((k) => [k, []]));
  const reasons: Record<string, number> = {};
  const trialsDone: number[] = [];
  const curseRiddles: number[] = [];
  const t0 = Date.now();
  for (let g = 0; g < GAMES; g++) {
    const s = playAiGame(n, `sim-${n}-${g}`);
    if (s.phase === 'won') won++;
    else reasons[s.lostReason ?? '?'] = (reasons[s.lostReason ?? '?'] ?? 0) + 1;
    rounds.push(s.round);
    klinge.push(...s.stats.klingeCounters);
    curseRiddles.push(s.stats.curseRiddlesSolved);
    for (const p of Object.values(s.players)) {
      for (const k of SOURCES) fame[k].push(k === 'doubloons' ? Math.floor(p.doubloons / 5) : p.fame[k]);
      trialsDone.push(Object.values(p.trials).filter(Boolean).length);
    }
  }
  const ms = Date.now() - t0;
  console.log(`\n=== ${n} Personen · ${GAMES} Partien (${(ms / 1000).toFixed(1)} s) ===`);
  console.log(`Gegen den Fluch gewonnen: ${won}/${GAMES} = ${pct(won / GAMES)}`);
  console.log(`Ø Runden: ${avg(rounds).toFixed(1)}   Ø Fluch-Rätsel gelöst: ${avg(curseRiddles).toFixed(2)}   Ø Prüfungen je Person: ${avg(trialsDone).toFixed(2)}`);
  console.log('Ø Ruhm je Person nach Quelle:');
  for (const k of SOURCES) console.log(`  ${LABELS[k].padEnd(14)} ${avg(fame[k]).toFixed(2)}`);
  console.log(`Ø Konter beim Bestehen der Klinge: ${klinge.length ? avg(klinge).toFixed(2) : '–'} (n = ${klinge.length})`);
  console.log('Niederlagen:', Object.entries(reasons).map(([r, c]) => `${r} ×${c}`).join(' | ') || '–');
  summary[n] = {
    winRate: won / GAMES,
    avgRounds: avg(rounds),
    fameBySource: Object.fromEntries(SOURCES.map((k) => [k, avg(fame[k])])),
    klingeCountersAvg: avg(klinge),
    losses: reasons,
  };
}
console.log('\nJSON:', JSON.stringify(summary));
