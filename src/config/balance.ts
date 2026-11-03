// Alle Zahlenwerte des Spiels. Änderungen hier wirken auf Engine, KI und Simulation.

export const BALANCE = {
  players: { min: 1, max: 5 },

  start: {
    doubloons: 4, // ANNAHME: Startkapital 4 Dublonen (Regel nennt keinen Wert)
    counters: 3, // ANNAHME: jede Person startet mit 3 zufälligen Konterkarten
    location: 'hafen' as const,
  },

  handLimit: 6,

  curse: {
    max: 15, // Feld 15 = alle verlieren
    perRound: 1,
    ghostApparition: 2, // Geistererscheinung: +2 statt +1
    extraEventFrom: 10, // ab diesem Feld eine zusätzliche Ereigniskarte
    curseRiddleReduction: 2,
    graveyardPirateReduction: 1,
  },

  riddles: {
    displaySize: 5,
    minCurseRiddlesOpen: 1,
    // ANNAHME: In jeder Fluchphase verlässt das älteste normale Rätsel die Auslage, damit sie nicht versteinert.
    rotatePerCursePhase: 1,
  },

  economy: {
    boatCost: 1,
    workIncome: 2,
    workLocations: ['hafen', 'taverne', 'werft'] as const,
    emptySearchDoubloons: 1,
    shopItemCost: 2,
    shopSize: 3, // ANNAHME: Krämer hat eine offene Auslage von 3 Gegenständen
    counterCost: 3,
    shipCost: 10,
    treasureDoubloons: 3,
    duelLossPenalty: 1,
  },

  fame: {
    trial: 5,
    thirdTrialBonus: 3,
    duelWin: 1,
    iou: 1,
    curseRiddle: 3,
    finaleFirstCounter: 2,
    doubloonsPerFame: 5,
  },

  duel: {
    hitsToWin: 3,
    dieSides: 6,
  },

  pirates: {
    activeOnBoard: 4, // ANNAHME: 4 Inselpiraten gleichzeitig auf der Insel
  },

  trials: {
    fragmentsNeeded: 4,
    crewNeeded: 3,
  },

  finale: {
    countersNeeded: 5,
    hitsToLose: 3,
  },

  favor: {
    // ANNAHME: Gültig im laufenden Zug des Empfängers (falls er gerade dran ist) und in seinem nächsten Zug.
    receiverTurns: 1,
  },

  solo: {
    // ANNAHME: Im Solo-Modus steigt der Fluch in den ersten N Fluchphasen nicht.
    curseGraceRounds: 2,
    startDoubloons: 4,
  },

  log: {
    maxEntries: 400,
  },
};

export type Balance = typeof BALANCE;
