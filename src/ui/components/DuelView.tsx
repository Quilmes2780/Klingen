// Wortgefecht-Dialog: Sprechblasen, Trefferanzeige, Auswahl von Thema bzw. Konter.
import { useEffect, useRef } from 'react';
import { BALANCE } from '../../config/balance';
import { TOPICS } from '../../engine/content';
import { duelDecider, insultText, unusedTopics } from '../../engine/duel';
import type { DuelState, TopicId } from '../../engine/types';
import { speak } from '../speech';
import { Icon } from './Icon';

interface Props {
  duel: DuelState;
  names: [string, string];
  /** Konter der Person, die gerade entscheiden muss. */
  deciderCounters: TopicId[];
  humanDecides: boolean;
  speech: boolean;
  onPick: (t: TopicId) => void;
  onCounter: (t: TopicId | null) => void;
  onClose?: () => void;
  closeLabel?: string;
  extra?: React.ReactNode;
}

function Pips({ n, good }: { n: number; good?: boolean }) {
  return (
    <div className="pips" aria-label={`${n} Treffer`}>
      {Array.from({ length: BALANCE.duel.hitsToWin }, (_, i) => (
        <span key={i} className={`pip${good ? ' good' : ''}${i < n ? ' on' : ''}`} />
      ))}
    </div>
  );
}

export function DuelView({ duel, names, deciderCounters, humanDecides, speech, onPick, onCounter, onClose, closeLabel, extra }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const spoken = useRef(0);
  const decider = duelDecider(duel);
  const sideClass = (side: 0 | 1) => (side === 0 ? 'right' : 'left');
  const title = duel.kind === 'master' ? 'Prüfung der Klinge' : 'Wortgefecht';

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [duel.exchanges.length, duel.topic]);

  // Sprachausgabe für neue Wortwechsel.
  useEffect(() => {
    if (!speech) {
      spoken.current = duel.exchanges.length;
      return;
    }
    const lines: { text: string; pitch: number }[] = [];
    for (const ex of duel.exchanges.slice(spoken.current)) {
      lines.push({ text: insultText(duel, ex.attacker, ex.topic), pitch: ex.attacker === 0 ? 1.1 : 0.8 });
      if (ex.counter) lines.push({ text: TOPICS[ex.counter].counter, pitch: ex.attacker === 0 ? 0.8 : 1.1 });
    }
    spoken.current = duel.exchanges.length;
    if (duel.stage === 'counter' && duel.topic) lines.push({ text: insultText(duel, duel.attacker, duel.topic), pitch: duel.attacker === 0 ? 1.1 : 0.8 });
    speak(lines);
  }, [duel.exchanges.length, duel.topic, duel.stage, speech, duel]);

  const learned = duel.learned[0];
  const playerWon = duel.winner === 0;

  return (
    <div className="dialog" role="dialog" aria-label={title}>
      <div className="duel-head">
        <div className="side">
          <div style={{ fontWeight: 700 }}>{names[1]}</div>
          <Pips n={duel.hits[1]} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <Icon name="klinge" size={30} />
          <div className="small-text muted">{title}</div>
        </div>
        <div className="side right">
          <div style={{ fontWeight: 700 }}>{names[0]}</div>
          <Pips n={duel.hits[0]} good />
        </div>
      </div>

      <div className="bubbles" ref={scroller}>
        {duel.exchanges.map((ex, i) => {
          const def = ex.attacker === 0 ? 1 : 0;
          const verdict =
            duel.kind === 'master'
              ? ex.parried
                ? `Treffer für ${names[def]}`
                : `Treffer für ${names[ex.attacker]}`
              : ex.parried
                ? 'Pariert – Angriffswechsel'
                : `Treffer für ${names[ex.attacker]}`;
          const good = (duel.kind === 'master' && ex.parried) || (duel.kind !== 'master' && ex.parried);
          return (
            <div key={i} className="col" style={{ gap: 4 }}>
              <div className={`bubble ${sideClass(ex.attacker)}`}>
                <span className="who">
                  {names[ex.attacker]} · {TOPICS[ex.topic].name}
                </span>
                {insultText(duel, ex.attacker, ex.topic)}
              </div>
              <div className={`bubble ${sideClass(def)}${ex.counter ? '' : ' miss'}${ex.parried ? '' : ' hit'}`}>
                <span className="who">{names[def]}</span>
                {ex.counter
                  ? `${TOPICS[ex.counter].counter}${ex.counter !== ex.topic ? ' (passt nicht!)' : ''}`
                  : '… (sucht vergeblich nach Worten)'}
              </div>
              <div className={`verdict ${good ? 'parry' : 'hit'}`}>{verdict}</div>
            </div>
          );
        })}
        {duel.stage === 'counter' && duel.topic ? (
          <div className={`bubble ${sideClass(duel.attacker)}`}>
            <span className="who">
              {names[duel.attacker]} · {TOPICS[duel.topic].name}
            </span>
            {insultText(duel, duel.attacker, duel.topic)}
          </div>
        ) : null}
      </div>

      {duel.stage === 'over' ? (
        <div className="col" style={{ marginTop: 10, alignItems: 'center' }}>
          <h3 style={{ color: playerWon ? 'var(--ok)' : 'var(--danger)' }}>
            {playerWon ? `${names[0]} gewinnt!` : `${names[1]} gewinnt!`}
          </h3>
          {learned.length ? (
            <div className="small-text">
              Gelernt (Lernen durch Verlieren): {learned.map((t) => TOPICS[t].name).join(', ')}
            </div>
          ) : null}
          {extra}
          {onClose ? (
            <button className="primary" onClick={onClose} autoFocus>
              {closeLabel ?? 'Weiter'}
            </button>
          ) : null}
        </div>
      ) : decider === null ? null : !humanDecides ? (
        <div className="muted" style={{ marginTop: 10, textAlign: 'center' }}>
          {names[decider]} überlegt …
        </div>
      ) : duel.stage === 'pick' ? (
        <div style={{ marginTop: 10 }}>
          <strong>{names[decider]}: Wähle ein Thema für deine Beleidigung</strong>
          <div className="choice-list">
            {unusedTopics(duel).map((t) => (
              <button key={t} onClick={() => onPick(t)}>
                <span className="topic">
                  {TOPICS[t].name}
                  {deciderCounters.includes(t) ? ' · Konter bekannt' : ''}
                </span>
                {TOPICS[t].insult}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <strong>{names[decider]}: Wie konterst du?</strong>
          <div className="choice-list">
            {deciderCounters.map((t) => (
              <button key={t} onClick={() => onCounter(t)}>
                <span className="topic">{TOPICS[t].name}</span>
                {TOPICS[t].counter}
              </button>
            ))}
            <button onClick={() => onCounter(null)}>
              <span className="topic">Kein Konter</span>…ähm…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
