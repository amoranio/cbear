export type StageId = 'sounds' | 'words' | 'digraphs';

export type Puzzle = {
  id: string;
  title: string;
  image: string;
  alt: string;
  bear: { x: number; y: number; w: number; h: number };
  clues: Record<StageId, { text: string; spoken: string; focus: string; audio: string }>;
  hint: string;
};

const stages: StageId[] = ['sounds', 'words', 'digraphs'];

export function isPuzzle(value: unknown): value is Puzzle {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<Puzzle>;
  if (typeof p.id !== 'string' || !/^[a-z0-9-]+$/.test(p.id)) return false;
  if (typeof p.title !== 'string' || !p.title.trim()) return false;
  if (typeof p.image !== 'string' || !/^scenes\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(p.image)) return false;
  if (typeof p.alt !== 'string' || !p.alt.trim() || typeof p.hint !== 'string' || !p.hint.trim()) return false;
  if (!p.bear || !['x', 'y', 'w', 'h'].every(key => typeof p.bear![key as keyof typeof p.bear] === 'number')) return false;
  const { x, y, w, h } = p.bear;
  if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1 || y + h > 1) return false;
  if (!p.clues) return false;
  return stages.every(stage => {
    const clue = p.clues?.[stage];
    return clue && ['text', 'spoken', 'focus', 'audio'].every(key => typeof clue[key as keyof typeof clue] === 'string' && clue[key as keyof typeof clue].trim()) && /^audio\/clues\/[a-z0-9-]+\.wav$/.test(clue.audio);
  });
}

export function pointIsOnBear(puzzle: Puzzle, x: number, y: number): boolean {
  const box = puzzle.bear;
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

export function bearQuadrant(puzzle: Puzzle): string {
  const x = puzzle.bear.x + puzzle.bear.w / 2;
  const y = puzzle.bear.y + puzzle.bear.h / 2;
  return `${y < 0.5 ? 'top' : 'bottom'} ${x < 0.5 ? 'left' : 'right'}`;
}

export async function loadCurrentPuzzle(): Promise<Puzzle> {
  const url = `${import.meta.env.BASE_URL}puzzles/current.json?v=${Date.now()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('The current puzzle could not load.');
  const value: unknown = await response.json();
  if (!isPuzzle(value)) throw new Error('The current puzzle has invalid details.');
  return value;
}
