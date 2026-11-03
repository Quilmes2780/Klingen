import { describe, expect, it } from 'vitest';
import { CONTENT, TOPICS, validateContent } from '../content';

describe('Inhalte', () => {
  it('sind gültig und vollständig verknüpft', () => {
    expect(validateContent(CONTENT)).toEqual([]);
  });

  it('haben die geforderten Mengen', () => {
    expect(CONTENT.locations).toHaveLength(8);
    expect(CONTENT.topics).toHaveLength(16);
    expect(CONTENT.curseInsults).toHaveLength(8);
    expect(CONTENT.pirates).toHaveLength(8);
    expect(CONTENT.riddles).toHaveLength(30);
    expect(CONTENT.items).toHaveLength(48);
  });

  it('jedes Thema hat Beleidigung, Konter und Meister-Beleidigung', () => {
    for (const t of CONTENT.topics) {
      expect(t.insult.length).toBeGreaterThan(5);
      expect(t.counter.length).toBeGreaterThan(5);
      expect(t.masterInsult.length).toBeGreaterThan(5);
    }
  });

  it('Fluch-Beleidigungen nutzen verschiedene Themen', () => {
    const topics = CONTENT.curseInsults.map((c) => c.topic);
    expect(new Set(topics).size).toBe(topics.length);
  });

  it('übernimmt die vier vorgegebenen Paare wörtlich', () => {
    expect(TOPICS.geruch.insult).toBe('Du riechst nach drei Wochen altem Pökelfisch!');
    expect(TOPICS.geruch.counter).toBe('Ich wollte nur, dass du dich wie zu Hause fühlst.');
    expect(TOPICS.schiff.insult).toBe('Dein Schiff hat mehr Löcher als ein Fischernetz!');
    expect(TOPICS.schiff.counter).toBe('Deshalb bleiben Fische wie du ja auch drin hängen.');
    expect(TOPICS.fechtkunst.insult).toBe('Ich habe Krabben gesehen, die eleganter fechten als du!');
    expect(TOPICS.fechtkunst.counter).toBe('Kein Wunder, du verbringst ja deine Abende mit ihnen.');
    expect(TOPICS.mannschaft.insult).toBe('Wenn ich mit dir fertig bin, sucht deine Crew einen neuen Kapitän!');
    expect(TOPICS.mannschaft.counter).toBe('Dich nehmen sie trotzdem nicht, die haben Geschmack.');
  });

  it('Pirat-Stärken liegen zwischen 2 und 5', () => {
    for (const p of CONTENT.pirates) expect(p.strength).toBeGreaterThanOrEqual(2);
    for (const p of CONTENT.pirates) expect(p.strength).toBeLessThanOrEqual(5);
  });
});
