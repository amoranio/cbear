import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import current from '../public/puzzles/current.json';
import { Learn, Play } from '../src/main';
import { Read } from '../src/Read';
import { playClip, playPhoneme } from '../src/audio';
import { awardTarget, type Session } from '../src/progress';
import { isPuzzle, targetAtPoint, type Puzzle } from '../src/puzzle';
import { readStory, soundsForWord } from '../src/readStory';

vi.mock('../src/audio', () => ({
  playClip: vi.fn(() => Promise.resolve()),
  playPhoneme: vi.fn(() => Promise.resolve()),
  stopAudio: vi.fn(),
}));

const puzzle = current as Puzzle;
const freshSession = (): Session => ({ stage: 'sounds', points: 0, found: [], foundItems: {} });

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
});
