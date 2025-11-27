'use client'

import { useState } from 'react'
import { Upload, Settings, Play, CheckCircle } from 'lucide-react'
import { FloatingStepIndicator, StepItem } from '@/components/common/FloatingStepIndicator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const DEMO_STEPS: StepItem[] = [
  { id: 1, label: 'Upload', icon: Upload },
  { id: 2, label: 'Configure', icon: Settings },
  { id: 3, label: 'Analyze', icon: Play },
  { id: 4, label: 'Results', icon: CheckCircle },
]

export function FloatingStepIndicatorDemo() {
  const [currentStep, setCurrentStep] = useState(2)
  const [completedSteps, setCompletedSteps] = useState<number[]>([1])

  const handleStepChange = (stepId: number) => {
    setCurrentStep(stepId)
  }

  const handleComplete = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep])
    }
    if (currentStep < DEMO_STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleReset = () => {
    setCurrentStep(1)
    setCompletedSteps([])
  }

  // Merge completed state into steps
  const stepsWithCompleted = DEMO_STEPS.map(step => ({
    ...step,
    completed: completedSteps.includes(step.id)
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            FloatingStepIndicator
          </CardTitle>
          <CardDescription>
            Pill-shaped floating step indicator for multi-step flows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Demo Area */}
          <div className="relative bg-muted/30 rounded-lg p-8 min-h-[200px]">
            {/* Simulate header space */}
            <div className="h-14 bg-background/50 rounded-t-lg border-b mb-4 flex items-center px-4">
              <span className="text-sm font-medium text-muted-foreground">Header Area</span>
            </div>

            {/* Floating Step Indicator */}
            <div className="relative">
              <FloatingStepIndicator
                steps={stepsWithCompleted}
                currentStep={currentStep}
                onStepChange={handleStepChange}
                position="sticky"
                topOffset="0"
              />
            </div>

            {/* Content Area */}
            <div className="mt-8 p-6 bg-background rounded-lg border text-center">
              <p className="text-lg font-medium">
                Current Step: {currentStep} - {DEMO_STEPS[currentStep - 1]?.label}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Completed: {completedSteps.length > 0 ? completedSteps.join(', ') : 'None'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2 justify-center">
            <Button onClick={handleComplete} disabled={currentStep > DEMO_STEPS.length}>
              Complete Step {currentStep}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>

          {/* Usage Code */}
          <div className="bg-muted rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Usage</h4>
            <pre className="text-xs overflow-x-auto">
{`import { FloatingStepIndicator, StepItem } from '@/components/common/FloatingStepIndicator'
import { Upload, Settings, Play } from 'lucide-react'

const steps: StepItem[] = [
  { id: 1, label: 'Upload', icon: Upload, completed: true },
  { id: 2, label: 'Configure', icon: Settings },
  { id: 3, label: 'Analyze', icon: Play },
]

<FloatingStepIndicator
  steps={steps}
  currentStep={2}
  onStepChange={(id) => setStep(id)}
  position="sticky"     // 'sticky' | 'fixed'
  topOffset="3.5rem"    // offset from top
/>`}
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
                  <td className="py-2 font-mono text-xs">steps</td>
                  <td className="py-2 font-mono text-xs">StepItem[]</td>
                  <td className="py-2">-</td>
                  <td className="py-2 text-muted-foreground">Array of step items</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono text-xs">currentStep</td>
                  <td className="py-2 font-mono text-xs">number</td>
                  <td className="py-2">-</td>
                  <td className="py-2 text-muted-foreground">Current active step ID</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono text-xs">onStepChange</td>
                  <td className="py-2 font-mono text-xs">(id: number) =&gt; void</td>
                  <td className="py-2">-</td>
                  <td className="py-2 text-muted-foreground">Callback when step is clicked</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono text-xs">position</td>
                  <td className="py-2 font-mono text-xs">&apos;sticky&apos; | &apos;fixed&apos;</td>
                  <td className="py-2">&apos;sticky&apos;</td>
                  <td className="py-2 text-muted-foreground">Positioning mode</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-mono text-xs">topOffset</td>
                  <td className="py-2 font-mono text-xs">string</td>
                  <td className="py-2">&apos;3.5rem&apos;</td>
                  <td className="py-2 text-muted-foreground">Top offset for positioning</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
