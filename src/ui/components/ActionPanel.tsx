import { useState } from 'react';
import { BALANCE } from '../../config/balance';
import { ITEMS, LOCATIONS, PIRATES, RIDDLES, TOPICS, TOPIC_IDS } from '../../engine/content';
import { trialBlocker, TRIAL_NAMES } from '../../engine/trials';
import { TRIALS, type Action, type GameState } from '../../engine/types';
import { playersAt } from '../../engine/util';
import { Icon } from './Icon';
import { playerColor } from './colors';

interface Props {
  state: GameState;
  legal: Action[];
  dispatch: (a: Action) => void;
}

export function ActionPanel({ state, legal, dispatch }: Props) {
  const p = state.players[state.turnOrder[state.activeIdx]];
  const idx = state.activeIdx;
  const has = (type: Action['type']) => legal.some((a) => a.type === type);
  const of = <T extends Action['type']>(type: T) => legal.filter((a): a is Extract<Action, { type: T }> => a.type === type);
  const others = playersAt(state, p.location).filter((o) => o.id !== p.id);
  const [giveItem, setGiveItem] = useState('');
  const [giveTo, setGiveTo] = useState('');
  const [tradeTheirs, setTradeTheirs] = useState('');
  const [counterTopic, setCounterTopic] = useState('');
  const top = state.locationDecks[p.location][0];
  const visibleTop = top && ITEMS[top].kind !== 'normal' ? ITEMS[top].name : null;
  const target = others.find((o) => o.id === giveTo) ?? others[0];

  return (
    <div className="panel actions" style={{ ['--pc' as string]: playerColor(idx) }}>
      <div className="turn-banner">
        {p.name} ist am Zug · {LOCATIONS[p.location].name}
        {state.countdownTurn ? ' · letzter Zug vor dem Finale!' : ''}
      </div>
      <div className="small-text muted" style={{ marginBottom: 6 }}>
        {!state.moved && !state.acted ? '1. Optional bewegen (oder auf der Karte klicken), 2. eine Aktion.' : state.acted ? 'Aktion erledigt – tauschen, schenken oder Zug beenden.' : 'Jetzt eine Aktion wählen.'}
      </div>

      {has('MOVE') || has('BOAT') ? (
        <>
          <h3>Bewegung</h3>
          <div className="action-group">
            {of('MOVE').map((a) => (
              <button key={a.to} onClick={() => dispatch(a)}>
                → {LOCATIONS[a.to].name}
              </button>
            ))}
            {of('BOAT').map((a) => (
              <button key={'b' + a.to} onClick={() => dispatch(a)} title={`Bootsfahrt für ${BALANCE.economy.boatCost} Dublone`}>
                <Icon name="schiff" /> {LOCATIONS[a.to].name}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {!state.acted ? (
        <>
          <h3>Aktion</h3>
          <div className="action-group">
            {has('SEARCH') ? (
              <button onClick={() => dispatch({ type: 'SEARCH' })}>
                Durchsuchen{visibleTop ? ` (oben: ${visibleTop})` : state.locationDecks[p.location].length ? ` (${state.locationDecks[p.location].length} Karten)` : ' (leer → 1 Dublone)'}
              </button>
            ) : null}
            {has('WORK') ? <button onClick={() => dispatch({ type: 'WORK' })}>Gelegenheitsarbeit (+{BALANCE.economy.workIncome})</button> : null}
            {of('SOLVE_RIDDLE').map((a) => (
              <button key={a.riddleId} className="primary" onClick={() => dispatch(a)}>
                Rätsel lösen: {RIDDLES[a.riddleId].title}
              </button>
            ))}
            {of('DUEL_PIRATE').map((a) => (
              <button key={a.pirateId} onClick={() => dispatch(a)}>
                <Icon name="pirat" /> Wortgefecht: {PIRATES[a.pirateId].name} (Stärke {PIRATES[a.pirateId].strength})
              </button>
            ))}
            {of('DUEL_PLAYER').map((a) => (
              <button key={a.playerId} onClick={() => dispatch(a)}>
                <Icon name="konter" /> Wortgefecht: {state.players[a.playerId].name}
              </button>
            ))}
            {of('BUY_ITEM').map((a) => (
              <button key={a.itemId} onClick={() => dispatch(a)} title={ITEMS[a.itemId].flavor}>
                Kaufen ({BALANCE.economy.shopItemCost}): <Icon name={ITEMS[a.itemId].symbol} /> {ITEMS[a.itemId].name}
              </button>
            ))}
            {p.location === 'kraemer' && !has('BUY_ITEM') && state.shop.length ? (
              <span className="small-text muted">Auslage: {state.shop.map((i) => ITEMS[i].name).join(', ')} (je {BALANCE.economy.shopItemCost} Dublonen)</span>
            ) : null}
            {has('BUY_COUNTER') ? (
              <span className="row">
                <select value={counterTopic} onChange={(e) => setCounterTopic(e.target.value)} aria-label="Konter wählen">
                  <option value="">Konter wählen …</option>
                  {TOPIC_IDS.filter((t) => !p.counters.includes(t)).map((t) => (
                    <option key={t} value={t}>
                      {TOPICS[t].name}
                    </option>
                  ))}
                </select>
                <button disabled={!counterTopic} onClick={() => dispatch({ type: 'BUY_COUNTER', topicId: counterTopic })}>
                  Konter kaufen ({BALANCE.economy.counterCost})
                </button>
              </span>
            ) : null}
            {has('BUY_SHIP') ? (
              <button className="primary" onClick={() => dispatch({ type: 'BUY_SHIP' })}>
                <Icon name="schiff" /> Schiff kaufen ({BALANCE.economy.shipCost})
              </button>
            ) : null}
            {of('TRIAL').map((a) => (
              <button key={a.trial} className="primary" onClick={() => dispatch(a)}>
                <Icon name={a.trial} /> {TRIAL_NAMES[a.trial]} ablegen
              </button>
            ))}
          </div>
          <div className="small-text muted">
            {TRIALS.filter((t) => !p.trials[t]).map((t) => (
              <div key={t}>
                {TRIAL_NAMES[t]}: {trialBlocker(state, p, t) ?? 'jetzt möglich!'}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {others.length ? (
        <>
          <h3 style={{ marginTop: 8 }}>Schenken & Tauschen (frei)</h3>
          <div className="row small-text">
            <select value={giveItem} onChange={(e) => setGiveItem(e.target.value)} aria-label="Eigener Gegenstand">
              <option value="">Eigener Gegenstand …</option>
              {p.items.map((i) => (
                <option key={i} value={i}>
                  {ITEMS[i].name}
                </option>
              ))}
            </select>
            <select value={target?.id ?? ''} onChange={(e) => setGiveTo(e.target.value)} aria-label="Person">
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <button
              className="small"
              disabled={!giveItem || !target || target.items.length >= BALANCE.handLimit}
              onClick={() => {
                dispatch({ type: 'GIVE', from: p.id, to: target!.id, itemId: giveItem });
                setGiveItem('');
              }}
            >
              Schenken
            </button>
          </div>
          {target && target.items.length ? (
            <div className="row small-text" style={{ marginTop: 4 }}>
              <select value={tradeTheirs} onChange={(e) => setTradeTheirs(e.target.value)} aria-label="Gegenstand der anderen Person">
                <option value="">… gegen {target.name}s …</option>
                {target.items.map((i) => (
                  <option key={i} value={i}>
                    {ITEMS[i].name}
                  </option>
                ))}
              </select>
              <button
                className="small"
                disabled={!giveItem || !tradeTheirs}
                onClick={() => {
                  dispatch({ type: 'TRADE', a: p.id, itemA: giveItem, b: target.id, itemB: tradeTheirs });
                  setGiveItem('');
                  setTradeTheirs('');
                }}
              >
                Tauschen
              </button>
              <span className="muted">(beide Seiten müssen zustimmen – Absprache am Tisch)</span>
            </div>
          ) : null}
        </>
      ) : null}

      {has('DISCARD') ? (
        <>
          <h3 style={{ marginTop: 8, color: 'var(--danger)' }}>Handlimit {BALANCE.handLimit}: einen Gegenstand abwerfen</h3>
          <div className="action-group">
            {of('DISCARD').map((a) => (
              <button key={a.itemId} onClick={() => dispatch(a)}>
                {ITEMS[a.itemId].name}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="row" style={{ marginTop: 10 }}>
        <span className="spacer" />
        <button className="primary" disabled={!has('END_TURN')} onClick={() => dispatch({ type: 'END_TURN' })}>
          Zug beenden
        </button>
      </div>
    </div>
  );
}
