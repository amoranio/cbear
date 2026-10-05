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

from piper import PiperVoice
from piper.config import SynthesisConfig


PROJECT = Path(__file__).resolve().parents[1]
PUBLIC = PROJECT / "public"
WORDS = ["pin", "sat", "tap", "nap", "mat", "sad", "ship", "chat", "thin", "sing", "mash", "path"]


def generate(voice: PiperVoice, relative_path: str, text: str) -> None:
    if not re.fullmatch(r"audio/[a-z0-9/-]+\.wav", relative_path):
        raise ValueError(f"Unsafe audio path: {relative_path}")
    output = PUBLIC / relative_path
    output.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output), "wb") as wav:
        voice.synthesize_wav(text, wav, syn_config=SynthesisConfig(length_scale=1.12))
    print(f"Created {relative_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="Path to en_GB-cori-medium.onnx")
    parser.add_argument("--manifest", help="Puzzle manifest to narrate")
    parser.add_argument("--core", action="store_true", help="Generate Learn word clips and success message")
    args = parser.parse_args()
    voice = PiperVoice.load(args.model)

    if args.core:
        for word in WORDS:
            generate(voice, f"audio/words/{word}.wav", word)
        generate(voice, "audio/found.wav", "You found Cbear! Brilliant looking and reading!")

    if args.manifest:
        puzzle = json.loads(Path(args.manifest).read_text())
        for stage in ("sounds", "words", "digraphs"):
            clue = puzzle["clues"][stage]
            generate(voice, clue["audio"], clue["spoken"])


if __name__ == "__main__":
    main()
