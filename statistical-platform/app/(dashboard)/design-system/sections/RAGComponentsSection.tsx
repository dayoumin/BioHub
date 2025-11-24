'use client';

/**
 * RAG Components 라이브러리 섹션 (개발 전용)
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, MessageCircle, Settings, Database, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ragMetadata from '../metadata/rag-components.json';

export function RAGComponentsSection() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(ragMetadata.categories[0].name);

  const copyToClipboard = useCallback((code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    toast.success(`${label} 복사됨!`);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const currentCategory = ragMetadata.categories.find(c => c.name === selectedCategory);

  const getCategoryIcon = (name: string) => {
    if (name.includes('Core')) return MessageCircle;
    if (name.includes('Setup')) return Settings;
    if (name.includes('Services')) return Database;
    return MessageCircle;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold">RAG Components 라이브러리</h1>
          <Badge variant="outline" className="text-xs">DEV ONLY</Badge>
        </div>
        <p className="text-muted-foreground">
          Retrieval-Augmented Generation 시스템 컴포넌트 모음
        </p>
        <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
          <span>출처:</span>
          <span className="font-mono">components/rag/</span>
          <span className="font-mono">lib/rag/</span>
          <span className="font-mono">RAG_ARCHITECTURE.md</span>
        </div>
      </div>

      {/* 카테고리 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>카테고리 ({ragMetadata.categories.length}개)</CardTitle>
          <CardDescription>
            RAG 컴포넌트 분류
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ragMetadata.categories.map((category) => {
              const Icon = getCategoryIcon(category.name);
              const itemCount = category.components?.length || category.services?.length || 0;

              return (
                <Button
                  key={category.name}
                  variant={selectedCategory === category.name ? 'default' : 'outline'}
                  className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                  onClick={() => setSelectedCategory(category.name)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{category.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {itemCount}개
                  </Badge>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 카테고리의 컴포넌트/서비스 */}
      {currentCategory && (
        <Card>
          <CardHeader>
            <CardTitle>{currentCategory.name}</CardTitle>
            <CardDescription>{currentCategory.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* UI 컴포넌트 */}
              {currentCategory.components && currentCategory.components.map((component, index) => (
                <div
                  key={component.name}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <MessageCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      {/* 컴포넌트 이름 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{index + 1}. {component.name}</h3>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {component.path}
                        </code>
                      </div>

                      {/* 목적 */}
                      <p className="text-sm text-muted-foreground">{component.purpose}</p>

                      {/* Props */}
                      {component.props && (
                        <div className="bg-muted p-3 rounded">
                          <div className="text-xs text-muted-foreground mb-1">Props:</div>
                          <pre className="text-xs overflow-x-auto">
                            <code>{Object.entries(component.props as unknown as Record<string, string>).map(([key, value]) =>
                              `${key}: ${value}`
                            ).join('\n')}</code>
                          </pre>
                        </div>
                      )}

                      {/* Features */}
                      {component.features && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">주요 기능:</div>
                          <ul className="text-sm space-y-1">
                            {component.features.map((feature, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 사용 예제 */}
                      {component.usage && (
                        <div className="relative">
                          <div className="text-xs text-muted-foreground mb-2">사용 예제:</div>
                          <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-3 rounded overflow-x-auto">
                            <code>{component.usage}</code>
                          </pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-0 right-0"
                            onClick={() => copyToClipboard(component.usage, component.name)}
                          >
                            {copiedCode === component.name ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* 서비스 */}
              {currentCategory.services && currentCategory.services.map((service, index) => (
                <div
                  key={service.name}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Database className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      {/* 서비스 이름 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{index + 1}. {service.name}</h3>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {service.path}
                        </code>
                      </div>

                      {/* 목적 */}
                      <p className="text-sm text-muted-foreground">{service.purpose}</p>

                      {/* 시그니처 */}
                      {service.signature && (
                        <div className="bg-muted p-3 rounded">
                          <div className="text-xs text-muted-foreground mb-1">함수 시그니처:</div>
                          <pre className="text-xs overflow-x-auto">
                            <code>{service.signature}</code>
                          </pre>
                        </div>
                      )}

                      {/* 파라미터 */}
                      {service.parameters && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">파라미터:</div>
                          <ul className="text-sm space-y-1">
                            {Object.entries(service.parameters as unknown as Record<string, string>).map(([key, value]) => (
                              <li key={key} className="flex items-start gap-2">
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">{key}</code>
                                <span>: {value}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 메서드 (클래스인 경우) */}
                      {service.methods && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2">메서드:</div>
                          <ul className="text-sm space-y-1">
                            {service.methods.map((method, i) => (
                              <li key={i} className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                {method}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 반환값 */}
                      {service.returns && (
                        <div className="text-sm">
                          <span className="font-medium">반환:</span> {service.returns}
                        </div>
                      )}

                      {/* 사용 예제 */}
                      {service.example && (
                        <div className="relative">
                          <div className="text-xs text-muted-foreground mb-2">사용 예제:</div>
                          <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-3 rounded overflow-x-auto">
                            <code>{service.example}</code>
                          </pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-0 right-0"
                            onClick={() => copyToClipboard(service.example, service.name)}
                          >
                            {copiedCode === service.name ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 아키텍처 */}
      <Card>
        <CardHeader>
          <CardTitle>RAG 시스템 아키텍처</CardTitle>
          <CardDescription>
            전체 시스템 구조 및 레이어 분리
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 데이터 흐름 다이어그램 */}
            <div>
              <h4 className="font-semibold mb-3">데이터 흐름:</h4>
              <div className="bg-muted p-4 rounded font-mono text-xs whitespace-pre-line">
                {ragMetadata.architecture.diagram}
              </div>
            </div>

            {/* 레이어 구조 */}
            <div>
              <h4 className="font-semibold mb-3">레이어 구조 ({ragMetadata.architecture.layers.length}개):</h4>
              <div className="space-y-4">
                {ragMetadata.architecture.layers.map((layer, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h5 className="font-medium mb-2">{layer.name}</h5>
                    <p className="text-sm text-muted-foreground mb-2">{layer.responsibility}</p>
                    <div className="flex flex-wrap gap-2">
                      {layer.components.map((comp) => (
                        <Badge key={comp} variant="secondary" className="text-xs">
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통합 패턴 */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            {ragMetadata.integrationPattern.name}
          </CardTitle>
          <CardDescription>
            {ragMetadata.integrationPattern.location}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 코드 예제 */}
            <div className="relative">
              <pre className="text-xs bg-white dark:bg-gray-900 p-4 rounded overflow-x-auto">
                <code>{ragMetadata.integrationPattern.code}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(ragMetadata.integrationPattern.code, 'Integration Pattern')}
              >
                {copiedCode === 'Integration Pattern' ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                복사
              </Button>
            </div>

            {/* 주요 기능 */}
            <div>
              <h4 className="font-semibold mb-2">주요 기능:</h4>
              <ul className="text-sm space-y-1">
                {ragMetadata.integrationPattern.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Best Practices</CardTitle>
          <CardDescription>
            RAG 컴포넌트 사용 시 권장 패턴
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {ragMetadata.bestPractices.map((practice, index) => (
              <div key={index} className="space-y-3">
                <div>
                  <h3 className="font-semibold">
                    {index + 1}. {practice.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {practice.description}
                  </p>
                </div>

                <div className="relative">
                  <pre className="text-xs bg-green-50 dark:bg-green-950/20 p-3 rounded overflow-x-auto max-h-[400px]">
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

      {/* Troubleshooting */}
      <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Troubleshooting
          </CardTitle>
          <CardDescription>
            자주 발생하는 문제 및 해결 방법
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ragMetadata.troubleshooting.map((item, index) => (
              <div
                key={index}
                className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 bg-white dark:bg-gray-900"
              >
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                  {index + 1}. {item.issue}
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">증상:</span> {item.symptoms}
                  </div>
                  <div>
                    <span className="font-medium">해결 방법:</span>
                    <ul className="mt-1 space-y-1 ml-4">
                      {item.solutions.map((solution, i) => (
                        <li key={i} className="list-disc">{solution}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI용 메타데이터 (숨김) */}
      <div
        className="hidden"
        data-ai-context="rag-components"
        data-version={ragMetadata.version}
        data-last-updated={ragMetadata.lastUpdated}
      >
        <pre>{JSON.stringify(ragMetadata, null, 2)}</pre>
      </div>
    </div>
  );
}
