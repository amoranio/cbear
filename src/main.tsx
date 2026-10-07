import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { playClip, playPhoneme } from './audio';
import { lessons, stageDescriptions, stageNames, stageOrder, type Card } from './lessons';
import { bearQuadrant, loadCurrentPuzzle, targetAtPoint, type Puzzle, type StageId } from './puzzle';
import { awardTarget, targetIsFound, type Session } from './progress';
import { soundGroups } from './soundBoard';
import { Read } from './Read';
import './styles.css';

type Page = 'home' | 'learn' | 'read' | 'play';

function readSession(): Session {
  try {
    const saved = JSON.parse(sessionStorage.getItem('cbear-session-v1') ?? 'null');
    if (saved && stageOrder.includes(saved.stage) && Number.isFinite(saved.points) && Array.isArray(saved.found)) {
      const foundItems: Record<string, string[]> = {};
      if (saved.foundItems && typeof saved.foundItems === 'object' && !Array.isArray(saved.foundItems)) {
        for (const [id, ids] of Object.entries(saved.foundItems)) {
          if (Array.isArray(ids) && ids.every((value: unknown) => typeof value === 'string')) foundItems[id] = ids as string[];
        }
      }
      return { stage: saved.stage, points: saved.points, found: saved.found.filter((id: unknown) => typeof id === 'string'), foundItems };
    }
  } catch { /* A fresh session is fine. */ }
  return { stage: 'sounds', points: 0, found: [], foundItems: {} };
}

function pageFromHash(): Page {
  return location.hash === '#learn' ? 'learn' : location.hash === '#read' ? 'read' : location.hash === '#play' ? 'play' : 'home';
}

function SpeakerIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>;
}

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>;
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>;
}

function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [session, setSession] = useState<Session>(readSession);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => sessionStorage.setItem('cbear-session-v1', JSON.stringify(session)), [session]);

  const addPoints = (points: number) => setSession(previous => ({ ...previous, points: previous.points + points }));
  const setStage = (stage: StageId) => setSession(previous => ({ ...previous, stage }));
  const markTarget = (puzzleId: string, targetId: string) => setSession(previous => awardTarget(previous, puzzleId, targetId));

  return <div className="site-shell">
    <header className="site-header">
      <a className="brand" href="#home" aria-label="Cbear home"><span className="brand-mark">c<span>✦</span></span><span>cbear<span className="brand-period">.</span></span></a>
      <nav className="main-nav" aria-label="Main navigation">
        <a href="#learn" aria-current={page === 'learn' ? 'page' : undefined}>Learn</a>
        <a href="#read" aria-current={page === 'read' ? 'page' : undefined}>Read</a>
        <a href="#play" aria-current={page === 'play' ? 'page' : undefined}>Play</a>
      </nav>
      <div className="points-pill" aria-label={`${session.points} points this session`}><span aria-hidden="true">✦</span> {session.points}<span className="points-label"> points</span></div>
    </header>

    <main>
      {page === 'home' && <Home />}
      {page === 'learn' && <Learn stage={session.stage} setStage={setStage} addPoints={addPoints} />}
      {page === 'read' && <Read />}
      {page === 'play' && <Play stage={session.stage} session={session} markTarget={markTarget} />}
    </main>

    <footer className="site-footer"><span>Little steps. Big discoveries.</span><span>Made for curious readers · UK English</span></footer>
  </div>;
}

