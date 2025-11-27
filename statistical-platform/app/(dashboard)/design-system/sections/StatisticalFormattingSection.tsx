'use client';

/**
 * Statistical Formatting Section (DEV ONLY)
 * p-value, effect size, correlation formatting guidelines
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, Calculator, Code2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import formattingMetadata from '../coding-patterns/statistical-formatting.json';

export function StatisticalFormattingSection() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(formattingMetadata.categories[0].name);

  const copyToClipboard = useCallback((code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const currentCategory = formattingMetadata.categories.find(c => c.name === selectedCategory);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold">Statistical Formatting</h1>
          <Badge variant="outline" className="text-xs">DEV ONLY</Badge>
        </div>
        <p className="text-muted-foreground">
          {formattingMetadata.description}
        </p>
        <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
          <span>Source:</span>
          <code className="font-mono bg-muted px-1 rounded">{formattingMetadata.sourceFile}</code>
          <span>|</span>
          <span>Updated: {formattingMetadata.lastUpdated}</span>
        </div>
      </div>

      {/* Constants Reference */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Constants Reference
          </CardTitle>
          <CardDescription>
            Defined in lib/statistics/constants.ts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {Object.entries(formattingMetadata.constants).map(([name, values]) => (
              <div key={name} className="space-y-2">
                <h4 className="font-semibold text-xs uppercase text-muted-foreground">{name}</h4>
                <div className="space-y-1">
                  {Object.entries(values as Record<string, number>).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{key}:</span>
                      <code className="font-mono">{value}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Categories ({formattingMetadata.categories.length})</CardTitle>
          <CardDescription>
            Select a category to view functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {formattingMetadata.categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? 'default' : 'outline'}
                className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                onClick={() => setSelectedCategory(category.name)}
              >
                <span className="font-medium text-sm">{category.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {category.functions.length} functions
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Category Functions */}
      {currentCategory && (
        <Card>
          <CardHeader>
            <CardTitle>{currentCategory.name}</CardTitle>
            <CardDescription>{currentCategory.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {currentCategory.functions.map((func, index) => (
                <div
                  key={func.name}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Code2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      {/* Function Name */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{index + 1}. {func.name}</h3>
                      </div>

                      {/* Signature */}
                      <div className="relative">
                        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                          <code>{func.signature}</code>
                        </pre>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => copyToClipboard(func.signature, func.name)}
                        >
                          {copiedCode === func.name ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      {/* Purpose */}
                      <p className="text-sm text-muted-foreground">{func.purpose}</p>

                      {/* Example */}
                      <div className="relative">
                        <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-3 rounded overflow-x-auto border border-green-200 dark:border-green-800">
                          <code className="text-green-800 dark:text-green-300">{func.example}</code>
                        </pre>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => copyToClipboard(func.example, `${func.name} example`)}
                        >
                          {copiedCode === `${func.name} example` ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      {/* Rules */}
                      <div className="flex flex-wrap gap-1">
                        {func.rules.map((rule, ruleIndex) => (
                          <Badge key={ruleIndex} variant="outline" className="text-xs">
                            {rule}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Guidelines */}
      <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Usage Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formattingMetadata.usageGuidelines.map((guideline, index) => (
              <div key={index} className="space-y-2">
                <h4 className="font-medium text-sm">{guideline.rule}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-red-100 dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-800">
                    <span className="text-red-600 dark:text-red-400 font-medium">BAD:</span>
                    <code className="block mt-1 text-red-800 dark:text-red-300">{guideline.bad}</code>
                  </div>
                  <div className="bg-green-100 dark:bg-green-950/30 p-2 rounded border border-green-200 dark:border-green-800">
                    <span className="text-green-600 dark:text-green-400 font-medium">GOOD:</span>
                    <code className="block mt-1 text-green-800 dark:text-green-300">{guideline.good}</code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Related Components */}
      <Card>
        <CardHeader>
          <CardTitle>Related Components</CardTitle>
          <CardDescription>UI components that use these formatters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formattingMetadata.relatedComponents.map((component) => (
              <div key={component.name} className="border rounded-lg p-4">
                <h4 className="font-semibold">{component.name}</h4>
                <code className="text-xs text-muted-foreground block mt-1">{component.path}</code>
                <p className="text-sm text-muted-foreground mt-2">{component.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Import */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Import</CardTitle>
          <CardDescription>Copy and paste into your component</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
              <code>{`import {
  formatPValue,
  formatNumber,
  formatEffectSize,
  formatConfidenceInterval,
  interpretPValue,
  interpretPValueKo,
  interpretEffectSize,
  interpretCorrelation,
  interpretCorrelationStrength
} from '@/lib/statistics/formatters'

import { PRECISION, SIGNIFICANCE_LEVELS, EFFECT_SIZE } from '@/lib/statistics/constants'`}</code>
            </pre>
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(
                `import {\n  formatPValue,\n  formatNumber,\n  formatEffectSize,\n  formatConfidenceInterval,\n  interpretPValue,\n  interpretPValueKo,\n  interpretEffectSize,\n  interpretCorrelation,\n  interpretCorrelationStrength\n} from '@/lib/statistics/formatters'\n\nimport { PRECISION, SIGNIFICANCE_LEVELS, EFFECT_SIZE } from '@/lib/statistics/constants'`,
                'Import statement'
              )}
            >
              {copiedCode === 'Import statement' ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
