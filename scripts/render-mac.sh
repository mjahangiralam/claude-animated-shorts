#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"
MODE="preview"
if [ "$#" -gt 0 ]; then MODE="$1"; fi
mkdir -p out

# Reinstall when the upgraded Three.js renderer was not present in an earlier checkout.
if [ ! -d node_modules/@remotion/three ] || [ ! -d node_modules/@react-three/postprocessing ]; then
  npm install
fi

case "$MODE" in
  preview)
    VIDEO="out/boston-preview.mp4"
    FINAL="out/boston-preview-with-voice.mp4"
    npm run preview
    ;;
  full)
    VIDEO="out/boston-silent.mp4"
    FINAL="out/boston-final.mp4"
    npm run render
    ;;
  *)
    echo "Usage: bash scripts/render-mac.sh [preview|full]"
    exit 2
    ;;
esac

PYTHON_BIN="python3"
if [ -x .venv/bin/python ]; then PYTHON_BIN=".venv/bin/python"; fi
"$PYTHON_BIN" scripts/build-voice.py
"$PYTHON_BIN" scripts/soundtrack.py

# The voice is precisely segmented onto the 30-fps picture timeline.
# Original music and effects are independently ducked under narration.
ffmpeg -hide_banner -loglevel error -y \
  -i "$VIDEO" \
  -i out/boston-voice.wav \
  -i out/boston-music.wav \
  -i out/boston-sfx.wav \
  -filter_complex "[1:a]aresample=48000,volume=1.0[v];[2:a]aresample=48000,volume=0.65[m];[3:a]aresample=48000,volume=0.72[s];[v][m][s]amix=inputs=3:duration=first:normalize=0,acompressor=threshold=0.10:ratio=2.5:attack=8:release=180,loudnorm=I=-14:TP=-1.2:LRA=7,atrim=0:60[mix]" \
  -map 0:v:0 -map "[mix]" \
  -c:v copy -c:a aac -b:a 192k -t 60 "$FINAL"

echo
echo "Rendered upgraded 3D short:"
echo "$REPO_DIR/$FINAL"
echo "Inspect the audio sync, shots, and animation before publishing."
