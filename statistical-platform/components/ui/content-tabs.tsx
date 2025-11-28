'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

/**
 * ContentTabs - Underline Style Tab Component (Style 3)
 *
 * Use for switching between different content views.
 * Google/GitHub style with underline indicator.
 *
 * When to use:
 * - Switching between different content types (Scatter vs Heatmap)
 * - Main navigation within a section
 * - When content changes significantly between tabs
 *
 * @example
 * ```tsx
 * const [activeTab, setActiveTab] = useState('scatter')
 *
 * <ContentTabs
 *   tabs={[
 *     { id: 'scatter', label: 'Scatter Plot', icon: ChartScatter },
 *     { id: 'heatmap', label: 'Heatmap', icon: Flame, badge: 3 }
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 *
 * <ContentTabsContent show={activeTab === 'scatter'}>
 *   <ScatterContent />
 * </ContentTabsContent>
 * <ContentTabsContent show={activeTab === 'heatmap'}>
 *   <HeatmapContent />
 * </ContentTabsContent>
 * ```
 */

export interface ContentTab {
  id: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
  /** Optional badge count (e.g., notification count) */
  badge?: number
}

interface ContentTabsProps {
  tabs: ContentTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
  /** Gap between tabs (default: gap-6) */
  gap?: 'gap-4' | 'gap-6' | 'gap-8'
  /** Accessible label for the tab list */
  ariaLabel?: string
}

export function ContentTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
  gap = 'gap-6',
  ariaLabel = 'Content tabs'
}: ContentTabsProps) {
  return (
    <div className={cn("border-b", className)}>
      <div
        className={cn("flex", gap)}
        role="tablist"
        aria-label={ariaLabel}
      >
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                "flex items-center gap-1.5 pb-3 text-sm font-medium transition-colors relative",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
                tab.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * ContentTabsContent - Wrapper for tab content with animation
 *
 * @example
 * ```tsx
 * <ContentTabsContent tabId="scatter" show={activeTab === 'scatter'}>
 *   <ScatterContent />
 * </ContentTabsContent>
 * ```
 */
interface ContentTabsContentProps {
  /** Tab ID for accessibility linkage (matches ContentTab.id) */
  tabId?: string
  show: boolean
  children: ReactNode
  className?: string
}

export function ContentTabsContent({
  tabId,
  show,
  children,
  className
}: ContentTabsContentProps) {
  if (!show) return null

  return (
    <div
      role="tabpanel"
      id={tabId ? `tabpanel-${tabId}` : undefined}
      aria-labelledby={tabId ? `tab-${tabId}` : undefined}
      className={cn("mt-4 animate-in fade-in duration-200", className)}
    >
      {children}
    </div>
  )
}
