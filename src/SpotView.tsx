import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { playClip, stopAudio } from './audio';
import { advanceSpotProgress, freshSpotProgress, restoreSpotProgress, retrySpotProgress, spotSets, type SpotMode, type SpotProgress, type SpotDirection, type SpotDifficulty } from './spotCards';

const storageKey = (mode: SpotMode, direction: SpotDirection, difficulty: SpotDifficulty) => `cbear-spot-${direction}-${mode}-${difficulty}-v2`;
const spotRoute = (direction: SpotDirection) => direction === 'wrong' ? '#flash-cards/spot' : '#flash-cards/spot-correct';
const retryAudio = 'audio/flash-cards/spot/try-again.wav';
const successAudio = 'audio/flash-cards/spot/well-done.wav';

function savedProgress(mode: SpotMode, length: number, direction: SpotDirection, difficulty: SpotDifficulty): SpotProgress {
  try {
    const raw = sessionStorage.getItem(storageKey(mode, direction, difficulty));
    const legacy = direction === 'wrong' && difficulty === 'standard' ? sessionStorage.getItem(`cbear-spot-${mode}-v1`) : null;
    return restoreSpotProgress(raw ?? legacy, length, undefined, difficulty) ?? freshSpotProgress(length);
  } catch { return freshSpotProgress(length); }
}

const difficultyKey = (mode: SpotMode, direction: SpotDirection) => `cbear-spot-${direction}-${mode}-difficulty-v2`;
function savedDifficulty(mode: SpotMode | null, direction: SpotDirection): SpotDifficulty {
  try { return mode && sessionStorage.getItem(difficultyKey(mode, direction)) === 'growing' ? 'growing' : 'standard'; }
  catch { return 'standard'; }
}

function SpeakerIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>;
}

function SpotChooser({ direction }: { direction: SpotDirection }) {
  return <div className="flash-page spot-page container">
    <a className="all-levels-link" href="#flash-cards">← Flash Cards</a>
    <div className="page-intro spot-intro"><span className="section-kicker">LOOK CLOSELY</span><h1>Spot the <em>{direction} one.</em></h1><p>{direction === 'wrong' ? 'Find the one backwards shape.' : 'Find the one correctly facing shape among backwards copies.'} Choose a standard grid or let it grow as you get answers right. Take as many tries as you need.</p></div>
    <div className="spot-choice-grid">
      {(['letters', 'numbers'] as const).map((mode, index) => <a className="spot-choice" href={`${spotRoute(direction)}/${mode}`} key={mode}>
        <span className="mini-kicker">{String(index + 1).padStart(2, '0')} / {spotSets[mode].cards.length} SHAPES</span>
        <span className="spot-choice-symbol" aria-hidden="true">{mode === 'letters' ? 'b' : '3'}</span>
        <strong>{spotSets[mode].title}</strong>
        <span>Find one {direction === 'wrong' ? 'mirrored' : 'correctly facing'} {mode === 'letters' ? 'lowercase letter' : 'number'} in each grid.</span>
        <span className="spot-choice-action">Start spotting →</span>
      </a>)}
    </div>
    <p className="flash-parent-note">Shapes that look unchanged when flipped stay in the regular flash cards. There is no timer or score.</p>
  </div>;
}

