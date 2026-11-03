// Optionale Sprachausgabe über die Web Speech API.

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function germanVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('de'));
}

/** Spricht Zeilen nacheinander; `pitch` unterscheidet die Sprecher grob. */
export function speak(lines: { text: string; pitch?: number }[]): void {
  if (!speechAvailable() || !lines.length) return;
  try {
    const voice = germanVoice();
    for (const l of lines) {
      const u = new SpeechSynthesisUtterance(l.text);
      u.lang = 'de-DE';
      if (voice) u.voice = voice;
      u.pitch = l.pitch ?? 1;
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    }
  } catch {
    /* Sprachausgabe ist optional */
  }
}

export function stopSpeech(): void {
  if (!speechAvailable()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* egal */
  }
}
