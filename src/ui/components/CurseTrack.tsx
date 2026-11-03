import { BALANCE } from '../../config/balance';
import { Icon } from './Icon';

export function CurseTrack({ curse }: { curse: number }) {
  const cells = Array.from({ length: BALANCE.curse.max + 1 }, (_, i) => i);
  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 6 }}>
        <strong style={{ color: 'var(--curse)' }}>
          <Icon name="fluch" /> Fluch: {curse} / {BALANCE.curse.max}
        </strong>
        <span className="small-text muted">
          ab {BALANCE.curse.extraEventFrom}: zwei Ereignisse je Fluchphase · {BALANCE.curse.max}: alle verlieren
        </span>
      </div>
      <div className="curse-track" role="meter" aria-valuemin={0} aria-valuemax={BALANCE.curse.max} aria-valuenow={curse}>
        {cells.map((i) => (
          <div
            key={i}
            className={[
              'curse-cell',
              i <= curse && i > 0 ? 'filled' : '',
              i === curse ? 'current' : '',
              i >= BALANCE.curse.extraEventFrom ? 'danger' : '',
              i === BALANCE.curse.max ? 'end' : '',
            ].join(' ')}
          >
            {i}
          </div>
        ))}
      </div>
    </div>
  );
}
