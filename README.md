# Cbear — Learn, Read, Play & Flash Cards

A small, responsive reading site for early readers. **Learn** teaches UK letter sounds, blending and common digraphs through short cards and offers a Phase 2–3 sound library. Children can hear every answer before checking it. **Read** has two short illustrated books whose printed sounds play when tapped. **Play** offers a daily search and eight selectable levels, with the final three adding much busier visual searches while keeping the reading approachable. **Flash Cards** offers parent-led number, letter and phonics decks that reshuffle after each round. The site is static and uses no accounts or tracking. Points and progress last only for the browser session.

## Run locally

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/`. Run `npm test` and `npm run build` before publishing; the build checks TypeScript, builds the Pages bundle and validates the puzzle manifests.

## Hosting

The workflow in `.github/workflows/deploy.yml` builds and deploys on each push to `main`. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The public URL is <https://cbear.amoran.io/>. The Vite base path is `/` for this custom domain; change it if the hosting path changes.

## Daily puzzle contract

The live puzzle is `public/puzzles/current.json`. A daily update adds a new scene image in `public/scenes/`, three narrated clues in `public/audio/clues/`, four or five narrated finding items in `public/audio/finds/`, and replaces `current.json` in one commit. The two `.sample.json` files demonstrate additional prepared scenes. Use a new ID and filenames for each puzzle so browser caches cannot show old artwork.

## Permanent Play levels

`#play` opens the gallery. The daily game is `#play/daily`; the eight permanent games have links such as `#play/park` and `#play/parade`. Their order and small preview images are listed in `public/puzzles/levels/index.json`, and each level has its own manifest in that directory. All eight use the daily puzzle schema and the same points, audio, hints, zoom, and finding key. The build validator checks every listed level, asset and target box. Completion is remembered by puzzle ID only for the browser session. Daily bots must not change the catalog or permanent level files.