function Home() {
  return <>
    <section className="hero container">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> READ · EXPLORE · GROW</div>
        <h1>A little reading.<br/><em>A big adventure.</em></h1>
        <p>Discover sounds, read a little story, and search for Cbear in a world full of things to notice.</p>
        <div className="hero-actions">
          <a className="button button-primary" href="#learn">Start learning <ArrowIcon /></a>
          <a className="button button-quiet" href="#play">Find Cbear <SearchIcon /></a>
        </div>
        <div className="hero-caption"><span className="caption-dot" /> Made for early readers, one sound at a time</div>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="hero-art-orbit"/><div className="hero-art-sun"/><img src={`${import.meta.env.BASE_URL}cbear.png`} alt="" /><span className="hero-art-note">hello, explorer!</span></div>
    </section>

    <section className="home-paths container" aria-labelledby="choose-title">
      <div className="section-intro"><span className="section-kicker">YOUR NEXT STEP</span><h2 id="choose-title">Choose your adventure</h2><p>Three ways to practise. Each helps the words make sense.</p></div>
      <div className="path-grid">
        <a className="path-card learn-path" href="#learn"><span className="path-count">01 / LEARN</span><span className="path-symbol" aria-hidden="true">Aa<span>·</span></span><span className="path-content"><strong>Hear it. Say it. Read it.</strong><span>Small phonics cards that grow with every sound you learn.</span></span><span className="path-arrow"><ArrowIcon /></span></a>
        <a className="path-card read-path" href="#read"><span className="path-count">02 / READ</span><span className="path-symbol path-book" aria-hidden="true">A<span>·</span></span><span className="path-content"><strong>A bug in my car.</strong><span>Tap each sound in a four-page story with Cbear.</span></span><span className="path-arrow"><ArrowIcon /></span></a>
        <a className="path-card play-path" href="#play"><span className="path-count">03 / PLAY</span><span className="path-symbol path-search" aria-hidden="true"><SearchIcon /></span><span className="path-content"><strong>Where’s Cbear?</strong><span>Read the clue, explore the scene, and spot your friend.</span></span><span className="path-arrow"><ArrowIcon /></span></a>
      </div>
    </section>
    <section className="home-note container"><span className="small-star">✦</span><p>There’s no rush here. Try, listen again, and enjoy the moment you get it.</p></section>
  </>;
}

