import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/main';
import { SpotCards } from '../src/SpotView';
import { playClip, stopAudio } from '../src/audio';
import { advanceSpotProgress, freshSpotProgress, restoreSpotProgress, retrySpotProgress, type SpotDirection, type SpotMode } from '../src/spotCards';

vi.mock('../src/audio', () => ({ playClip: vi.fn(() => Promise.resolve()), playPhoneme: vi.fn(() => Promise.resolve()), stopAudio: vi.fn() }));
beforeEach(() => { sessionStorage.clear(); location.hash = ''; vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const cells = (container: HTMLElement) => [...container.querySelectorAll<HTMLButtonElement>('.spot-cell')];
const target = (container: HTMLElement, direction: SpotDirection = 'wrong') => cells(container).find(cell => Boolean(cell.querySelector('.spot-glyph-mirrored')) === (direction === 'wrong'))!;
const grow = () => fireEvent.click(screen.getByRole('radio', { name: /Growing/ }));
function solve(container: HTMLElement, direction: SpotDirection = 'wrong') {
  fireEvent.click(target(container, direction));
  act(() => vi.advanceTimersByTime(2000));
}

describe('growing grid state', () => {
  it('grows and shrinks at every size, respects bounds, and preserves the card on retries', () => {
    let progress = freshSpotProgress(18, () => 0.2);
    for (let size = 5; size <= 10; size++) {
      expect(progress.gridSize).toBe(size);
      expect(progress.targetIndex).toBeLessThan(size * size);
      const retry = retrySpotProgress(progress, 'growing', () => 0);
      expect(retry.gridSize).toBe(Math.max(5, size - 1));
      expect(retry.order).toEqual(progress.order);
      expect(retry.index).toBe(progress.index);
      expect(retry.targetIndex).not.toBe(progress.targetIndex);
      expect(retry.targetIndex).toBeLessThan(retry.gridSize ** 2);
      progress = advanceSpotProgress(progress, () => 0.2, 'growing');
    }
    expect(progress.gridSize).toBe(10);
    expect(advanceSpotProgress(progress).gridSize).toBe(5);
  });

  it('restores growing grids, validates corrupt data, and migrates v1 Standard progress', () => {
    const progress = advanceSpotProgress(freshSpotProgress(8), () => 0.3, 'growing');
    const restored = restoreSpotProgress(JSON.stringify(progress), 8, () => 0.3, 'growing')!;
    expect(restored.gridSize).toBe(6);
    expect(restored.index).toBe(progress.index);
    expect(restored.targetIndex).not.toBe(progress.targetIndex);
    for (const invalid of [{ gridSize: 11 }, { gridSize: 4 }, { gridSize: 5.5 }, { targetIndex: 36 }, { targetIndex: -1 }]) {
      expect(restoreSpotProgress(JSON.stringify({ ...progress, ...invalid }), 8, undefined, 'growing')).toBeNull();
    }
    const { gridSize: _size, targetIndex, ...deck } = progress;
    const legacy = JSON.stringify({ ...deck, wrongIndex: targetIndex % 25 });
    expect(restoreSpotProgress(legacy, 8)?.gridSize).toBe(5);
    expect(restoreSpotProgress(legacy, 8, undefined, 'growing')).toBeNull();
    expect(restoreSpotProgress(JSON.stringify(progress), 8)).toBeNull();
  });
});

for (const direction of ['wrong', 'correct'] as SpotDirection[]) for (const mode of ['letters', 'numbers'] as SpotMode[]) {
  it(`${direction}/${mode}: has one target at every size, grows once per success, and shrinks immediately on a mistake`, () => {
    vi.useFakeTimers();
    const view = render(<SpotCards mode={mode} direction={direction} />);
    grow();
    for (let size = 5; size <= 10; size++) {
      expect(cells(view.container)).toHaveLength(size ** 2);
      const mirrored = view.container.querySelectorAll('.spot-glyph-mirrored').length;
      expect(mirrored).toBe(direction === 'wrong' ? 1 : size ** 2 - 1);
      const correct = target(view.container, direction);
      fireEvent.click(correct);
      fireEvent.click(correct);
      expect(cells(view.container).every(cell => cell.disabled)).toBe(true);
      act(() => vi.advanceTimersByTime(2000));
      expect(cells(view.container)).toHaveLength(Math.min(10, size + 1) ** 2);
    }
    const before = view.container.querySelector('.spot-glyph')!.textContent;
    const correct = target(view.container, direction);
    const oldIndex = cells(view.container).indexOf(correct);
    fireEvent.click(cells(view.container).find(cell => cell !== correct)!);
    expect(cells(view.container)).toHaveLength(81);
    expect(view.container.querySelector('.spot-glyph')!.textContent).toBe(before);
    expect(cells(view.container).indexOf(target(view.container, direction))).not.toBe(oldIndex);
    expect(screen.getByRole('status').textContent).toContain('Not quite');
    expect(cells(view.container).every(cell => !cell.disabled)).toBe(true);
  });
}

it('keeps Standard, Growing, directions and content progress separate and restores after refresh', () => {
  vi.useFakeTimers();
  const first = render(<SpotCards mode="numbers" />);
  solve(first.container);
  const standardFace = first.container.querySelector('.spot-glyph')!.textContent;
  grow();
  solve(first.container);
  expect(cells(first.container)).toHaveLength(36);
  const growingFace = first.container.querySelector('.spot-glyph')!.textContent;
  const oldIndex = cells(first.container).indexOf(target(first.container));
  first.unmount();
  const second = render(<SpotCards mode="numbers" />);
  expect((screen.getByRole('radio', { name: /Growing/ }) as HTMLInputElement).checked).toBe(true);
  expect(cells(second.container)).toHaveLength(36);
  expect(second.container.querySelector('.spot-glyph')!.textContent).toBe(growingFace);
  expect(cells(second.container).indexOf(target(second.container))).not.toBe(oldIndex);
  fireEvent.click(screen.getByRole('radio', { name: /Standard/ }));
  expect(cells(second.container)).toHaveLength(25);
  expect(second.container.querySelector('.spot-glyph')!.textContent).toBe(standardFace);
  expect(screen.getByText(/Card 2 of 8/)).toBeTruthy();
  second.unmount();
  for (const [direction, mode] of [['correct', 'numbers'], ['wrong', 'letters']] as const) {
    const other = render(<SpotCards mode={mode} direction={direction} />);
    grow();
    expect(cells(other.container)).toHaveLength(25);
    expect(screen.getByText(/Card 1 of/)).toBeTruthy();
    other.unmount();
  }
});

it('migrates existing v1 progress in the UI', () => {
  const { gridSize: _size, targetIndex, ...deck } = freshSpotProgress(8);
  sessionStorage.setItem('cbear-spot-numbers-v1', JSON.stringify({ ...deck, index: 3, round: 2, wrongIndex: targetIndex }));
  render(<SpotCards mode="numbers" />);
  expect(screen.getByText(/Card 4 of 8/)).toBeTruthy();
  expect(screen.getByText(/NUMBERS · ROUND 2/)).toBeTruthy();
});

it('clears a pending advance and stops audio when changing difficulty or leaving', () => {
  vi.useFakeTimers();
  const view = render(<SpotCards mode="letters" />);
  fireEvent.click(target(view.container));
  grow();
  act(() => vi.advanceTimersByTime(2000));
  expect(screen.getByText(/Card 1 of 18/)).toBeTruthy();
  fireEvent.click(screen.getByRole('radio', { name: /Standard/ }));
  expect(screen.getByText(/Card 1 of 18/)).toBeTruthy();
  const schedule = vi.spyOn(globalThis, 'setTimeout');
  const cancel = vi.spyOn(globalThis, 'clearTimeout');
  fireEvent.click(target(view.container));
  const advanceCall = schedule.mock.calls.findIndex(([, delay]) => delay === 2000);
  expect(advanceCall).toBeGreaterThanOrEqual(0);
  const advanceTimer = schedule.mock.results[advanceCall].value;
  const saved = sessionStorage.getItem('cbear-spot-wrong-letters-standard-v2');
  view.unmount();
  // Assert only the game's timer: jsdom may have its own pending timers.
  expect(cancel).toHaveBeenCalledWith(advanceTimer);
  act(() => vi.advanceTimersByTime(2000));
  expect(sessionStorage.getItem('cbear-spot-wrong-letters-standard-v2')).toBe(saved);
  expect(stopAudio).toHaveBeenCalled();
});

it('supports unavailable storage and audio failure', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.mocked(playClip).mockRejectedValueOnce(new Error('audio blocked'));
  location.hash = '#flash-cards/spot-correct/numbers';
  const view = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /^Hear/ }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  grow();
  expect(cells(view.container)).toHaveLength(25);
});

