import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

// Original illustrated 2.5D pilot. All motion is deterministic from the frame number.
// 1080 × 1920, 30 fps. No footage or third-party reference frames.
const W = 1080;
const H = 1920;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const progress = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
const wave = (f: number, speed: number) => Math.sin(f * speed);
const ease = (t: number) => t * t * (3 - 2 * t);

const Palette = () => (
  <defs>
    <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stopColor="#518fc8" />
      <stop offset=".7" stopColor="#b6d7e7" />
      <stop offset="1" stopColor="#f7d9ae" />
    </linearGradient>
    <linearGradient id="street" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stopColor="#c7aa8d" />
      <stop offset="1" stopColor="#6e5754" />
    </linearGradient>
    <linearGradient id="steel" x1="0" x2="1" y1=".15" y2=".85">
      <stop offset="0" stopColor="#394a59" />
      <stop offset=".35" stopColor="#718391" />
      <stop offset=".7" stopColor="#364451" />
      <stop offset="1" stopColor="#172330" />
    </linearGradient>
    <linearGradient id="molasses" x1="0" x2=".7" y1="0" y2="1">
      <stop offset="0" stopColor="#d88a42" />
      <stop offset=".18" stopColor="#85401f" />
      <stop offset=".55" stopColor="#58261b" />
      <stop offset="1" stopColor="#230e13" />
    </linearGradient>
    <linearGradient id="brick" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stopColor="#d68b67" />
      <stop offset="1" stopColor="#8f4c46" />
    </linearGradient>
    <radialGradient id="vignette" cx=".5" cy=".48" r=".8">
      <stop offset=".47" stopColor="#000" stopOpacity="0" />
      <stop offset="1" stopColor="#121019" stopOpacity=".42" />
    </radialGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="22" />
    </filter>
  </defs>
);

const Window = ({x, y, lit = false}: {x: number; y: number; lit?: boolean}) => (
  <g>
    <rect x={x - 5} y={y - 6} width="61" height="96" rx="3" fill="#533a3d" />
    <rect x={x} y={y} width="51" height="83" fill={lit ? '#e5bd88' : '#91b2c2'} />
    <path d={`M ${x + 25} ${y} v83 M${x} ${y + 42}h51`} stroke="#473a40" strokeWidth="6" />
    <path d={`M${x - 7} ${y + 87}h65`} stroke="#efc79f" strokeWidth="10" strokeLinecap="round" />
  </g>
);

const House = ({x, y, scale = 1, tone = '#b36f5d', frame = 0}: {x: number; y: number; scale?: number; tone?: string; frame?: number}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect x="0" y="0" width="270" height="930" fill="#412f39" opacity=".28" />
    <rect x="10" y="-10" width="260" height="930" fill={tone} stroke="#563b42" strokeWidth="8" />
    <path d="M-16 -12L142 -116L289 -12Z" fill="#6d4b4e" stroke="#49333e" strokeWidth="12" />
    <rect x="-15" y="-17" width="305" height="22" fill="#e9c1a0" />
    <rect x="37" y="-152" width="58" height="97" fill="#765554" stroke="#49333e" strokeWidth="7" />
    {[0, 1, 2, 3].map((i) => <Window key={i} x={45} y={58 + i * 195} lit={i === 1 && frame % 260 < 120}/>)}
    {[0, 1, 2, 3].map((i) => <Window key={i + 4} x={166} y={58 + i * 195}/>)}
    <path d="M10 180h260M10 377h260M10 572h260M10 769h260" stroke="#e5b294" strokeWidth="10" />
  </g>
);

