import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FlashCards } from '../src/FlashCardsView';
import { App } from '../src/main';
import { advanceDeckProgress, flashDecks, freshDeckProgress, restoreDeckProgress } from '../src/flashCards';
import { soundGroups } from '../src/soundBoard';
import { playClip, stopAudio } from '../src/audio';

vi.mock('../src/audio', () => ({ playClip: vi.fn(() => Promise.resolve()), playPhoneme: vi.fn(() => Promise.resolve()), stopAudio: vi.fn() }));

beforeEach(() => { sessionStorage.clear(); location.hash = ''; vi.clearAllMocks(); });
afterEach(cleanup);

describe('Flash Cards decks', () => {
  it('includes every number, letter, and Learn sound with bundled audio', () => {
    expect(flashDecks.numbers.cards.map(card => card.face)).toEqual(Array.from({ length: 20 }, (_, index) => String(index + 1)));
    expect(flashDecks.numbers.cards.map(card => card.caption)).toEqual(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']);
    expect(flashDecks.letters.cards.map(card => card.face)).toEqual(Array.from('abcdefghijklmnopqrstuvwxyz', letter => `${letter.toUpperCase()}${letter}`));
    expect(flashDecks.letters.cards.find(card => card.face === 'Qq')?.audio).toBe('audio/qu.m4a');
    const tiles = soundGroups.flatMap(group => group.sounds);
    expect(flashDecks.phonics.cards.map(card => card.audio)).toEqual(tiles.map(tile => tile.audio));
    expect(flashDecks.phonics.cards.filter(card => card.face === 'oo').map(card => card.audio)).toEqual(['audio/oo.m4a', 'audio/ooo.m4a']);
    for (const deck of Object.values(flashDecks)) for (const card of deck.cards) {
      const file = join(process.cwd(), 'public', card.audio);
      expect(existsSync(file) && statSync(file).size > 100).toBe(true);
    }
  });

  it('reshuffles only after a complete round and restores valid progress', () => {
    let progress = freshDeckProgress(20, () => 0.35);
    const firstOrder = [...progress.order];
    expect(new Set(firstOrder).size).toBe(20);
    for (let index = 0; index < 19; index++) progress = advanceDeckProgress(progress, () => 0.35);
    expect(progress.round).toBe(1);
    expect(progress.order).toEqual(firstOrder);
    progress = advanceDeckProgress(progress, () => 0.95);
    expect(progress.round).toBe(2);
    expect(progress.index).toBe(0);
    expect(new Set(progress.order).size).toBe(20);
    expect(progress.order).not.toEqual(firstOrder);
    expect(progress.order[0]).not.toBe(firstOrder.at(-1));
    expect(restoreDeckProgress(JSON.stringify(progress), 20)).toEqual(progress);
    expect(restoreDeckProgress(JSON.stringify({ ...progress, order: Array(20).fill(0) }), 20)).toBeNull();
  });
});

describe('Flash Cards interaction', () => {
  it('opens direct deck links and a sound tap does not advance the card', () => {
    location.hash = '#flash-cards/letters';
    render(<App />);
    expect(screen.getByRole('link', { name: 'Flash Cards' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /All card sets/ }).getAttribute('href')).toBe('#flash-cards');
    const before = screen.getByText(/Card 1 of 26/).textContent;
    const sound = screen.getByRole('button', { name: /^Hear [A-Z][a-z]$/ });
    fireEvent.click(sound);
    expect(playClip).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Card 1 of 26/).textContent).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: /Next card/ }));
    expect(screen.getByText(/Card 2 of 26/)).toBeTruthy();
    expect(stopAudio).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /All card sets/ }).getAttribute('href')).toBe('#flash-cards');
  });

  it('advances by swipe and keyboard, with separate session progress for each deck', () => {
    const view = render(<FlashCards deckId="numbers" />);
    const card = screen.getByRole('group', { name: /Numbers card 1 of 20/ });
    fireEvent.pointerDown(card, { pointerId: 1, button: 0, clientX: 200, clientY: 120 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 100, clientY: 120 });
    expect(screen.getByText(/Card 2 of 20/)).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(/Card 3 of 20/)).toBeTruthy();
    view.unmount();
    render(<FlashCards deckId="numbers" />);
    expect(screen.getByText(/Card 3 of 20/)).toBeTruthy();
    cleanup();
    render(<FlashCards deckId="phonics" />);
    expect(screen.getByText(`Card 1 of ${flashDecks.phonics.cards.length} · Round 1`)).toBeTruthy();
  });

  it('offers all three decks from the chooser', () => {
    render(<FlashCards deckId={null} />);
    for (const id of ['numbers', 'letters', 'phonics']) expect(screen.getByRole('link', { name: new RegExp(id, 'i') }).getAttribute('href')).toBe(`#flash-cards/${id}`);
  });
});
