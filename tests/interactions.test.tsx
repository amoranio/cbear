import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import current from '../public/puzzles/current.json';
import { Learn, Play } from '../src/main';
import { playClip, playPhoneme } from '../src/audio';
import { awardTarget, type Session } from '../src/progress';
import { isPuzzle, targetAtPoint, type Puzzle } from '../src/puzzle';

vi.mock('../src/audio', () => ({
  playClip: vi.fn(() => Promise.resolve()),
  playPhoneme: vi.fn(() => Promise.resolve()),
}));

const puzzle = current as Puzzle;
const freshSession = (): Session => ({ stage: 'sounds', points: 0, found: [], foundItems: {} });

beforeEach(() => {
  vi.clearAllMocks();
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
