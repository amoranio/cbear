import { advanceDeckProgress, flashDecks, freshDeckProgress, restoreDeckProgress, type DeckProgress } from './flashCards';

export type SpotMode = 'letters' | 'numbers';
export type SpotDirection = 'wrong' | 'correct';
export type SpotDifficulty = 'standard' | 'growing';
export const MIN_GRID_SIZE = 5;
export const MAX_GRID_SIZE = 10;
export type SpotCard = { id: string; face: string; audio: string; spoken: string };
export type SpotProgress = DeckProgress & { targetIndex: number; gridSize: number };

// A mirror must be visibly different from the printed character. The omitted
// shapes still appear in the ordinary flash-card decks.
const letterFaces = Array.from('abcdefghijklmnopqrstuvwxyz').filter(face => !'ilmouvwx'.includes(face));
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

export function chooseTargetIndex(gridSize: number, random: () => number = Math.random, previous?: number): number {
  const tileCount = gridSize * gridSize;
  const hasPrevious = Number.isInteger(previous) && previous! >= 0 && previous! < tileCount;
  const count = hasPrevious ? tileCount - 1 : tileCount;
  const draw = Math.min(count - 1, Math.floor(random() * count));
  return hasPrevious && draw >= previous! ? draw + 1 : draw;
}

export function freshSpotProgress(length: number, random?: () => number): SpotProgress {
  return { ...freshDeckProgress(length, random), gridSize: MIN_GRID_SIZE, targetIndex: chooseTargetIndex(MIN_GRID_SIZE, random) };
}

export function advanceSpotProgress(progress: SpotProgress, random?: () => number, difficulty: SpotDifficulty = 'standard'): SpotProgress {
  const gridSize = difficulty === 'growing' ? Math.min(MAX_GRID_SIZE, progress.gridSize + 1) : MIN_GRID_SIZE;
  return {
    ...advanceDeckProgress(progress, random),
    gridSize,
    targetIndex: chooseTargetIndex(gridSize, random, progress.targetIndex),
  };
}

export function retrySpotProgress(progress: SpotProgress, difficulty: SpotDifficulty, random?: () => number): SpotProgress {
  const gridSize = difficulty === 'growing' ? Math.max(MIN_GRID_SIZE, progress.gridSize - 1) : MIN_GRID_SIZE;
  return { ...progress, gridSize, targetIndex: chooseTargetIndex(gridSize, random, progress.targetIndex) };
}

export function restoreSpotProgress(raw: string | null, length: number, random?: () => number, difficulty: SpotDifficulty = 'standard'): SpotProgress | null {
  const deck = restoreDeckProgress(raw, length);
  if (!deck) return null;
  try {
    const saved = JSON.parse(raw!) as { targetIndex?: number; wrongIndex?: number; gridSize?: number };
    // v1 stored only wrongIndex and always used a 5×5 grid.
    const legacy = saved.gridSize === undefined && saved.targetIndex === undefined && difficulty === 'standard';
    const gridSize = legacy ? MIN_GRID_SIZE : saved.gridSize;
    const targetIndex = legacy ? saved.wrongIndex : saved.targetIndex;
    if (!Number.isInteger(gridSize) || gridSize! < MIN_GRID_SIZE || gridSize! > MAX_GRID_SIZE ||
        (difficulty === 'standard' && gridSize !== MIN_GRID_SIZE) ||
        !Number.isInteger(targetIndex) || targetIndex! < 0 || targetIndex! >= gridSize! * gridSize!) return null;
    return { order: deck.order, index: deck.index, round: deck.round, gridSize: gridSize!, targetIndex: chooseTargetIndex(gridSize!, random, targetIndex) };
  } catch { return null; }
}
