'use client'

import { useEffect } from 'react'

export default function LiteraturePage(): null {
  useEffect(() => {
    const existing = new URLSearchParams(window.location.search)
    existing.set('tab', 'literature')
    window.location.replace(`/papers?${existing.toString()}`)
  }, [])
  return null
}
