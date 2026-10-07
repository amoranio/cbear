import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../public/', import.meta.url).pathname;
const archive = join(root, 'puzzles/archive');
const files = ['puzzles/current.json', 'puzzles/seaside.sample.json', 'puzzles/station.sample.json'];
if (existsSync(archive)) files.push(...readdirSync(archive).filter(name => name.endsWith('.json')).map(name => `puzzles/archive/${name}`));
let failed = false;
const puzzleIds = new Set();

try {
  const catalog = JSON.parse(readFileSync(join(root, 'puzzles/levels/index.json'), 'utf8'));
  if (!Array.isArray(catalog.levels) || catalog.levels.length !== 8) throw new Error('the level catalog must list eight games');
  const slugs = new Set();
  for (const level of catalog.levels) {
    if (typeof level.slug !== 'string' || !/^[a-z0-9-]+$/.test(level.slug) || slugs.has(level.slug) ||
        level.manifest !== `puzzles/levels/${level.slug}.json` ||
        level.thumbnail !== `scenes/level-${level.slug}-thumb.jpg` ||
        typeof level.caption !== 'string' || !level.caption.trim() ||
        !existsSync(join(root, level.manifest)) || !existsSync(join(root, level.thumbnail))) {
      throw new Error(`invalid level entry: ${level?.slug ?? 'unknown'}`);
    }
    slugs.add(level.slug);
    files.push(level.manifest);
  }
  console.log('✓ puzzles/levels/index.json');
} catch (error) {
  failed = true;
  console.error(`✗ puzzles/levels/index.json: ${error.message}`);
}

const validBox = box => box && ['x', 'y', 'w', 'h'].every(key => Number.isFinite(box[key])) &&
  box.x >= 0 && box.y >= 0 && box.w > 0 && box.h > 0 && box.x + box.w <= 1 && box.y + box.h <= 1;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const fileHasAudio = path => existsSync(join(root, path)) && statSync(join(root, path)).size > 44;

for (const file of files) {
  try {
    const data = JSON.parse(readFileSync(join(root, file), 'utf8'));
    const validText = ['id', 'title', 'image', 'alt', 'hint'].every(key => typeof data[key] === 'string' && data[key].trim());
    const validImage = /^scenes\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(data.image) && existsSync(join(root, data.image));
    const validClues = ['sounds', 'words', 'digraphs'].every(stage => {
      const clue = data.clues?.[stage];
      return ['text', 'spoken', 'focus', 'audio'].every(key => typeof clue?.[key] === 'string' && clue[key].trim()) &&
        /^audio\/clues\/[a-z0-9-]+\.wav$/.test(clue.audio) && fileHasAudio(clue.audio);
    });
    if (!validText || !/^[a-z0-9-]+$/.test(data.id) || !validImage || !validBox(data.bear) || !validClues) {
      throw new Error('invalid puzzle details, bear box, scene image, or reading clues');
    }
    if (file.startsWith('puzzles/levels/') && data.id !== `level-${file.split('/').at(-1).replace('.json', '')}`) {
      throw new Error('level ID does not match catalog slug');
    }
    if (puzzleIds.has(data.id) && !file.startsWith('puzzles/archive/')) throw new Error('duplicate puzzle ID');
    puzzleIds.add(data.id);
    if (!Array.isArray(data.finds) || data.finds.length < 4 || data.finds.length > 5) {
      throw new Error('add four or five extra finding items');
    }
    const ids = new Set(['cbear']);
    const boxes = [data.bear];
    for (const item of data.finds) {
      if (!item || typeof item.id !== 'string' || !/^[a-z0-9-]+$/.test(item.id) || ids.has(item.id) ||
          typeof item.label !== 'string' || !item.label.trim() || typeof item.spoken !== 'string' || !item.spoken.trim() ||
          typeof item.audio !== 'string' || !/^audio\/finds\/[a-z0-9-]+\.wav$/.test(item.audio) || !fileHasAudio(item.audio) ||
          !validBox(item.box) || boxes.some(box => overlap(box, item.box))) {
        throw new Error(`invalid, missing, or overlapping finding item: ${item?.id ?? 'unknown'}`);
      }
      ids.add(item.id);
      boxes.push(item.box);
    }
    console.log(`✓ ${file}`);
  } catch (error) {
    failed = true;
    console.error(`✗ ${file}: ${error.message}`);
  }
}

if (failed) process.exitCode = 1;
