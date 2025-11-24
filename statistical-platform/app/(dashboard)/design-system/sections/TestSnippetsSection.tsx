'use client';

/**
 * Test Snippets 라이브러리 섹션 (개발 전용)
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, FlaskConical, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import testSnippets from '../metadata/test-snippets.json';

export function TestSnippetsSection() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(testSnippets.categories[0].name);

  const copyToClipboard = useCallback((code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    toast.success(`${label} 복사됨!`);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const currentCategory = testSnippets.categories.find(c => c.name === selectedCategory);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold">Test Snippets 라이브러리</h1>
          <Badge variant="outline" className="text-xs">DEV ONLY</Badge>
        </div>
        <p className="text-muted-foreground">
          Jest + React Testing Library 테스트 패턴 모음
        </p>
        <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
          <span>출처:</span>
          <span className="font-mono">__tests__/</span>
          <span className="font-mono">jest.config.js</span>
        </div>
      </div>

      {/* 카테고리 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>카테고리 ({testSnippets.categories.length}개)</CardTitle>
          <CardDescription>
            테스트 유형별 분류
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {testSnippets.categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? 'default' : 'outline'}
                className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                onClick={() => setSelectedCategory(category.name)}
              >
                <span className="font-medium text-sm">{category.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {category.patterns.length}개
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 카테고리의 패턴들 */}
      {currentCategory && (
        <Card>
          <CardHeader>
            <CardTitle>{currentCategory.name}</CardTitle>
            <CardDescription>{currentCategory.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {currentCategory.patterns.map((pattern, index) => (
                <div
                  key={pattern.name}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <FlaskConical className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      {/* 패턴 이름 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{index + 1}. {pattern.name}</h3>
                      </div>

                      {/* 목적 */}
                      <p className="text-sm text-muted-foreground">{pattern.purpose}</p>

                      {/* 키워드 */}
                      <div className="flex flex-wrap gap-2">
                        {pattern.keywords.map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>

                      {/* 코드 예제 */}
                      <div className="relative">
                        <div className="text-xs text-muted-foreground mb-2">코드 예제:</div>
                        <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-3 rounded overflow-x-auto max-h-[600px]">
                          <code>{pattern.code}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-0 right-0"
                          onClick={() => copyToClipboard(pattern.code, pattern.name)}
                        >
                          {copiedCode === pattern.name ? (
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

      {/* Best Practices */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Best Practices
          </CardTitle>
          <CardDescription>
            테스트 작성 시 권장 패턴
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {testSnippets.bestPractices.map((practice, index) => (
              <div key={index} className="space-y-3">
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-300">
                    {index + 1}. {practice.title}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    {practice.description}
                  </p>
                </div>

                <div className="relative">
                  <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded overflow-x-auto max-h-[400px]">
                    <code>{practice.example}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(practice.example, practice.title)}
                  >
                    {copiedCode === practice.title ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Errors */}
      <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            자주 발생하는 에러
          </CardTitle>
          <CardDescription>
            흔한 테스트 에러 및 해결 방법
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testSnippets.commonErrors.map((item, index) => (
              <div
                key={index}
                className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 bg-white dark:bg-gray-900"
              >
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                  {index + 1}. {item.error}
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">원인:</span> {item.cause}
                  </div>
                  <div>
                    <span className="font-medium">해결:</span>
                    <pre className="mt-1 text-xs bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded overflow-x-auto">
                      <code>{item.solution}</code>
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 테스트 실행 명령어 */}
      <Card>
        <CardHeader>
          <CardTitle>테스트 실행 명령어</CardTitle>
          <CardDescription>
            Jest 테스트 실행 방법
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { cmd: 'npm test', desc: '모든 테스트 실행' },
              { cmd: 'npm test [파일명]', desc: '특정 파일 테스트 실행' },
              { cmd: 'npm test:watch', desc: 'Watch 모드 (파일 변경 시 자동 재실행)' },
              { cmd: 'npm test:coverage', desc: '커버리지 리포트 생성' },
              { cmd: 'npm test -- --verbose', desc: '상세 출력' },
              { cmd: 'npm test -- --silent', desc: '최소 출력' }
            ].map(({ cmd, desc }) => (
              <div key={cmd} className="flex items-start gap-3">
                <code className="text-xs bg-muted px-3 py-2 rounded flex-shrink-0">
                  {cmd}
                </code>
                <span className="text-sm text-muted-foreground mt-2">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI용 메타데이터 (숨김) */}
      <div
        className="hidden"
        data-ai-context="test-snippets"
        data-version={testSnippets.version}
        data-last-updated={testSnippets.lastUpdated}
      >
        <pre>{JSON.stringify(testSnippets, null, 2)}</pre>
      </div>
    </div>
  );
}
