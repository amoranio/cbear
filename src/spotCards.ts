import { advanceDeckProgress, flashDecks, freshDeckProgress, restoreDeckProgress, type DeckProgress } from './flashCards';

export type SpotMode = 'letters' | 'numbers';
export type SpotCard = { id: string; face: string; audio: string; spoken: string };
export type SpotProgress = DeckProgress & { wrongIndex: number };

// A mirror must be visibly different from the printed character. The omitted
// shapes still appear in the ordinary flash-card decks.
const letterFaces = Array.from('abcdefghijklmnopqrstuvwxyz').filter(face => !'mouvwx'.includes(face));
const numberFaces = Array.from('123456789').filter(face => face !== '8');

export const spotSets: Record<SpotMode, { title: string; cards: SpotCard[] }> = {
  letters: {
    title: 'Letters',
    cards: letterFaces.map(face => {
      const card = flashDecks.letters.cards.find(item => item.id === `letter-${face}`);
      if (!card) throw new Error(`Missing letter recording: ${face}`);
      return { id: card.id, face, audio: card.audio, spoken: card.spoken };
    }),
  },
  numbers: {
    title: 'Numbers',
    cards: numberFaces.map(face => {
      const card = flashDecks.numbers.cards.find(item => item.face === face);
      if (!card) throw new Error(`Missing number recording: ${face}`);
      return { id: card.id, face, audio: card.audio, spoken: card.spoken };
    }),
  },
};

export function isSpotMode(value: string): value is SpotMode {
  return value === 'letters' || value === 'numbers';
}

export function chooseWrongIndex(random: () => number = Math.random, previous?: number): number {
  const hasPrevious = Number.isInteger(previous) && previous! >= 0 && previous! < 25;
  const count = hasPrevious ? 24 : 25;
  const draw = Math.min(count - 1, Math.floor(random() * count));
  return hasPrevious && draw >= previous! ? draw + 1 : draw;
}

export function freshSpotProgress(length: number, random?: () => number): SpotProgress {
  return { ...freshDeckProgress(length, random), wrongIndex: chooseWrongIndex(random) };
}

export function advanceSpotProgress(progress: SpotProgress, random?: () => number): SpotProgress {
  return {
    ...advanceDeckProgress(progress, random),
    wrongIndex: chooseWrongIndex(random, progress.wrongIndex),
  };
}

export function restoreSpotProgress(raw: string | null, length: number, random?: () => number): SpotProgress | null {
  const deck = restoreDeckProgress(raw, length);
  if (!deck) return null;
  try {
    const saved = JSON.parse(raw!) as { wrongIndex?: number };
    if (!Number.isInteger(saved.wrongIndex) || saved.wrongIndex! < 0 || saved.wrongIndex! >= 25) return null;
    return { order: deck.order, index: deck.index, round: deck.round, wrongIndex: chooseWrongIndex(random, saved.wrongIndex) };
  } catch { return null; }
}