export function Learn({ stage, setStage, addPoints }: { stage: StageId; setStage: (stage: StageId) => void; addPoints: (points: number) => void }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [solved, setSolved] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [showParts, setShowParts] = useState(false);
  const [audioIssue, setAudioIssue] = useState(false);
  const [boardAudioIssue, setBoardAudioIssue] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const cards = lessons[stage];
  const done = cardIndex >= cards.length;
  const card = cards[cardIndex];
  const threshold = stage === 'sounds' ? 6 : 4;
  const ready = firstTry >= threshold;

  function chooseStage(next: StageId) {
    setStage(next); setCardIndex(0); setWrong(0); setSolved(false); setFirstTry(0); setShowParts(false); setAudioIssue(false); setSelectedChoice(null);
  }

  function playCard(cardToPlay: Card) {
    setAudioIssue(false);
    if (cardToPlay.sound) playPhoneme(cardToPlay.sound).catch(() => setAudioIssue(true));
    else playClip(`audio/words/${cardToPlay.id}.wav`, cardToPlay.spoken).catch(() => setAudioIssue(true));
  }

  function chooseAnswer(choice: string) {
    if (solved) return;
    setSelectedChoice(choice);
    setAudioIssue(false);
    const audio = stage === 'sounds' ? playPhoneme(choice) : playClip(`audio/words/${choice}.wav`, choice);
    audio.catch(() => setAudioIssue(true));
  }

  function submitAnswer() {
    if (solved || selectedChoice === null) return;
    if (selectedChoice === card.answer) {
      setSolved(true);
      if (wrong === 0) setFirstTry(value => value + 1);
      addPoints(wrong === 0 ? 5 : 2);
    } else {
      setWrong(value => value + 1);
      if (wrong >= 1) setShowParts(true);
      setSelectedChoice(null);
    }
  }

  function next() { setCardIndex(value => value + 1); setWrong(0); setSolved(false); setShowParts(false); setSelectedChoice(null); setAudioIssue(false); }

  return <div className="learn-page container">
    <div className="page-intro"><span className="section-kicker">THE READING ROOM</span><h1>Small sounds. <em>Strong readers.</em></h1><p>Tap each choice to hear it, then check your answer. Every try helps.</p></div>
    <div className="learn-navigation"><div className="stage-tabs" role="group" aria-label="Choose a learning stage">{stageOrder.map((item, index) => <button key={item} className={`stage-tab ${stage === item ? 'selected' : ''}`} onClick={() => chooseStage(item)} aria-pressed={stage === item}><span>0{index + 1}</span> {stageNames[item]}</button>)}</div><button className="all-sounds-link" onClick={() => document.getElementById('all-sounds')?.scrollIntoView({ behavior: 'smooth' })}>Explore all sounds ↓</button></div>
    <div className="learn-layout">
      <section className="lesson-card" aria-live="polite">
        {!done ? <>
          <div className="lesson-topline"><span>{stageNames[stage]}</span><span>{cardIndex + 1} / {cards.length}</span></div>
          <div className="progress-track"><div style={{ width: `${(cardIndex / cards.length) * 100}%` }} /></div>
          <div className="lesson-content">
            <span className="mini-kicker">LISTEN & CHOOSE</span>
            <h2>{stage === 'sounds' ? 'Which letter makes this sound?' : 'Which word do you hear?'}</h2>
            <button className="sound-button" onClick={() => playCard(card)} aria-label="Play the sound again"><SpeakerIcon /><span>Hear it again</span></button>
            {audioIssue && <p className="audio-message">Sound is unavailable here. Check your volume or try another browser.</p>}
            {stage !== 'sounds' && <div className="sound-out"><button onClick={() => setShowParts(value => !value)}>{showParts ? 'Hide sounds' : 'Sound it out'}</button>{showParts && <div className="sound-chips" aria-label="Sounds in the word">{card.parts?.map((part, index) => <button key={`${part}-${index}`} onClick={() => playPhoneme(part).catch(() => setAudioIssue(true))} aria-label={`Hear ${part}`}><SpeakerIcon />{part}</button>)}</div>}</div>}
            <div className="choices" role="group" aria-label="Answer choices">{card.choices.map(choice => <button key={choice} className={`choice ${selectedChoice === choice ? 'selected' : ''} ${solved && choice === card.answer ? 'right' : ''} ${wrong >= 2 && choice === card.answer ? 'gentle-hint' : ''}`} onClick={() => chooseAnswer(choice)} aria-pressed={selectedChoice === choice} disabled={solved}>{choice}</button>)}</div>
            <div className={`feedback ${solved ? 'positive' : ''}`} role="status">{solved ? <><span className="feedback-star">✦</span><strong>Lovely work!</strong> {card.note}</> : wrong >= 2 ? 'Take a breath. The right choice has a little glow.' : wrong === 1 ? 'Good try. Listen again and choose once more.' : selectedChoice ? 'You can hear the other choices before checking.' : 'Tap any choice to hear it. Choose one, then check.'}</div>
            {!solved && <button className="button button-primary check-button" onClick={submitAnswer} disabled={!selectedChoice}>Check answer <ArrowIcon /></button>}
            {solved && <button className="button button-primary next-button" onClick={next}>{cardIndex + 1 === cards.length ? 'See your progress' : 'Next card'} <ArrowIcon /></button>}
          </div>
        </> : <div className="stage-finish"><span className="finish-mark">✦</span><span className="mini-kicker">PRACTICE COMPLETE</span><h2>{ready ? 'You’re ready for more.' : 'Every sound is a step.'}</h2><p>You recognised {firstTry} of {cards.length} on your first listen. {ready ? 'Let’s keep going when you feel ready.' : 'Try this set once more and see what you notice.'}</p>{stage !== 'sounds' && <p className="finish-sentence">Read together: <strong>{stage === 'words' ? 'A man sat.' : 'A thin man sat.'}</strong></p>}<div className="finish-actions"><button className="button button-quiet" onClick={() => chooseStage(stage)}>Practise again</button>{ready && stage !== 'digraphs' && <button className="button button-primary" onClick={() => chooseStage(stageOrder[stageOrder.indexOf(stage) + 1])}>Next stage <ArrowIcon /></button>}<a className="button button-text" href="#play">Find Cbear <SearchIcon /></a></div></div>}
      </section>
      <aside className="lesson-side"><div className="side-card"><span className="side-index">YOUR PATH / 0{stageOrder.indexOf(stage) + 1}</span><h3>{stageNames[stage]}</h3><p>{stageDescriptions[stage]}</p><div className="side-divider"/><p className="side-footnote">No timer. No points taken away. Points and progress last for this session only.</p></div><div className="side-illustration"><img src={`${import.meta.env.BASE_URL}cbear.png`} alt="Cbear the brown bear in a navy scarf" /></div></aside>
    </div>
    <section className="sound-library" id="all-sounds" aria-labelledby="all-sounds-title"><div className="sound-library-intro"><span className="section-kicker">SOUND LIBRARY</span><h2 id="all-sounds-title">All sounds, ready to hear.</h2><p>Tap a sound to hear it. The small word below shows one place to spot it.</p></div>{boardAudioIssue && <p className="audio-message" role="alert">This sound could not play. Check your volume or try another browser.</p>}{soundGroups.map(group => <div className="sound-group" key={group.id}><h3>{group.title}</h3><div className="sound-grid">{group.sounds.map(tile => <button className="sound-tile" key={tile.id} aria-label={`Hear ${tile.letters} as in ${tile.example}`} onClick={() => { setBoardAudioIssue(false); playClip(tile.audio, tile.spoken).catch(() => setBoardAudioIssue(true)); }}><strong>{tile.letters}</strong><span>{tile.example}</span><SpeakerIcon /></button>)}</div></div>)}</section>
  </div>;
}

