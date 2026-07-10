import { useId } from 'react'

interface Props {
  size?: number
  isActive?: boolean
}

const INK = '#1a1a1a'
const PANEL = '#b0b0b0'

/**
 * Classic clip-art hot air balloon — bulbous teardrop envelope, gores,
 * trapezoid skirt, vertical ropes, wicker basket.
 */
export default function Logo({ size = 36, isActive = false }: Props) {
  const uid = useId().replace(/:/g, '')

  // Bulbous top, narrow neck — matches reference teardrop silhouettes
  const envelope =
    'M20 2 C9 2 3.5 10 4 17 C4.5 22.5 8.5 26.5 13 27.2' +
    ' L27 27.2 C31.5 26.5 35.5 22.5 36 17 C36.5 10 31 2 20 2 Z'

  return (
    <div
      className={`logo ${isActive ? 'logo--live' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id={`${uid}-clip`}>
            <path d={envelope} />
          </clipPath>
          <clipPath id={`${uid}-basket`}>
            <rect x="10.6" y="32.1" width="18.8" height="5.3" rx="0.3" />
          </clipPath>
        </defs>

        <g className="logo-rig">
          <g className="logo-balloon">
            <path
              d={envelope}
              fill="white"
              stroke={INK}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />

            <g className="logo-panels" clipPath={`url(#${uid}-clip)`} stroke={PANEL} strokeWidth="0.7">
              <path d="M20 2 Q12 14 13 27.2" />
              <path d="M20 2 Q15.5 14 15.5 27.2" />
              <path d="M20 2 Q17.5 14 17.5 27.2" />
              <path d="M20 2 L20 27.2" />
              <path d="M20 2 Q22.5 14 22.5 27.2" />
              <path d="M20 2 Q24.5 14 24.5 27.2" />
              <path d="M20 2 Q28 14 27 27.2" />
            </g>

            <path
              d="M13 27.2 L27 27.2 L25.2 29 L14.8 29 Z"
              fill="white"
              stroke={INK}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </g>

          <g className="logo-basket-rig">
            <line className="logo-rope" x1="14.8" y1="29" x2="11" y2="31.5" stroke={INK} strokeWidth="0.85" />
            <line className="logo-rope" x1="17" y1="29" x2="14.5" y2="31.5" stroke={INK} strokeWidth="0.85" />
            <line className="logo-rope" x1="23" y1="29" x2="25.5" y2="31.5" stroke={INK} strokeWidth="0.85" />
            <line className="logo-rope" x1="25.2" y1="29" x2="29" y2="31.5" stroke={INK} strokeWidth="0.85" />

            <rect
              className="logo-basket"
              x="10"
              y="31.5"
              width="20"
              height="6.5"
              rx="0.6"
              fill="white"
              stroke={INK}
              strokeWidth="1.25"
            />

            <g className="logo-wicker" clipPath={`url(#${uid}-basket)`} stroke={INK} strokeWidth="0.45" opacity="0.5">
              <line x1="11" y1="32.5" x2="29" y2="32.5" />
              <line x1="11" y1="34" x2="29" y2="34" />
              <line x1="11" y1="35.5" x2="29" y2="35.5" />
              <line x1="11" y1="37" x2="29" y2="37" />
              <line x1="13" y1="31.5" x2="13" y2="38" />
              <line x1="16" y1="31.5" x2="16" y2="38" />
              <line x1="20" y1="31.5" x2="20" y2="38" />
              <line x1="24" y1="31.5" x2="24" y2="38" />
              <line x1="27" y1="31.5" x2="27" y2="38" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
