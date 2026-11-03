import { BALANCE } from '../../config/balance';
import { ITEMS, LOCATIONS, PIRATES, TOPICS } from '../../engine/content';
import type { GameState } from '../../engine/types';
import { fameTotal } from '../../engine/util';
import { Icon } from './Icon';
import { playerColor } from './colors';

export function PlayerBoards({ state }: { state: GameState }) {
  const active = state.turnOrder[state.activeIdx];
  return (
    <div className="boards">
      {state.turnOrder.map((id, idx) => {
        const p = state.players[id];
        return (
          <div key={id} className={`panel board${id === active ? ' active' : ''}`} style={{ ['--pc' as string]: playerColor(idx) }}>
            <h3>
              <span style={{ color: playerColor(idx) }}>●</span> {p.name}
              <span className="badge">{p.kind === 'ai' ? 'KI' : 'Mensch'}</span>
              <span className="spacer" />
              <span title="Ruhm (vorläufig)">
                <Icon name="ruhm" /> {fameTotal(p)}
              </span>
            </h3>
            <div className="row small-text">
              <span>
                <Icon name="zugang" /> {LOCATIONS[p.location].name.replace(/ „.*“/, '')}
              </span>
              <span title="Dublonen">
                <Icon name="dublone" /> {p.doubloons}
              </span>
              <span title="Mannschaft">
                <Icon name="mannschaft" /> {p.crew.length}/{BALANCE.trials.crewNeeded}
              </span>
              {p.hasShip ? (
                <span title="Schiff">
                  <Icon name="schiff" /> Schiff
                </span>
              ) : null}
              {p.klingenZugang ? (
                <span title="Zugang zur Klingenmeisterin">
                  <Icon name="klinge" /> Zugang
                </span>
              ) : null}
            </div>
            <div className="trials" style={{ margin: '6px 0' }}>
              <span className={`trial${p.trials.klinge ? ' done' : ''}`}>
                <Icon name="klinge" size={13} /> Klinge
              </span>
              <span className={`trial${p.trials.karte ? ' done' : ''}`}>
                <Icon name="karte" size={13} /> Karte
              </span>
              <span className={`trial${p.trials.kahn ? ' done' : ''}`}>
                <Icon name="kahn" size={13} /> Kahn
              </span>
            </div>
            <div className="small-text muted">
              Gegenstände ({p.items.length}/{BALANCE.handLimit})
            </div>
            <div className="chips" style={{ marginBottom: 4 }}>
              {p.items.map((i) => (
                <span key={i} className="chip" title={`${ITEMS[i].name} – ${ITEMS[i].flavor}`}>
                  <Icon name={ITEMS[i].symbol} size={13} /> {ITEMS[i].name}
                </span>
              ))}
              {!p.items.length ? <span className="muted small-text">–</span> : null}
            </div>
            <div className="small-text muted">Konter ({p.counters.length}/16)</div>
            <div className="chips">
              {p.counters.map((t) => (
                <span key={t} className="chip" title={TOPICS[t].counter}>
                  {TOPICS[t].name}
                </span>
              ))}
            </div>
            {p.crew.length ? (
              <div className="small-text muted" style={{ marginTop: 4 }}>
                Mannschaft: {p.crew.map((c) => PIRATES[c].name).join(', ')}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
