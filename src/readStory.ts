import story from '../public/read/story.json';

export type SoundUnit = { letters: string; audio: string; fallback: string };
export type BugPlacement = 'none' | 'inside' | 'bonnet' | 'cap';
export type ReadPage = {
  words: string[];
  punctuation: string;
  line: string;
  audio: string;
  bug: BugPlacement;
  alt: string;
};

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
};

export function soundsForWord(word: string): SoundUnit[] {
  const sounds = wordSounds[word.toLowerCase()];
  if (!sounds || sounds.map(sound => sound.letters).join('') !== word.toLowerCase()) {
    throw new Error(`Read story has no sound map for ${word}`);
  }
  return sounds;
}

export const readStory = {
  id: story.id,
  title: story.title,
  pages: story.pages.map((page): ReadPage => ({
    ...page,
    line: `${page.words.join(' ')}${page.punctuation}`,
    bug: page.bug as BugPlacement,
  })),
};
