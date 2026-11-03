import { useEffect, useState } from 'react';
import { CONTENT, PIRATES, TOPICS } from '../../engine/content';
import { createQuickDuel, quickCounter, quickPick, startingCounters, type QuickDuelState } from '../../engine/quickDuel';
import { randomSeed } from '../../engine/rng';
import type { PirateId } from '../../engine/types';
import { DuelView } from '../components/DuelView';
import { clearQuick, loadQuick, saveQuick, type Prefs } from '../storage';

interface Props {
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
  onExit: () => void;
}

export function QuickDuelScreen({ prefs, setPrefs, onExit }: Props) {
  const [record, setRecord] = useState(() => loadQuick() ?? { counters: startingCounters(randomSeed()), wins: 0, losses: 0 });
  const [pirate, setPirate] = useState<PirateId | ''>('');
  const [q, setQ] = useState<QuickDuelState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => saveQuick(record), [record]);

  const start = () => setQ(createQuickDuel(randomSeed(), record.counters, pirate || undefined, record));

  const act = (fn: (s: QuickDuelState) => QuickDuelState) => {
    if (!q) return;
    try {
      const next = fn(q);
      setQ(next);
      if (next.duel.stage === 'over') setRecord({ counters: next.counters, wins: next.wins, losses: next.losses });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="app">
      <div className="topbar">
        <h1>Schnellmodus: Wortgefecht</h1>
        <span className="spacer" />
        <label className="small-text row" style={{ gap: 4 }}>
          <input type="checkbox" checked={prefs.speech} onChange={(e) => setPrefs({ ...prefs, speech: e.target.checked })} />
          Sprachausgabe
        </label>
        <button className="small" onClick={onExit}>
          Hauptmenü
        </button>
      </div>
      <div className="panel" style={{ maxWidth: 760 }}>
        <p>
          Du greifst zuerst an. Pariert der Pirat (W6 ≤ Stärke), greift er an – dann brauchst du den passenden Konter. Jeden Konter, den du vom Piraten
          hörst, lernst du nach dem Duell. Bilanz: <b>{record.wins}</b> Siege, <b>{record.losses}</b> Niederlagen.
        </p>
        <div className="small-text muted">Deine Konter ({record.counters.length}/16):</div>
        <div className="chips" style={{ margin: '4px 0 10px' }}>
          {record.counters.map((t) => (
            <span key={t} className="chip" title={TOPICS[t].counter}>
              {TOPICS[t].name}
            </span>
          ))}
        </div>
        <div className="row">
          <select value={pirate} onChange={(e) => setPirate(e.target.value)} aria-label="Gegner wählen">
            <option value="">Zufälliger Pirat</option>
            {CONTENT.pirates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Stärke {p.strength})
              </option>
            ))}
          </select>
          <button className="primary" onClick={start}>
            Duell beginnen
          </button>
          <span className="spacer" />
          <button
            className="small"
            onClick={() => {
              clearQuick();
              setRecord({ counters: startingCounters(randomSeed()), wins: 0, losses: 0 });
            }}
          >
            Fortschritt zurücksetzen
          </button>
        </div>
      </div>

      {q ? (
        <div className="overlay">
          <DuelView
            duel={q.duel}
            names={['Du', PIRATES[q.pirateId].name]}
            deciderCounters={q.counters}
            humanDecides
            speech={prefs.speech}
            onPick={(t) => act((s) => quickPick(s, t))}
            onCounter={(t) => act((s) => quickCounter(s, t))}
            onClose={() => setQ(null)}
            closeLabel="Zurück"
            extra={
              <button
                onClick={() => {
                  setQ(createQuickDuel(randomSeed(), q.counters, pirate || undefined, { wins: q.wins, losses: q.losses }));
                }}
              >
                Revanche
              </button>
            }
          />
        </div>
      ) : null}
      {error ? (
        <div className="toast" role="alert" onClick={() => setError(null)}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