const Town = ({frame, tank = true, dark = false}: {frame: number; tank?: boolean; dark?: boolean}) => {
  const t = frame / 30;
  return (
    <g>
      <rect width={W} height={H} fill="url(#sky)" />
      <circle cx="880" cy="266" r="145" fill="#ffe3ad" opacity=".75" />
      <g fill="#fff5e8" opacity=".68" transform={`translate(${wave(frame, .014) * 25} 0)`}>
        <ellipse cx="220" cy="310" rx="200" ry="36" />
        <ellipse cx="300" cy="290" rx="95" ry="60" />
        <ellipse cx="790" cy="500" rx="180" ry="34" />
      </g>
      <path d="M0 910L535 840L1080 910V1920H0Z" fill="#b8a5a0" />
      <path d="M518 850L590 850L1180 1920H-100Z" fill="url(#street)" />
      {Array.from({length: 18}, (_, i) => {
        const p = (i + 1) / 18;
        const y = 855 + 1120 * p * p;
        return <path key={i} d={`M${-120 + p * 160} ${y}Q540 ${y - 30 * p} ${1200 - p * 160} ${y}`} stroke="#8b7773" opacity=".45" strokeWidth={1 + 6 * p} fill="none"/>;
      })}
      <g opacity=".75">
        <House x={-105} y={620} scale={.8} tone="#aa6c5b" frame={frame}/>
        <House x={-110} y={1050} scale={1.32} tone="#cf9b7f" frame={frame}/>
        <House x={890} y={585} scale={.74} tone="#9e6061" frame={frame}/>
        <House x={780} y={1020} scale={1.28} tone="#d49b77" frame={frame}/>
      </g>
      <g stroke="#27323d" strokeWidth="18" fill="none" opacity=".9">
        <path d="M-100 480L1150 465" strokeWidth="38"/>
        <path d="M-100 545L1150 530" strokeWidth="15"/>
        {Array.from({length: 8}, (_, i) => <path key={i} d={`M${i * 160} 470L${i * 160 + 90} 545M${i * 160 + 90} 470L${i * 160} 545`} strokeWidth="10" />)}
      </g>
      {tank && <g transform="translate(595 410)">
        <ellipse cx="145" cy="65" rx="258" ry="66" fill="#657683" stroke="#1b2935" strokeWidth="20" />
        <rect x="-112" y="65" width="514" height="920" fill="url(#steel)" stroke="#23313b" strokeWidth="20" />
        <ellipse cx="145" cy="990" rx="256" ry="57" fill="#182633" />
        {Array.from({length: 7}, (_, i) => <g key={i}>
          <path d={`M-110 ${120 + i * 135}Q145 ${145 + i * 135} 402 ${120 + i * 135}`} stroke="#9c9c98" opacity=".48" strokeWidth="9" fill="none"/>
          {Array.from({length: 13}, (_, j) => <circle key={j} cx={-95 + 40 * j} cy={129 + i * 135} r="6" fill="#b9a796" opacity=".65"/>)}
        </g>)}
        <path d="M-117 70L-117 989" stroke="#1a2b35" strokeWidth="15" />
        <path d="M406 70L406 989" stroke="#17232b" strokeWidth="17" />
        <g fill="none" stroke="#222e39" strokeWidth="15">
          <path d="M-120 20L407 20M-120 20v-70M407 20v-70" />
          {Array.from({length: 10}, (_, i) => <path key={i} d={`M${-100 + i * 55} 20v-70`} strokeWidth="8" />)}
        </g>
      </g>}
      {dark && <rect width={W} height={H} fill="#241921" opacity=".22"/>}
      <path d="M0 0H1080V1920H0Z" fill="url(#vignette)" />
      <text x="45" y="1835" fill="#eddec7" opacity=".24" fontSize="25" fontFamily="Georgia">HISTORICAL RECONSTRUCTION • 1919</text>
    </g>
  );
};

const Person = ({x, y, scale = 1, face = 0, frame}: {x: number; y: number; scale?: number; face?: number; frame: number}) => {
  const bob = Math.sin(frame * .17 + face) * 6;
  return <g transform={`translate(${x} ${y + bob}) scale(${scale})`} stroke="#2a1d2b" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="0" cy="5" rx="62" ry="12" fill="#1d1a24" stroke="none" opacity=".23" filter="url(#shadow)" />
    <path d="M-29 -90L-39 -13M29 -90L41 -13" fill="none" />
    <path d="M-50 -125Q0 -165 50 -125L39 -80L-38 -80Z" fill="#7e584e"/>
    <path d="M-44 -125L-72 -83M44 -125L65 -93" fill="none"/>
    <path d="M-59 -214Q-76 -280 -18 -295Q52 -320 68 -253Q72 -210 39 -183Q4 -160 -41 -187Z" fill="#e8b998"/>
    <path d="M-76 -257Q-44 -334 22 -317Q70 -312 83 -269Q13 -288 -76 -257Z" fill="#6c4e42"/>
    <path d="M-77 -277Q5 -310 80 -270" fill="none"/>
    <circle cx="-18" cy="-246" r="6" fill="#251c2a" stroke="none" />
    <circle cx="35" cy="-248" r="6" fill="#251c2a" stroke="none" />
    <path d={face % 2 ? "M1 -211q16 -18 29 1" : "M5 -209q15 20 30 0"} strokeWidth="7" fill="none" />
  </g>;
};

