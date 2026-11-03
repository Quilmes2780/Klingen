// Schlichte, eigene Linien-Icons (24×24, Farbe = currentColor).
import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  seil: (
    <>
      <path d="M5 18c3-6 11-6 14 0" />
      <path d="M5 12c3-6 11-6 14 0" />
      <path d="M5 6c3 2 11 2 14 0" />
    </>
  ),
  schluessel: (
    <>
      <circle cx="7" cy="12" r="4" />
      <path d="M11 12h10M17 12v4M20 12v3" />
    </>
  ),
  laterne: (
    <>
      <path d="M9 4h6M12 2v2M8 7h8l-1 11H9z" />
      <path d="M8 20h8" />
      <path d="M12 10v5" />
    </>
  ),
  flasche: (
    <>
      <path d="M10 2h4v5l2 3v11H8V10l2-3z" />
      <path d="M8 14h8" />
    </>
  ),
  kompass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-2 5-4 1 2-5z" />
    </>
  ),
  haken: <path d="M14 3v11a4 4 0 1 1-8 0M14 3h3" />,
  feder: (
    <>
      <path d="M20 4C10 4 6 10 5 19" />
      <path d="M20 4c-1 8-6 12-13 12" />
    </>
  ),
  knochen: (
    <>
      <path d="M8 8l8 8" />
      <circle cx="6" cy="7" r="2" />
      <circle cx="7" cy="5" r="2" />
      <circle cx="17" cy="19" r="2" />
      <circle cx="19" cy="17" r="2" />
    </>
  ),
  kerze: (
    <>
      <path d="M9 9h6v12H9z" />
      <path d="M12 3c2 2 2 4 0 5-2-1-2-3 0-5z" />
    </>
  ),
  fisch: (
    <>
      <path d="M3 12c4-6 11-6 15 0-4 6-11 6-15 0z" />
      <path d="M18 12l3-3v6z" />
      <circle cx="8" cy="11" r="0.8" />
    </>
  ),
  hammer: (
    <>
      <path d="M5 5h10v5H5z" />
      <path d="M11 10l7 11" />
    </>
  ),
  glocke: (
    <>
      <path d="M6 17c1-2 1-4 1-7a5 5 0 0 1 10 0c0 3 0 5 1 7z" />
      <path d="M10 20h4M12 3v2" />
    </>
  ),
  muschel: (
    <>
      <path d="M4 16c0-6 4-11 8-11s8 5 8 11z" />
      <path d="M12 5v11M8 7l2 9M16 7l-2 9" />
      <path d="M10 16l2 3 2-3" />
    </>
  ),
  buch: (
    <>
      <path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z" />
      <path d="M12 6v14" />
    </>
  ),
  fragment: (
    <>
      <path d="M4 5l7-2 9 3-2 8 2 6-9-2-7 1 1-7z" />
      <path d="M10 10l4 4M14 10l-4 4" />
    </>
  ),
  schaufel: (
    <>
      <path d="M12 2v12" />
      <path d="M8 14h8l-1 5-3 3-3-3z" />
      <path d="M9 2h6" />
    </>
  ),
  dublone: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
    </>
  ),
  ruhm: <path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16.2 6.6 19.2l1.3-6-4.5-4 6-.6z" />,
  pirat: (
    <>
      <path d="M5 10c0-4 3-6 7-6s7 2 7 6c0 3-2 4-2 6H7c0-2-2-3-2-6z" />
      <circle cx="9.5" cy="10" r="1.5" />
      <circle cx="14.5" cy="10" r="1.5" />
      <path d="M9 19h6M10 16v3M14 16v3" />
    </>
  ),
  schiff: (
    <>
      <path d="M3 16h18l-3 4H6z" />
      <path d="M12 3v13M12 4l6 9h-6M12 6l-5 7h5" />
    </>
  ),
  klinge: (
    <>
      <path d="M4 20l12-12 4-4-1 5-12 12" />
      <path d="M6 15l3 3M3 18l3 3" />
    </>
  ),
  karte: (
    <>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v14M15 6v14" />
      <path d="M17 10l2 2M19 10l-2 2" />
    </>
  ),
  kahn: (
    <>
      <path d="M3 14h18l-3 5H6z" />
      <path d="M8 14V8h8v6" />
    </>
  ),
  konter: (
    <>
      <path d="M4 5h16v10H9l-5 4z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),
  mannschaft: (
    <>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path d="M2 20c0-4 3-6 6-6s6 2 6 6M10 20c0-4 3-6 6-6s6 2 6 6" />
    </>
  ),
  fluch: (
    <>
      <path d="M12 3c4 3 6 6 6 10a6 6 0 0 1-12 0c0-4 2-7 6-10z" />
      <path d="M9.5 13h.01M14.5 13h.01M10 17c1-1 3-1 4 0" />
    </>
  ),
  zugang: (
    <>
      <path d="M6 21V8l6-5 6 5v13" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  schatz: (
    <>
      <path d="M3 10h18v10H3z" />
      <path d="M3 10c0-4 4-6 9-6s9 2 9 6" />
      <path d="M11 13h2v3h-2z" />
    </>
  ),
};

export function Icon({ name, size = 16, title }: { name: string; size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={{ verticalAlign: '-3px', flexShrink: 0 }}
    >
      {title ? <title>{title}</title> : null}
      {P[name] ?? <circle cx="12" cy="12" r="6" />}
    </svg>
  );
}
