'use client'
import { useState } from 'react'

export default function ShipGoalImage({
  variant,
  name,
  className = '',
}: {
  variant: string | null
  name: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const src = variant ? `/images/items/epheria-carrack-${variant}.png` : null

  return (
    <div className={`relative overflow-hidden bg-gradient-to-b from-[#1c2840] to-[#0d1624] ${className}`}>
      {/* SVG boat silhouette — always in background, covered by image when loaded */}
      <svg viewBox="0 0 120 90" className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <g fill="#60a5fa">
          <path d="M34 60 L42 76 L78 76 L86 60 Z" />
          <rect x="59" y="16" width="2.5" height="44" rx="1" />
          <path d="M61.5 19 L85 60 L61.5 60 Z" />
        </g>
      </svg>
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
