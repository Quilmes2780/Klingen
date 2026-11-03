import { useEffect } from 'react';
import { BALANCE } from '../../config/balance';
import { CURSE_INSULTS, TOPICS } from '../../engine/content';
import { finaleActorId } from '../../engine/finale';
import type { GameState, TopicId } from '../../engine/types';
import { speak } from '../speech';
import { Icon } from './Icon';

interface Props {
  state: GameState;
  speech: boolean;
  onRespond: (t: TopicId | null) => void;
}

export function FinaleView({ state, speech, onRespond }: Props) {
  const f = state.finale!;
  const actorId = finaleActorId(state);
  const actor = actorId ? state.players[actorId] : null;
  const current = f.current ? CURSE_INSULTS[f.current] : null;

  useEffect(() => {
    if (speech && current) speak([{ text: current.text, pitch: 0.6 }]);
  }, [current, speech]);

  return (
    <div className="dialog" role="dialog" aria-label="Finale">
      <div className="duel-head">
        <div className="side">
          <div style={{ fontWeight: 700, color: 'var(--curse)' }}>
            <Icon name="fluch" /> Der Geisterkapitän
          </div>
          <div className="pips">
            {Array.from({ length: BALANCE.finale.hitsToLose }, (_, i) => (
              <span key={i} className={`pip${i < f.hits ? ' on' : ''}`} />
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Icon name="klinge" size={30} />
          <div className="small-text muted">Finale im Hafen</div>
        </div>
        <div className="side">
          <div style={{ fontWeight: 700 }}>{f.participants.map((id) => state.players[id].name).join(', ')}</div>
          <div className="pips">
            {Array.from({ length: BALANCE.finale.countersNeeded }, (_, i) => (
              <span key={i} className={`pip good${i < f.counters ? ' on' : ''}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="bubbles">
        {f.exchanges.map((ex, i) => {
          const ins = CURSE_INSULTS[ex.insult];
          return (
            <div key={i} className="col" style={{ gap: 4 }}>
              <div className="bubble left">
                <span className="who">Geisterkapitän</span>
                {ins.text}
              </div>
              <div className={`bubble right${ex.counteredBy ? '' : ' miss hit'}`}>
                <span className="who">{ex.counteredBy ? state.players[ex.counteredBy].name : 'Alle'}</span>
                {ex.counteredBy ? TOPICS[ins.topic].counter : '… (Schweigen im Hafen)'}
              </div>
              <div className={`verdict ${ex.counteredBy ? 'parry' : 'hit'}`}>
                {ex.counteredBy ? `Gekontert (+${BALANCE.fame.finaleFirstCounter} Ruhm)` : 'Treffer für den Geisterkapitän'}
              </div>
            </div>
          );
        })}
        {current ? (
          <div className="bubble left">
            <span className="who">Geisterkapitän</span>
            {current.text}
          </div>
        ) : null}
      </div>
      {actor && current ? (
        actor.kind === 'human' ? (
          <div style={{ marginTop: 10 }}>
            <strong>{actor.name}, kannst du kontern?</strong>
            <div className="choice-list">
              {actor.counters.map((t) => (
                <button key={t} onClick={() => onRespond(t)}>
                  <span className="topic">{TOPICS[t].name}</span>
                  {TOPICS[t].counter}
                </button>
              ))}
              <button onClick={() => onRespond(null)}>
                <span className="topic">Passen</span>Ich überlasse das den anderen.
              </button>
            </div>
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 10, textAlign: 'center' }}>
            {actor.name} überlegt …
          </div>
        )
      ) : null}
    </div>
  );
}
