import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import current from '../public/puzzles/current.json';
import catalog from '../public/puzzles/levels/index.json';
import park from '../public/puzzles/levels/park.json';
import farm from '../public/puzzles/levels/farm.json';
import harbour from '../public/puzzles/levels/harbour.json';
import fair from '../public/puzzles/levels/fair.json';
import castle from '../public/puzzles/levels/castle.json';
import { App, Learn, Play, PlayGallery } from '../src/main';
import { Read } from '../src/Read';
import { playClip, playPhoneme } from '../src/audio';
import { awardTarget, type Session } from '../src/progress';
import { isLevelCatalog, isPuzzle, targetAtPoint, type Puzzle } from '../src/puzzle';
import { readStory, soundsForWord } from '../src/readStory';

vi.mock('../src/audio', () => ({
  playClip: vi.fn(() => Promise.resolve()),
  playPhoneme: vi.fn(() => Promise.resolve()),
  stopAudio: vi.fn(),
}));

const puzzle = current as Puzzle;
const levelPuzzles = { park, farm, harbour, fair, castle } as const;
const freshSession = (): Session => ({ stage: 'sounds', points: 0, found: [], foundItems: {} });

function mockAllPuzzles() {
  globalThis.fetch = vi.fn(async input => {
    const url = String(input);
    if (url.includes('levels/index.json')) return { ok: true, json: async () => catalog } as Response;
    for (const [slug, scene] of Object.entries(levelPuzzles)) {
      if (url.includes(`levels/${slug}.json`)) return { ok: true, json: async () => scene } as Response;
    }
    return { ok: true, json: async () => current } as Response;
  }) as typeof fetch;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => current })) as typeof fetch;
});
afterEach(cleanup);

