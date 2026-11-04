#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

MODE="${1:-preview}"
mkdir -p out

if [ ! -d node_modules ]; then
  npm install
fi

if [ "$MODE" = "preview" ]; then
  npm run preview
  VIDEO="out/boston-preview.mp4"
  FINAL="out/boston-preview-with-voice.mp4"
elif [ "$MODE" = "full" ]; then
  npm run render
  VIDEO="out/boston-silent.mp4"
  FINAL="out/boston-final.mp4"
else
  echo "Usage: bash scripts/render-mac.sh [preview|full]"
  exit 2
fi

# Built-in macOS voice; the scene pacing and narration are still a pilot.
say -v Samantha -r 195 -f shorts/boston-molasses/narration.txt -o out/boston-narration.aiff

ffmpeg -hide_banner -loglevel error -y \
  -i "$VIDEO" -i out/boston-narration.aiff \
  -filter_complex "[1:a]apad=whole_dur=60,atrim=duration=60[a]" \
  -map 0:v:0 -map "[a]" \
  -c:v copy -c:a aac -b:a 192k -t 60 "$FINAL"

echo "Rendered: $REPO_DIR/$FINAL"
