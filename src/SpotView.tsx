import { useEffect, useRef, useState } from 'react';
import { playClip, stopAudio } from './audio';
import { advanceSpotProgress, freshSpotProgress, restoreSpotProgress, spotSets, type SpotMode, type SpotProgress } from './spotCards';

const storageKey = (mode: SpotMode) => `cbear-spot-${mode}-v1`;
const retryAudio = 'audio/flash-cards/spot/try-again.wav';
const successAudio = 'audio/flash-cards/spot/well-done.wav';

function savedProgress(mode: SpotMode, length: number): SpotProgress {
  try { return restoreSpotProgress(sessionStorage.getItem(storageKey(mode)), length) ?? freshSpotProgress(length); }
  catch { return freshSpotProgress(length); }
}

function SpeakerIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>;
}

function SpotChooser() {
  return <div className="flash-page spot-page container">
    <a className="all-levels-link" href="#flash-cards">← Flash Cards</a>
    <div className="page-intro spot-intro"><span className="section-kicker">LOOK CLOSELY</span><h1>Spot the <em>wrong one.</em></h1><p>Twenty-five shapes, one backwards. Tap the one that looks different. Take as many tries as you need.</p></div>
    <div className="spot-choice-grid">
      {(['letters', 'numbers'] as const).map((mode, index) => <a className="spot-choice" href={`#flash-cards/spot/${mode}`} key={mode}>
        <span className="mini-kicker">{String(index + 1).padStart(2, '0')} / {spotSets[mode].cards.length} SHAPES</span>
        <span className="spot-choice-symbol" aria-hidden="true">{mode === 'letters' ? 'b' : '3'}</span>
        <strong>{spotSets[mode].title}</strong>
        <span>Find one mirrored {mode === 'letters' ? 'lowercase letter' : 'number'} in each grid.</span>
        <span className="spot-choice-action">Start spotting →</span>
      </a>)}
    </div>
    <p className="flash-parent-note">Shapes that look unchanged when flipped stay in the regular flash cards. There is no timer or score.</p>
  </div>;
}

function SpotGame({ mode }: { mode: SpotMode }) {
  const set = spotSets[mode];
  const [progress, setProgress] = useState(() => savedProgress(mode, set.cards.length));
  const [feedback, setFeedback] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [audioIssue, setAudioIssue] = useState(false);
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const card = set.cards[progress.order[progress.index]];

  useEffect(() => {
    try { sessionStorage.setItem(storageKey(mode), JSON.stringify(progress)); }
    catch { /* Practice still works without storage. */ }
  }, [mode, progress]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    stopAudio();
  }, []);

  function hearCard() {
    setAudioIssue(false);
    playClip(card.audio, card.spoken).catch(() => setAudioIssue(true));
  }

  function chooseTile(index: number) {
    if (lockedRef.current) return;
    setAudioIssue(false);
    setAttempt(value => value + 1);
    if (index !== progress.wrongIndex) {
      setFeedback('Not quite — try again.');
      playClip(retryAudio, 'Not quite, try again.').catch(() => setAudioIssue(true));
      return;
    }

    lockedRef.current = true;
    setLocked(true);
    setFeedback('Well done! You found it.');
    playClip(successAudio, 'Well done! You found it.').catch(() => setAudioIssue(true));
    timer.current = setTimeout(() => {
      stopAudio();
      setProgress(previous => advanceSpotProgress(previous));
      setFeedback('');
      setLocked(false);
      lockedRef.current = false;
      timer.current = null;
    }, 2000);
  }

  return <div className="flash-page spot-page container">
    <div className="flash-deck-top"><a className="all-levels-link" href="#flash-cards/spot">← Spotting choices</a><span className="mini-kicker">{set.title.toUpperCase()} · ROUND {progress.round}</span></div>
    <div className="page-intro spot-practice-intro"><span className="section-kicker">LOOK · LISTEN · FIND</span><h1>Find the backwards <em>{card.face}.</em></h1><p>One {mode === 'letters' ? 'letter' : 'number'} has been flipped. Tap it to continue.</p></div>
    <div className="spot-game">
      <div className="spot-game-top"><span>Card {progress.index + 1} of {set.cards.length}</span><button className="flash-sound-button" type="button" onClick={hearCard} aria-label={`Hear ${card.face}`}><SpeakerIcon /> Hear it</button></div>
      <div className="spot-grid" role="group" aria-label={`Find the backwards ${card.face} in a five by five grid`}>
        {Array.from({ length: 25 }, (_, index) => <button className="spot-cell" type="button" key={index} disabled={locked} onClick={() => chooseTile(index)} aria-label={`${card.face}, row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}`}>
          <span className={`spot-glyph${index === progress.wrongIndex ? ' spot-glyph-mirrored' : ''}`}>{card.face}</span>
        </button>)}
      </div>
      <p className="spot-feedback" role="status" aria-live="polite" key={`${progress.round}-${progress.index}-${attempt}`}>{feedback || 'Look closely. You can try again.'}</p>
      {audioIssue && <p className="audio-message" role="alert">This sound could not play. Check your volume or try another browser.</p>}
    </div>
  </div>;
}

export function SpotCards({ mode }: { mode: SpotMode | null }) {
  return mode ? <SpotGame key={mode} mode={mode} /> : <SpotChooser />;
}
