import type { StageId } from './puzzle';

export type Card = {
  id: string;
  answer: string;
  choices: string[];
  spoken: string;
  sound?: string;
  parts?: string[];
  note: string;
};

export const stageNames: Record<StageId, string> = {
  sounds: 'Letter sounds',
  words: 'Build words',
  digraphs: 'Two-letter sounds',
};

export const stageDescriptions: Record<StageId, string> = {
  sounds: 'Listen, then match the sound to its letter.',
  words: 'Hear a word and blend its sounds together.',
  digraphs: 'Notice when two letters make one sound.',
};

export const stageOrder: StageId[] = ['sounds', 'words', 'digraphs'];

export const lessons: Record<StageId, Card[]> = {
  sounds: [
    { id: 's', answer: 's', choices: ['s', 'm', 't'], spoken: 's', sound: 's', note: 's as in sun' },
    { id: 'a', answer: 'a', choices: ['n', 'a', 'i'], spoken: 'a', sound: 'a', note: 'a as in ant' },
    { id: 't', answer: 't', choices: ['p', 'n', 't'], spoken: 't', sound: 't', note: 't as in tap' },
    { id: 'p', answer: 'p', choices: ['p', 's', 'i'], spoken: 'p', sound: 'p', note: 'p as in pin' },
    { id: 'i', answer: 'i', choices: ['a', 'i', 'n'], spoken: 'i', sound: 'i', note: 'i as in ink' },
    { id: 'n', answer: 'n', choices: ['t', 'p', 'n'], spoken: 'n', sound: 'n', note: 'n as in nap' },
    { id: 'm', answer: 'm', choices: ['n', 'm', 'p'], spoken: 'm', sound: 'm', note: 'm as in man' },
    { id: 'd', answer: 'd', choices: ['d', 't', 'p'], spoken: 'd', sound: 'd', note: 'd as in dad' },
  ],
  words: [
    { id: 'pin', answer: 'pin', choices: ['pin', 'pan', 'pit'], spoken: 'pin', parts: ['p', 'i', 'n'], note: 'p · i · n → pin' },
    { id: 'sat', answer: 'sat', choices: ['sit', 'sap', 'sat'], spoken: 'sat', parts: ['s', 'a', 't'], note: 's · a · t → sat' },
    { id: 'tap', answer: 'tap', choices: ['tan', 'tap', 'tip'], spoken: 'tap', parts: ['t', 'a', 'p'], note: 't · a · p → tap' },
    { id: 'nap', answer: 'nap', choices: ['nap', 'nip', 'pan'], spoken: 'nap', parts: ['n', 'a', 'p'], note: 'n · a · p → nap' },
    { id: 'mat', answer: 'mat', choices: ['man', 'mat', 'map'], spoken: 'mat', parts: ['m', 'a', 't'], note: 'm · a · t → mat' },
    { id: 'sad', answer: 'sad', choices: ['sat', 'sap', 'sad'], spoken: 'sad', parts: ['s', 'a', 'd'], note: 's · a · d → sad' },
  ],
  digraphs: [
    { id: 'ship', answer: 'ship', choices: ['ship', 'chip', 'shin'], spoken: 'ship', parts: ['sh', 'i', 'p'], note: 'sh makes one sound in ship' },
    { id: 'chat', answer: 'chat', choices: ['that', 'chat', 'chap'], spoken: 'chat', parts: ['ch', 'a', 't'], note: 'ch makes one sound in chat' },
    { id: 'thin', answer: 'thin', choices: ['shin', 'then', 'thin'], spoken: 'thin', parts: ['th', 'i', 'n'], note: 'th makes one sound in thin' },
    { id: 'sing', answer: 'sing', choices: ['sing', 'sang', 'song'], spoken: 'sing', parts: ['s', 'i', 'ng'], note: 'ng makes one sound in sing' },
    { id: 'mash', answer: 'mash', choices: ['math', 'mash', 'match'], spoken: 'mash', parts: ['m', 'a', 'sh'], note: 'm · a · sh → mash' },
    { id: 'path', answer: 'path', choices: ['patch', 'path', 'pass'], spoken: 'path', parts: ['p', 'a', 'th'], note: 'p · a · th → path' },
  ],
};
