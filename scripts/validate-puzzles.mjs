import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../public/', import.meta.url).pathname;
const files = ['puzzles/current.json', 'puzzles/seaside.sample.json', 'puzzles/station.sample.json'];
let failed = false;

for (const file of files) {
  try {
    const data = JSON.parse(readFileSync(join(root, file), 'utf8'));
    const { x, y, w, h } = data.bear ?? {};
    const validBox = [x, y, w, h].every(n => Number.isFinite(n)) && x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1 && y + h <= 1;
    const validClues = ['sounds', 'words', 'digraphs'].every(stage => ['text', 'spoken', 'focus', 'audio'].every(key => typeof data.clues?.[stage]?.[key] === 'string' && data.clues[stage][key].trim()) && /^audio\/clues\/[a-z0-9-]+\.wav$/.test(data.clues[stage].audio) && existsSync(join(root, data.clues[stage].audio)));
    const validText = ['id', 'title', 'image', 'alt', 'hint'].every(key => typeof data[key] === 'string' && data[key].trim());
    const validImage = /^scenes\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(data.image) && existsSync(join(root, data.image));
    if (!validBox || !validClues || !validText || !validImage) throw new Error('missing field, invalid bear box, or missing scene image');
    console.log(`✓ ${file}`);
  } catch (error) {
    failed = true;
    console.error(`✗ ${file}: ${error.message}`);
  }
}

if (failed) process.exitCode = 1;
