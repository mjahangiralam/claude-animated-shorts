# Boston Molasses Flood — cinematic 3D upgrade (macOS)

The **BostonMolasses** composition is now a procedurally modeled Three.js / Remotion short. It replaces the earlier 2.5D SVG pilot while preserving the previous **BostonMolasses2DPilot** in Studio.

Features: a 1919-inspired painted town, modeled buildings, shop fronts, elevated railway, three-dimensional riveted tank, separate tearing wall sections, mesh-based moving flood with ripples and highlights, cast/ground shadows, original cartoon character drawings, animated camera, ink outlines, background depth blur, filmic colour, original music and effects, and scene-aligned narration.

## On your Apple Silicon Mac

Your machine has Node 22, npm and FFmpeg 8.1 installed.

In the folder you cloned earlier:

~~~bash
cd "$HOME/Documents/GitHub/AnimatedShorts-Mac"
git status
git pull --ff-only origin feature/boston-molasses-short
npm install
npm test
npm run typecheck
npm run studio
~~~

Important: if git status shows modifications you want to keep, **do not force reset or clean**. Share the output so we can work around your changes.

In Remotion Studio select **BostonMolasses**, not **BostonMolasses2DPilot**. Check frames at approximately 0, 200, 450, 720, 850, 1080, 1320, 1530 and 1720.

## Better (neural) narration, optional but recommended

The upgraded render uses an online neural voice automatically if edge-tts is installed. The service requires Internet access; availability and voice choice can vary. No API key is needed for the community package. Without it, the pipeline falls back to macOS Samantha.

Install it in an isolated environment (no changes to system Python):

~~~bash
python3 -m venv .venv
.venv/bin/python -m pip install edge-tts
~~~

The selected default voice is en-US-AndrewNeural. It generates individual clips paced to the shot schedule. For the original macOS voice instead:

~~~bash
SHORT_TTS=mac bash scripts/render-mac.sh preview
~~~

To use your own recording, set SHORT_VOICE_FILE to its path; the script will pad/trim it to 60 seconds.

## Render

After stopping Remotion Studio with Ctrl+C:

~~~bash
bash scripts/render-mac.sh preview
~~~

The 540 × 960 preview will be saved at out/boston-preview-with-voice.mp4. It includes narration, synthesized original cinematic music and sound effects.

Generate a contact sheet to compare the visuals with the example frames and upload it here:

~~~bash
bash scripts/preview-frames.sh
~~~

This produces out/boston-3d-contact-sheet.jpg with nine representative frames.

After inspecting the preview:

~~~bash
bash scripts/render-mac.sh full
~~~

The 1080 × 1920 output is out/boston-final.mp4.

If the render runs out of disk, use df -h . first; do not delete files without inspecting the exact targets. Our renderer uses procedural textures and ships no external 1.3 GB model pack.

## Limitations / quality control

- **The 3D code is committed but has not yet completed a verified Mac video render.** Run type checking and the preview before calling it finished.
- Characters are camera-facing painted 2D figures inside a 3D world, matching the reference's 2D-in-3D approach; they are not skeletal 3D humanoids.
- The molasses surface is a procedural animated mesh, not a fluid simulation.
- Review the half-resolution preview for framing, motion and audio before a costly full render.
- Example reference frames in the fork are for private style study and are not reproduced.
- The human toll is treated seriously; there are no graphic injuries or slapstick gags.

The MIT-licensed bridge example supplies the toon, ink, lensblur and grade modules. The Boston town, tank, liquid, scenes, narration, and score are original work.

## Factual sources

- https://www.boston.gov/news/100-years-ago-today-molasses-crashes-through-bostons-north-end
- https://www.sec.state.ma.us/divisions/state-house-tours/did-you-know/Molasses-Flood.htm
