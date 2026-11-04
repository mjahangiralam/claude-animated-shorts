#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out

# If given an existing video, preserve the original extraction workflow.
if [ "$#" -gt 0 ]; then
  SOURCE="$1"
  if [ ! -f "$SOURCE" ]; then
    echo "Video not found: $SOURCE" >&2
    exit 1
  fi
  ffmpeg -hide_banner -loglevel error -y -i "$SOURCE" \
    -vf "select='eq(n\\,22)+eq(n\\,190)+eq(n\\,345)+eq(n\\,455)+eq(n\\,722)+eq(n\\,865)+eq(n\\,1070)+eq(n\\,1530)+eq(n\\,1720)',scale=270:480,tile=3x3:padding=10:margin=10:color=0x28394a" \
    -vsync vfr -frames:v 1 out/boston-3d-contact-sheet.jpg
  echo "Contact sheet: out/boston-3d-contact-sheet.jpg"
  exit 0
fi

# Storyboard review: render just nine stills; no 1,800-frame video required.
# ANGLE is recommended for Remotion Three.js; one renderer avoids heavy parallel GPU load.
FRAMES=(22 190 345 455 722 865 1070 1530 1720)
for i in "${!FRAMES[@]}"; do
  frame="${FRAMES[$i]}"
  printf -v destination 'out/boston-story-%02d.png' "$((i + 1))"
  echo "Rendering storyboard frame $((i + 1))/9 (video frame $frame)"
  npx remotion still src/index.ts BostonMolasses "$destination" \
    --frame="$frame" --scale=0.5 --gl=angle --timeout=60000
done
ffmpeg -hide_banner -loglevel error -y \
  -framerate 1 -start_number 1 -i 'out/boston-story-%02d.png' \
  -vf "scale=270:480,tile=3x3:padding=10:margin=10:color=0x28394a" \
  -frames:v 1 out/boston-3d-contact-sheet.jpg
echo "Contact sheet: out/boston-3d-contact-sheet.jpg"
