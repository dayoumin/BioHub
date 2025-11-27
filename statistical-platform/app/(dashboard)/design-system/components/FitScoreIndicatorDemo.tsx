'use client'

import { useState } from 'react'
import { FitScoreIndicator, FitScoreBadge, getFitLevel } from '@/components/smart-flow/visualization/FitScoreIndicator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function FitScoreIndicatorDemo() {
  const [score, setScore] = useState(75)
  const [compact, setCompact] = useState(false)

  const currentLevel = getFitLevel(score)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            FitScoreIndicator
            <Badge variant="secondary">NEW</Badge>
          </CardTitle>
          <CardDescription>
            Data-method compatibility indicator with semantic labels (Progressive Disclosure Pattern)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Demo Area */}
          <div className="bg-muted/30 rounded-lg p-6 space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Current Score</p>
              <p className="text-4xl font-bold">{score}</p>
            </div>

            {/* Slider Control */}
            <div className="px-4">
              <Slider
                value={[score]}
                onValueChange={(value) => setScore(value[0])}
                max={100}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            {/* Compact Toggle */}
            <div className="flex items-center justify-center gap-2">
              <Switch
                id="compact-mode"
                checked={compact}
                onCheckedChange={setCompact}
              />
              <Label htmlFor="compact-mode" className="text-sm">Compact Mode</Label>
            </div>

            {/* Preview */}
            <div className="bg-background rounded-lg border p-6">
              <FitScoreIndicator score={score} compact={compact} />
            </div>

            {/* Badge Preview */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm text-muted-foreground">Badge variant:</span>
              <FitScoreBadge score={score} />
            </div>
          </div>

          {/* Score Levels Reference */}
          <div>
            <h4 className="text-sm font-medium mb-3">Score Levels</h4>
            <div className="grid grid-cols-5 gap-2">
              {[
                { score: 90, label: 'Excellent' },
                { score: 75, label: 'Good' },
                { score: 55, label: 'Caution' },
                { score: 30, label: 'Poor' },
                { score: 0, label: 'Unknown' },
              ].map((item) => {
                const level = getFitLevel(item.score)
                return (
                  <button
                    key={item.score}
                    onClick={() => setScore(item.score)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      currentLevel.level === level.level
                        ? 'ring-2 ring-primary border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className={`text-xs font-medium ${level.colorClass}`}>
                      {level.shortLabel}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {item.score === 90 ? '85+' :
                       item.score === 75 ? '70-84' :
                       item.score === 55 ? '50-69' :
                       item.score === 30 ? '1-49' : '0'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Usage Code */}
          <div className="bg-muted rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Usage</h4>
            <pre className="text-xs overflow-x-auto">
{`import { FitScoreIndicator, FitScoreBadge, getFitLevel } from '@/components/smart-flow/visualization/FitScoreIndicator'

// Full indicator with progress bar
<FitScoreIndicator score={85} />

// Compact pill badge
<FitScoreIndicator score={85} compact />

// Inline badge variant
<FitScoreBadge score={85} />

// Get level config programmatically
const config = getFitLevel(85)
// => { level: 'excellent', label: 'Very Suitable', shortLabel: 'Optimal', ... }`}
            </pre>
          </div>

          {/* Props Table */}
          <div>
            <h4 className="text-sm font-medium mb-2">Props</h4>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Prop</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Default</th>
                  <th className="text-left py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-mono text-xs">score</td>
                  <td className="py-2 font-mono text-xs">number</td>
                  <td className="py-2">-</td>
                  <td className="py-2 text-muted-foreground">0-100 fit score</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono text-xs">compact</td>
                  <td className="py-2 font-mono text-xs">boolean</td>
                  <td className="py-2">false</td>
                  <td className="py-2 text-muted-foreground">Show pill badge only</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono text-xs">className</td>
                  <td className="py-2 font-mono text-xs">string</td>
                  <td className="py-2">-</td>
                  <td className="py-2 text-muted-foreground">Additional CSS classes</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Design Rationale */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm text-blue-800 dark:text-blue-300">Design Rationale</h4>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <li>• <strong>Progressive Disclosure:</strong> Show semantic labels first, details on expand</li>
              <li>• <strong>Human-readable:</strong> Replaces confusing percentages with meaningful terms</li>
              <li>• <strong>Color-coded:</strong> Green/Blue/Amber/Red for instant recognition</li>
              <li>• <strong>Dark mode:</strong> Full support with accessible contrast ratios</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
