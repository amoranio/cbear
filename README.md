# Cbear — Learn & Play

A small, responsive reading site for early readers. **Learn** teaches UK letter sounds, blending and common digraphs through short cards and offers a Phase 2–3 sound library. Children can hear every answer before checking it. **Play** pairs a reading clue with a detailed search for Cbear and four other objects. The site is static and uses no accounts or tracking. Points and progress last only for the browser session.

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
