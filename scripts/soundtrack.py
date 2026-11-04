#!/usr/bin/env python3
"""Original deterministic 60 s dramatic score + foley synthesis, Python stdlib only.
No borrowed music, sampled recordings, royalty/licensing questions or network access.
"""
from __future__ import annotations
import math
import random
import wave
from array import array
from pathlib import Path

SR = 24000
N = 60 * SR
PI = math.pi
R = random.Random(1919)
MUSIC = array("f", [0]) * N
SFX = array("f", [0]) * N

def add_note(buf, start, dur, frequency, amplitude, attack=.16, release=.5, shimmer=False):
    a = int(start * SR)
    length = min(int(dur * SR), N - a)
    for k in range(max(0, length)):
        t = k / SR
        env = min(1, t / max(.001, attack), (dur - t) / max(.001, release))
        if env <= 0:
            continue
        vibrato = 1 + .0024 * math.sin(2 * PI * .7 * t)
        phase = 2 * PI * frequency * vibrato * t
        value = math.sin(phase) + .22 * math.sin(2 * phase + .2)
        if shimmer:
            value += .15 * math.sin(3 * phase + .8)
        buf[a + k] += value * amplitude * env * (1 + .06 * math.sin(2 * PI * 1.75 * t))

def noise(buf, start, dur, amplitude, cutoff=.94, rising=False):
    a = int(start * SR)
    length = min(N - a, int(dur * SR))
    lp = 0.0
    for k in range(max(0, length)):
        t = k / SR
        # One-pole low pass, cinematic rumble rather than full-band digital hiss.
        lp = cutoff * lp + (1 - cutoff) * R.uniform(-1, 1)
        u = min(1.0, t / dur)
        env = math.sin(PI * u) ** .65
        if rising:
            env *= .22 + .78 * u
        buf[a + k] += lp * amplitude * env

# 15 four-second minor-key atmospheric chords, subtle ostinato and final resolution.
chords = [
    (50,53,57),(48,53,57),(46,53,58),(48,52,55),
    (50,53,57),(48,53,57),(46,53,58),(43,50,55),
    (43,50,55),(45,52,57),(50,53,57),(46,53,58),
    (48,53,57),(43,50,55),(50,53,57)
]
for bar, chord in enumerate(chords):
    t = bar * 4
    energy = .6 if 48 <= t < 56 else (1.25 if 20 <= t < 40 else 1)
    for j, midi in enumerate(chord):
        freq = 440 * 2 ** ((midi - 69) / 12)
        add_note(MUSIC, t, 4.3, freq, (.022 if j == 0 else .012) * energy, .42, .65, j == 2)
    if t < 48:
        for k in range(4):
            add_note(MUSIC, t + k, .5, 55 * 2 ** (chord[0] % 3 / 12), .012 * energy, .02, .24)
# Uneasy ticking: pulses grow before the rupture.
for k in range(20, 88):
    t = k * .31
    if t >= 25:
        break
    add_note(MUSIC, t, .19, 92, .015 * max(.2,(t - 8) / 19), .004, .17)
# Tail is darker, softer and more reflective.
for t, freq in [(49,440),(51.8,523.25),(55.2,392),(58.1,349.23)]:
    add_note(MUSIC, t, 1.6, freq, .015, .04, 1.2, True)

# Hand-authored effects tied to the narrative shots.
noise(SFX,0,3.8,.58,.971,True)             # immediate surge hook
noise(SFX,3.9,1.25,.13,.94)               # spoon and viscous pour
add_note(SFX,4.65,.4,134,.035,.003,.22)
for t in [13.25,14.15,15.1,16.4,17.3,19.1,20.05]:
    add_note(SFX,t,.22,340,.026,.003,.2)  # drips
noise(SFX,18.4,2.1,.23,.989,True)         # steel under strain
for freq, amp in [(97,.15),(144,.11),(313,.07),(607,.034)]:
    add_note(SFX,22.7,2.2,freq,amp,.006,2.0,True)
noise(SFX,22.8,3,.67,.948,True)           # fracture / rupture
noise(SFX,26.45,10.8,.59,.957,True)       # immense rushing liquid
for t in [28.0,29.25,30.8,32.55,35.2,36.3,37.15]:
    noise(SFX,t,.9,.42,.936)              # debris and impact
    add_note(SFX,t,.42,81+25*R.random(),.052,.006,.34)
noise(SFX,34.5,2.7,.7,.944,True)          # firehouse impact
for t in [40.6,44.1,47.0]:
    add_note(SFX,t,.34,120,.035,.01,.28) # analogy beats
noise(SFX,49.4,5.5,.2,.99)
add_note(SFX,55.35,2.1,420,.027,.02,1.7,True)

def write(path, buf):
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = array("h")
    for x in buf:
        # Conservative pre-mix peak; master limiting happens in ffmpeg.
        v = max(-.9, min(.9, x))
        pcm.append(int(v * 32767))
        pcm.append(int(v * 32767))
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(path)

out=Path(__file__).resolve().parent.parent / "out"
write(out/"boston-music.wav", MUSIC)
write(out/"boston-sfx.wav", SFX)
