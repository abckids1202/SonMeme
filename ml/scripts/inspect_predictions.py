from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--split", choices=["train", "val"], default="val")
    parser.add_argument("--count", type=int, default=100)
    parser.add_argument("--input-dir")
    args = parser.parse_args()
    print("Prediction inspection scaffold is installed.")
    print("Run this after tiny/smoke training produces a useful checkpoint:")
    print(f"  checkpoint={args.checkpoint}")
    print(f"  split={args.split}")
    if args.input_dir:
        print(f"  unlabeled input dir={Path(args.input_dir)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
