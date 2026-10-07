export type SoundTile = {
  id: string;
  letters: string;
  example: string;
  audio: string;
  spoken: string;
};

export type SoundGroup = { id: string; title: string; sounds: SoundTile[] };

const sound = (letters: string, example: string, audio = letters, id = letters): SoundTile => ({
  id,
  letters,
  example,
  audio: `audio/${audio}.m4a`,
  spoken: `${letters} as in ${example}`,
});

export const soundGroups: SoundGroup[] = [
  {
    id: 'first-letters', title: 'Start here · first letters',
    sounds: [
      sound('s', 'sun'), sound('a', 'ant'), sound('t', 'tap'), sound('p', 'pin'),
      sound('i', 'ink'), sound('n', 'nap'), sound('m', 'man'), sound('d', 'dad'),
    ],
  },
  {
    id: 'more-letters', title: 'More letters',
    sounds: [
      sound('g', 'goat'), sound('o', 'ox'), sound('c', 'cat'), sound('k', 'kite', 'c'),
      sound('e', 'egg'), sound('u', 'up'), sound('r', 'red'), sound('h', 'hat'),
      sound('b', 'bus'), sound('f', 'fish'), sound('l', 'leg'),
    ],
  },
  {
    id: 'letter-teams', title: 'Letters working together',
    sounds: [sound('ck', 'duck', 'c'), sound('ff', 'puff', 'f'), sound('ll', 'bell', 'l'), sound('ss', 'hiss', 's')],
  },
  {
    id: 'new-letters', title: 'New letters',
    sounds: [sound('j', 'jam'), sound('v', 'van'), sound('w', 'web'), sound('x', 'box'), sound('y', 'yes'), sound('z', 'zip')],
  },
  {
    id: 'consonant-teams', title: 'More letter teams',
    sounds: [
      sound('zz', 'buzz', 'z'), sound('qu', 'queen'), sound('ch', 'chip'), sound('sh', 'ship'),
      sound('th', 'thin', 'th', 'th-thin'),
      sound('ng', 'sing'),
    ],
  },
  {
    id: 'vowel-teams', title: 'Vowel sounds',
    sounds: [
      sound('ai', 'rain'), sound('ee', 'feet'), sound('igh', 'night'), sound('oa', 'boat'),
      sound('oo', 'moon', 'oo', 'oo-moon'), sound('oo', 'book', 'ooo', 'oo-book'),
      sound('ar', 'car'), sound('or', 'fork'), sound('ur', 'fur'), sound('ow', 'cow'),
      sound('oi', 'coin'), sound('ear', 'hear'), sound('air', 'chair'), sound('ure', 'pure'), sound('er', 'hammer'),
    ],
  },
];
