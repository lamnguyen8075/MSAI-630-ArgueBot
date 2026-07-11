import { useId } from 'react'

interface Props {
  size?: number
  isActive?: boolean
}

const BLACK = '#0f172a'
const WHITE = '#ffffff'
const GREY = '#6b7280'
const GREY_LIGHT = '#d1d5db'
const GREY_FILL = '#f3f4f6'

/**
 * Compact scales of justice — black, white, and grey only.
 */
export default function Logo({ size = 28, isActive = false }: Props) {
  const uid = useId().replace(/:/g, '')
  const g = (name: string) => `${uid}-${name}`

  return (
    <div
      className={`logo ${isActive ? 'logo--live' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={g('pillar')} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={WHITE} />
            <stop offset="100%" stopColor={GREY_FILL} />
          </linearGradient>
          <linearGradient id={g('pan')} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={WHITE} />
            <stop offset="100%" stopColor={GREY_FILL} />
          </linearGradient>
        </defs>

        <g className="logo-rig">
          <g className="logo-stand">
            <path
              d="M20 1.5 L21.2 4.2 L20 5.5 L18.8 4.2 Z"
              fill={BLACK}
              stroke={BLACK}
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            <path
              d="M18.8 5.8 C17.6 5.8 17 11 17.8 16.5 C18.2 19.5 18.7 25 18.8 28.5
                 L21.2 28.5 C21.3 25 21.8 19.5 22.2 16.5 C23 11 22.4 5.8 21.2 5.8 Z"
              fill={`url(#${g('pillar')})`}
              stroke={BLACK}
              strokeWidth="1.05"
              strokeLinejoin="round"
            />
            <ellipse cx="20" cy="33" rx="3.8" ry="1" fill={WHITE} stroke={GREY} strokeWidth="0.85" />
            <ellipse cx="20" cy="35" rx="5.8" ry="1.3" fill={WHITE} stroke={GREY} strokeWidth="0.85" />
            <ellipse cx="20" cy="37.2" rx="7.8" ry="1.6" fill={WHITE} stroke={GREY} strokeWidth="0.9" />
          </g>

          <g className="logo-beam-rig">
            <g className="logo-beam">
              <path
                d="M6.5 10 C5.5 9.5 5 8.8 5.8 8.3 C6.4 8 7 8.2 7.3 8.8"
                stroke={BLACK}
                strokeWidth="1"
                strokeLinecap="round"
                fill="none"
              />
              <rect
                x="7"
                y="9.2"
                width="26"
                height="2.2"
                rx="1.1"
                fill={BLACK}
                stroke={BLACK}
                strokeWidth="0.85"
              />
              <path
                d="M34.5 10 C35.5 9.5 36 8.8 35.2 8.3 C34.6 8 34 8.2 33.7 8.8"
                stroke={BLACK}
                strokeWidth="1"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            <g className="logo-pan logo-pan-left">
              <line x1="7" y1="11.4" x2="5.5" y2="18.5" stroke={GREY_LIGHT} strokeWidth="0.65" />
              <line x1="8.5" y1="11.4" x2="8.5" y2="18.5" stroke={GREY} strokeWidth="0.65" />
              <line x1="10" y1="11.4" x2="11.5" y2="18.5" stroke={GREY_LIGHT} strokeWidth="0.65" />
              <path
                d="M4.5 18.8 Q8.5 21.8 12.5 18.8 Q8.5 24.5 4.5 18.8 Z"
                fill={`url(#${g('pan')})`}
                stroke={BLACK}
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </g>

            <g className="logo-pan logo-pan-right">
              <line x1="30" y1="11.4" x2="28.5" y2="18.5" stroke={GREY_LIGHT} strokeWidth="0.65" />
              <line x1="31.5" y1="11.4" x2="31.5" y2="18.5" stroke={GREY} strokeWidth="0.65" />
              <line x1="33" y1="11.4" x2="34.5" y2="18.5" stroke={GREY_LIGHT} strokeWidth="0.65" />
              <path
                d="M27.5 18.8 Q31.5 21.8 35.5 18.8 Q31.5 24.5 27.5 18.8 Z"
                fill={`url(#${g('pan')})`}
                stroke={BLACK}
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
