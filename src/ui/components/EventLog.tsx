import { useEffect, useRef } from 'react';
import type { LogEntry } from '../../engine/types';

export function EventLog({ log }: { log: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log.length]);
  return (
    <div className="panel">
      <h3>Ereignisprotokoll</h3>
      <div className="log" ref={ref} aria-live="polite">
        {log.map((e, i) => (
          <div key={i} className={`entry ${e.kind}`}>
            <span className="muted small-text">R{e.round} </span>
            {e.text}
          </div>
        ))}
      </div>
    </div>
  );
}
