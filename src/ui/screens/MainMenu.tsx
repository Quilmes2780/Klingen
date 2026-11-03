import { Icon } from '../components/Icon';

interface Props {
  canContinue: boolean;
  onNew: () => void;
  onContinue: () => void;
  onQuick: () => void;
  onRules: () => void;
}

export function MainMenu({ canContinue, onNew, onContinue, onQuick, onRules }: Props) {
  return (
    <div className="app">
      <div className="menu panel">
        <div style={{ color: 'var(--accent)' }}>
          <Icon name="klinge" size={56} />
        </div>
        <h1>Klingen &amp; Kommentare</h1>
        <p className="muted">Ein semi-kooperatives Insel-Abenteuer mit Rätseln und Wortgefechten.</p>
        <div className="col" style={{ marginTop: 16 }}>
          {canContinue ? (
            <button className="primary" onClick={onContinue}>
              Partie fortsetzen
            </button>
          ) : null}
          <button className={canContinue ? '' : 'primary'} onClick={onNew}>
            Neue Partie (1–5 Personen, Hotseat)
          </button>
          <button onClick={onQuick}>
            <Icon name="konter" /> Schnellmodus: Wortgefecht gegen einen Piraten
          </button>
          <button onClick={onRules}>Regelübersicht</button>
        </div>
      </div>
    </div>
  );
}