The three challenge levels can also be opened directly: [museum](https://cbear.amoran.io/#play/museum), [botanical gardens](https://cbear.amoran.io/#play/gardens), and [city parade](https://cbear.amoran.io/#play/parade).

## Flash Cards

`#flash-cards` opens the three-deck chooser, tracing, and Spot the wrong one. Direct card links are `#flash-cards/numbers`, `#flash-cards/letters`, and `#flash-cards/phonics`. Number cards cover 1–20 with printed words and bundled UK narration. Letter cards cover Aa–Zz and play the existing phonics sound, not the alphabet name. The phonics deck follows every sound in Learn’s sound board, including both pronunciations of `oo`. Swipe either way, press Next card, or press the right arrow key to advance. A separate Hear it button plays sound without advancing. Each deck remembers its own place for the browser session, reshuffling after every complete round. Flash Cards have no points.

`#flash-cards/trace` offers freehand number tracing for 1–10 and lowercase p, q, b, d, g, y. Direct links are `#flash-cards/trace/numbers` and `#flash-cards/trace/letters`. Children draw with touch, pen, or mouse over or beside a light dotted guide. Ink is not snapped or graded. They can hide the guide, undo a stroke, clear the board, choose any shape, and hear its existing UK recording. The selected shape is remembered for this browser session; drawings are cleared when changing shape and are never uploaded. The guide paths live in `src/traceData.ts` and the drawing surface in `src/Trace.tsx`.

`#flash-cards/spot` offers “Spot the wrong one”: find one mirrored shape among correctly facing copies. `#flash-cards/spot-correct` offers “Spot the correct one”: find one correctly facing shape among mirrored copies. Both have `/letters` and `/numbers` direct links, a **Standard** fixed 5×5 grid, and a **Growing** difficulty. Growing starts at 5×5; each correct answer adds a row and column up to 10×10, and each wrong tap removes a row and column down to 5×5. Wrong taps keep the current card, move the answer, and allow an immediate retry. Correct taps give spoken and written feedback and advance automatically after two seconds. Larger grids scroll within the game on small screens, keeping tiles at least 44px wide and tall. There is no timer or score.

Every tile otherwise has the same typography and styling, using the same sans-serif font as the footer. Cards reshuffle after each round. Each game, letter/number set, and difficulty remembers its own progress for the browser session; switching difficulty resumes that set’s saved card and grid size. Refreshing keeps the selected difficulty, card and size but moves the answer. Existing spotting sessions migrate to Standard. Practice still works when session storage is unavailable. The games omit lowercase i, l, m, o, u, v, w, x and the number 8 because their mirror forms can be indistinguishable in that font; they remain in the ordinary decks. Bundled Andika literacy type remains in Learn, Read, the ordinary Flash Cards, and Trace. Its SIL Open Font License is in `public/fonts/OFL.txt`.

To regenerate the number WAV files with the Piper voice described below, run `python scripts/generate-audio.py --model en_GB-cori-medium.onnx --numbers`. Daily puzzle bots must leave the decks, their audio, and this section alone.

## Read story

`#read` shows two books. The original four-page bug book opens at `#read/bug-in-my-car`; its manifest remains in `public/read/story.json`. The five-page sausage roll book opens at `#read/sausage-roll`, with its own manifest and new reusable artwork. The roll speaks to Cbear and hops into a puddle; the child reads short sound-focused lines while the pictures carry the harder nouns. Each printed sound button plays a bundled clip. Letter teams such as `ar`, `ee`, `ow`, and `sh` stay together, and `I`, `Hi`, `by`, and `my` use the /aɪ/ sound where printed. A separate button narrates each complete line. Each book remembers its own page only in browser session storage, with no Read points or account.

To regenerate the original book's audio with the Piper voice described below, run `python scripts/generate-audio.py --model en_GB-cori-medium.onnx --read`. Use `--read-story sausage-roll` to regenerate only the five new line recordings. Daily puzzle bots must leave both books, their artwork, and their audio alone.

```json
{
  "id": "2026-10-06-town-square",
  "title": "The town square",
  "image": "scenes/2026-10-06-town-square.jpg",
  "alt": "Describe the complete scene and mention Cbear's navy scarf.",
  "bear": { "x": 0.40, "y": 0.55, "w": 0.04, "h": 0.08 },
  "finds": [
    { "id": "dog", "label": "Dog", "spoken": "Find the dog.", "audio": "audio/finds/2026-10-06-town-square-dog.wav", "box": { "x": 0.10, "y": 0.70, "w": 0.07, "h": 0.10 } },
    { "id": "bus", "label": "Bus", "spoken": "Find the bus.", "audio": "audio/finds/2026-10-06-town-square-bus.wav", "box": { "x": 0.75, "y": 0.20, "w": 0.10, "h": 0.08 } },
    { "id": "hat", "label": "Hat", "spoken": "Find the hat.", "audio": "audio/finds/2026-10-06-town-square-hat.wav", "box": { "x": 0.22, "y": 0.35, "w": 0.04, "h": 0.04 } },
    { "id": "bike", "label": "Bike", "spoken": "Find the bike.", "audio": "audio/finds/2026-10-06-town-square-bike.wav", "box": { "x": 0.62, "y": 0.72, "w": 0.09, "h": 0.12 } }
  ],
  "clues": {
    "sounds": { "text": "Short printed clue.", "spoken": "The complete spoken clue.", "focus": "s", "audio": "audio/clues/2026-10-06-town-square-sounds.wav" },
    "words": { "text": "Short printed clue.", "spoken": "The complete spoken clue.", "focus": "sun", "audio": "audio/clues/2026-10-06-town-square-words.wav" },
    "digraphs": { "text": "Short printed clue.", "spoken": "The complete spoken clue.", "focus": "shop", "audio": "audio/clues/2026-10-06-town-square-digraphs.wav" }
  },
  "hint": "A gentle location hint for a child who gets stuck."
}
```

`bear` and each `finds[].box` are tight bounding rectangles in **fractions of the full image**: `x` and `y` are the left and top edges, and `w` and `h` are width and height. All values must be between 0 and 1, with each rectangle wholly inside the image and no rectangles overlapping. Inspect the final image at full size and test taps on every object on phone and desktop; valid coordinates alone do not prove they match the artwork. The second optional hint highlights Cbear's quadrant automatically. The sample coordinates above illustrate the format; measure new coordinates from the new final image.

The three clue stages must all refer to a visible part of the same scene. `sounds` points out a sound in a familiar word; `words` invites sounding out a short word; `digraphs` highlights a two-letter sound. Keep their language gentle and accurate. Each finding-item label must name a distinct visible object. The `spoken` fields generate bundled audio. The site can use browser speech as a fallback, but every audio file is required so voice works on browsers without speech synthesis.

## Generate clue audio

The included `scripts/generate-audio.py` makes the UK narration used by the first three scenes. It uses the [Piper `en_GB-cori-medium` voice](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/cori/medium/MODEL_CARD), trained on public-domain LibriVox recordings. The model is a build-time tool; do not commit its roughly 61 MB ONNX file.

```sh
python -m pip install piper-tts
curl -L -o en_GB-cori-medium.onnx https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/cori/medium/en_GB-cori-medium.onnx
curl -L -o en_GB-cori-medium.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/cori/medium/en_GB-cori-medium.onnx.json
python scripts/generate-audio.py --model en_GB-cori-medium.onnx --manifest public/puzzles/current.json
```

The phoneme recordings in `public/audio/*.m4a` come from [Buzzphonics](https://github.com/hellodeborahuk/buzzphonics), which publishes its sounds under the MIT licence. Its notice is included in `THIRD_PARTY_LICENSE.txt`. The sound library follows the [Reception Phase 2–3 inventory](https://www.gov.uk/government/publications/letters-and-sounds); it is a listening reference alongside the guided cards. Check every new grapheme's audio and pronunciation before adding it to a lesson.

## For the daily bot

Give the bot [`BOT_PROMPT.md`](BOT_PROMPT.md). It restricts daily changes to puzzle data and new assets, and defines the publishing checks. If the bot misses a day, the last published puzzle remains playable; there is no server-side scheduler in this repository.
