'use client';

/**
 * Type Guards 라이브러리 섹션 (개발 전용)
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, Shield, Code2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import typeGuardsMetadata from '../coding-patterns/type-guards.json';

export function TypeGuardsSection() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(typeGuardsMetadata.categories[0].name);

  const copyToClipboard = useCallback((code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    toast.success(`${label} 복사됨!`);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const currentCategory = typeGuardsMetadata.categories.find(c => c.name === selectedCategory);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold">Type Guards 라이브러리</h1>
          <Badge variant="outline" className="text-xs">DEV ONLY</Badge>
        </div>
        <p className="text-muted-foreground">
          타입 안전성 보장 함수 모음 (any 금지 → unknown + 타입 가드)
        </p>
        <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
          <span>출처:</span>
          <span className="font-mono">lib/utils/type-guards.ts</span>
          <span className="font-mono">AI-CODING-RULES.md</span>
        </div>
      </div>

      {/* 카테고리 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>카테고리 ({typeGuardsMetadata.categories.length}개)</CardTitle>
          <CardDescription>
            함수 타입별 분류
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {typeGuardsMetadata.categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? 'default' : 'outline'}
                className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                onClick={() => setSelectedCategory(category.name)}
              >
                <span className="font-medium text-sm">{category.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {category.functions.length}개
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 카테고리의 함수들 */}
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
                    <Shield className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      {/* 함수 이름 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{index + 1}. {func.name}</h3>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          lib/utils/type-guards.ts
                        </code>
                      </div>

                      {/* 목적 */}
                      <p className="text-sm text-muted-foreground">{func.purpose}</p>

                      {/* 시그니처 */}
                      <div className="bg-muted p-3 rounded">
                        <div className="text-xs text-muted-foreground mb-1">함수 시그니처:</div>
                        <pre className="text-xs overflow-x-auto">
                          <code>{func.signature}</code>
                        </pre>
                      </div>

                      {/* 반환값 */}
                      <div className="text-sm">
                        <span className="font-medium">반환:</span> {func.returns}
                      </div>

                      {/* 사용 예제 */}
                      <div className="relative">
                        <div className="text-xs text-muted-foreground mb-2">사용 예제:</div>
                        <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-3 rounded overflow-x-auto">
                          <code>{func.example}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-0 right-0"
                          onClick={() => copyToClipboard(func.example, func.name)}
                        >
                          {copiedCode === func.name ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 사용 패턴 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            실전 사용 패턴
          </CardTitle>
          <CardDescription>
            실제 프로젝트에서 사용하는 패턴 {typeGuardsMetadata.usagePatterns.length}가지
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {typeGuardsMetadata.usagePatterns.map((pattern, index) => (
              <div key={index} className="space-y-3">
                <h3 className="font-semibold">{index + 1}. {pattern.name}</h3>
                <div className="relative">
                  <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-[400px]">
                    <code>{pattern.code}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(pattern.code, pattern.name)}
                  >
                    {copiedCode === pattern.name ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    복사
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Best Practices
          </CardTitle>
          <CardDescription>
            타입 가드 사용 시 권장 패턴
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {typeGuardsMetadata.bestPractices.map((practice, index) => (
              <div key={index} className="space-y-3">
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300">
                    {index + 1}. {practice.title}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    {practice.description}
                  </p>
                </div>

                {practice.bad && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Bad */}
                    <div>
                      <div className="text-xs text-red-700 dark:text-red-300 font-semibold mb-2">
                        ❌ Bad
                      </div>
                      <pre className="text-xs bg-red-50 dark:bg-red-950/20 p-3 rounded overflow-x-auto">
                        <code>{practice.bad}</code>
                      </pre>
                    </div>

                    {/* Good */}
                    <div>
                      <div className="text-xs text-green-700 dark:text-green-300 font-semibold mb-2">
                        ✅ Good
                      </div>
                      <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-3 rounded overflow-x-auto">
                        <code>{practice.good}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {practice.example && !practice.bad && (
                  <div>
                    <div className="text-xs text-green-700 dark:text-green-300 font-semibold mb-2">
                      예제:
                    </div>
                    <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-3 rounded overflow-x-auto">
                      <code>{practice.example}</code>
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI용 메타데이터 (숨김) */}
      <div
        className="hidden"
        data-ai-context="type-guards"
        data-version={typeGuardsMetadata.version}
        data-last-updated={typeGuardsMetadata.lastUpdated}
      >
        <pre>{JSON.stringify(typeGuardsMetadata, null, 2)}</pre>
      </div>
    </div>
  );
}
