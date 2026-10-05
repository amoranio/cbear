# Cbear — Learn & Play

A small, responsive reading site for early readers. **Learn** teaches UK letter sounds, blending and common digraphs through short cards. **Play** pairs a reading clue with a detailed search for Cbear. The site is static and uses no accounts or tracking. Points and the chosen stage last only for the browser session.

## Run locally

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/`. Run `npm run build` before publishing; it checks TypeScript, builds the Pages bundle and validates the puzzle manifests.

## Hosting

The workflow in `.github/workflows/deploy.yml` builds and deploys on each push to `main`. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The public URL is <https://cbear.amoran.io/>. The Vite base path is `/` for this custom domain; change it if the hosting path changes.

## Daily puzzle contract

The live puzzle is `public/puzzles/current.json`. A daily update adds a new scene image in `public/scenes/`, adds three narrated clues in `public/audio/clues/`, and replaces `current.json` in one commit. The two `.sample.json` files demonstrate additional prepared scenes. Use a new ID and filenames for each puzzle so browser caches cannot show old artwork.

```json
{
  "id": "2026-10-06-town-square",
  "title": "The town square",
  "image": "scenes/2026-10-06-town-square.jpg",
  "alt": "Describe the complete scene and mention Cbear's navy scarf.",
  "bear": { "x": 0.40, "y": 0.55, "w": 0.04, "h": 0.08 },
  "clues": {
    "sounds": { "text": "Short printed clue.", "spoken": "The complete spoken clue.", "focus": "s", "audio": "audio/clues/2026-10-06-town-square-sounds.wav" },
    "words": { "text": "Short printed clue.", "spoken": "The complete spoken clue.", "focus": "sun", "audio": "audio/clues/2026-10-06-town-square-words.wav" },
    "digraphs": { "text": "Short printed clue.", "spoken": "The complete spoken clue.", "focus": "shop", "audio": "audio/clues/2026-10-06-town-square-digraphs.wav" }
  },
  "hint": "A gentle location hint for a child who gets stuck."
}
```

`bear` is the bear's tight bounding rectangle in **fractions of the full image**: `x` and `y` are the left and top edges, and `w` and `h` are width and height. All values must be between 0 and 1, with the rectangle wholly inside the image. Inspect the final image at full size and test a click on Cbear on both phone and desktop; a valid rectangle alone does not prove it matches the artwork. The second optional hint highlights the rectangle's quadrant automatically.

The three clue stages must all refer to a visible part of the same scene. `sounds` points out a sound in a familiar word; `words` invites sounding out a short word; `digraphs` highlights a two-letter sound. Keep their language gentle and accurate. The `spoken` field is used to generate the bundled audio. The site can use browser speech as a fallback, but each audio file is required so voice works on browsers without speech synthesis.

## Generate clue audio

The included `scripts/generate-audio.py` makes the UK narration used by the first three scenes. It uses the [Piper `en_GB-cori-medium` voice](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/cori/medium/MODEL_CARD), trained on public-domain LibriVox recordings. The model is a build-time tool; do not commit its roughly 61 MB ONNX file.

```sh
python -m pip install piper-tts
curl -L -o en_GB-cori-medium.onnx https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/cori/medium/en_GB-cori-medium.onnx
curl -L -o en_GB-cori-medium.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/cori/medium/en_GB-cori-medium.onnx.json
python scripts/generate-audio.py --model en_GB-cori-medium.onnx --manifest public/puzzles/current.json
```

The phoneme recordings in `public/audio/*.m4a` come from [Buzzphonics](https://github.com/hellodeborahuk/buzzphonics), which publishes its sounds under the MIT licence. Its notice is included in `THIRD_PARTY_LICENSE.txt`. Check every new grapheme's audio and pronunciation before adding it to a lesson.

## For the daily bot

Give the bot [`BOT_PROMPT.md`](BOT_PROMPT.md). It defines the daily publishing steps and quality checks. If the bot misses a day, the last published puzzle remains playable; there is no server-side scheduler in this repository.
