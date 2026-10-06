export type StageId = 'sounds' | 'words' | 'digraphs';
export type Box = { x: number; y: number; w: number; h: number };
export type Find = { id: string; label: string; spoken: string; audio: string; box: Box };

export type Puzzle = {
  id: string;
  title: string;
  image: string;
  alt: string;
  bear: Box;
  finds: Find[];
  clues: Record<StageId, { text: string; spoken: string; focus: string; audio: string }>;
  hint: string;
};

const stages: StageId[] = ['sounds', 'words', 'digraphs'];
const itemAudio = /^audio\/finds\/[a-z0-9-]+\.wav$/;

export function isBox(value: unknown): value is Box {
  if (!value || typeof value !== 'object') return false;
  const box = value as Partial<Box>;
  return [box.x, box.y, box.w, box.h].every(n => typeof n === 'number' && Number.isFinite(n)) &&
    box.x! >= 0 && box.y! >= 0 && box.w! > 0 && box.h! > 0 && box.x! + box.w! <= 1 && box.y! + box.h! <= 1;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInBox(box: Box, x: number, y: number): boolean {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

export function isPuzzle(value: unknown): value is Puzzle {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<Puzzle>;
  if (typeof p.id !== 'string' || !/^[a-z0-9-]+$/.test(p.id)) return false;
  if (typeof p.title !== 'string' || !p.title.trim()) return false;
  if (typeof p.image !== 'string' || !/^scenes\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(p.image)) return false;
  if (typeof p.alt !== 'string' || !p.alt.trim() || typeof p.hint !== 'string' || !p.hint.trim()) return false;
  if (!isBox(p.bear)) return false;
  if (!Array.isArray(p.finds) || p.finds.length < 4 || p.finds.length > 5) return false;
  const seen = new Set<string>(['cbear']);
  const boxes: Box[] = [p.bear];
  for (const candidate of p.finds) {
    if (!candidate || typeof candidate !== 'object') return false;
    const item = candidate as Partial<Find>;
    if (typeof item.id !== 'string' || !/^[a-z0-9-]+$/.test(item.id) || seen.has(item.id)) return false;
    if (typeof item.label !== 'string' || !item.label.trim() || typeof item.spoken !== 'string' || !item.spoken.trim()) return false;
    if (typeof item.audio !== 'string' || !itemAudio.test(item.audio) || !isBox(item.box)) return false;
    if (boxes.some(box => boxesOverlap(box, item.box!))) return false;
    seen.add(item.id);
    boxes.push(item.box);
  }
  if (!p.clues) return false;
  return stages.every(stage => {
    const clue = p.clues?.[stage];
    return clue && ['text', 'spoken', 'focus', 'audio'].every(key => typeof clue[key as keyof typeof clue] === 'string' && clue[key as keyof typeof clue].trim()) && /^audio\/clues\/[a-z0-9-]+\.wav$/.test(clue.audio);
  });
}

export function pointIsOnBear(puzzle: Puzzle, x: number, y: number): boolean {
  return pointInBox(puzzle.bear, x, y);
}

export function targetAtPoint(puzzle: Puzzle, x: number, y: number): string | null {
  if (pointIsOnBear(puzzle, x, y)) return 'cbear';
  return puzzle.finds.find(item => pointInBox(item.box, x, y))?.id ?? null;
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