describe('Learn', () => {
  it('plays every answer choice while allowing selection changes before checking', () => {
    const addPoints = vi.fn();
    render(<Learn stage="sounds" setStage={vi.fn()} addPoints={addPoints} />);
    for (const choice of ['s', 'm', 't']) fireEvent.click(screen.getByRole('button', { name: choice }));
    expect(vi.mocked(playPhoneme).mock.calls.map(call => call[0])).toEqual(['s', 'm', 't']);
    expect(addPoints).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 's' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole('button', { name: 't' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 's' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(addPoints).toHaveBeenCalledExactlyOnceWith(5);
    expect((screen.getByRole('button', { name: 'm' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('allows a wrong answer to be retried without a premature reward', () => {
    const addPoints = vi.fn();
    render(<Learn stage="sounds" setStage={vi.fn()} addPoints={addPoints} />);
    fireEvent.click(screen.getByRole('button', { name: 'm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(addPoints).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Check answer' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 's' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(addPoints).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('plays bundled word choices and the all-sounds library directly on tap', () => {
    render(<Learn stage="words" setStage={vi.fn()} addPoints={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'pan' }));
    expect(playClip).toHaveBeenCalledWith('audio/words/pan.wav', 'pan');
    fireEvent.click(screen.getByRole('button', { name: 'Hear ai as in rain' }));
    expect(playClip).toHaveBeenCalledWith('audio/ai.m4a', 'ai as in rain');
    expect(screen.getByRole('button', { name: 'Hear th as in thin' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Hear th as in this' })).toBeNull();
  });
});

describe('Read', () => {
  it('plays the sounds actually printed in the story, including ar and the y in my', () => {
    render(<Read />);
    expect(screen.getByRole('group', { name: 'In my car.' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hear ar in car' }));
    expect(playClip).toHaveBeenCalledWith('audio/ar.m4a', 'ar as in car');
    fireEvent.click(screen.getByRole('button', { name: 'Hear y in my' }));
    expect(playClip).toHaveBeenCalledWith('audio/igh.m4a', 'y makes the eye sound in my');
    fireEvent.click(screen.getByRole('button', { name: 'Hear the line' }));
    expect(playClip).toHaveBeenCalledWith('audio/read/page-1.wav', 'In my car.');
    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    expect(screen.getByRole('group', { name: 'A bug in my car.' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hear a as a word' }));
    expect(playClip).toHaveBeenCalledWith('audio/read/a-article.wav', 'a bug');
  });

  it('turns pages, resumes within this session, and encourages a fresh read at the end', () => {
    const view = render(<Read />);
    expect((screen.getByRole('button', { name: '← Back' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    expect(sessionStorage.getItem('cbear-read-page-v1')).toBe('1');
    view.unmount();
    render(<Read />);
    expect(screen.getByRole('group', { name: 'A bug in my car.' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    expect(screen.getByRole('group', { name: 'A bug on my car.' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    expect(screen.getByRole('group', { name: 'A bug on my cap!' })).toBeTruthy();
    expect(screen.getByText(/You read with Cbear/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Read again' }));
    expect(screen.getByRole('group', { name: 'In my car.' })).toBeTruthy();
  });

  it('has a bundled recording for every sound and every line', () => {
    for (const page of readStory.pages) {
      expect(page.words.join(' ') + page.punctuation).toBe(page.line);
      for (const word of page.words) {
        const sounds = soundsForWord(word);
        expect(sounds.map(sound => sound.letters).join('')).toBe(word.toLowerCase());
        for (const sound of sounds) {
          const file = join(process.cwd(), 'public', sound.audio);
          expect(existsSync(file) && statSync(file).size > 0).toBe(true);
        }
      }
      const file = join(process.cwd(), 'public', page.audio);
      expect(existsSync(file) && statSync(file).size > 0).toBe(true);
    }
  });
});

describe('Play', () => {
  function Harness() {
    const [session, setSession] = useState(freshSession);
    return <><span data-testid="points">{session.points}</span><Play stage="sounds" session={session} markTarget={(puzzleId, targetId) => setSession(previous => awardTarget(previous, puzzleId, targetId))} /></>;
  }

  it('validates unique non-overlapping targets and finds them by image position', () => {
    expect(isPuzzle(current)).toBe(true);
    expect(targetAtPoint(puzzle, 0.66, 0.23)).toBe('bus');
    expect(targetAtPoint(puzzle, 0.286, 0.68)).toBe('cbear');
    expect(targetAtPoint(puzzle, 0.85, 0.9)).toBeNull();
    const overlapping = structuredClone(current);
    overlapping.finds[0].box = { ...overlapping.bear };
    expect(isPuzzle(overlapping)).toBe(false);
  });

  it('ticks targets automatically, keeps Cbear independent, and rewards each only once', async () => {
    render(<Harness />);
    const image = await screen.findByRole('img', { name: /busy outdoor market/i });
    vi.spyOn(image, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.click(screen.getByRole('button', { name: 'Hear Red bus' }));
    expect(playClip).toHaveBeenCalledWith('audio/finds/market-001-bus.wav', 'Find the red bus.');
    fireEvent.click(image, { clientX: 660, clientY: 230 });
    expect(screen.getByTestId('points').textContent).toBe('5');
    expect(screen.getByText('1 / 5 found')).toBeTruthy();
    fireEvent.click(image, { clientX: 660, clientY: 230 });
    expect(screen.getByTestId('points').textContent).toBe('5');
    fireEvent.click(image, { clientX: 286, clientY: 680 });
    expect(screen.getByTestId('points').textContent).toBe('25');
    expect(screen.queryByText('You found everything!')).toBeNull();
    fireEvent.click(image, { clientX: 540, clientY: 820 });
    fireEvent.click(image, { clientX: 600, clientY: 590 });
    fireEvent.click(image, { clientX: 160, clientY: 860 });
    expect(screen.getByTestId('points').textContent).toBe('40');
    expect(screen.getByText('5 / 5 found')).toBeTruthy();
    expect(screen.getByText('You found everything!')).toBeTruthy();
  });

  it('validates all five selectable levels and their bundled files', () => {
    expect(isLevelCatalog(catalog)).toBe(true);
    const ids = new Set<string>();
    for (const entry of catalog.levels) {
      const scene = levelPuzzles[entry.slug as keyof typeof levelPuzzles];
      expect(isPuzzle(scene)).toBe(true);
      expect(scene.id).toBe(`level-${entry.slug}`);
      expect(ids.has(scene.id)).toBe(false);
      ids.add(scene.id);
      for (const path of [scene.image, entry.thumbnail, ...Object.values(scene.clues).map(clue => clue.audio), ...scene.finds.map(item => item.audio)]) {
        const file = join(process.cwd(), 'public', path);
        expect(existsSync(file) && statSync(file).size > 44).toBe(true);
      }
      expect(targetAtPoint(scene, scene.bear.x + scene.bear.w / 2, scene.bear.y + scene.bear.h / 2)).toBe('cbear');
      for (const item of scene.finds) expect(targetAtPoint(scene, item.box.x + item.box.w / 2, item.box.y + item.box.h / 2)).toBe(item.id);
    }
  });

  it('shows an open level gallery and keeps progress separate for each game', async () => {
    mockAllPuzzles();
    const session = awardTarget(awardTarget(freshSession(), 'level-park', 'cbear'), 'level-park', 'ball');
    render(<PlayGallery session={session} />);
    expect(await screen.findByText('The castle courtyard')).toBeTruthy();
    expect(screen.getByRole('link', { name: /The park/ }).getAttribute('href')).toBe('#play/park');
    expect(screen.getByRole('link', { name: /The castle courtyard/ }).getAttribute('href')).toBe('#play/castle');
    expect(screen.getByText('2 / 5 found')).toBeTruthy();
    expect(screen.getAllByText('0 / 5 found').length).toBeGreaterThan(0);
    expect(awardTarget(session, 'level-park', 'cbear').points).toBe(25);
    expect(awardTarget(session, 'level-farm', 'cbear').points).toBe(45);
  });

  it('opens a direct level link and offers a route back to all levels', async () => {
    mockAllPuzzles();
    location.hash = '#play/farm';
    render(<App />);
    expect(await screen.findByRole('img', { name: /lively farmyard/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /All levels/ }).getAttribute('href')).toBe('#play');
    expect(screen.getByText('The farm')).toBeTruthy();
    location.hash = '';
  });

  it('shows a recoverable error for an unknown level', async () => {
    mockAllPuzzles();
    render(<Play slug="missing" stage="sounds" session={freshSession()} markTarget={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('That level was not found.'));
    expect(screen.getByRole('link', { name: /All levels/ })).toBeTruthy();
  });
});
