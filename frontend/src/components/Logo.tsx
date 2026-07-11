import { useId } from 'react'

interface Props {
  size?: number
  isActive?: boolean
}

const INK = '#0f172a'
const SHADE = '#e0e7ff'
const SHADE_MID = '#c7d2fe'

/**
 * Vintage scales of justice — inspired by hand-drawn reference.
 * Beam rocks gently while a debate is in progress.
 */
export default function Logo({ size = 36, isActive = false }: Props) {
  const uid = useId().replace(/:/g, '')

  return (
    <div
      className={`logo ${isActive ? 'logo--live' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id={`${uid}-lpan`}>
            <path d="M4 19 Q8 23 12 19 Q8 25 4 19 Z" />
          </clipPath>
          <clipPath id={`${uid}-rpan`}>
            <path d="M28 19 Q32 23 36 19 Q32 25 28 19 Z" />
          </clipPath>
        </defs>

        <g className="logo-rig">
          {/* Stand — finial, pillar, tiered base */}
          <g className="logo-stand">
            <path
              d="M20 1.5 L21.3 4.8 L20 6.2 L18.7 4.8 Z"
              fill={SHADE}
              stroke={INK}
              strokeWidth="1.1"
              strokeLinejoin="round"
            />

            <path
              d="M18.6 6.2 C17.2 6.2 16.6 11.5 17.4 17 C17.8 20 18.4 25.5 18.5 28.2
                 L21.5 28.2 C21.6 25.5 22.2 20 22.6 17 C23.4 11.5 22.8 6.2 21.4 6.2 Z"
              fill={SHADE}
              stroke={INK}
              strokeWidth="1.25"
              strokeLinejoin="round"
            />

            <ellipse cx="20" cy="33" rx="4.2" ry="1.1" fill={SHADE_MID} stroke={INK} strokeWidth="1" />
            <ellipse cx="20" cy="35.2" rx="6.2" ry="1.5" fill={SHADE_MID} stroke={INK} strokeWidth="1" />
            <ellipse cx="20" cy="37.5" rx="8.5" ry="1.8" fill={SHADE} stroke={INK} strokeWidth="1.1" />
          </g>

          {/* Beam + pans — rocks as arguments are weighed */}
          <g className="logo-beam-rig">
            <g className="logo-beam">
              <path
                d="M6.5 10.2 C5 9.5 4.2 8.8 5.5 8.2 C6.2 7.9 6.8 8.1 7.2 8.6
                   M7.2 8.6 L32.8 8.6
                   M32.8 8.6 C33.2 8.1 33.8 7.9 34.5 8.2 C35.8 8.8 35 9.5 33.5 10.2"
                stroke={INK}
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5.5 8.2 C5 7.5 5.2 6.8 6 6.9 C6.5 7 6.7 7.5 6.5 8.2
                   M34.5 8.2 C34.3 7.5 34.5 7 35 6.9 C35.8 6.8 36 7.5 35.5 8.2"
                stroke={INK}
                strokeWidth="1"
                strokeLinecap="round"
              />
              <line x1="7.2" y1="8.6" x2="7.2" y2="10.5" stroke={INK} strokeWidth="1.2" />
              <line x1="32.8" y1="8.6" x2="32.8" y2="10.5" stroke={INK} strokeWidth="1.2" />
            </g>

            <g className="logo-pan logo-pan-left">
              <line x1="6.5" y1="10.2" x2="4.5" y2="18.5" stroke={INK} strokeWidth="0.75" />
              <line x1="8" y1="10.2" x2="8" y2="18.5" stroke={INK} strokeWidth="0.75" />
              <line x1="9.5" y1="10.2" x2="11.5" y2="18.5" stroke={INK} strokeWidth="0.75" />
              <path
                d="M4 18.8 Q8 22.2 12 18.8 Q8 24.2 4 18.8 Z"
                fill={SHADE}
                stroke={INK}
                strokeWidth="1.15"
                strokeLinejoin="round"
              />
              <path
                d="M4.8 19.5 Q8 21.5 11.2 19.5"
                stroke={INK}
                strokeWidth="0.5"
                opacity="0.45"
                clipPath={`url(#${uid}-lpan)`}
              />
            </g>

            <g className="logo-pan logo-pan-right">
              <line x1="30.5" y1="10.2" x2="28.5" y2="18.5" stroke={INK} strokeWidth="0.75" />
              <line x1="32" y1="10.2" x2="32" y2="18.5" stroke={INK} strokeWidth="0.75" />
              <line x1="33.5" y1="10.2" x2="35.5" y2="18.5" stroke={INK} strokeWidth="0.75" />
              <path
                d="M28 18.8 Q32 22.2 36 18.8 Q32 24.2 28 18.8 Z"
                fill={SHADE}
                stroke={INK}
                strokeWidth="1.15"
                strokeLinejoin="round"
              />
              <path
                d="M28.8 19.5 Q32 21.5 35.2 19.5"
                stroke={INK}
                strokeWidth="0.5"
                opacity="0.45"
                clipPath={`url(#${uid}-rpan)`}
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
