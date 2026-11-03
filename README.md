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

**Standard seit Balance-Anpassung:** Ein gelöstes Fluch-Rätsel senkt den Fluch um **3** statt der ursprünglichen Regel −2 (`curse.curseRiddleReduction` in `src/config/balance.ts`). Grund: Mit −2 schlug die Gruppe den Fluch kaum je (2P 0 %, 3P 0,5 %, 4P 6 %, 5P 12,5 %).

| Personen | Sieg gegen den Fluch | Ø Runden | Ø Konter beim Bestehen der Klinge |
| --- | --- | --- | --- |
| 2 | 0,0 % | 21,9 | 11,0 |
| 3 | 6,5 % | 28,7 | 11,9 |
| 4 | 28,0 % | 29,9 | 11,0 |
| 5 | 31,0 % | 29,3 | 10,8 |

Ø Ruhm je Person nach Quelle:

| Personen | Prüfungen | Rätsel | Duelle | Schuldscheine | Finale | Bonus | Dublonen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 1,54 | 4,62 | 1,23 | 0,15 | 0,00 | 0,00 | 0,27 |
| 3 | 3,76 | 6,25 | 2,62 | 0,28 | 0,22 | 0,07 | 0,45 |
| 4 | 4,91 | 5,88 | 3,01 | 0,48 | 0,70 | 0,21 | 0,63 |
| 5 | 4,47 | 5,49 | 2,57 | 0,61 | 0,62 | 0,19 | 1,09 |

**Lesart:** Ab vier Personen ist das Spiel jetzt fordernd, aber gewinnbar. Zu zweit bleibt es praktisch unschaffbar: Eine einzelne Person braucht für drei Prüfungen mehr Züge, als der Fluch hergibt, und zu zweit gibt es zu wenige Hände für Fluch-Rätsel. Die KI ist eine Heuristik und spielt nicht optimal; Menschen dürften besser abschneiden.

Empfindlichkeit (je 40 Partien, gemessen mit der ursprünglichen Regel −2 als Basis):

| Variante | 2P | 3P | 4P | 5P |
| --- | --- | --- | --- | --- |
| Basis (−2) | 0 % | 0 % | 3 % | 20 % |
| Fluch-Rätsel −3 statt −2 (jetzt Standard) | 0 % | 8 % | 30 % | 40 % |
| Mannschaft 2 statt 3 | 0 % | 0 % | 5 % | 33 % |
| Schiff 6 statt 10 | 0 % | 5 % | 13 % | 15 % |
| Fluch-Maximum 20 | 0 % | 10 % | 33 % | 30 % |
| Mannschaft 2 + Schiff 6 + Fluch-Rätsel −3 | 0 % | 15 % | 28 % | 50 % |
| Fluch-Maximum 25 | 3 % | 15 % | 48 % | 50 % |

Alle diese Werte stehen in `src/config/balance.ts`.