const MolassesWave = ({frame, height = 1, offset = 0}: {frame: number; height?: number; offset?: number}) => {
  const shift = wave(frame, .095) * 20;
  const crest = 1180 - 420 * height + wave(frame, .12) * 23;
  const up = offset;
  return <g transform={`translate(${shift} ${up})`}>
    <path d={`M-250 1920L-220 ${crest + 145}Q10 ${crest - 240} 250 ${crest + 80}Q420 ${crest - 130} 570 ${crest + 45}Q780 ${crest - 190} 1160 ${crest + 30}L1320 1920Z`}
      fill="url(#molasses)" stroke="#2a1016" strokeWidth="19"/>
    <path d={`M-210 ${crest + 155}Q35 ${crest - 167} 260 ${crest + 102}Q429 ${crest - 97} 580 ${crest + 70}Q782 ${crest - 155} 1150 ${crest + 60}`}
      fill="none" stroke="#f5ad64" strokeWidth="24" strokeLinecap="round" opacity=".52"/>
    {Array.from({length: 17}, (_, i) => {
      const x = (i * 103 + frame * (3 + i % 3)) % 1400 - 160;
      const y = crest + 250 + (i * 137) % 550 + wave(frame + i, .13) * 35;
      return <ellipse key={i} cx={x} cy={y} rx={12 + i % 13} ry={4 + i % 7} fill="#f9b36e" opacity=".4"/>;
    })}
  </g>;
};

const Spoon = ({frame}: {frame: number}) => {
  const t = progress(frame, 195, 360);
  return <g>
    <rect width={W} height={H} fill="#edd5b7"/>
    <path d="M0 1270Q540 1150 1080 1270V1920H0Z" fill="#9e6b52"/>
    <g transform={`translate(${Math.sin(t * Math.PI) * 80} 0)`}>
      <path d="M200 660L750 1040" stroke="#c9cfd1" strokeWidth="75" strokeLinecap="round" />
      <ellipse cx="220" cy="670" rx="230" ry="134" transform="rotate(32 220 670)" fill="#b6b9bd" stroke="#647780" strokeWidth="18" />
      <ellipse cx="220" cy="680" rx="155" ry="86" transform="rotate(32 220 680)" fill="#57251a" />
      <path d={`M290 720Q395 ${840 + t * 260} 350 ${1000 + t * 315}`} stroke="#66301f" strokeWidth="52" strokeLinecap="round" fill="none"/>
      <ellipse cx="350" cy={1020 + t * 440} rx="26" ry="45" fill="#854020"/>
    </g>
    <rect x="140" y="160" width="800" height="110" rx="55" fill="#f8e8d0" opacity=".5"/>
    <text x="540" y="235" textAnchor="middle" fontFamily="Georgia" fontSize="69" fill="#4b3435">Slow from a spoon.</text>
  </g>;
};

const Blueprint = ({frame}: {frame: number}) => {
  const p = progress(frame, 1680, 1800);
  return <g>
    <rect width={W} height={H} fill="#203d52"/>
    {Array.from({length: 24}, (_, i) => <g key={i} stroke="#93bac9" opacity=".19" strokeWidth="2">
      <path d={`M${i * 48} 0v1920M0 ${i * 88}h1080`}/>
    </g>)}
    <g transform={`translate(540 880) rotate(${Math.sin(p * Math.PI) * 1.2})`} fill="none" stroke="#d5decc" strokeWidth="8">
      <path d="M-325 400V-440Q0 -510 325 -440V400Q0 460 -325 400Z"/>
      <ellipse cy="-440" rx="325" ry="76"/>
      {Array.from({length: 9}, (_, i) => <path key={i} d={`M-320 ${-390 + i * 92}Q0 ${-345 + i * 92} 320 ${-390 + i * 92}`} strokeWidth="3" opacity=".55"/>)}
      <path d="M0 -430v840" strokeDasharray="20 15" strokeWidth="4"/>
      <path d="M-325 485h650M-390 -440v840M-390 -440h47M-390 400h47" strokeWidth="3"/>
      <path d={`M-17 -65L65 -2L-20 78L47 152`} stroke="#f4b26b" strokeWidth="15"/>
    </g>
    <text x="540" y="1610" textAnchor="middle" fill="#f1e7d8" fontFamily="Georgia" fontSize="65">A preventable disaster.</text>
    <text x="540" y="1685" textAnchor="middle" fill="#b8ced1" fontFamily="Georgia" fontSize="36">Boston • January 15, 1919</text>
  </g>;
};

