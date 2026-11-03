import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { aiStep, isAiTurn } from '../../engine/ai/autoplay';
import { boatTargets, canMoveNow, neighbors } from '../../engine/board';
import { BALANCE } from '../../config/balance';
import { currentActorId, getLegalActions, isGameOver } from '../../engine/legal';
import { applyAction } from '../../engine/reducer';
import type { Action, DuelState, GameState, LocationId } from '../../engine/types';
import { ActionPanel } from '../components/ActionPanel';
import { CurseTrack } from '../components/CurseTrack';
import { DuelView } from '../components/DuelView';
import { EventLog } from '../components/EventLog';
import { FinaleView } from '../components/FinaleView';
import { IslandMap } from '../components/IslandMap';
import { PlayerBoards } from '../components/PlayerBoard';
import { RiddleDisplay } from '../components/RiddleDisplay';
import { RulesPanel } from '../components/RulesPanel';
import { ScoreTable } from '../components/ScoreTable';
import { sideName } from '../../engine/duel';
import { clearGame, saveGame, type Prefs } from '../storage';
import { stopSpeech } from '../speech';

interface Props {
  initial: GameState;
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
  onExit: () => void;
}

export function GameScreen({ initial, prefs, setPrefs, onExit }: Props) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [paused, setPaused] = useState(false);
  // Abgeschlossenes Duell noch anzeigen, bis es weggeklickt wird.
  const [shownDuel, setShownDuel] = useState<DuelState | null>(null);
  // Der Reducer klont den Zustand – Duelle daher über ihre laufende Nummer erkennen, nicht per Objektidentität.
  const lastDuelRef = useRef(state.lastDuel ? state.stats.duelsFought : -1);

  const dispatch = useCallback((a: Action) => {
    setState((s) => {
      try {
        return applyAction(s, a);
      } catch (e) {
        setError((e as Error).message);
        return s;
      }
    });
  }, []);

  useEffect(() => saveGame(state), [state]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(t);
  }, [error]);

  // Fertiges Duell mit menschlicher Beteiligung kurz stehen lassen.
  useEffect(() => {
    if (state.lastDuel && !state.duel && state.stats.duelsFought !== lastDuelRef.current) {
      lastDuelRef.current = state.stats.duelsFought;
      const humans = state.lastDuel.sides.some((sd) => sd.kind === 'player' && state.players[sd.playerId].kind === 'human');
      if (humans) setShownDuel(state.lastDuel);
    }
  }, [state.lastDuel, state.duel, state.stats.duelsFought, state.players]);

  // KI-Züge automatisch ausführen.
  useEffect(() => {
    if (paused || shownDuel || isGameOver(state) || !isAiTurn(state)) return;
    const delay = state.duel || state.phase === 'finale' ? prefs.aiDelay * 1.4 : prefs.aiDelay;
    const t = setTimeout(() => {
      setState((s) => {
        try {
          return isAiTurn(s) ? aiStep(s) : s;
        } catch (e) {
          setError(`KI-Fehler: ${(e as Error).message}`);
          setPaused(true);
          return s;
        }
      });
    }, delay);
    return () => clearTimeout(t);
  }, [state, paused, shownDuel, prefs.aiDelay]);

  const actorId = currentActorId(state);
  const actor = actorId ? state.players[actorId] : null;
  const humanActs = !!actor && actor.kind === 'human';
  const legal = useMemo(() => (humanActs ? getLegalActions(state) : []), [state, humanActs]);
  const active = state.players[state.turnOrder[state.activeIdx]];
  const normalTurn = !state.duel && state.phase === 'playing' && humanActs;

  const walk = normalTurn && canMoveNow(state) ? neighbors(active.location) : [];
  const boats = normalTurn && canMoveNow(state) && active.doubloons >= BALANCE.economy.boatCost ? boatTargets(active.location) : [];
  const solvable = normalTurn ? legal.filter((a) => a.type === 'SOLVE_RIDDLE').map((a) => (a as { riddleId: string }).riddleId) : [];

  const onMap = (loc: LocationId, mode: 'walk' | 'boat') => dispatch(mode === 'walk' ? { type: 'MOVE', to: loc } : { type: 'BOAT', to: loc });

  const duelToShow = state.duel ?? shownDuel;
  const duelDecider = state.duel ? currentActorId(state) : null;

  return (
    <div className="app">
      <div className="topbar">
        <h1>Klingen &amp; Kommentare</h1>
        <span className="seed" title="Seed dieser Partie – gleicher Seed, gleiche Partie">
          Seed: {state.seed}
        </span>
        <span className="small-text muted">Runde {state.round}</span>
        <span className="spacer" />
        <label className="small-text row" style={{ gap: 4 }}>
          <input
            type="checkbox"
            checked={prefs.speech}
            onChange={(e) => {
              if (!e.target.checked) stopSpeech();
              setPrefs({ ...prefs, speech: e.target.checked });
            }}
          />
          Sprachausgabe
        </label>
        <label className="small-text row" style={{ gap: 4 }}>
          KI-Tempo
          <select value={prefs.aiDelay} onChange={(e) => setPrefs({ ...prefs, aiDelay: Number(e.target.value) })}>
            <option value={1200}>gemütlich</option>
            <option value={600}>normal</option>
            <option value={150}>schnell</option>
          </select>
        </label>
        <button className="small" onClick={() => setPaused((p) => !p)}>
          {paused ? 'KI fortsetzen' : 'KI pausieren'}
        </button>
        <button className="small" onClick={() => setShowRules(true)}>
          Regeln
        </button>
        <button className="small" onClick={onExit}>
          Hauptmenü
        </button>
      </div>

      <div className="game-grid">
        <div className="col">
          <CurseTrack curse={state.curse} />
          <IslandMap state={state} viewerId={humanActs ? actorId : null} walkTargets={walk} boatTargets={boats} onLocationClick={onMap} />
          <RiddleDisplay state={state} viewerId={normalTurn ? active.id : null} solvable={solvable} onSolve={(id) => dispatch({ type: 'SOLVE_RIDDLE', riddleId: id })} />
        </div>
        <div className="col">
          {normalTurn ? (
            <ActionPanel state={state} legal={legal} dispatch={dispatch} />
          ) : !isGameOver(state) ? (
            <div className="panel">
              <div className="turn-banner">{actor ? `${actor.name} ist am Zug${actor.kind === 'ai' ? ' (KI)' : ''}` : '…'}</div>
              {paused ? <div className="muted">KI pausiert.</div> : null}
            </div>
          ) : null}
          <EventLog log={state.log} />
        </div>
      </div>
      <h2 style={{ marginTop: 14 }}>Tableaus</h2>
      <PlayerBoards state={state} />

      {duelToShow ? (
        <div className="overlay">
          <DuelView
            duel={duelToShow}
            names={[sideName(state, duelToShow.sides[0]), sideName(state, duelToShow.sides[1])]}
            deciderCounters={duelDecider ? state.players[duelDecider].counters : []}
            humanDecides={!!state.duel && humanActs}
            speech={prefs.speech}
            onPick={(t) => dispatch({ type: 'DUEL_PICK', topicId: t })}
            onCounter={(t) => dispatch({ type: 'DUEL_COUNTER', topicId: t })}
            onClose={state.duel ? undefined : () => setShownDuel(null)}
          />
        </div>
      ) : null}

      {state.phase === 'finale' && state.finale ? (
        <div className="overlay">
          <FinaleView state={state} speech={prefs.speech} onRespond={(t) => dispatch({ type: 'FINALE_RESPOND', topicId: t })} />
        </div>
      ) : null}

      {isGameOver(state) && !duelToShow ? (
        <div className="overlay">
          <div className="dialog">
            <h2 style={{ color: state.phase === 'won' ? 'var(--ok)' : 'var(--danger)' }}>
              {state.phase === 'won' ? 'Der Fluch ist gebrochen!' : 'Der Fluch hat gesiegt.'}
            </h2>
            {state.phase === 'lost' ? <p>{state.lostReason} Alle haben verloren – es gibt keine Wertung.</p> : <p>Endwertung nach {state.round} Runden:</p>}
            {state.phase === 'won' ? <ScoreTable state={state} /> : null}
            {state.phase === 'lost' ? (
              <details style={{ marginTop: 8 }}>
                <summary>Ruhmstand zum Vergleich</summary>
                <ScoreTable state={state} />
              </details>
            ) : null}
            <div className="row" style={{ marginTop: 12 }}>
              <span className="spacer" />
              <button
                onClick={() => {
                  clearGame();
                  onExit();
                }}
                className="primary"
              >
                Zum Hauptmenü
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRules ? <RulesPanel onClose={() => setShowRules(false)} /> : null}
      {error ? <div className="toast" role="alert">{error}</div> : null}
    </div>
  );
}
