import { useId } from 'react'

interface Props {
  size?: number
  isActive?: boolean
}

/**
 * ArgueBot mark — animated hot air balloon with four agent thought trails.
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
          <pattern id={`${uid}-basket`} width="3" height="3" patternUnits="userSpaceOnUse">
            <path d="M0 3 L3 0" stroke="#d1d5db" strokeWidth="0.55" />
          </pattern>
          <clipPath id={`${uid}-clip`}>
            <path d="M20 3.5 C11 3.5 7.5 10 7.5 15.5 C7.5 19.5 10 22.5 14 23.5 L20 24.5 L26 23.5 C30 22.5 32.5 19.5 32.5 15.5 C32.5 10 29 3.5 20 3.5 Z" />
          </clipPath>
        </defs>

        {/* Balloon envelope */}
        <path
          className="logo-balloon"
          d="M20 3.5 C11 3.5 7.5 10 7.5 15.5 C7.5 19.5 10 22.5 14 23.5 L20 24.5 L26 23.5 C30 22.5 32.5 19.5 32.5 15.5 C32.5 10 29 3.5 20 3.5 Z"
          fill="#f3f4f6"
          stroke="#1f2937"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Gore panel lines */}
        <g className="logo-panels" clipPath={`url(#${uid}-clip)`} stroke="#d1d5db" strokeWidth="0.7">
          <path d="M20 4 C20 4 16 12 16 20" />
          <path d="M20 4 C20 4 13 12 12.5 20" />
          <path d="M20 4 C20 4 24 12 24 20" />
          <path d="M20 4 C20 4 27 12 27.5 20" />
          <path d="M11 14 H29" strokeWidth="0.5" />
          <path d="M9.5 18 H30.5" strokeWidth="0.5" />
        </g>

        {/* Highlight sheen */}
        <ellipse className="logo-shine" cx="16" cy="10" rx="4" ry="5" fill="white" fillOpacity="0.45" />

        {/* Neck + burner ring */}
        <path
          d="M17 24.2 L20 25.8 L23 24.2"
          stroke="#1f2937"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="20" y1="25.8" x2="20" y2="27.5" stroke="#6b7280" strokeWidth="1" />

        {/* Ropes */}
        <line className="logo-rope" x1="15" y1="24" x2="12" y2="30" stroke="#9ca3af" strokeWidth="0.7" />
        <line className="logo-rope" x1="18" y1="25" x2="16" y2="30" stroke="#9ca3af" strokeWidth="0.7" />
        <line className="logo-rope" x1="22" y1="25" x2="24" y2="30" stroke="#9ca3af" strokeWidth="0.7" />
        <line className="logo-rope" x1="25" y1="24" x2="28" y2="30" stroke="#9ca3af" strokeWidth="0.7" />

        {/* Basket */}
        <path
          className="logo-basket"
          d="M10 30 H30 L28.5 36.5 H11.5 Z"
          fill={`url(#${uid}-basket)`}
          stroke="#1f2937"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <line x1="10" y1="30" x2="30" y2="30" stroke="#1f2937" strokeWidth="1.3" strokeLinecap="round" />

        {/* Sandbags */}
        <rect x="9" y="31" width="2" height="3" rx="0.4" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="29" y="31" width="2" height="3" rx="0.4" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />

        {/* Four agents in basket */}
        <circle cx="14" cy="33" r="1.5" fill="#4b5563" />
        <circle cx="17.5" cy="33" r="1.5" fill="#4b5563" />
        <circle cx="22.5" cy="33" r="1.5" fill="#4b5563" />
        <circle cx="26" cy="33" r="1.5" fill="#4b5563" />

        {/* Thought bubbles rising into balloon */}
        <g className="logo-trail logo-trail--1">
          <circle className="logo-dot" cx="14" cy="28.5" r="1" fill="#9ca3af" />
          <circle className="logo-dot logo-dot--mid" cx="14" cy="21" r="0.85" fill="#6b7280" />
        </g>
        <g className="logo-trail logo-trail--2">
          <circle className="logo-dot" cx="17.5" cy="28.5" r="1" fill="#9ca3af" />
          <circle className="logo-dot logo-dot--mid" cx="17.5" cy="20" r="0.85" fill="#6b7280" />
        </g>
        <g className="logo-trail logo-trail--3">
          <circle className="logo-dot" cx="22.5" cy="28.5" r="1" fill="#9ca3af" />
          <circle className="logo-dot logo-dot--mid" cx="22.5" cy="20" r="0.85" fill="#6b7280" />
        </g>
        <g className="logo-trail logo-trail--4">
          <circle className="logo-dot" cx="26" cy="28.5" r="1" fill="#9ca3af" />
          <circle className="logo-dot logo-dot--mid" cx="26" cy="21" r="0.85" fill="#6b7280" />
        </g>
      </svg>
    </div>
  )
}
