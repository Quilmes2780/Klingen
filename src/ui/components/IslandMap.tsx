import { CONTENT, ITEMS, LOCATIONS, PIRATES } from '../../engine/content';
import type { GameState, LocationId, PlayerId } from '../../engine/types';
import { Icon } from './Icon';
import { playerColor } from './colors';

const LOC_ICON: Record<LocationId, string> = {
  hafen: 'schiff',
  taverne: 'flasche',
  kraemer: 'dublone',
  werft: 'hammer',
  dschungel: 'feder',
  friedhof: 'knochen',
  herrenhaus: 'zugang',
  leuchtturm: 'laterne',
};

const EDGES = (() => {
  const seen = new Set<string>();
  const out: [LocationId, LocationId][] = [];
  for (const l of CONTENT.locations) {
    for (const n of l.neighbors) {
      const key = [l.id, n].sort().join('-');
      if (!seen.has(key)) {
        seen.add(key);
        out.push([l.id, n]);
      }
    }
  }
  return out;
})();

interface Props {
  state: GameState;
  viewerId: PlayerId | null;
  walkTargets: LocationId[];
  boatTargets: LocationId[];
  onLocationClick?: (loc: LocationId, mode: 'walk' | 'boat') => void;
}

export function IslandMap({ state, viewerId, walkTargets, boatTargets, onLocationClick }: Props) {
  const viewer = viewerId ? state.players[viewerId] : null;
  const fragments = viewer ? viewer.items.filter((i) => ITEMS[i].kind === 'fragment').length : 0;
  const showTreasure = fragments >= 4;
  return (
    <div className="map panel" style={{ padding: 6 }}>
      <svg className="island" viewBox="0 0 820 600" role="img" aria-label="Inselkarte">
        <defs>
          <pattern id="waves" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M0 10 Q10 4 20 10 T40 10" fill="none" stroke="var(--sea-deep)" strokeWidth="1.5" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="820" height="600" fill="var(--sea)" />
        <rect width="820" height="600" fill="url(#waves)" />
        <path
          d="M120 150 C140 70 300 60 420 80 C560 60 720 100 730 210 C760 300 700 360 680 430 C660 520 540 540 450 530 C340 540 250 500 260 440 C200 420 150 360 150 300 C100 260 100 200 120 150 Z"
          fill="var(--land)"
          stroke="var(--land-edge)"
          strokeWidth="4"
        />
        {EDGES.map(([a, b]) => (
          <line
            key={a + b}
            x1={LOCATIONS[a].x}
            y1={LOCATIONS[a].y}
            x2={LOCATIONS[b].x}
            y2={LOCATIONS[b].y}
            stroke="var(--land-edge)"
            strokeWidth="5"
            strokeDasharray="2 10"
            strokeLinecap="round"
          />
        ))}
        {CONTENT.locations.map((l) => {
          const walk = walkTargets.includes(l.id);
          const boat = !walk && boatTargets.includes(l.id);
          const cls = `loc${walk ? ' reachable' : ''}${boat ? ' reachable boat' : ''}`;
          const here = state.turnOrder.map((id) => state.players[id]).filter((p) => p.location === l.id);
          const pirates = state.pirates.filter((p) => p.location === l.id);
          const deck = state.locationDecks[l.id];
          const top = deck[0] && ITEMS[deck[0]].kind !== 'normal' ? ITEMS[deck[0]] : null;
          return (
            <g
              key={l.id}
              className={cls}
              onClick={() => (walk || boat) && onLocationClick?.(l.id, walk ? 'walk' : 'boat')}
              role={walk || boat ? 'button' : undefined}
              aria-label={walk || boat ? `${walk ? 'Gehe' : 'Boot'} nach ${l.name}` : l.name}
            >
              <title>{`${l.name}\n${l.description}\nStapel: ${deck.length} Karten`}</title>
              <circle className="ring" cx={l.x} cy={l.y} r={40} fill="none" stroke="transparent" />
              <circle cx={l.x} cy={l.y} r={32} fill="var(--panel)" stroke={l.coastal ? 'var(--sea-deep)' : 'var(--land-edge)'} strokeWidth="3" />
              <g transform={`translate(${l.x - 14} ${l.y - 16})`} style={{ color: 'var(--ink)' }}>
                <Icon name={LOC_ICON[l.id]} size={28} />
              </g>
              <text x={l.x} y={l.y + 52} textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--ink)" style={{ paintOrder: 'stroke', stroke: 'var(--land)', strokeWidth: 4 }}>
                {l.name.replace(/ „.*“/, '')}
              </text>
              <text x={l.x + 26} y={l.y + 30} fontSize="11" fill="var(--muted)">
                {deck.length}
              </text>
              {top ? (
                <g transform={`translate(${l.x + 18} ${l.y - 40})`} style={{ color: 'var(--gold)' }}>
                  <title>{`Offen oben: ${top.name}`}</title>
                  <circle cx="11" cy="11" r="13" fill="var(--panel)" stroke="var(--gold)" strokeWidth="2" />
                  <g transform="translate(1 1)">
                    <Icon name={top.symbol} size={20} />
                  </g>
                </g>
              ) : null}
              {showTreasure && state.treasureLocation === l.id ? (
                <g transform={`translate(${l.x - 44} ${l.y - 44})`} style={{ color: 'var(--danger)' }}>
                  <title>Hier liegt der Schatz!</title>
                  <circle cx="12" cy="12" r="14" fill="var(--panel)" stroke="var(--danger)" strokeWidth="2" />
                  <g transform="translate(2 2)">
                    <Icon name="schatz" size={20} />
                  </g>
                </g>
              ) : null}
              {here.map((p, i) => {
                const px = l.x - 48 - Math.floor(i / 3) * 24;
                const py = l.y - 18 + (i % 3) * 20;
                const idx = state.turnOrder.indexOf(p.id);
                const active = state.turnOrder[state.activeIdx] === p.id;
                return (
                  <g key={p.id}>
                    <title>{p.name}</title>
                    <circle cx={px} cy={py} r={active ? 12 : 10} fill={playerColor(idx)} stroke={active ? 'var(--ink)' : '#fff'} strokeWidth={active ? 3 : 2} />
                    <text x={px} y={py + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
                      {p.name.slice(0, 1).toUpperCase()}
                    </text>
                  </g>
                );
              })}
              {pirates.map((pi, i) => (
                <g key={pi.id} transform={`translate(${l.x - 12 + i * 26 - (pirates.length - 1) * 13} ${l.y - 70})`}>
                  <title>{`${PIRATES[pi.id].name} (Stärke ${PIRATES[pi.id].strength})`}</title>
                  <circle cx="12" cy="12" r="13" fill="#2b2118" stroke="#fff" strokeWidth="1.5" />
                  <g transform="translate(2 1)" style={{ color: '#fff' }}>
                    <Icon name="pirat" size={20} />
                  </g>
                  <text x="22" y="24" fontSize="11" fontWeight="700" fill="var(--danger)" style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3 }}>
                    {PIRATES[pi.id].strength}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="row small-text muted" style={{ padding: '4px 6px' }}>
        <span>
          <span style={{ color: 'var(--ok)' }}>— —</span> zu Fuß erreichbar
        </span>
        <span>
          <span style={{ color: 'var(--sea-deep)' }}>· · ·</span> per Boot (1 Dublone)
        </span>
        <span>
          <Icon name="pirat" /> Inselpirat (Zahl = Stärke)
        </span>
        <span style={{ color: 'var(--gold)' }}>
          <Icon name="fragment" /> offen liegendes Fragment/Schaufel
        </span>
      </div>
    </div>
  );
}
