#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
SOURCE="out/boston-preview-with-voice.mp4"
if [ "$#" -gt 0 ]; then SOURCE="$1"; fi
if [ ! -f "$SOURCE" ]; then
  echo "First render preview: bash scripts/render-mac.sh preview"
  exit 1
fi
mkdir -p out
# Nine representative story beats. Upload this JPG for side-by-side style review.
ffmpeg -hide_banner -loglevel error -y -i "$SOURCE" \
  -vf "select='eq(n\,22)+eq(n\,190)+eq(n\,345)+eq(n\,455)+eq(n\,722)+eq(n\,865)+eq(n\,1070)+eq(n\,1530)+eq(n\,1720)',scale=270:480,tile=3x3:padding=10:margin=10:color=0x28394a" \
  -vsync vfr -frames:v 1 out/boston-3d-contact-sheet.jpg
echo "Contact sheet: out/boston-3d-contact-sheet.jpg"
