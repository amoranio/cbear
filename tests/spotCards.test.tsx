import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playClip } from '../src/audio';
import { App } from '../src/main';
import { advanceSpotProgress, chooseWrongIndex, freshSpotProgress, restoreSpotProgress, spotSets } from '../src/spotCards';

vi.mock('../src/audio', () => ({ playClip: vi.fn(() => Promise.resolve()), playPhoneme: vi.fn(() => Promise.resolve()), stopAudio: vi.fn() }));

beforeEach(() => { sessionStorage.clear(); location.hash = ''; vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('spotting card data', () => {
  it('uses visibly reversible lowercase letters and numbers with existing sounds', () => {
    expect(spotSets.letters.cards.map(card => card.face).join('')).toBe('abcdefghjknpqrstyz');
    expect(spotSets.numbers.cards.map(card => card.face).join('')).toBe('12345679');
    for (const set of Object.values(spotSets)) for (const card of set.cards) {
      const file = join(process.cwd(), 'public', card.audio);
      expect(existsSync(file) && statSync(file).size > 100).toBe(true);
    }
    for (const name of ['try-again', 'well-done']) {
      expect(statSync(join(process.cwd(), `public/audio/flash-cards/spot/${name}.wav`)).size).toBeGreaterThan(100);
    }
  });

  it('reshuffles only after a round and never repeats the wrong position consecutively', () => {
    let progress = freshSpotProgress(spotSets.letters.cards.length, () => 0.3);
    const firstOrder = [...progress.order];
    for (let index = 0; index < spotSets.letters.cards.length - 1; index++) {
      const previousWrong = progress.wrongIndex;
      progress = advanceSpotProgress(progress, () => 0.3);
      expect(progress.wrongIndex).not.toBe(previousWrong);
    }
    expect(progress.order).toEqual(firstOrder);
    const lastWrong = progress.wrongIndex;
    progress = advanceSpotProgress(progress, () => 0.9);
    expect(progress.round).toBe(2);
    expect(progress.wrongIndex).not.toBe(lastWrong);
    expect(new Set(progress.order).size).toBe(spotSets.letters.cards.length);
    expect(progress.order).not.toEqual(firstOrder);
    expect(chooseWrongIndex(() => 0, 0)).toBe(1);
    expect(restoreSpotProgress(JSON.stringify(progress), spotSets.letters.cards.length, () => 0.9)?.wrongIndex).not.toBe(progress.wrongIndex);
    expect(restoreSpotProgress(JSON.stringify({ ...progress, wrongIndex: 25 }), spotSets.letters.cards.length)).toBeNull();
  });
});

describe('spotting interaction', () => {
  it('opens chooser and direct links with twenty-five identical tiles except the mirror', () => {
    location.hash = '#flash-cards/spot';
    const view = render(<App />);
    expect(view.container.querySelector('a[href="#flash-cards/spot/letters"]')).toBeTruthy();
    expect(view.container.querySelector('a[href="#flash-cards/spot/numbers"]')).toBeTruthy();
    view.unmount();
    location.hash = '#flash-cards/spot/numbers';
    const game = render(<App />);
    const cells = game.container.querySelectorAll('.spot-cell');
    expect(cells.length).toBe(25);
    expect(game.container.querySelectorAll('.spot-glyph-mirrored').length).toBe(1);
    expect([...game.container.querySelectorAll('.spot-glyph')].map(glyph => glyph.textContent)).toEqual(Array(25).fill(game.container.querySelector('.spot-glyph')?.textContent));
    expect(screen.getByRole('button', { name: /^Hear [1-9]$/ })).toBeTruthy();
  });

  it('lets wrong answers retry immediately, then advances once after a correct tap', () => {
    vi.useFakeTimers();
    location.hash = '#flash-cards/spot/letters';
    const view = render(<App />);
    const cells = [...view.container.querySelectorAll<HTMLButtonElement>('.spot-cell')];
    const correct = cells.find(cell => cell.querySelector('.spot-glyph-mirrored'))!;
    const wrong = cells.find(cell => cell !== correct)!;
    const before = screen.getByText(/Card 1 of 18/).textContent;

    fireEvent.click(screen.getByRole('button', { name: /^Hear [a-z]$/ }));
    expect(playClip).toHaveBeenCalled();
    fireEvent.click(wrong);
    expect(screen.getByRole('status').textContent).toContain('Not quite');
    expect(screen.getByText(/Card 1 of 18/).textContent).toBe(before);
    expect(playClip).toHaveBeenCalledWith('audio/flash-cards/spot/try-again.wav', 'Not quite, try again.');
    fireEvent.click(wrong);
    expect(screen.getByText(/Card 1 of 18/)).toBeTruthy();

    fireEvent.click(correct);
    fireEvent.click(correct);
    expect(screen.getByRole('status').textContent).toContain('Well done');
    expect(playClip).toHaveBeenCalledWith('audio/flash-cards/spot/well-done.wav', 'Well done! You found it.');
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText(/Card 2 of 18/)).toBeTruthy();
    expect(view.container.querySelectorAll('.spot-glyph-mirrored').length).toBe(1);
  });

  it('keeps the current card but moves the wrong tile after a refresh', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    location.hash = '#flash-cards/spot/numbers';
    const first = render(<App />);
    const firstPosition = [...first.container.querySelectorAll('.spot-cell')].findIndex(cell => cell.querySelector('.spot-glyph-mirrored'));
    const firstCard = first.container.querySelector('.spot-glyph')?.textContent;
    first.unmount();
    const second = render(<App />);
    const secondPosition = [...second.container.querySelectorAll('.spot-cell')].findIndex(cell => cell.querySelector('.spot-glyph-mirrored'));
    expect(second.container.querySelector('.spot-glyph')?.textContent).toBe(firstCard);
    expect(secondPosition).not.toBe(firstPosition);
  });
});
