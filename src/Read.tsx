import { useEffect, useRef, useState } from 'react';
import { playClip, stopAudio } from './audio';
import { isReadStoryId, readStories, soundsForWord, type ReadPage, type ReadStory, type ReadStoryId } from './readStory';

const storageKey = (id: ReadStoryId) => `cbear-read-page-${id}-v1`;

function storedPage(story: ReadStory): number {
  try {
    const saved = sessionStorage.getItem(storageKey(story.id));
    const legacy = story.id === 'bug-in-my-car' ? sessionStorage.getItem('cbear-read-page-v1') : null;
    const value = Number(saved ?? legacy ?? 0);
    return Number.isInteger(value) && value >= 0 && value < story.pages.length ? value : 0;
  } catch { return 0; }
}

function SpeakerIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>;
}

function StoryArt({ page, storyId }: { page: ReadPage; storyId: ReadStoryId }) {
  if (storyId === 'bug-in-my-car') {
    return <div className="read-picture" role="img" aria-label={page.alt}>
      <div className="read-picture-halo" />
      <img className="read-car" src={`${import.meta.env.BASE_URL}read/cbear-car-v2.png`} alt="" draggable="false" />
      {page.bug !== 'none' && <img className={`read-bug read-bug-${page.bug}`} src={`${import.meta.env.BASE_URL}read/bug.png`} alt="" draggable="false" />}
    </div>;
  }

  return <div className={`read-picture read-sausage-scene read-scene-${page.scene}`} role="img" aria-label={page.alt}>
    <div className="read-picture-halo" />
    <div className="read-scene-ground" />
    <img className="read-scene-puddle" src={`${import.meta.env.BASE_URL}read/puddle.png`} alt="" draggable="false" />
    <img className="read-scene-bear" src={`${import.meta.env.BASE_URL}cbear.png`} alt="" draggable="false" />
    <img className="read-scene-roll" src={`${import.meta.env.BASE_URL}read/sausage-roll.png`} alt="" draggable="false" />
    {page.scene === 'talking' && <span className="read-scene-speech" aria-hidden="true">Hi!</span>}
    {(page.scene === 'splash' || page.scene === 'wet') && <img className="read-water-splash" src={`${import.meta.env.BASE_URL}read/splash.png`} alt="" draggable="false" />}
  </div>;
}

function StoryChoice({ storyId, number }: { storyId: ReadStoryId; number: number }) {
  const story = readStories[storyId];
  return <a className="read-story-choice" href={`#read/${storyId}`}>
    <span className="mini-kicker">{String(number).padStart(2, '0')} / {story.pages.length} PAGES</span>
    <span className={`read-story-preview read-story-preview-${storyId}`} aria-hidden="true">
      {storyId === 'bug-in-my-car' ? <img src={`${import.meta.env.BASE_URL}read/cbear-car-v2.png`} alt="" /> : <>
        <img className="read-preview-puddle" src={`${import.meta.env.BASE_URL}read/puddle.png`} alt="" />
        <img className="read-preview-bear" src={`${import.meta.env.BASE_URL}cbear.png`} alt="" />
        <img className="read-preview-roll" src={`${import.meta.env.BASE_URL}read/sausage-roll.png`} alt="" />
      </>}
    </span>
    <strong>{story.title}</strong>
    <span>{storyId === 'bug-in-my-car' ? 'A little bug moves from car to cap.' : 'A little roll says hello and makes a splash.'}</span>
    <span className="read-story-action">Open story →</span>
  </a>;
}

function StoryGallery() {
  return <div className="read-page container">
    <div className="page-intro read-intro"><span className="section-kicker">READ WITH CBEAR</span><h1>Pick a little <em>story.</em></h1><p>Read together, tap each sound, and listen to every line. Go at your own pace.</p></div>
    <div className="read-story-grid"><StoryChoice storyId="bug-in-my-car" number={1} /><StoryChoice storyId="sausage-roll" number={2} /></div>
    <p className="flash-parent-note">The pictures help with the story. The printed lines are for sounding out together.</p>
  </div>;
}

