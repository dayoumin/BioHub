'use client'

import { usePathname } from 'next/navigation'
import { FeedbackPanel } from './FeedbackPanel'

export function GlobalFeedbackPanel() {
    const pathname = usePathname()

    // Design System, Admin 페이지에서는 피드백 패널 숨김
    const hideFeedbackPanel = pathname?.startsWith('/design-system') || pathname?.startsWith('/admin')

    if (hideFeedbackPanel) return null

    return <FeedbackPanel />
}
