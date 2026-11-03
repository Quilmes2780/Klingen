import { useState } from 'react';
import { randomSeed } from '../../engine/rng';
import type { GameConfig, PlayerKind, PlayerSetup } from '../../engine/types';
import { playerColor } from '../components/colors';

const DEFAULT_NAMES = ['Anna', 'Bo', 'Céline', 'Deniz', 'Emil'];

export function GameSetup({ onStart, onBack }: { onStart: (c: GameConfig) => void; onBack: () => void }) {
  const [count, setCount] = useState(3);
  const [players, setPlayers] = useState<PlayerSetup[]>(
    DEFAULT_NAMES.map((name, i) => ({ name, kind: (i === 0 ? 'human' : 'ai') as PlayerKind })),
  );
  const [seed, setSeed] = useState(randomSeed());

  const update = (i: number, patch: Partial<PlayerSetup>) => setPlayers((ps) => ps.map((p, k) => (k === i ? { ...p, ...patch } : p)));

  return (
    <div className="app">
      <div className="menu panel" style={{ textAlign: 'left' }}>
        <h2>Neue Partie</h2>
        <div className="row" style={{ marginBottom: 10 }}>
          <span>Anzahl Personen:</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className={n === count ? 'primary small' : 'small'} onClick={() => setCount(n)}>
              {n}
            </button>
          ))}
        </div>
        {count === 1 ? <p className="small-text muted">Solo-Modus: rein kooperativ gegen den Fluch.</p> : null}
        <div className="col">
          {players.slice(0, count).map((p, i) => (
            <div key={i} className="row">
              <span style={{ color: playerColor(i), fontSize: 22 }}>●</span>
              <input value={p.name} onChange={(e) => update(i, { name: e.target.value })} aria-label={`Name Person ${i + 1}`} style={{ flex: 1 }} />
              <select value={p.kind} onChange={(e) => update(i, { kind: e.target.value as PlayerKind })} aria-label={`Art Person ${i + 1}`}>
                <option value="human">Mensch</option>
                <option value="ai">KI</option>
              </select>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <label htmlFor="seed">Seed:</label>
          <input id="seed" value={seed} onChange={(e) => setSeed(e.target.value)} style={{ flex: 1 }} />
          <button className="small" onClick={() => setSeed(randomSeed())}>
            Zufällig
          </button>
        </div>
        <p className="small-text muted">Gleicher Seed und gleiche Züge ergeben dieselbe Partie.</p>
        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={onBack}>Zurück</button>
          <span className="spacer" />
          <button className="primary" disabled={!seed.trim()} onClick={() => onStart({ seed: seed.trim(), players: players.slice(0, count) })}>
            Ablegen!
          </button>
        </div>
      </div>
    </div>
  );
}
