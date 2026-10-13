// Procedural monochrome "photographic plates". Generated SVG, so there's no licensing and no network.
// Each scene is a cinematic metaphor for a module; the user can replace the home plate with their own photo.

import { memo } from 'react'

export type Scene = 'monolith' | 'iron' | 'mirror' | 'skyline' | 'eclipse' | 'lights' | 'blueprint' | 'stairs'

const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={`fog-${id}`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.0025 0.009" numOctaves="4" seed="7" />
        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.25 -0.45" />
      </filter>
      <filter id={`blur-${id}`}><feGaussianBlur stdDeviation="28" /></filter>
      <filter id={`soft-${id}`}><feGaussianBlur stdDeviation="6" /></filter>
      <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#030303" /><stop offset="0.55" stopColor="#151515" /><stop offset="1" stopColor="#040404" />
      </linearGradient>
      <linearGradient id={`metal-${id}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#5a5a57" /><stop offset="0.45" stopColor="#f0efe9" /><stop offset="1" stopColor="#3c3c3a" />
      </linearGradient>
      <radialGradient id={`glow-${id}`}>
        <stop offset="0" stopColor="#fff" stopOpacity="0.55" /><stop offset="0.35" stopColor="#fff" stopOpacity="0.12" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`fade-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.3" stopColor="#fff" /><stop offset="0.7" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <mask id={`fogmask-${id}`} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={`url(#fade-${id})`} /></mask>
      <linearGradient id={`shaft-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.16" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
  )
}

const Fog = ({ id, y = 0, o = 0.35 }: { id: string; y?: number; o?: number }) => (
  <g mask={`url(#fogmask-${id})`}>
    <rect x="-200" y={y - 150} width="2000" height="900" filter={`url(#fog-${id})`} opacity={o} className="drift" />
  </g>
)

function Scene({ scene, id }: { scene: Scene; id: string }) {
  const r = rng(scene.length * 7919 + 13)
  switch (scene) {
    case 'monolith':
      return (
        <>
          <circle cx="960" cy="420" r="520" fill={`url(#glow-${id})`} />
          <rect x="0" y="610" width="1600" height="290" fill="#060606" />
          <polygon points="925,610 995,610 1320,900 600,900" fill="#fff" opacity="0.05" />
          <rect x="925" y="170" width="70" height="440" fill="#fff" opacity="0.5" filter={`url(#blur-${id})`} />
          <rect x="925" y="170" width="70" height="440" fill={`url(#metal-${id})`} />
          <rect x="925" y="612" width="70" height="200" fill={`url(#metal-${id})`} opacity="0.12" />
          {/* lone figure */}
          <g fill="#030303" transform="translate(842 560)">
            <circle cx="0" cy="-2" r="8" />
            <path d="M-11 8 Q0 2 11 8 L13 46 L7 46 L5 88 L1 88 L0 52 L-1 88 L-5 88 L-7 46 L-13 46 Z" />
          </g>
          <Fog id={id} y={180} o={0.42} />
        </>
      )
    case 'iron': {
      return (
        <>
          {[0, 1, 2].map((i) => <polygon key={i} points={`${120 + i * 210},0 ${200 + i * 210},0 ${760 + i * 260},900 ${560 + i * 260},900`} fill={`url(#shaft-${id})`} />)}
          <rect x="0" y="690" width="1600" height="210" fill="#050505" />
          <rect x="250" y="508" width="1100" height="12" fill={`url(#metal-${id})`} />
          {[330, 1270].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="514" r="175" fill="#0b0b0b" stroke="#2c2c2a" strokeWidth="3" />
              <circle cx={cx} cy="514" r="175" fill="none" stroke="#e9e8e2" strokeWidth="2" strokeDasharray="140 960" strokeDashoffset={cx > 800 ? 300 : 820} opacity="0.85" />
              <circle cx={cx} cy="514" r="120" fill="none" stroke="#1d1d1c" strokeWidth="2" />
              <circle cx={cx} cy="514" r="26" fill="#161615" stroke="#5a5a56" />
            </g>
          ))}
          {Array.from({ length: 70 }, (_, i) => <circle key={i} cx={r() * 1600} cy={r() * 800} r={r() * 1.8 + 0.3} fill="#fff" opacity={r() * 0.5} />)}
          <Fog id={id} y={350} o={0.22} />
        </>
      )
    }
    case 'mirror':
      return (
        <>
          <ellipse cx="800" cy="440" rx="230" ry="340" fill="#0c0c0c" stroke="#3a3a37" strokeWidth="2" />
          <ellipse cx="800" cy="440" rx="214" ry="324" fill="url(#sky-m2)" />
          <rect x="720" y="110" width="26" height="660" fill="#fff" opacity="0.10" transform="rotate(14 800 440)" filter={`url(#soft-${id})`} />
          <rect x="790" y="110" width="8" height="660" fill="#fff" opacity="0.14" transform="rotate(14 800 440)" filter={`url(#soft-${id})`} />
          <ellipse cx="800" cy="440" rx="230" ry="340" fill="none" stroke="#efeee8" strokeWidth="2.5" strokeDasharray="300 2000" strokeDashoffset="-60" />
          <circle cx="1240" cy="200" r="340" fill={`url(#glow-${id})`} opacity="0.5" />
          <Fog id={id} y={300} o={0.25} />
        </>
      )
    case 'skyline': {
      const b: JSX.Element[] = []
      let x = -20
      while (x < 1620) {
        const w = 40 + r() * 90, h = 120 + Math.pow(r(), 1.6) * 420
        b.push(<rect key={x} x={x} y={900 - h} width={w} height={h} fill={r() > 0.5 ? '#080808' : '#0d0d0d'} />)
        for (let wy = 900 - h + 14; wy < 880; wy += 18) for (let wx = x + 8; wx < x + w - 8; wx += 14)
          if (r() > 0.93) b.push(<rect key={`${wx}-${wy}`} x={wx} y={wy} width="5" height="7" fill="#e8e7e0" opacity={0.3 + r() * 0.6} />)
        x += w + 4
      }
      return (
        <>
          <circle cx="1180" cy="260" r="70" fill="#d7d6cf" opacity="0.85" />
          <circle cx="1180" cy="260" r="260" fill={`url(#glow-${id})`} opacity="0.6" />
          <Fog id={id} y={120} o={0.3} />
          {b}
        </>
      )
    }
    case 'eclipse':
      return (
        <>
          {Array.from({ length: 160 }, (_, i) => <circle key={i} cx={r() * 1600} cy={r() * 900} r={r() * 1.2 + 0.2} fill="#fff" opacity={r() * 0.6} />)}
          <circle cx="1060" cy="430" r="300" fill={`url(#glow-${id})`} />
          <circle cx="1060" cy="430" r="208" fill="#fff" opacity="0.5" filter={`url(#soft-${id})`} />
          <circle cx="1060" cy="430" r="200" fill="#020202" />
          {[260, 330, 420].map((rr) => <circle key={rr} cx="1060" cy="430" r={rr} fill="none" stroke="#fff" opacity="0.06" />)}
        </>
      )
    case 'lights':
      return (
        <>
          <rect x="0" y="560" width="1600" height="340" fill="#050505" />
          {Array.from({ length: 46 }, (_, i) => {
            const rr = 10 + r() * 70
            return <circle key={i} cx={r() * 1600} cy={260 + r() * 420} r={rr} fill="#fff" opacity={0.04 + r() * 0.16} filter={rr > 40 ? `url(#soft-${id})` : undefined} />
          })}
          {Array.from({ length: 9 }, (_, i) => (
            <g key={i} fill="#020202" transform={`translate(${180 + i * 150 + r() * 60} ${640 + r() * 30}) scale(${0.9 + r() * 0.5})`}>
              <circle cx="0" cy="-60" r="13" /><path d="M-24 -40 Q0 -50 24 -40 L28 60 L-28 60 Z" />
            </g>
          ))}
          <Fog id={id} y={350} o={0.2} />
        </>
      )
    case 'blueprint':
      return (
        <>
          {Array.from({ length: 41 }, (_, i) => <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="900" stroke="#4f82ff" opacity={i % 5 ? 0.06 : 0.14} />)}
          {Array.from({ length: 23 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 40} x2="1600" y2={i * 40} stroke="#4f82ff" opacity={i % 5 ? 0.06 : 0.14} />)}
          {[0, 60, 120].map((a) => <ellipse key={a} cx="1080" cy="440" rx="280" ry="96" fill="none" stroke="#dfe7ff" opacity="0.35" transform={`rotate(${a} 1080 440)`} />)}
          <circle cx="1080" cy="440" r="36" fill="#dfe7ff" opacity="0.9" />
          <circle cx="1080" cy="440" r="200" fill={`url(#glow-${id})`} opacity="0.5" />
          <g stroke="#dfe7ff" fill="none" opacity="0.5" transform="translate(300 300)">
            <path d="M0 60 L90 10 L180 60 L90 110 Z M0 60 L0 170 L90 220 L180 170 L180 60 M90 110 L90 220" />
          </g>
        </>
      )
    case 'stairs':
      return (
        <>
          <rect x="1180" y="80" width="150" height="300" fill="#fff" opacity="0.85" />
          <rect x="1180" y="80" width="150" height="300" fill="#fff" filter={`url(#blur-${id})`} opacity="0.6" />
          {Array.from({ length: 12 }, (_, i) => (
            <g key={i}>
              <rect x={i * 100 + 40} y={830 - i * 40} width="2000" height="44" fill={i % 2 ? '#0b0b0b' : '#0e0e0e'} />
              <rect x={i * 100 + 40} y={830 - i * 40} width="2000" height="1.5" fill="#fff" opacity={0.08 + i * 0.03} />
            </g>
          ))}
          <polygon points="1180,380 1330,380 1600,900 700,900" fill="#fff" opacity="0.04" />
          <Fog id={id} y={250} o={0.28} />
        </>
      )
  }
}

export const Plate = memo(function Plate({ scene, className = '' }: { scene: Scene; className?: string }) {
  const id = scene
  return (
    <svg className={className} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Defs id={id} />
      <defs>
        <radialGradient id="sky-m2" cx="0.4" cy="0.3"><stop offset="0" stopColor="#262624" /><stop offset="1" stopColor="#060606" /></radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#sky-${id})`} />
      <Scene scene={scene} id={id} />
    </svg>
  )
})