export function Play({ stage, session, markTarget }: { stage: StageId; session: Session; markTarget: (puzzleId: string, targetId: string) => void }) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [recentFind, setRecentFind] = useState<string | null>(null);
  const [bearRevealed, setBearRevealed] = useState(false);
  const [audioIssue, setAudioIssue] = useState(false);

  useEffect(() => {
    loadCurrentPuzzle().then(setPuzzle).catch((cause: Error) => setError(cause.message));
  }, []);

  const bearFound = puzzle ? targetIsFound(session, puzzle.id, 'cbear') : false;
  const foundItems = puzzle ? puzzle.finds.filter(item => targetIsFound(session, puzzle.id, item.id)) : [];
  const foundCount = foundItems.length + (bearFound ? 1 : 0);
  const totalTargets = puzzle ? puzzle.finds.length + 1 : 0;
  const complete = puzzle ? foundCount === totalTargets : false;
  const clue = puzzle?.clues[stage];

  function checkClick(event: React.MouseEvent<HTMLImageElement>) {
    if (!puzzle) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    const targetId = targetAtPoint(puzzle, x, y);
    if (targetId && !targetIsFound(session, puzzle.id, targetId)) {
      markTarget(puzzle.id, targetId);
      setRecentFind(targetId);
      const item = puzzle.finds.find(find => find.id === targetId);
      playClip(item?.audio ?? 'audio/found.wav', item?.spoken).catch(() => setAudioIssue(true));
    } else if (!targetId) setAttempts(value => value + 1);
  }

  function playClue() {
    if (!clue) return;
    playClip(clue.audio, clue.spoken).then(() => setAudioIssue(false)).catch(() => setAudioIssue(true));
  }

  function showHint() { setHintLevel(value => Math.min(value + 1, 2)); }

  function playFind(targetId: string) {
    if (targetId === 'cbear') { playClue(); return; }
    const item = puzzle?.finds.find(find => find.id === targetId);
    if (item) playClip(item.audio, item.spoken).then(() => setAudioIssue(false)).catch(() => setAudioIssue(true));
  }

  const quadrant = puzzle ? bearQuadrant(puzzle) : '';
  const [vertical, horizontal] = quadrant.split(' ');

  return <div className="play-page container">
    <div className="page-intro play-intro"><span className="section-kicker">THE DAILY SEARCH</span><h1>Where’s <em>Cbear?</em></h1><p>Read the clue, explore the picture, and tap Cbear when you spot that navy scarf.</p></div>
    {error && <div className="error-card" role="alert"><h2>The scene is taking a break.</h2><p>{error}</p><button className="button button-primary" onClick={() => location.reload()}>Try again</button></div>}
    {!error && !puzzle && <div className="loading-card">Preparing today’s scene…</div>}
    {puzzle && <>
      <div className="puzzle-info"><div><span className="mini-kicker">TODAY’S PLACE</span><h2>{puzzle.title}</h2></div><span className="puzzle-badge"><SearchIcon /> A Cbear search</span></div>
      <section className="clue-card" aria-label="Reading clue"><div className="clue-label">01 / READ THE CLUE</div><div className="clue-main"><div><p>{clue?.text}</p><span className="clue-focus">Sound to notice: <strong>{clue?.focus}</strong></span></div><button className="button button-audio" onClick={playClue}><SpeakerIcon /> Listen to clue</button></div>{audioIssue && <p className="audio-message">Audio could not play. The words are still here to read.</p>}</section>
      <div className="search-layout">
        <div className="scene-column">
          <div className="scene-toolbar"><span>02 / LOOK CLOSELY <span className="toolbar-helper">· On a phone, swipe across the picture</span></span><button className="zoom-button" onClick={() => setZoomed(value => !value)}>{zoomed ? 'Fit picture' : 'Zoom in'} <SearchIcon /></button></div>
          <div className="scene-viewport"><div className={`scene-inner ${zoomed ? 'zoomed' : ''}`}>
            <img className="scene-image" src={`${import.meta.env.BASE_URL}${puzzle.image}?v=${encodeURIComponent(puzzle.id)}`} alt={puzzle.alt} onClick={checkClick} draggable="false" />
            {hintLevel >= 2 && !bearFound && <div className="quadrant-hint" style={{ left: horizontal === 'left' ? '0%' : '50%', top: vertical === 'top' ? '0%' : '50%' }} aria-hidden="true" />}
            {(bearFound || bearRevealed) && <div className="found-ring" style={{ left: `${(puzzle.bear.x + puzzle.bear.w / 2) * 100}%`, top: `${(puzzle.bear.y + puzzle.bear.h / 2) * 100}%` }} aria-hidden="true" />}
            {foundItems.map(item => <div className="found-mark" key={item.id} style={{ left: `${(item.box.x + item.box.w / 2) * 100}%`, top: `${(item.box.y + item.box.h / 2) * 100}%` }} aria-hidden="true">✓</div>)}
          </div></div>
          <div className="play-bottom"><div className="play-status" role="status">{complete ? <><span className="status-star">✦</span><strong>You found everything!</strong> Brilliant looking and reading.</> : recentFind ? <><span className="status-star">✦</span><strong>{recentFind === 'cbear' ? 'You found Cbear!' : `You found the ${puzzle.finds.find(item => item.id === recentFind)?.label.toLowerCase()}!`}</strong> {recentFind === 'cbear' ? '+20 points' : '+5 points'} · Keep looking.</> : bearRevealed ? 'There he is! Tap Cbear in the picture to tick him off.' : attempts > 0 ? 'Good looking. Keep exploring the picture.' : `Find all ${totalTargets} things in the key. ${foundCount} found so far.`}</div><div className="hint-actions">{!bearFound && <><button className="button button-quiet" onClick={showHint} disabled={hintLevel >= 2}>{hintLevel === 0 ? 'Need a hint?' : hintLevel === 1 ? 'Show me the area' : 'Area shown'}</button>{hintLevel >= 1 && !bearRevealed && <button className="button button-text" onClick={() => setBearRevealed(true)}>Show Cbear</button>}</>}</div></div>
          {hintLevel >= 1 && !bearFound && <p className="hint-copy">Hint: {puzzle.hint} {hintLevel >= 2 ? `Try the ${quadrant} part of the picture.` : ''}</p>}
        </div>
        <aside className="find-key" aria-label="Things to find"><div className="find-key-head"><span className="mini-kicker">YOUR FINDING KEY</span><h3>Can you spot them?</h3><p>{foundCount} / {puzzle.finds.length + 1} found</p></div><div className="find-list"><button className={`find-row ${bearFound ? 'found' : ''}`} onClick={() => playFind('cbear')} aria-label="Hear Cbear clue"><span className="find-check" aria-hidden="true">{bearFound ? '✓' : '○'}</span><span className="find-name"><strong>Cbear</strong><small>Navy scarf</small></span><SpeakerIcon /></button>{puzzle.finds.map(item => { const found = targetIsFound(session, puzzle.id, item.id); return <button className={`find-row ${found ? 'found' : ''}`} key={item.id} onClick={() => playFind(item.id)} aria-label={`Hear ${item.label}`}><span className="find-check" aria-hidden="true">{found ? '✓' : '○'}</span><span className="find-name"><strong>{item.label}</strong><small>{found ? 'Found!' : 'Tap to hear'}</small></span><SpeakerIcon /></button>; })}</div><p className="find-key-note">Tap the picture when you see one. The key will tick it for you.</p></aside>
      </div>
      <div className="play-learning-link"><span className="small-star">✦</span><p>Curious about the sounds in your clue? <a href="#learn">Practise with the reading cards <ArrowIcon /></a></p></div>
    </>}
  </div>;
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
