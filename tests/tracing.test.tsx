import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { App } from '../src/main';
import { TracePractice } from '../src/Trace';
import { traceGroups } from '../src/traceData';
import { playClip } from '../src/audio';

vi.mock('../src/audio', () => ({ playClip: vi.fn(() => Promise.resolve()), playPhoneme: vi.fn(() => Promise.resolve()), stopAudio: vi.fn() }));

const context = {
  setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(),
  moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
};

beforeEach(() => {
  sessionStorage.clear();
  location.hash = '';
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('freehand tracing', () => {
  it('has exactly 1–10 and p q b d g y, with a path and existing sound for every shape', () => {
    expect(traceGroups.numbers.shapes.map(shape => shape.face)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(traceGroups.letters.shapes.map(shape => shape.face)).toEqual(['p', 'q', 'b', 'd', 'g', 'y']);
    for (const group of Object.values(traceGroups)) for (const shape of group.shapes) {
      expect(shape.paths.length).toBeGreaterThan(0);
      expect(shape.paths.every(path => path.startsWith('M'))).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', shape.audio))).toBe(true);
    }
    expect(traceGroups.letters.shapes.find(shape => shape.face === 'q')?.audio).toBe('audio/qu.m4a');
  });

  it('opens from above the flash decks and supports direct chooser and practice links', () => {
    location.hash = '#flash-cards';
    const view = render(<App />);
    expect(screen.getByRole('link', { name: /Trace letters & numbers/ }).getAttribute('href')).toBe('#flash-cards/trace');
    view.unmount();
    location.hash = '#flash-cards/trace';
    const choices = render(<App />);
    expect(screen.getByRole('link', { name: /Start numbers/ }).getAttribute('href')).toBe('#flash-cards/trace/numbers');
    expect(screen.getByRole('link', { name: /Start letters/ }).getAttribute('href')).toBe('#flash-cards/trace/letters');
    choices.unmount();
    location.hash = '#flash-cards/trace/numbers';
    render(<App />);
    expect(screen.getByRole('button', { name: 'Hear 1' })).toBeTruthy();
    expect(screen.getByLabelText('0 points this session')).toBeTruthy();
  });

  it('draws with pointer coordinates, allows undo and clear, and never grades the line', () => {
    const { container } = render(<TracePractice mode="numbers" />);
    const canvas = container.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 500, height: 360 } as DOMRect);
    expect((screen.getByRole('button', { name: 'Undo stroke' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.pointerDown(canvas, { pointerId: 4, pointerType: 'touch', clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { pointerId: 4, pointerType: 'touch', clientX: 130, clientY: 155 });
    fireEvent.pointerUp(canvas, { pointerId: 4, pointerType: 'touch', clientX: 150, clientY: 180 });
    expect(context.moveTo).toHaveBeenCalledWith(100, 100);
    expect(context.lineTo).toHaveBeenCalledWith(130, 155);
    expect(context.stroke).toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Undo stroke' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Undo stroke' }));
    expect((screen.getByRole('button', { name: 'Clear drawing' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.pointerDown(canvas, { pointerId: 5, pointerType: 'mouse', clientX: 20, clientY: 20, button: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Clear drawing' }));
    expect((screen.getByRole('button', { name: 'Undo stroke' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/wrong|try again|score:/i)).toBeNull();
  });

  it('plays the current sound, toggles the guide, changes shape, and remembers each set place', () => {
    const view = render(<TracePractice mode="letters" />);
    expect(screen.getByRole('button', { name: 'Hear p' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hear p' }));
    expect(playClip).toHaveBeenCalledWith('audio/p.m4a', 'p as in pin');
    expect(view.container.querySelectorAll('.trace-template').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Hide guide' }));
    expect(view.container.querySelectorAll('.trace-template').length).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Show guide' }));
    expect(view.container.querySelectorAll('.trace-template').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Next shape →' }));
    expect(screen.getByRole('button', { name: 'Hear q' })).toBeTruthy();
    expect(sessionStorage.getItem('cbear-trace-letters-v1')).toBe('1');
    view.unmount();
    render(<TracePractice mode="letters" />);
    expect(screen.getByRole('button', { name: 'Hear q' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Clear drawing' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
