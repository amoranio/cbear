import { useEffect, useRef, useState } from 'react';
import { playClip, stopAudio } from './audio';
import { readStory, soundsForWord } from './readStory';

const STORAGE_KEY = 'cbear-read-page-v1';

function storedPage(): number {
  try {
    const value = Number(sessionStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value >= 0 && value < readStory.pages.length ? value : 0;
  } catch { return 0; }
}

function SpeakerIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>;
}

export function Read() {
  const [pageIndex, setPageIndex] = useState(storedPage);
  const [activeSound, setActiveSound] = useState('');
  const [audioIssue, setAudioIssue] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);
  const page = readStory.pages[pageIndex];
  const isLast = pageIndex === readStory.pages.length - 1;

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, String(pageIndex)); } catch { /* Reading still works without storage. */ }
  }, [pageIndex]);
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
    <div className="page-intro read-intro"><span className="section-kicker">READ WITH CBEAR</span><h1>A little story. <em>One sound at a time.</em></h1><p>Tap the letters to hear their sounds. The letters in one sound, like <strong>ar</strong>, stay together.</p></div>
    <div className="read-book" ref={bookRef}>
      <div className="read-book-top"><span>THE LITTLE BOOK / {readStory.title.toUpperCase()}</span><span>Page {pageIndex + 1} of {readStory.pages.length}</span></div>
      <div className="read-page-progress" aria-label={`Page ${pageIndex + 1} of ${readStory.pages.length}`}><span style={{ width: `${((pageIndex + 1) / readStory.pages.length) * 100}%` }} /></div>
      <div className="read-spread">
        <div className="read-picture" role="img" aria-label={page.alt}>
          <div className="read-picture-halo" />
          <img className="read-car" src={`${import.meta.env.BASE_URL}read/cbear-car.png`} alt="" draggable="false" />
          {page.bug !== 'none' && <img className={`read-bug read-bug-${page.bug}`} src={`${import.meta.env.BASE_URL}read/bug.png`} alt="" draggable="false" />}
        </div>
        <div className="read-copy" key={pageIndex}>
          <span className="mini-kicker">LOOK · SOUND · READ</span>
          <h2>{pageIndex === 0 ? 'Here is Cbear.' : isLast ? 'Look where the bug went!' : 'Can you see the bug?'}</h2>
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
                {wordIndex === page.words.length - 1 && <span className="read-punctuation">{page.punctuation}</span>}
              </span>;
            })}
          </div>
          <button className="button button-quiet read-listen" onClick={() => hear(page.audio, page.line)}><SpeakerIcon /> Hear the line</button>
          {audioIssue && <p className="audio-message" role="alert">Sound is unavailable here. Check your volume or try another browser.</p>}
          {isLast && <p className="read-finish"><span aria-hidden="true">✦</span> You read with Cbear. Brilliant sounding out!</p>}
        </div>
      </div>
      <div className="read-book-bottom"><button className="button button-quiet" onClick={() => turnPage(pageIndex - 1)} disabled={pageIndex === 0}>← Back</button><span className="read-page-number">{pageIndex + 1} / {readStory.pages.length}</span><button className="button button-primary" onClick={() => turnPage(isLast ? 0 : pageIndex + 1)}>{isLast ? 'Read again' : 'Next page →'}</button></div>
    </div>
  </div>;
}
