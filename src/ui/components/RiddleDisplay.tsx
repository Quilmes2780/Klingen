import { BALANCE } from '../../config/balance';
import { ITEMS, LOCATIONS, RIDDLES, SYMBOLS } from '../../engine/content';
import { findRiddlePlan } from '../../engine/riddles';
import type { GameState, PlayerId, RiddleId } from '../../engine/types';
import { Icon } from './Icon';

interface Props {
  state: GameState;
  viewerId: PlayerId | null;
  solvable: RiddleId[];
  onSolve?: (id: RiddleId) => void;
}

export function RiddleDisplay({ state, viewerId, solvable, onSolve }: Props) {
  const viewer = viewerId ? state.players[viewerId] : null;
  const owned = viewer ? viewer.items.map((i) => ITEMS[i].symbol) : [];
  return (
    <div className="panel">
      <h3>Rätselauslage</h3>
      <div className="riddles">
        {state.riddleDisplay.map((id) => {
          const r = RIDDLES[id];
          const pool = [...owned];
          const can = solvable.includes(id);
          const plan = can && viewerId ? findRiddlePlan(state, viewerId, id) : null;
          const helpers = plan ? [...new Set(plan.filter((c) => c.owner !== viewerId).map((c) => state.players[c.owner].name))] : [];
          return (
            <div key={id} className={`riddle${r.curse ? ' curse' : ''}${can ? ' solvable' : ''}`}>
              <div className="row" style={{ gap: 4 }}>
                {r.curse ? <span className="badge curse">Fluch-Rätsel</span> : null}
                {r.reward.grants === 'klingenZugang' ? <span className="badge gold">Zugang Meisterin</span> : null}
                {r.reward.grants === 'schiff' ? <span className="badge gold">Schiff</span> : null}
              </div>
              <h4>{r.title}</h4>
              <div className="small-text muted">{r.text}</div>
              <div className="small-text">
                <Icon name="zugang" size={13} /> {LOCATIONS[r.location].name}
              </div>
              <div className="symbols">
                {r.symbols.map((s, i) => {
                  const idx = pool.indexOf(s);
                  const have = idx >= 0;
                  if (have) pool.splice(idx, 1);
                  return (
                    <span key={i} className={`sym${have ? ' have' : ''}`} title={SYMBOLS[s].name}>
                      <Icon name={s} size={14} /> {SYMBOLS[s].name}
                    </span>
                  );
                })}
              </div>
              <div className="small-text">
                <Icon name="ruhm" size={13} />{' '}
                {r.curse
                  ? `${BALANCE.fame.curseRiddle} Ruhm (geteilt) · Fluch −${BALANCE.curse.curseRiddleReduction}`
                  : `${r.reward.fame} Ruhm${r.reward.doubloons ? ` · +${r.reward.doubloons} Dublonen` : ''}`}
              </div>
              {can && onSolve ? (
                <button className="primary small" onClick={() => onSolve(id)}>
                  Lösen{helpers.length ? ` (mit ${helpers.join(', ')})` : ''}
                </button>
              ) : null}
            </div>
          );
        })}
        {!state.riddleDisplay.length ? <div className="muted">Keine Rätsel offen – Nachschub in der Fluchphase.</div> : null}
      </div>
    </div>
  );
}
