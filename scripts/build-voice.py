#!/usr/bin/env python3
"""Narrate and align every short scene. Neural edge-tts if available; macOS say fallback.
All outputs stay in this project's out/ folder. Exact audio timing uses FFmpeg.
"""
from __future__ import annotations
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT / "out"
OUT.mkdir(exist_ok=True)
SEGMENTS=ROOT / "shorts/boston-molasses/voice_segments.txt"
NEURAL=importlib.util.find_spec("edge_tts") is not None
VOICE_FILE=os.environ.get("SHORT_VOICE_FILE","").strip()

def run(args):
    subprocess.run([str(x) for x in args],check=True,stdout=subprocess.DEVNULL)

def seconds(path):
    p=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
                      "-of","default=noprint_wrappers=1:nokey=1",str(path)],
                     capture_output=True,text=True,check=True)
    return float(p.stdout.strip())

if VOICE_FILE:
    voice=Path(VOICE_FILE).expanduser()
    if not voice.is_file():
        raise SystemExit("SHORT_VOICE_FILE does not exist: " + str(voice))
    run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",voice,
         "-af","apad=whole_dur=60,atrim=0:60","-ar","48000","-ac","2",OUT/"boston-voice.wav"])
    print("Using supplied voice:",voice)
    sys.exit(0)

lines=[v.strip() for v in SEGMENTS.read_text().splitlines() if v.strip() and not v.startswith("#")]
if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
    raise SystemExit("FFmpeg and FFprobe are required.")
use_neural=NEURAL and os.environ.get("SHORT_TTS","neural")!="mac"
if not use_neural and not shutil.which("say"):
    raise SystemExit("Install edge-tts (python3 -m pip install edge-tts) or run on macOS with say.")
if use_neural: print("Narrator: online neural en-US-AndrewNeural")
else: print("Narrator: macOS system voice (install edge-tts for improved natural speech)")

audio=[]
last=0
for i,line in enumerate(lines):
    start,end,text=line.split("|",2)
    a,b=int(start),int(end)
    if a!=last or b<=a: raise SystemExit("Voice segment frames are not contiguous.")
    last=b
    target=(b-a)/30
    src=OUT/("narr-%02d.%s"%(i,"mp3" if use_neural else "aiff"))
    if use_neural:
        command=[sys.executable,"-m","edge_tts","--voice","en-US-AndrewNeural",
                 "--rate=+10%","--text",text,"--write-media",src]
        try:run(command)
        except subprocess.CalledProcessError:
            if not shutil.which("say"): raise
            print("Neural speech unavailable, falling back to macOS voice.")
            use_neural=False
            src=OUT/("narr-%02d.aiff"%i)
            run(["say","-v","Samantha","-r","210","-o",src,text])
    else:run(["say","-v","Samantha","-r","210","-o",src,text])
    duration=seconds(src)
    if duration<=.01:raise SystemExit("Empty synthesized speech: "+str(src))
    tempo=max(.5,min(3.0,duration/target))
    dst=OUT/("narr-fit-%02d.wav"%i)
    run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",src,
         "-af","atempo=%.6f,apad=whole_dur=%.6f,atrim=0:%.6f"%(tempo,target,target),
         "-ar","48000","-ac","2",dst])
    audio.append(dst)
if last!=1800:raise SystemExit("Voice segments must total 1800 frames.")
listing=OUT/"narr-files.txt"
listing.write_text("".join("file '"+str(p).replace("'","'\\''")+"'\n" for p in audio))
run(["ffmpeg","-hide_banner","-loglevel","error","-y","-safe","0",
     "-f","concat","-i",listing,"-af","apad=whole_dur=60,atrim=0:60",
     "-ar","48000","-ac","2",OUT/"boston-voice.wav"])
print("Voice aligned to all eleven scenes:",OUT/"boston-voice.wav")
