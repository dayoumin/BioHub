'use client'

import { useState } from 'react'
import { VariableSelectorToggle } from '@/components/common/VariableSelectorToggle'
import {
  TwoWayAnovaSelector,
  CorrelationSelector,
  GroupComparisonSelector,
  MultipleRegressionSelector,
  PairedSelector
} from '@/components/common/variable-selectors'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { SAMPLE_DATA, EXTENDED_SAMPLE_DATA } from '../constants'

export function VariableSelectorDemo() {
  const [activeTab, setActiveTab] = useState('basic')
  const [methodTab, setMethodTab] = useState('group')

  return (
    <div className="space-y-4 mt-6 animate-in fade-in duration-300">
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Selector</TabsTrigger>
          <TabsTrigger value="method-specific">Method-Specific</TabsTrigger>
          <TabsTrigger value="usage">Usage Guide</TabsTrigger>
        </TabsList>

        {/* Basic Selector Tab */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                VariableSelectorToggle
                <Badge variant="secondary" className="text-xs">Default</Badge>
              </CardTitle>
              <CardDescription>Toggle-based variable selection - instant select/deselect</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <VariableSelectorToggle
                data={SAMPLE_DATA}
                onComplete={(selection) => {
                  toast.success(`Selected: Dependent=${selection.dependent}, Independent=${selection.independent}`)
                }}
                onBack={() => toast.info('Going back')}
                title="Variable Selection Demo"
                description="Click to instantly select/deselect"
              />

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Props:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <code>data</code>: DataRow[] - Data (required)</li>
                  <li>• <code>onComplete</code>: (selection) =&gt; void - Complete handler (required)</li>
                  <li>• <code>onBack</code>: () =&gt; void - Back handler (required)</li>
                  <li>• <code>title</code>: string - Title (optional)</li>
                  <li>• <code>description</code>: string - Description (optional)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Method-Specific Selectors Tab */}
        <TabsContent value="method-specific">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Method-Specific Variable Selectors
                <Badge variant="default" className="text-xs">NEW</Badge>
              </CardTitle>
              <CardDescription>
                Specialized selectors for different statistical methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Inner tabs for each method */}
              <Tabs value={methodTab} onValueChange={setMethodTab} className="w-full">
                <TabsList className="flex flex-wrap gap-1 h-auto">
                  <TabsTrigger value="group" className="text-xs">Group Comparison</TabsTrigger>
                  <TabsTrigger value="correlation" className="text-xs">Correlation</TabsTrigger>
                  <TabsTrigger value="paired" className="text-xs">Paired</TabsTrigger>
                  <TabsTrigger value="regression" className="text-xs">Regression</TabsTrigger>
                  <TabsTrigger value="anova" className="text-xs">Two-way ANOVA</TabsTrigger>
                </TabsList>

                {/* Group Comparison Selector */}
                <TabsContent value="group" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">t-test, ANOVA, Mann-Whitney</Badge>
                    </div>
                    <GroupComparisonSelector
                      data={EXTENDED_SAMPLE_DATA}
                      onComplete={(mapping) => {
                        toast.success(`Group: ${mapping.groupVar}, Dependent: ${mapping.dependentVar}`)
                      }}
                      onBack={() => toast.info('Back')}
                      title="Group Comparison"
                      description="Select group variable and dependent variable"
                    />
                    <div className="bg-muted/50 rounded-lg p-3 text-xs">
                      <strong>Use for:</strong> t-test, One-way ANOVA, Mann-Whitney U, Kruskal-Wallis
                    </div>
                  </div>
                </TabsContent>

                {/* Correlation Selector */}
                <TabsContent value="correlation" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Pearson, Spearman, Kendall</Badge>
                    </div>
                    <CorrelationSelector
                      data={EXTENDED_SAMPLE_DATA}
                      onComplete={(mapping) => {
                        toast.success(`Variables: ${mapping.variables?.join(', ')}`)
                      }}
                      onBack={() => toast.info('Back')}
                      title="Correlation Analysis"
                      description="Select 2+ numeric variables"
                      minVariables={2}
                      maxVariables={5}
                    />
                    <div className="bg-muted/50 rounded-lg p-3 text-xs">
                      <strong>Use for:</strong> Pearson, Spearman, Kendall correlation analysis
                    </div>
                  </div>
                </TabsContent>

                {/* Paired Selector */}
                <TabsContent value="paired" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Paired t-test, Wilcoxon</Badge>
                    </div>
                    <PairedSelector
                      data={EXTENDED_SAMPLE_DATA}
                      onComplete={(mapping) => {
                        toast.success(`Paired: ${mapping.variables?.[0]} vs ${mapping.variables?.[1]}`)
                      }}
                      onBack={() => toast.info('Back')}
                      title="Paired Samples"
                      description="Select two related measurements"
                      labels={{ first: 'Before', second: 'After' }}
                    />
                    <div className="bg-muted/50 rounded-lg p-3 text-xs">
                      <strong>Use for:</strong> Paired t-test, Wilcoxon signed-rank, McNemar test
                    </div>
                  </div>
                </TabsContent>

                {/* Multiple Regression Selector */}
                <TabsContent value="regression" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Multiple Regression</Badge>
                    </div>
                    <MultipleRegressionSelector
                      data={EXTENDED_SAMPLE_DATA}
                      onComplete={(mapping) => {
                        toast.success(`Y: ${mapping.dependentVar}, X: ${mapping.independentVar}`)
                      }}
                      onBack={() => toast.info('Back')}
                      title="Multiple Regression"
                      description="Select dependent (Y) and independent (X) variables"
                      minIndependent={1}
                      maxIndependent={5}
                    />
                    <div className="bg-muted/50 rounded-lg p-3 text-xs">
                      <strong>Use for:</strong> Multiple regression, Stepwise regression
                    </div>
                  </div>
                </TabsContent>

                {/* Two-way ANOVA Selector */}
                <TabsContent value="anova" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Two-way / Three-way ANOVA</Badge>
                    </div>
                    <TwoWayAnovaSelector
                      data={EXTENDED_SAMPLE_DATA}
                      onComplete={(mapping) => {
                        toast.success(`Factors: ${mapping.groupVar}, Dependent: ${mapping.dependentVar}`)
                      }}
                      onBack={() => toast.info('Back')}
                      title="Two-way ANOVA"
                      description="Select 2 factors and 1 dependent variable"
                    />
                    <div className="bg-muted/50 rounded-lg p-3 text-xs">
                      <strong>Use for:</strong> Two-way ANOVA, Three-way ANOVA (factorial designs)
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Guide Tab */}
        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Usage Guide</CardTitle>
              <CardDescription>How to use method-specific variable selectors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Method-Selector Mapping */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-3">Method → Selector Mapping</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-background rounded border">
                    <strong>GroupComparisonSelector</strong>
                    <p className="text-muted-foreground">t-test, One-way ANOVA, Mann-Whitney, Kruskal-Wallis</p>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <strong>CorrelationSelector</strong>
                    <p className="text-muted-foreground">Pearson, Spearman, Kendall correlation</p>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <strong>PairedSelector</strong>
                    <p className="text-muted-foreground">Paired t-test, Wilcoxon signed-rank</p>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <strong>MultipleRegressionSelector</strong>
                    <p className="text-muted-foreground">Multiple regression, Stepwise</p>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <strong>TwoWayAnovaSelector</strong>
                    <p className="text-muted-foreground">Two-way ANOVA, Three-way ANOVA</p>
                  </div>
                  <div className="p-2 bg-background rounded border">
                    <strong>VariableSelectorToggle</strong>
                    <p className="text-muted-foreground">Simple regression, default fallback</p>
                  </div>
                </div>
              </div>

              {/* Code Example */}
              <div>
                <h4 className="font-medium text-sm mb-2">Dynamic Selector Example</h4>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{`// In VariableSelectionStep.tsx
function getSelectorType(methodId: string): string {
  if (methodId === 'two-way-anova') return 'two-way-anova'
  if (methodId === 'pearson-correlation') return 'correlation'
  if (methodId === 'paired-t') return 'paired'
  if (methodId === 'multiple-regression') return 'multiple-regression'
  if (methodId === 't-test') return 'group-comparison'
  return 'default'
}

// Render based on type
switch (selectorType) {
  case 'correlation':
    return <CorrelationSelector {...props} />
  case 'paired':
    return <PairedSelector {...props} />
  // ... other cases
}`}</code>
                </pre>
              </div>

              {/* VariableMapping Interface */}
              <div>
                <h4 className="font-medium text-sm mb-2">VariableMapping Interface</h4>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{`interface VariableMapping {
  dependentVar?: string      // Y variable
  independentVar?: string    // Single X variable
  groupVar?: string          // Group/Factor variable
  factors?: string[]         // Multiple factors (ANOVA)
  variables?: string[]       // Multiple variables (correlation)
  covariates?: string[]      // Control variables
}`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
