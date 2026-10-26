import { useCallback, useEffect, useRef, useState } from 'react';
import { playClip, stopAudio } from './audio';
import { advanceDeckProgress, flashDecks, freshDeckProgress, restoreDeckProgress, type DeckId, type DeckProgress } from './flashCards';
import { Trace } from './Trace';
import type { TraceMode } from './traceData';
import { SpotCards } from './SpotView';
import type { SpotMode, SpotDirection } from './spotCards';

const storageKey = (deckId: DeckId) => `cbear-flash-cards-${deckId}-v1`;

function savedProgress(deckId: DeckId, length: number): DeckProgress {
  try { return restoreDeckProgress(sessionStorage.getItem(storageKey(deckId)), length) ?? freshDeckProgress(length); }
  catch { return freshDeckProgress(length); }
}

function SpeakerIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>;
}

function DeckChooser() {
  return <div className="flash-page container">
    <div className="page-intro flash-intro"><span className="section-kicker">PRACTISE TOGETHER</span><h1>Flash cards. <em>One at a time.</em></h1><p>Choose a set, say what you see, then hear it together. Swipe or press Next when you are ready.</p></div>
    <a className="trace-feature" href="#flash-cards/trace"><span className="trace-feature-copy"><span className="mini-kicker">NEW · DRAW IT YOUR WAY</span><strong>Trace letters & numbers.</strong><span>Follow a soft guide, then make your own lines with a finger or mouse. Start with 1–10 and p, q, b, d, g, y.</span><span className="trace-feature-action">Start tracing →</span></span><span className="trace-feature-art" aria-hidden="true"><span>7</span><span>g</span><i /></span></a>
    <a className="spot-feature" href="#flash-cards/spot"><span className="spot-feature-copy"><span className="mini-kicker">LOOK CLOSELY</span><strong>Spot the wrong one.</strong><span>Find a backwards letter or number. Choose a steady 5×5 grid or a growing challenge.</span><span className="spot-feature-action">Start spotting →</span></span><span className="spot-feature-art" aria-hidden="true"><span>3</span><span>3</span><span>3</span><span className="spot-feature-mirror">3</span><span>3</span><span>3</span><span>3</span><span>3</span><span>3</span></span></a>
    <a className="spot-feature" href="#flash-cards/spot-correct"><span className="spot-feature-copy"><span className="mini-kicker">LOOK THE OTHER WAY</span><strong>Spot the correct one.</strong><span>Find the one correctly facing letter or number among backwards copies. Try standard or growing grids.</span><span className="spot-feature-action">Find the correct one →</span></span><span className="spot-feature-art" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} className={index === 4 ? '' : 'spot-feature-mirror'}>b</span>)}</span></a>
    <div className="flash-deck-heading"><span className="section-kicker">OR CHOOSE A CARD SET</span><h2>See it. Say it. Hear it.</h2></div>
    <div className="flash-deck-grid">
      {(['numbers', 'letters', 'phonics'] as const).map((id, index) => {
        const deck = flashDecks[id];
        return <a href={`#flash-cards/${id}`} className="flash-deck-choice" key={id}>
          <span className="mini-kicker">SET {String(index + 1).padStart(2, '0')} · {deck.cards.length} CARDS</span>
          <span className="flash-deck-sample" aria-hidden="true">{id === 'numbers' ? '12' : id === 'letters' ? 'Aa' : 'sh'}</span>
          <strong>{deck.title}</strong><span>{deck.description}</span>
          <span className="flash-deck-action">Open cards →</span>
        </a>;
      })}
    </div>
    <p className="flash-parent-note"><span aria-hidden="true">✦</span> Take your time. There is no timer or score here.</p>
  </div>;
}

function FlashDeck({ deckId }: { deckId: DeckId }) {
  const deck = flashDecks[deckId];
  const [progress, setProgress] = useState(() => savedProgress(deckId, deck.cards.length));
  const [dragX, setDragX] = useState(0);
  const [audioIssue, setAudioIssue] = useState(false);
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const card = deck.cards[progress.order[progress.index]];

  useEffect(() => {
    try { sessionStorage.setItem(storageKey(deckId), JSON.stringify(progress)); }
    catch { /* Practice still works without storage. */ }
  }, [deckId, progress]);
  useEffect(() => () => stopAudio(), []);

  const nextCard = useCallback(() => {
    stopAudio();
    setAudioIssue(false);
    setDragX(0);
    setProgress(previous => advanceDeckProgress(previous));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowRight' || (event.key === ' ' && target === cardRef.current)) {
        event.preventDefault();
        nextCard();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextCard]);

  function hearCard() {
    setAudioIssue(false);
    playClip(card.audio, card.spoken).catch(() => setAudioIssue(true));
  }

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button, a')) return;
    pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) setDragX(Math.max(-120, Math.min(120, dx)));
  }

  function pointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId) return;
    pointerStart.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 65 && Math.abs(dx) > Math.abs(dy) * 1.2) nextCard();
    else setDragX(0);
  }

  return <div className="flash-page container">
    <div className="flash-deck-top"><a href="#flash-cards" className="all-levels-link">← All card sets</a><span className="mini-kicker">{deck.title.toUpperCase()} · ROUND {progress.round}</span></div>
    <div className="page-intro flash-practice-intro"><span className="section-kicker">SAY IT · HEAR IT · SWIPE IT</span><h1>{deck.title} <em>flash cards.</em></h1><p>{deck.description} Say it together, then tap the sound button to listen.</p></div>
    <div className="flash-practice-layout">
      <div className="flash-card-stack" aria-live="polite" aria-atomic="true">
        <div className="flash-card-stage" key={`${progress.round}-${card.id}`}>
          <div ref={cardRef} className="flash-current-card" role="group" tabIndex={0} aria-label={`${deck.title} card ${progress.index + 1} of ${deck.cards.length}: ${card.face}, ${card.caption}`} style={{ transform: `translateX(${dragX}px) rotate(${dragX / 35}deg)` }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { pointerStart.current = null; setDragX(0); }}>
            <span className="flash-card-eyebrow">{deck.title.toUpperCase()} / CARD {String(progress.index + 1).padStart(2, '0')}</span>
            <div className={`flash-card-face flash-face-${deckId}`}>{card.face}</div>
            <div className="flash-card-caption">{card.caption}</div>
            <button className="flash-sound-button" onClick={hearCard} aria-label={`Hear ${card.face}`}><SpeakerIcon /> Hear it</button>
          </div>
        </div>
      </div>
      <div className="flash-card-controls">
        <span className="flash-card-count">Card {progress.index + 1} of {deck.cards.length} · Round {progress.round}</span>
        <button className="button button-primary flash-next" onClick={nextCard}>Next card →</button>
        <span className="flash-swipe-hint">Swipe the card left or right to continue.</span>
        {audioIssue && <p className="audio-message" role="alert">This sound could not play. Check your volume or try another browser.</p>}
      </div>
    </div>
  </div>;
}

export function FlashCards({ deckId, traceMode, spotMode, spotDirection }: { deckId: DeckId | null; traceMode?: TraceMode | 'choose' | null; spotMode?: SpotMode | 'choose' | null; spotDirection?: SpotDirection }) {
  return spotMode ? <SpotCards key={`${spotDirection}-${spotMode}`} direction={spotDirection} mode={spotMode === 'choose' ? null : spotMode} /> : traceMode ? <Trace mode={traceMode === 'choose' ? null : traceMode} /> : deckId ? <FlashDeck key={deckId} deckId={deckId} /> : <DeckChooser />;
}
