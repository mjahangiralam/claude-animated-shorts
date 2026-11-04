# Boston Molasses Flood — first Mac render

This branch adds a **runnable 60-second Remotion pilot**, designed for macOS Apple Silicon. It is an original illustrated 2.5D animation with animated streets, a storage tank, cartoon people, and a procedural molasses wave. It is a first preview, not the final 3D production.

## Requirements

- macOS 15 or newer (you have 27.2)
- Node.js / npm (you have Node 22)
- FFmpeg (you have FFmpeg 8.1)
- At least 30 GiB of free storage recommended for preview and render
- Internet access on first npm install and browser download

## Get this branch on your Mac

For a fresh copy:

```bash
cd "$HOME/Documents/GitHub"
git clone --branch feature/boston-molasses-short https://github.com/mjahangiralam/claude-animated-shorts.git AnimatedShorts-Mac
cd AnimatedShorts-Mac
npm install
```

Do not run `git clean` or `git reset` in your existing CanadianSpellingBee repository. This is an unrelated new folder.

## Preview interactively

```bash
npm run studio
```

Remotion Studio opens in your browser. Select `BostonMolasses`. You can scrub through 60 seconds and inspect the frames.

## Render a low-resolution pilot with Mac narration

```bash
bash scripts/render-mac.sh preview
```

Output: `out/boston-preview-with-voice.mp4` (540 × 960, 30 fps).

## Render full HD after approving the pilot

```bash
bash scripts/render-mac.sh full
```

Output: `out/boston-final.mp4` (1080 × 1920, 30 fps).

The script generates narration using the built-in macOS Samantha voice, then adds it to the video with FFmpeg. No Claude, API key, or paid TTS service is required. The narration's exact pacing and audio quality need a review before final publication.

## Current limitations

- This first pilot uses SVG-based depth and character cards, not a fully rigged Three.js world.
- The narration is a system voice and the exact word-to-frame synchronization is pending.
- Music and authored sound effects are not yet in this pilot.
- It does **not** ship or redistribute the repository's reference frames.
- The serious historical human toll should be depicted respectfully.

## Sources

- https://www.boston.gov/news/100-years-ago-today-molasses-crashes-through-bostons-north-end
- https://www.sec.state.ma.us/divisions/state-house-tours/did-you-know/Molasses-Flood.htm

## Next work

1. Inspect rendered pilot for layout, timing, and completeness.
2. Improve foreground character motion and 3D camera/parallax.
3. Replace the system narration with an approved voice if desired.
4. Add original music, SFX, and per-shot QA.
