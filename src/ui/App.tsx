import { useState } from 'react';
import { createGame } from '../engine/setup';
import type { GameState } from '../engine/types';
import { RulesPanel } from './components/RulesPanel';
import { GameScreen } from './screens/GameScreen';
import { GameSetup } from './screens/GameSetup';
import { MainMenu } from './screens/MainMenu';
import { QuickDuelScreen } from './screens/QuickDuelScreen';
import { loadGame, loadPrefs, savePrefs, type Prefs } from './storage';

type Screen = { kind: 'menu' } | { kind: 'setup' } | { kind: 'game'; state: GameState } | { kind: 'quick' };

export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const [rules, setRules] = useState(false);
  const setPrefs = (p: Prefs) => {
    setPrefsState(p);
    savePrefs(p);
  };
  const saved = screen.kind === 'menu' ? loadGame() : null;
  const resumable = saved && (saved.phase === 'playing' || saved.phase === 'finale') ? saved : null;

  return (
    <>
      {screen.kind === 'menu' ? (
        <MainMenu
          canContinue={!!resumable}
          onContinue={() => resumable && setScreen({ kind: 'game', state: resumable })}
          onNew={() => setScreen({ kind: 'setup' })}
          onQuick={() => setScreen({ kind: 'quick' })}
          onRules={() => setRules(true)}
        />
      ) : null}
      {screen.kind === 'setup' ? (
        <GameSetup onBack={() => setScreen({ kind: 'menu' })} onStart={(config) => setScreen({ kind: 'game', state: createGame(config) })} />
      ) : null}
      {screen.kind === 'game' ? <GameScreen initial={screen.state} prefs={prefs} setPrefs={setPrefs} onExit={() => setScreen({ kind: 'menu' })} /> : null}
      {screen.kind === 'quick' ? <QuickDuelScreen prefs={prefs} setPrefs={setPrefs} onExit={() => setScreen({ kind: 'menu' })} /> : null}
      {rules ? <RulesPanel onClose={() => setRules(false)} /> : null}
    </>
  );
}
