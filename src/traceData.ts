import { flashDecks } from './flashCards';

export type TraceMode = 'numbers' | 'letters';
export type TraceShape = {
  id: string;
  face: string;
  caption: string;
  audio: string;
  spoken: string;
  paths: string[];
};

// Simple print shapes keep the guide consistent on every device. The child draws
// freely over the guide; these paths are never used to judge or constrain ink.
const numberPaths: Record<string, string[]> = {
  '1': ['M205 117 L251 73 L251 286'],
  '2': ['M185 128 C185 93 213 71 253 71 C296 71 319 94 319 129 C319 159 301 179 265 211 L187 285 L322 285'],
  '3': ['M192 91 C208 77 231 70 254 70 C299 70 319 94 319 127 C319 155 298 174 262 177 C301 179 324 199 324 232 C324 270 297 288 252 288 C225 288 202 280 184 262'],
  '4': ['M295 285 L295 73 L179 220 L322 220'],
  '5': ['M315 76 L202 76 L190 168 C207 155 224 150 247 150 C298 150 322 178 322 219 C322 263 291 287 247 287 C221 287 200 279 184 263'],
  '6': ['M300 83 C236 75 187 125 187 205 C187 258 210 287 251 287 C294 287 318 258 318 216 C318 176 293 153 252 153 C219 153 193 176 188 210'],
  '7': ['M181 76 L322 76 L216 286'],
  '8': ['M250 177 C208 175 190 151 190 122 C190 90 214 70 250 70 C286 70 310 90 310 122 C310 151 292 175 250 177 C204 179 183 201 183 233 C183 267 209 288 250 288 C291 288 317 267 317 233 C317 201 296 179 250 177'],
  '9': ['M311 154 C306 191 280 214 246 214 C205 214 182 187 182 146 C182 103 206 71 250 71 C296 71 319 106 319 163 C319 241 281 291 204 282'],
  '10': ['M113 117 L159 73 L159 286', 'M310 70 C262 70 241 113 241 179 C241 246 262 286 310 286 C358 286 379 246 379 179 C379 113 358 70 310 70 Z'],
};

// Single-storey g and clearly opposed b/d, p/q make the commonly confused
// lowercase letters useful for early handwriting practice.
const letterPaths: Record<string, string[]> = {
  p: ['M205 140 L205 329', 'M205 170 C223 146 243 136 266 136 C301 136 321 161 321 209 C321 258 299 284 265 284 C239 284 219 270 205 248'],
  q: ['M309 169 C290 146 271 136 245 136 C211 136 188 162 188 209 C188 257 211 284 245 284 C271 284 291 269 309 247', 'M309 141 L309 329'],
  b: ['M204 69 L204 285', 'M204 171 C220 149 242 137 267 137 C303 137 323 163 323 210 C323 258 301 284 267 284 C242 284 220 270 204 249'],
  d: ['M308 171 C292 149 270 137 245 137 C210 137 188 163 188 210 C188 258 210 284 245 284 C270 284 292 270 308 249', 'M308 69 L308 285'],
  g: ['M307 171 C290 149 270 137 245 137 C210 137 188 162 188 209 C188 257 210 283 245 283 C270 283 291 268 307 247', 'M307 141 L307 279 C307 311 287 331 250 331 C227 331 209 324 194 313'],
  y: ['M187 141 L250 280', 'M314 141 L236 330'],
};

const letterOrder = ['p', 'q', 'b', 'd', 'g', 'y'];

export const traceGroups: Record<TraceMode, { title: string; description: string; shapes: TraceShape[] }> = {
  numbers: {
    title: 'Numbers',
    description: 'Make the numbers from one to ten. Trace the soft line, or try your own way beside it.',
    shapes: flashDecks.numbers.cards.slice(0, 10).map(card => ({ ...card, paths: numberPaths[card.face] })),
  },
  letters: {
    title: 'Letters',
    description: 'Try six lowercase letters that can look alike. Listen, then draw each one at your own pace.',
    shapes: letterOrder.map(letter => {
      const card = flashDecks.letters.cards.find(item => item.face === `${letter.toUpperCase()}${letter}`);
      if (!card) throw new Error(`Missing tracing sound for ${letter}`);
      return { ...card, face: letter, paths: letterPaths[letter] };
    }),
  },
};

export function isTraceMode(value: string): value is TraceMode {
  return value === 'numbers' || value === 'letters';
}
