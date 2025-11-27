import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Brain, BookOpen, Activity, Lightbulb } from 'lucide-react'
import { InterpretationResult } from '@/lib/interpretation/engine'
import { cn } from '@/lib/utils'

interface ResultInterpretationProps {
  result: InterpretationResult
  className?: string
  initialMode?: 'beginner' | 'expert'
}

export function ResultInterpretation({
  result,
  className,
  initialMode = 'beginner'
}: ResultInterpretationProps) {
  const [mode, setMode] = useState<'beginner' | 'expert'>(initialMode)

  // initialMode changes update the internal state
  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  return (
    <Card className={cn("w-full transition-all duration-300", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <CardTitle>{result.title}</CardTitle>
          </div>
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setMode('beginner')}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-all",
                mode === 'beginner' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* "Beginner" */}
              {'\uCD08\uBCF4\uC790'}
            </button>
            <button
              onClick={() => setMode('expert')}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-all",
                mode === 'expert' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* "Expert" */}
              {'\uC804\uBB38\uAC00'}
            </button>
          </div>
        </div>
        <CardDescription>
          {mode === 'beginner'
            ? '\uBD84\uC11D \uACB0\uACFC\uB97C \uC774\uD574\uD558\uAE30 \uC27D\uAC8C \uC124\uBA85\uD569\uB2C8\uB2E4.' // "Explains analysis results in an easy-to-understand way."
            : '\uD1B5\uACC4\uC801 \uC218\uCE58\uC640 \uC0C1\uC138 \uD574\uC11D\uC744 \uC81C\uACF5\uD569\uB2C8\uB2E4.' // "Provides statistical figures and detailed interpretation."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary (Common) */}
        <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
          <h4 className="font-semibold flex items-center gap-2 mb-2 text-primary">
            <Lightbulb className="w-4 h-4" />
            {/* "Result Summary" */}
            {'\uACB0\uACFC \uC694\uC57D'}
          </h4>
          <p className="text-sm leading-relaxed text-foreground/90">
            {result.summary}
          </p>
        </div>

        {/* Practical Meaning (Both modes) */}
        {result.practical && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-green-600" />
              {/* "Practical Meaning" */}
              {'\uC2E4\uC6A9\uC801 \uC758\uBBF8'}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.practical}
            </p>
          </div>
        )}

        {/* Statistical Details (Expert mode only) */}
        {mode === 'expert' && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-blue-600" />
              {/* "Statistical Details" */}
              {'\uD1B5\uACC4\uC801 \uC0C1\uC138'}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed font-mono bg-muted/30 p-3 rounded">
              {result.statistical}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