function SpotGame({ mode, direction, difficulty }: { mode: SpotMode; direction: SpotDirection; difficulty: SpotDifficulty }) {
  const set = spotSets[mode];
  const [progress, setProgress] = useState(() => savedProgress(mode, set.cards.length, direction, difficulty));
  const [feedback, setFeedback] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [audioIssue, setAudioIssue] = useState(false);
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const card = set.cards[progress.order[progress.index]];

  useEffect(() => {
    try { sessionStorage.setItem(storageKey(mode, direction, difficulty), JSON.stringify(progress)); }
    catch { /* Practice still works without storage. */ }
  }, [mode, direction, difficulty, progress]);
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
    if (index !== progress.targetIndex) {
      setFeedback('Not quite — try again.');
      setProgress(previous => retrySpotProgress(previous, difficulty));
      playClip(retryAudio, 'Not quite, try again.').catch(() => setAudioIssue(true));
      return;
    }

    lockedRef.current = true;
    setLocked(true);
    setFeedback('Well done! You found it.');
    playClip(successAudio, 'Well done! You found it.').catch(() => setAudioIssue(true));
    timer.current = setTimeout(() => {
      stopAudio();
      setProgress(previous => advanceSpotProgress(previous, undefined, difficulty));
      setFeedback('');
      setLocked(false);
      lockedRef.current = false;
      timer.current = null;
    }, 2000);
  }

  return <div className="flash-page spot-page container">
    <div className="flash-deck-top"><a className="all-levels-link" href={spotRoute(direction)}>← Spotting choices</a><span className="mini-kicker">{set.title.toUpperCase()} · ROUND {progress.round}</span></div>
    <div className="page-intro spot-practice-intro"><span className="section-kicker">LOOK · LISTEN · FIND</span><h1>Find the {direction === 'wrong' ? 'backwards' : 'correctly facing'} <em>{card.face}.</em></h1><p>One {mode === 'letters' ? 'letter' : 'number'} {direction === 'wrong' ? 'has been flipped.' : 'faces the right way. All the others are backwards.'} Tap it to continue.</p></div>
    <div className="spot-game">
      <div className="spot-game-top"><span>Card {progress.index + 1} of {set.cards.length} · {progress.gridSize}×{progress.gridSize}</span><button className="flash-sound-button" type="button" onClick={hearCard} aria-label={`Hear ${card.face}`}><SpeakerIcon /> Hear it</button></div>
      <div className="spot-grid-scroll" role="region" aria-label="Spotting grid" tabIndex={0}>
        <div className="spot-grid" style={{ '--spot-size': progress.gridSize } as CSSProperties} role="group" aria-label={`Find the ${direction === 'wrong' ? 'backwards' : 'correctly facing'} ${card.face} in a ${progress.gridSize} by ${progress.gridSize} grid`}>
          {Array.from({ length: progress.gridSize * progress.gridSize }, (_, index) => <button className="spot-cell" type="button" key={index} disabled={locked} onClick={() => chooseTile(index)} aria-label={`${card.face}, row ${Math.floor(index / progress.gridSize) + 1}, column ${index % progress.gridSize + 1}`}>
            <span className={`spot-glyph${(direction === 'wrong' ? index === progress.targetIndex : index !== progress.targetIndex) ? ' spot-glyph-mirrored' : ''}`}>{card.face}</span>
          </button>)}
        </div>
      </div>
      <p className="spot-feedback" role="status" aria-live="polite" key={`${progress.round}-${progress.index}-${attempt}`}>{feedback || 'Look closely. You can try again.'}</p>
      {audioIssue && <p className="audio-message" role="alert">This sound could not play. Check your volume or try another browser.</p>}
    </div>
  </div>;
}

export function SpotCards({ mode, direction = 'wrong' }: { mode: SpotMode | null; direction?: SpotDirection }) {
  const [difficulty, setDifficulty] = useState<SpotDifficulty>(() => savedDifficulty(mode, direction));
  useEffect(() => {
    if (!mode) return;
    try { sessionStorage.setItem(difficultyKey(mode, direction), difficulty); }
    catch { /* Practice still works without storage. */ }
  }, [mode, direction, difficulty]);
  if (!mode) return <SpotChooser direction={direction} />;
  return <>
    <fieldset className="spot-difficulty container">
      <legend>Grid difficulty</legend>
      {(['standard', 'growing'] as const).map(value => <label key={value}>
        <input type="radio" name="spot-difficulty" value={value} checked={difficulty === value} onChange={() => setDifficulty(value)} />
        {value === 'standard' ? 'Standard · 5×5' : 'Growing · 5×5 to 10×10'}
      </label>)}
      <p>{difficulty === 'growing' ? 'Start at 5×5. Each correct answer grows the next grid by one row and column, up to 10×10. Each wrong tap shrinks it by one, down to 5×5.' : 'Practise with a steady 5×5 grid.'}</p>
    </fieldset>
    <SpotGame key={`${direction}-${mode}-${difficulty}`} mode={mode} direction={direction} difficulty={difficulty} />
  </>;
}