export const BostonMolasses: React.FC = () => {
  const frame = useCurrentFrame();
  const flood1 = progress(frame, 0, 195);
  const flood2 = progress(frame, 690, 1010);
  const waveHeight = frame < 195 ? .7 + flood1 * .5 : .4 + flood2 * 1.15;
  const cameraScale = frame < 195 ? 1.02 + flood1 * .19 : frame < 690 ? 1 + progress(frame, 360, 690) * .1 : 1 + flood2 * .16;
  const cameraY = frame < 195 ? -flood1 * 80 : frame < 690 ? -progress(frame, 360, 690) * 100 : -flood2 * 90;
  const showTown = frame < 195 || (frame >= 360 && frame < 1230) || (frame >= 1500 && frame < 1680);
  const leaking = frame >= 360 && frame < 690;
  const aftermath = frame >= 1020 && frame < 1680;
  return <AbsoluteFill style={{backgroundColor: '#172a33'}}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'100%'}}>
      <Palette/>
      {showTown && <g transform={`translate(${-540 * (cameraScale - 1)} ${cameraY}) scale(${cameraScale})`}>
        <Town frame={frame} tank={!aftermath} dark={aftermath} />
        {frame < 195 && <>
          <Person x={204} y={1680} scale={1.25} frame={frame} face={1}/>
          <Person x={365} y={1570} scale={.75} frame={frame} face={0}/>
          <MolassesWave frame={frame} height={waveHeight} offset={350 - flood1 * 330}/>
        </>}
        {leaking && <>
          <Person x={250} y={1660} frame={frame} face={0} scale={1.1}/>
          <path d={`M810 1100Q850 ${1250 + wave(frame,.05)*15} 825 1370`} stroke="#83431e" strokeWidth="22" strokeLinecap="round" fill="none"/>
          <ellipse cx="816" cy={1390 + progress(frame,360,690)*150} rx="22" ry="38" fill="#d48c44"/>
        </>}
        {frame >= 690 && frame < 1020 && <>
          <path d={`M640 1020L720 900L760 1090L890 990L920 1340L650 1370Z`} fill="#6c3527" stroke="#e5a172" strokeWidth="25" />
          <MolassesWave frame={frame} height={waveHeight} offset={300 - flood2 * 310}/>
        </>}
        {aftermath && <>
          <path d="M0 1570Q280 1470 490 1560Q780 1460 1080 1580V1920H0Z" fill="#3f221e" opacity=".8"/>
          <Person x={280} y={1710} frame={frame} face={1} scale={1}/>
          <Person x={520} y={1670} frame={frame} face={0} scale={.92}/>
          <Person x={775} y={1740} frame={frame} face={1} scale={1.1}/>
        </>}
      </g>}
      {frame >= 195 && frame < 360 && <Spoon frame={frame}/>}
      {frame >= 1230 && frame < 1500 && <>
        <Spoon frame={frame}/>
        <g transform="translate(500 0)">
          <Town frame={frame} tank/>
          <MolassesWave frame={frame} height={.75 + progress(frame,1230,1500)*.35}/>
        </g>
        <path d="M540 0v1920" stroke="#fff5df" strokeWidth="22"/>
      </>}
      {frame >= 1680 && <Blueprint frame={frame}/>}
      <rect width={W} height={H} fill="url(#vignette)" pointerEvents="none"/>
      {frame < 180 && <rect width={W} height={H} fill="#f7e6c8" opacity={Math.max(0, 1 - frame / 12)*.84}/>}
      {frame > 1785 && <rect width={W} height={H} fill="#0b1321" opacity={progress(frame, 1785, 1800)}/>}
    </svg>
  </AbsoluteFill>;
};
