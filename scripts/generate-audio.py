"""Generate bundled UK narration with the open Piper cori voice.

Setup (outside the deployed site):
  python -m pip install piper-tts
  python scripts/generate-audio.py --model /path/to/en_GB-cori-medium.onnx \
      --manifest public/puzzles/current.json --core
"""

import argparse
import json
import re
import wave
from pathlib import Path

import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig


PROJECT = Path(__file__).resolve().parents[1]
PUBLIC = PROJECT / "public"
WORDS = [
    "pin", "pan", "pit", "sat", "sit", "sap", "tap", "tan", "tip",
    "nap", "nip", "mat", "man", "map", "sad", "ship", "chip",
    "shin", "chat", "that", "chap", "thin", "than", "sing", "sang",
    "ding", "mash", "math", "dash", "path", "pat",
]


def generate(voice: PiperVoice, relative_path: str, text: str) -> None:
    if not re.fullmatch(r"audio/[a-z0-9/-]+\.wav", relative_path):
        raise ValueError(f"Unsafe audio path: {relative_path}")
    output = PUBLIC / relative_path
    output.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output), "wb") as wav:
        voice.synthesize_wav(text, wav, syn_config=SynthesisConfig(length_scale=1.12))
    print(f"Created {relative_path}")


def generate_article(voice: PiperVoice) -> None:
    """Use the unstressed UK article sound from 'a bug', not the letter name."""
    phonemes = voice.phonemize("a bug")[0]
    article = phonemes[0]
    if article != "ɐ":
        raise ValueError(f"Unexpected article phoneme: {article}")
    samples = voice.phoneme_ids_to_audio(
        voice.phonemes_to_ids([article]), SynthesisConfig(length_scale=1.12)
    )
    samples = np.asarray(samples, dtype=np.float32)
    peak = float(np.max(np.abs(samples)))
    if peak < 1e-8:
        raise ValueError("Article audio is empty")
    output = PUBLIC / "audio/read/a-article.wav"
    output.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(voice.config.sample_rate)
        wav.writeframes((np.clip(samples / peak, -1, 1) * 32767).astype(np.int16).tobytes())
    print("Created audio/read/a-article.wav")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="Path to en_GB-cori-medium.onnx")
    parser.add_argument("--manifest", help="Puzzle manifest to narrate")
    parser.add_argument("--core", action="store_true", help="Generate Learn word clips and success message")
    parser.add_argument("--read", action="store_true", help="Generate the bundled Read story narration")
    args = parser.parse_args()
    voice = PiperVoice.load(args.model)

    if args.core:
        for word in WORDS:
            path = f"audio/words/{word}.wav"
            if not (PUBLIC / path).exists():
                generate(voice, path, word)
        if not (PUBLIC / "audio/found.wav").exists():
            generate(voice, "audio/found.wav", "You found Cbear! Brilliant looking and reading!")

    if args.read:
        story = json.loads((PUBLIC / "read/story.json").read_text())
        generate_article(voice)
        for index, page in enumerate(story["pages"], start=1):
            line = " ".join(page["words"]) + page["punctuation"]
            generate(voice, page["audio"], line)

    if args.manifest:
        puzzle = json.loads(Path(args.manifest).read_text())
        for stage in ("sounds", "words", "digraphs"):
            clue = puzzle["clues"][stage]
            generate(voice, clue["audio"], clue["spoken"])
        for item in puzzle.get("finds", []):
            generate(voice, item["audio"], item["spoken"])


if __name__ == "__main__":
    main()