function ReadBook({ story }: { story: ReadStory }) {
  const [pageIndex, setPageIndex] = useState(() => storedPage(story));
  const [activeSound, setActiveSound] = useState('');
  const [audioIssue, setAudioIssue] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);
  const page = story.pages[pageIndex];
  const isLast = pageIndex === story.pages.length - 1;

  useEffect(() => {
    try { sessionStorage.setItem(storageKey(story.id), String(pageIndex)); } catch { /* Reading still works without storage. */ }
  }, [story.id, pageIndex]);
  useEffect(() => () => stopAudio(), []);

  function turnPage(next: number) {
    stopAudio();
    setPageIndex(next);
    setActiveSound('');
    setAudioIssue(false);
    bookRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  function hear(path: string, fallback: string, sound = '') {
    setAudioIssue(false);
    setActiveSound(sound);
    playClip(path, fallback).catch(() => setAudioIssue(true));
  }

  return <div className="read-page container">
    <a className="all-levels-link read-all-stories" href="#read">← All stories</a>
    <div className="page-intro read-intro"><span className="section-kicker">READ WITH CBEAR</span><h1>A little story. <em>One sound at a time.</em></h1><p>Tap the letters to hear their sounds. Letters in one sound, like <strong>ar</strong> or <strong>ee</strong>, stay together.</p></div>
    <div className="read-book" ref={bookRef}>
      <div className="read-book-top"><span>THE LITTLE BOOK / {story.title.toUpperCase()}</span><span>Page {pageIndex + 1} of {story.pages.length}</span></div>
      <div className="read-page-progress" aria-label={`Page ${pageIndex + 1} of ${story.pages.length}`}><span style={{ width: `${((pageIndex + 1) / story.pages.length) * 100}%` }} /></div>
      <div className="read-spread">
        <StoryArt page={page} storyId={story.id} />
        <div className="read-copy" key={pageIndex}>
          <span className="mini-kicker">LOOK · SOUND · READ</span>
          <h2>{page.heading}</h2>
          <p className="read-instruction">Tap each sound in the line.</p>
          <div className="read-line" role="group" aria-label={page.line}>
            {page.words.map((word, wordIndex) => {
              const sounds = soundsForWord(word);
              return <span className="read-word" key={`${word}-${wordIndex}`}>
                {sounds.map((sound, soundIndex) => {
                  const offset = sounds.slice(0, soundIndex).reduce((total, item) => total + item.letters.length, 0);
                  const visible = word.slice(offset, offset + sound.letters.length);
                  const id = `${wordIndex}-${soundIndex}`;
                  return <button className={`read-sound ${activeSound === id ? 'active' : ''}`} key={id} onClick={() => hear(sound.audio, sound.fallback, id)} aria-label={word.toLowerCase() === 'a' ? 'Hear a as a word' : `Hear ${sound.letters} in ${word.toLowerCase()}`}>{visible}</button>;
                })}
                {page.marks[wordIndex] && <span className="read-punctuation">{page.marks[wordIndex]}</span>}
              </span>;
            })}
          </div>
          <button className="button button-quiet read-listen" onClick={() => hear(page.audio, page.line)}><SpeakerIcon /> Hear the line</button>
          {audioIssue && <p className="audio-message" role="alert">Sound is unavailable here. Check your volume or try another browser.</p>}
          {isLast && <p className="read-finish"><span aria-hidden="true">✦</span> You read with Cbear. Brilliant sounding out!</p>}
        </div>
      </div>
      <div className="read-book-bottom"><button className="button button-quiet" onClick={() => turnPage(pageIndex - 1)} disabled={pageIndex === 0}>← Back</button><span className="read-page-number">{pageIndex + 1} / {story.pages.length}</span><button className="button button-primary" onClick={() => turnPage(isLast ? 0 : pageIndex + 1)}>{isLast ? 'Read again' : 'Next page →'}</button></div>
    </div>
  </div>;
}

export function Read({ storyId = null }: { storyId?: string | null }) {
  if (storyId === null) return <StoryGallery />;
  if (!isReadStoryId(storyId)) return <div className="read-page container"><a className="all-levels-link" href="#read">← All stories</a><div className="error-card"><h2>That story is not here yet.</h2><p>Choose one of Cbear's little books.</p></div></div>;
  return <ReadBook key={storyId} story={readStories[storyId]} />;
}