it('supports keyboard answers and difficulty selection', async () => {
  // jsdom lacks CSS.escape, which user-event uses for the plain radio group name.
  vi.stubGlobal('CSS', { escape: (value: string) => value });
  const user = userEvent.setup();
  const view = render(<SpotCards mode="numbers" direction="correct" />);
  const radio = screen.getByRole('radio', { name: /Standard/ });
  radio.focus();
  await user.keyboard('{ArrowRight}');
  expect((screen.getByRole('radio', { name: /Growing/ }) as HTMLInputElement).checked).toBe(true);
  target(view.container, 'correct').focus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('status').textContent).toContain('Well done');
});

it('links to the new chooser and both new direct games', () => {
  location.hash = '#flash-cards';
  const home = render(<App />);
  expect(home.container.querySelector('a[href="#flash-cards/spot-correct"]')).toBeTruthy();
  home.unmount();
  location.hash = '#flash-cards/spot-correct';
  const chooser = render(<App />);
  for (const mode of ['letters', 'numbers']) expect(chooser.container.querySelector(`a[href="#flash-cards/spot-correct/${mode}"]`)).toBeTruthy();
  chooser.unmount();
  for (const mode of ['letters', 'numbers']) {
    location.hash = `#flash-cards/spot-correct/${mode}`;
    const game = render(<App />);
    expect(cells(game.container)).toHaveLength(25);
    expect(game.container.querySelectorAll('.spot-glyph-mirrored')).toHaveLength(24);
    game.unmount();
  }
});
