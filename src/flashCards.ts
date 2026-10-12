import { soundGroups, type SoundTile } from './soundBoard';

export type DeckId = 'numbers' | 'letters' | 'phonics';
export type FlashCard = { id: string; face: string; caption: string; audio: string; spoken: string };
export type DeckProgress = { order: number[]; index: number; round: number };

const numberWords = [
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen', 'twenty',
];

const tiles = soundGroups.flatMap(group => group.sounds);
const tileByLetters = new Map<string, SoundTile>(tiles.map(tile => [tile.letters, tile]));

const letters = Array.from('abcdefghijklmnopqrstuvwxyz', letter => {
  const sound = tileByLetters.get(letter === 'q' ? 'qu' : letter);
  if (!sound) throw new Error(`Missing letter sound: ${letter}`);
  return {
    id: `letter-${letter}`,
    face: `${letter.toUpperCase()}${letter}`,
    caption: `as in ${sound.example}`,
    audio: sound.audio,
    spoken: sound.spoken,
  };
});

export const flashDecks: Record<DeckId, { title: string; description: string; cards: FlashCard[] }> = {
  numbers: {
    title: 'Numbers',
    description: 'Count and say the numbers from one to twenty.',
    cards: numberWords.map((word, index) => ({
      id: `number-${index + 1}`,
      face: String(index + 1),
      caption: word,
      audio: `audio/flash-cards/numbers/${index + 1}.wav`,
      spoken: word,
    })),
  },
  letters: {
    title: 'Letters',
    description: 'See big and small letters, then hear their sounds.',
    cards: letters,
  },
  phonics: {
    title: 'Phonics',
    description: 'Practise every sound in the Learn sound library.',
    cards: tiles.map(tile => ({
      id: `sound-${tile.id}`,
      face: tile.letters,
      caption: `as in ${tile.example}`,
      audio: tile.audio,
      spoken: tile.spoken,
    })),
  },
};

export function isDeckId(value: string): value is DeckId {
  return value === 'numbers' || value === 'letters' || value === 'phonics';
}

export function shuffledOrder(length: number, random: () => number = Math.random, previousLast?: number): number[] {
  const order = Array.from({ length }, (_, index) => index);
  for (let index = length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }
  if (length > 1 && order[0] === previousLast) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

export function freshDeckProgress(length: number, random?: () => number): DeckProgress {
  return { order: shuffledOrder(length, random), index: 0, round: 1 };
}

export function advanceDeckProgress(progress: DeckProgress, random?: () => number): DeckProgress {
  if (progress.index < progress.order.length - 1) return { ...progress, index: progress.index + 1 };
  return {
    order: shuffledOrder(progress.order.length, random, progress.order.at(-1)),
    index: 0,
    round: progress.round + 1,
  };
}

export function restoreDeckProgress(raw: string | null, length: number): DeckProgress | null {
  if (!raw) return null;
  try {
    const saved: DeckProgress = JSON.parse(raw);
    if (!Array.isArray(saved.order) || saved.order.length !== length ||
        new Set(saved.order).size !== length ||
        saved.order.some(index => !Number.isInteger(index) || index < 0 || index >= length) ||
        !Number.isInteger(saved.index) || saved.index < 0 || saved.index >= length ||
        !Number.isInteger(saved.round) || saved.round < 1) return null;
    return saved;
  } catch { return null; }
}
