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

export type LevelEntry = {
  slug: string;
  manifest: string;
  thumbnail: string;
  caption: string;
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
  return loadPuzzleFile('puzzles/current.json', true);
}

export function isLevelCatalog(value: unknown): value is { levels: LevelEntry[] } {
  if (!value || typeof value !== 'object') return false;
  const levels = (value as { levels?: unknown }).levels;
  if (!Array.isArray(levels) || levels.length !== 8) return false;
  const seen = new Set<string>();
  return levels.every(item => {
    if (!item || typeof item !== 'object') return false;
    const entry = item as Partial<LevelEntry>;
    if (typeof entry.slug !== 'string' || !/^[a-z0-9-]+$/.test(entry.slug) || seen.has(entry.slug)) return false;
    if (entry.manifest !== `puzzles/levels/${entry.slug}.json` || entry.thumbnail !== `scenes/level-${entry.slug}-thumb.jpg`) return false;
    if (typeof entry.caption !== 'string' || !entry.caption.trim()) return false;
    seen.add(entry.slug);
    return true;
  });
}

export async function loadLevelCatalog(): Promise<LevelEntry[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}puzzles/levels/index.json`);
  if (!response.ok) throw new Error('The levels could not load.');
  const value: unknown = await response.json();
  if (!isLevelCatalog(value)) throw new Error('The level list has invalid details.');
  return value.levels;
}

export async function loadLevelPuzzle(slug: string): Promise<Puzzle> {
  const levels = await loadLevelCatalog();
  const level = levels.find(entry => entry.slug === slug);
  if (!level) throw new Error('That level was not found.');
  const puzzle = await loadPuzzleFile(level.manifest);
  if (puzzle.id !== `level-${slug}`) throw new Error('This level has invalid details.');
  return puzzle;
}

export async function loadPuzzleFile(path: string, fresh = false): Promise<Puzzle> {
  const url = `${import.meta.env.BASE_URL}${path}${fresh ? `?v=${Date.now()}` : ''}`;
  const response = await fetch(url, fresh ? { cache: 'no-store' } : undefined);
  if (!response.ok) throw new Error('The puzzle could not load.');
  const value: unknown = await response.json();
  if (!isPuzzle(value)) throw new Error('The puzzle has invalid details.');
  return value;
}
