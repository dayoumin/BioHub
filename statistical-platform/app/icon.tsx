import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom, #1e40af, #2563eb)',
          borderRadius: '64px',
        }}
      >
        <svg
          width="512"
          height="512"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Wave Layers */}
          <g opacity="0.9">
            {/* Top Wave */}
            <path
              d="M 50 180 Q 128 140, 206 180 T 362 180 T 462 180"
              stroke="#ffffff"
              strokeWidth="24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Middle Wave */}
            <path
              d="M 50 256 Q 128 216, 206 256 T 362 256 T 462 256"
              stroke="#ffffff"
              strokeWidth="24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />

            {/* Bottom Wave */}
            <path
              d="M 50 332 Q 128 292, 206 332 T 362 332 T 462 332"
              stroke="#ffffff"
              strokeWidth="24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.6"
            />
          </g>

          {/* Data Points */}
          <circle cx="128" cy="140" r="12" fill="#ffffff" />
          <circle cx="284" cy="180" r="12" fill="#ffffff" />
          <circle cx="206" cy="216" r="12" fill="#ffffff" />
          <circle cx="362" cy="256" r="12" fill="#ffffff" />
          <circle cx="128" cy="292" r="12" fill="#ffffff" opacity="0.8" />
          <circle cx="284" cy="332" r="12" fill="#ffffff" opacity="0.8" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
