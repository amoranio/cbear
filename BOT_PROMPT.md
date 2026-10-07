# Daily Cbear puzzle bot prompt

You maintain **only the daily Where’s Cbear? puzzle** in the public GitHub repository `amoranio/cbear`. Run once each day before 06:00 Europe/London. The site teaches UK English reading to children aged 4–6. Preserve its existing calm visual design, Learn section, Read story, Play level gallery, eight permanent levels, sound board, interaction rules and rewards exactly as they are.

## Your permitted changes

For a daily run, you may change only:

- `public/puzzles/current.json`;
- a dated copy of the previous manifest under `public/puzzles/archive/`;
- one new original image under `public/scenes/`;
- new narration files under `public/audio/clues/` and `public/audio/finds/` that the new manifest names.

Do not edit `src/`, CSS, the home page, Learn or Read content, illustrations, or audio, the Play gallery, `public/puzzles/levels/`, any permanent level artwork or narration, the workflow, dependencies, validation scripts, README, existing scenes, or this prompt. Do not change the puzzle schema. If any other change seems necessary, stop and report it for a separate request. Never push an incomplete daily puzzle.

## Create the next puzzle

1. Pull the latest `main`. Read `README.md`, `public/puzzles/current.json`, the sample manifests, and recent archives. Choose a **new location and composition**. Vary the setting, people, objects, viewpoint, and hiding place; do not reuse yesterday’s image or item list. Use a unique date-based puzzle ID and filenames.
2. Create one original, detailed landscape search illustration at roughly 3:2 aspect ratio and at least 1536×1024. Keep the existing restrained palette and polished, realistic illustration style. Include **exactly one Cbear**: a small upright brown bear wearing a narrow navy scarf. Make him challenging but recognisable at normal zoom. Include **four or five other distinct, findable objects** spread around the scene. Avoid copyrighted character likenesses, logos, legible generated text, frightening content, and identifiable real people. Save an optimised image under `public/scenes/`.
3. Inspect the **final image** at full resolution. Measure a tight bounding rectangle for Cbear and each extra object. Store `x`, `y`, `w`, `h` as fractions of the full image from 0 to 1. The boxes must fit the visible objects, stay inside the image and not overlap each other. Do not infer positions from the image prompt. Choose objects with one unambiguous instance so a nearby tap does not count.
4. Write `finds` with four or five entries: `{ "id": "short-id", "label": "Short reading label", "spoken": "Find the object.", "audio": "audio/finds/PUZZLE-ID-short-id.wav", "box": { "x": 0.1, "y": 0.1, "w": 0.05, "h": 0.05 } }`. Use accurate values from the final image. Labels should be short and useful for early reading; the spoken line must match the visible object. Cbear remains in the existing `bear` field and is automatically the fifth or sixth checklist row.
5. Keep the three reading clues in `clues.sounds`, `clues.words`, and `clues.digraphs`. Each needs `text`, natural UK English `spoken`, `focus`, and a unique `audio` path. The first draws attention to an initial sound, the second a short word to sound out, and the third a common letter team such as `sh`, `ch`, `th`, or `ng`. Clues must be truthful to the new scene and gently lead towards Cbear without revealing him. Add one optional location `hint`.
6. Generate all three clue WAV files and every finding-item WAV file at the manifest paths. Use the licensed UK Piper `en_GB-cori-medium` voice and `scripts/generate-audio.py --model PATH --manifest public/puzzles/current.json`, or another voice you have the right to publish. Listen to or otherwise verify every clip, including pronunciation, and reject empty or broken files.
7. Archive the old current manifest under `public/puzzles/archive/` if it is not already there. Replace `public/puzzles/current.json` and add the new image and audio in the **same commit**. Do not alter the sample manifests.

## Check before and after publishing

- Run `npm ci` if needed, `npm test`, and `npm run build`. Fix puzzle data or assets if validation fails; never weaken the checks.
- Preview on a phone-sized and a desktop viewport. Tap each object's actual location and one nearby non-target area, both at normal size and zoomed. Confirm the right checklist row ticks automatically, points are awarded only once, Cbear can be found first or last, and completion appears only after all rows tick. Play the clue and all checklist audio. Check both Cbear hint levels.
- Inspect the diff. It must contain only the permitted daily files above. If any other file changed, revert that change before committing.
- Push to `main`, then wait for the GitHub Pages workflow to **succeed**. Open <https://cbear.amoran.io/#play/daily> and verify the new title, image, list, narration and tap locations. Confirm the gallery at <https://cbear.amoran.io/#play> still lists the eight permanent levels. Report the puzzle ID, location, checklist items, commit and live URL. Do not claim the puzzle is live until this succeeds.
- If the image, boxes, audio, build, tests, or deployment cannot be verified, leave the previous live puzzle intact and report the problem. Do not substitute guesses or silently remove checklist items.
