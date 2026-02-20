'use client'

/**
 * Feedback Panel Demo - Design System Showcase
 *
 * A/B comparison between:
 * - Original: Gradient-based professional style
 * - New: Friendly cartoon mascot style
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel'
import { FeedbackPanelOriginal } from '@/components/feedback/FeedbackPanelOriginal'
import { cn } from '@/lib/utils'

type StyleTab = 'cartoon' | 'gradient'

export function FeedbackPanelDemo() {
  const [activeStyle, setActiveStyle] = useState<StyleTab>('cartoon')

  return (
    <div className="space-y-6">
      {/* Style Selector Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveStyle('cartoon')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeStyle === 'cartoon'
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          New: Cartoon Style
        </button>
        <button
          onClick={() => setActiveStyle('gradient')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeStyle === 'gradient'
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          Original: Gradient Style
        </button>
      </div>

      {/* Cartoon Style */}
      {activeStyle === 'cartoon' && (
        <Card className="border-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Friendly Cartoon Style</span>
              <span className="text-xs font-normal px-2 py-1 bg-violet-100 text-violet-700 rounded-full">New</span>
            </CardTitle>
            <CardDescription>
              Mascot character with micro-interactions and friendly UI
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative flex h-[600px] bg-slate-50/50 overflow-hidden">
              {/* Simulated Main Content */}
              <div className="flex-1 p-10 flex flex-col items-center justify-center text-slate-300">
                <div className="text-6xl mb-4">📊</div>
                <div className="font-medium text-lg">Statistics Analysis Page</div>
                <div className="text-sm">Check the floating button on the bottom right</div>
              </div>

              {/* The Actual Component in Demo Mode */}
              <FeedbackPanel isDemo={true} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gradient Style */}
      {activeStyle === 'gradient' && (
        <Card className="border-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Gradient Professional Style</span>
              <span className="text-xs font-normal px-2 py-1 bg-slate-100 text-slate-600 rounded-full">Original</span>
            </CardTitle>
            <CardDescription>
              Clean gradient design with professional look
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative flex h-[600px] bg-slate-50/50 overflow-hidden">
              {/* Simulated Main Content */}
              <div className="flex-1 p-10 flex flex-col items-center justify-center text-slate-300">
                <div className="text-6xl mb-4">📊</div>
                <div className="font-medium text-lg">Statistics Analysis Page</div>
                <div className="text-sm">Check the floating button on the bottom right</div>
              </div>

              {/* Original Style Component */}
              <FeedbackPanelOriginal isDemo={true} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={cn(
          "transition-all",
          activeStyle === 'cartoon' ? "ring-2 ring-violet-200" : ""
        )}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <span>Cartoon Style Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Cat mascot character for friendly feel</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Speech bubble style UI</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Confetti micro-interactions on vote</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Icon-based tab navigation</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>40 statistical methods (4 categories)</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "transition-all",
          activeStyle === 'gradient' ? "ring-2 ring-violet-200" : ""
        )}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <span>Gradient Style Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Professional gradient header</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Clean, minimal design</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Text-based tab navigation</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Category icons (emoji-based)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>12 statistical methods (3 categories)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
