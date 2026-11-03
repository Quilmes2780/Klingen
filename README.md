# Klingen & Kommentare

Browser-Umsetzung des semi-kooperativen Insel-Abenteuers mit Rätseln und Wortgefechten.
TypeScript, Vite, React, ohne Server. Hotseat für 1–5 Personen (Mensch oder KI); mit einer Person läuft der Solo-Modus.

## Starten

```bash
npm install
npm run dev        # Entwicklungsserver auf http://localhost:5173
npm test           # Vitest – alle Engine-Regeln
npm run build      # Produktions-Build nach dist/
npm run sim        # 200 KI-Partien je Spielerzahl (2–5), Auswertung in der Konsole
npm run sim -- 50  # andere Anzahl
```

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/engine` | Komplette Spiellogik als reine Funktionen `applyAction(state, action) → newState`. Kein React, kein DOM. |
| `src/engine/ai` | KI-Heuristik (`chooseAction`) und Autoplay für die Simulation |
| `src/engine/__tests__` | Vitest-Tests für jede Regel |
| `src/config/balance.ts` | **Alle Zahlenwerte** |
| `src/content/*.json` | **Alle Spieltexte**: Orte (inkl. Wegenetz), Symbole, Gegenstände, Rätsel, Themen (Beleidigung/Konter/Meister-Beleidigung), Fluch-Beleidigungen, Piraten, Ereignisse |
| `src/ui` | Darstellung: Inselkarte (SVG), Fluchleiste, Rätselauslage, Tableaus, Wortgefecht-Dialog, Finale, Protokoll, Regeln, Wertung, Schnellmodus |
| `scripts/simulate.ts` | Simulation |

Die Inhalte werden beim Start geprüft (`validateContent`, auch als Test). Wenn du Texte änderst, zeigt `npm test` kaputte Querverweise sofort an.

Der Seed steht oben im Spiel. Gleicher Seed und gleiche Züge ergeben dieselbe Partie. Der Spielstand liegt in `localStorage`, alle Zugriffe sind mit try/catch abgesichert.

## Annahmen (im Code mit `// ANNAHME` markiert)

**Spielfeld und Zug**
- Wegenetz: Hafen–Taverne, Hafen–Krämer, Hafen–Werft, Taverne–Krämer, Krämer–Dschungel, Werft–Leuchtturm, Dschungel–Friedhof, Dschungel–Herrenhaus, Herrenhaus–Leuchtturm, Friedhof–Leuchtturm. Küstenorte: Hafen, Werft, Friedhof, Leuchtturm (`locations.json`).
- Die Bewegung ist optional. Das Boot fährt nur von einem Küstenort ab.
- Start: alle im Hafen, 4 Dublonen, 3 zufällige Konter.
- Tauschen und Schenken nur, wenn eine der beiden Personen am Zug ist. Ein Geschenk darf das Handlimit nicht sprengen. Über dem Handlimit wird am Zugende abgeworfen.
- Krämer: 3 offene Gegenstände, Nachschub aus der Ablage, sonst aus dem Krämer-Stapel. Taverne: Das Thema des gekauften Konters ist frei wählbar. Das Schiff gibt es auf der Werft, der Kauf zählt als „Einkaufen“.

**Rätsel und Gefälligkeiten**
- Die Engine wählt die passenden Gegenstände automatisch (eigene zuerst, geschenkte bevorzugt). Bei Fluch-Rätseln stimmen Mitspielende am Ort stillschweigend zu.
- Der Ruhm aus Fluch-Rätseln wird abgerundet geteilt, der Rest geht an die lösende Person.
- Gefälligkeit gilt im laufenden Zug des Empfängers (falls er gerade dran ist) und in seinem nächsten Zug.
- In jeder Fluchphase verlässt das älteste normale Rätsel die Auslage, sonst „versteinert“ sie. Ein leerer Rätselstapel wird aus gelösten Rätseln neu gemischt.

**Wortgefechte**
- 4 Inselpiraten gleichzeitig auf der Insel. Für jeden besiegten erscheint der nächste aus dem Stapel.
- Gehen die Themen aus, gewinnt die Seite mit mehr Treffern, bei Gleichstand die verteidigende.
- Duell zwischen Personen: Wer pariert, übernimmt den Angriff, und beide lernen gehörte Konter. Die unterlegene Person zahlt 1 Dublone an die siegreiche.
- Die KI fordert keine Mitspielenden heraus.

**Prüfungen**
- Kartenfragmente und Schaufeln liegen offen oben auf ihrem Ortsstapel. Nach dem Schatzheben landen die Fragmente oben auf zufälligen Stapeln, und der Schatz zieht um (nie in den Hafen).
- Nach der Kahn-Prüfung heuert die Mannschaft ab und kehrt als Inselpiraten zurück. Sonst gehen bei 3+ Personen die 8 Piraten aus.
- Wer gegen die Meisterin verliert, darf es später erneut versuchen.

**Fluch und Finale**
- In den letzten Zügen vor dem Finale gibt es keine Fluchphase. Auch die auslösende Person hat noch einen Zug (als letzte).
- Im Finale rotiert die Reihenfolge je Angriff. Ein falscher Konter zählt wie Passen. Steht niemand im Hafen, ist die Partie verloren.
- Solo: 4 Startdublonen, der Fluch steigt in den ersten 2 Fluchphasen nicht.

## Simulation (200 KI-Partien je Spielerzahl)

| Personen | Sieg gegen den Fluch | Ø Runden | Ø Konter beim Bestehen der Klinge |
| --- | --- | --- | --- |
| 2 | 0,0 % | 18,4 | 12,2 |
| 3 | 0,5 % | 23,2 | 11,4 |
| 4 | 6,0 % | 25,5 | 10,8 |
| 5 | 12,5 % | 25,9 | 10,7 |

Ø Ruhm je Person nach Quelle:

| Personen | Prüfungen | Rätsel | Duelle | Schuldscheine | Finale | Bonus | Dublonen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 1,06 | 3,80 | 0,71 | 0,10 | 0,00 | 0,00 | 0,23 |
| 3 | 2,13 | 5,37 | 1,66 | 0,28 | 0,02 | 0,01 | 0,34 |
| 4 | 3,24 | 5,47 | 2,26 | 0,43 | 0,15 | 0,04 | 0,47 |
| 5 | 3,53 | 5,15 | 2,22 | 0,58 | 0,25 | 0,07 | 0,70 |

**Lesart:** Das Spiel ist mit den verbindlichen Regeln sehr schwer, vor allem zu zweit und zu dritt. Eine einzelne Person braucht für drei Prüfungen deutlich mehr Züge, als der Fluch hergibt (Fluch +1 je Runde, Ende bei 15). Zu zweit lohnen sich Fluch-Rätsel kaum: Sie kosten etwa so viele Aktionen, wie sie Runden zurückbringen. Die KI ist eine Heuristik und spielt nicht optimal. Menschen dürften besser abschneiden, die Tendenz bleibt aber.

Empfindlichkeit (je 40 Partien; die Basis entspricht der Tabelle oben):

| Variante | 2P | 3P | 4P | 5P |
| --- | --- | --- | --- | --- |
| Basis | 0 % | 0 % | 3 % | 20 % |
| Fluch-Rätsel −3 statt −2 | 0 % | 8 % | 30 % | 40 % |
| Mannschaft 2 statt 3 | 0 % | 0 % | 5 % | 33 % |
| Schiff 6 statt 10 | 0 % | 5 % | 13 % | 15 % |
| Fluch-Maximum 20 | 0 % | 10 % | 33 % | 30 % |
| Mannschaft 2 + Schiff 6 + Fluch-Rätsel −3 | 0 % | 15 % | 28 % | 50 % |
| Fluch-Maximum 25 | 3 % | 15 % | 48 % | 50 % |

Alle diese Werte stehen in `src/config/balance.ts`.
