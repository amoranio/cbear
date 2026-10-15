import bugStory from '../public/read/story.json';
import sausageStory from '../public/read/sausage-roll.json';

export type SoundUnit = { letters: string; audio: string; fallback: string };
export type BugPlacement = 'none' | 'inside' | 'bonnet' | 'cap';
export type SausageScene = 'found' | 'talking' | 'hopping' | 'splash' | 'wet';
export type ReadStoryId = 'bug-in-my-car' | 'sausage-roll';
export type ReadPage = {
  words: string[];
  marks: string[];
  line: string;
  audio: string;
  bug?: BugPlacement;
  scene?: SausageScene;
  heading: string;
  alt: string;
};
export type ReadStory = { id: ReadStoryId; title: string; pages: ReadPage[] };

type RawPage = {
  words: string[];
  punctuation?: string;
  marks?: string[];
  audio: string;
  bug?: BugPlacement;
  scene?: SausageScene;
  heading?: string;
  alt: string;
};
type RawStory = { id: ReadStoryId; title: string; pages: RawPage[] };

const unit = (letters: string, audio = letters, fallback = letters): SoundUnit => ({
  letters,
  audio: `audio/${audio}.m4a`,
  fallback,
});

const wordSounds: Record<string, SoundUnit[]> = {
  in: [unit('i', 'i', 'i as in ink'), unit('n', 'n', 'n as in nap')],
  my: [unit('m', 'm', 'm as in man'), unit('y', 'igh', 'y makes the eye sound in my')],
  car: [unit('c', 'c', 'c as in cat'), unit('ar', 'ar', 'ar as in car')],
  a: [{ letters: 'a', audio: 'audio/read/a-article.wav', fallback: 'a bug' }],
  bug: [unit('b', 'b', 'b as in bus'), unit('u', 'u', 'u as in up'), unit('g', 'g', 'g as in goat')],
  on: [unit('o', 'o', 'o as in ox'), unit('n', 'n', 'n as in nap')],
  cap: [unit('c', 'c', 'c as in cat'), unit('a', 'a', 'a as in ant'), unit('p', 'p', 'p as in pin')],
  i: [unit('i', 'igh', 'I')],
  can: [unit('c'), unit('a'), unit('n')],
  see: [unit('s'), unit('ee', 'ee', 'ee as in see')],
  it: [unit('i'), unit('t')],
  by: [unit('b'), unit('y', 'igh', 'y makes the eye sound in by')],
  feet: [unit('f'), unit('ee', 'ee', 'ee as in feet'), unit('t')],
  hi: [unit('h'), unit('i', 'igh', 'i makes the eye sound in hi')],
  pal: [unit('p'), unit('a'), unit('l')],
  hop: [unit('h'), unit('o'), unit('p')],
  up: [unit('u'), unit('p')],
  and: [unit('a'), unit('n'), unit('d')],
  down: [unit('d'), unit('ow', 'ow', 'ow as in down'), unit('n')],
  splash: [unit('s'), unit('p'), unit('l'), unit('a'), unit('sh', 'sh', 'sh as in ship')],
  am: [unit('a'), unit('m')],
  wet: [unit('w'), unit('e'), unit('t')],
  but: [unit('b'), unit('u'), unit('t')],
  grin: [unit('g'), unit('r'), unit('i'), unit('n')],
};

export function soundsForWord(word: string): SoundUnit[] {
  const sounds = wordSounds[word.toLowerCase()];
  if (!sounds || sounds.map(sound => sound.letters).join('') !== word.toLowerCase()) {
    throw new Error(`Read story has no sound map for ${word}`);
  }
  return sounds;
}

function normaliseStory(raw: RawStory): ReadStory {
  return {
    id: raw.id,
    title: raw.title,
    pages: raw.pages.map((page, index) => {
      const marks = page.marks ?? page.words.map((_, wordIndex) => wordIndex === page.words.length - 1 ? page.punctuation ?? '' : '');
      if (marks.length !== page.words.length) throw new Error(`Invalid punctuation on ${raw.id} page ${index + 1}`);
      return {
        words: page.words,
        marks,
        line: page.words.map((word, wordIndex) => `${word}${marks[wordIndex]}`).join(' '),
        audio: page.audio,
        bug: page.bug,
        scene: page.scene,
        heading: page.heading ?? (index === 0 ? 'Here is Cbear.' : index === raw.pages.length - 1 ? 'Look where the bug went!' : 'Can you see the bug?'),
        alt: page.alt,
      };
    }),
  };
}

export const readStories: Record<ReadStoryId, ReadStory> = {
  'bug-in-my-car': normaliseStory(bugStory as RawStory),
  'sausage-roll': normaliseStory(sausageStory as RawStory),
};
export const readStory = readStories['bug-in-my-car'];

export function isReadStoryId(value: string): value is ReadStoryId {
  return value === 'bug-in-my-car' || value === 'sausage-roll';
}
