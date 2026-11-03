import { BALANCE as B } from '../../config/balance';

export function RulesPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog rules" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Regelübersicht">
        <div className="row">
          <h2>Regelübersicht</h2>
          <span className="spacer" />
          <button onClick={onClose}>Schließen</button>
        </div>
        <p>
          Semi-kooperativ: Alle verlieren gemeinsam, wenn der Fluch Feld {B.curse.max} erreicht. Wer den Fluch bricht, gewinnt mit der Gruppe – den
          Ruhm zählt aber jede Person für sich.
        </p>
        <h3>Dein Zug</h3>
        <ol>
          <li>Optional bewegen: zu einem Nachbarort oder für {B.economy.boatCost} Dublone per Boot von Küste zu Küste.</li>
          <li>
            Genau eine Aktion: <b>Durchsuchen</b> (oberste Karte des Ortsstapels, leer → {B.economy.emptySearchDoubloons} Dublone),{' '}
            <b>Rätsel lösen</b>, <b>Wortgefecht</b>, <b>Gelegenheitsarbeit</b> ({B.economy.workIncome} Dublonen in Hafen/Taverne/Werft),{' '}
            <b>Einkaufen</b> (Krämer: Gegenstand für {B.economy.shopItemCost}; Taverne: Konter für {B.economy.counterCost}; Werft: Schiff für{' '}
            {B.economy.shipCost}) oder <b>Prüfung ablegen</b>.
          </li>
          <li>Jederzeit im eigenen Zug frei: Tauschen und Schenken mit Personen am selben Ort. Handlimit {B.handLimit}.</li>
        </ol>
        <h3>Fluchphase (nach jeder Runde)</h3>
        <p>
          Ereigniskarte (ab Feld {B.curse.extraEventFrom} zwei), Fluch +{B.curse.perRound} (Geistererscheinung +{B.curse.ghostApparition}),
          Inselpiraten ziehen weiter, Rätselauslage auf {B.riddles.displaySize} auffüllen – immer mindestens ein Fluch-Rätsel offen.
        </p>
        <h3>Rätsel und Gefälligkeiten</h3>
        <p>
          Rätsel brauchen 2–3 Symbole am richtigen Ort. Fluch-Rätsel: Fluch −{B.curse.curseRiddleReduction}, {B.fame.curseRiddle} Ruhm geteilt,
          Gegenstände aller Personen am Ort zählen. Wer etwas verschenkt, das beim Empfänger im selben oder nächsten Zug ein Rätsel löst, erhält einen
          Schuldschein ({B.fame.iou} Ruhm).
        </p>
        <h3>Wortgefechte</h3>
        <p>
          16 Themen, ein Konter passt zum gleichen Thema. Wer zuerst {B.duel.hitsToWin} Treffer hat, gewinnt. Gegen Piraten wählst du das Thema; der
          Pirat pariert mit W6 ≤ Stärke, dann greift er an. Jedes Thema nur einmal pro Duell. Danach lernst du jeden gehörten Konter. Sieg: {B.fame.duelWin}{' '}
          Ruhm + Pirat als Mannschaft (auf dem Friedhof zusätzlich Fluch −{B.curse.graveyardPirateReduction}). Niederlage: −{B.economy.duelLossPenalty}{' '}
          Dublone.
        </p>
        <h3>Prüfungen (je {B.fame.trial} Ruhm)</h3>
        <ul>
          <li>
            <b>Klinge</b>: Zugang über ein Rätsel, dann im Herrenhaus gegen die Meisterin – sie greift nur an. Passender Konter = Treffer für dich.
          </li>
          <li>
            <b>Karte</b>: {B.trials.fragmentsNeeded} Kartenfragmente + Schaufel, am Schatzort heben (+{B.economy.treasureDoubloons} Dublonen). Wer alle
            Fragmente hat, sieht den Schatzort auf der Karte.
          </li>
          <li>
            <b>Kahn</b>: Schiff + {B.trials.crewNeeded} Mannschaftskarten, im Hafen.
          </li>
        </ul>
        <h3>Finale</h3>
        <p>
          Wer die dritte Prüfung besteht (+{B.fame.thirdTrialBonus}), ruft den Geisterkapitän in den Hafen. Alle haben noch einen Zug. Dann
          gemeinsames Wortgefecht: {B.finale.countersNeeded} Konter vor {B.finale.hitsToLose} Treffern. Erster Konter je Angriff: +
          {B.fame.finaleFirstCounter} Ruhm.
        </p>
        <h3>Wertung</h3>
        <p>
          Prüfungen, Rätsel laut Karte, Duellsiege, Schuldscheine, Finale-Konter, Bonus und 1 Ruhm je {B.fame.doubloonsPerFame} Dublonen. Gleichstand:
          mehr Dublonen.
        </p>
        <h3>Annahmen dieser Umsetzung</h3>
        <ul className="small-text">
          <li>Fragmente und Schaufeln liegen offen oben auf ihrem Ortsstapel; nach dem Schatzheben landen die Fragmente oben auf zufälligen Stapeln.</li>
          <li>Boot nur von einem Küstenort aus. Bewegung ist optional.</li>
          <li>In jeder Fluchphase verlässt das älteste normale Rätsel die Auslage.</li>
          <li>Nach der Kahn-Prüfung heuert die Mannschaft ab und kehrt als Inselpiraten zurück.</li>
          <li>Ist im Finale niemand im Hafen, ist die Partie verloren.</li>
        </ul>
      </div>
    </div>
  );
}
