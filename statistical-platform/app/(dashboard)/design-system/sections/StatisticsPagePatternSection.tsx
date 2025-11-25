'use client';

/**
 * 통계 페이지 작성 규칙 섹션 (개발 전용)
 *
 * 이 컴포넌트는 개발 환경에서만 렌더링되며,
 * 프로덕션 빌드 시 완전히 제외됩니다.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { STATISTICS_PAGE_TEMPLATE, CODE_EXAMPLES } from '../constants-dev';

// AI 메타데이터 임포트 (개발 환경에서만)
import statsMetadata from '../coding-patterns/statistics-page-pattern.json';

export function StatisticsPagePatternSection() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = useCallback((code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    toast.success(`${label} 복사됨!`);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ========================================
          헤더
      ======================================== */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold">통계 페이지 작성 규칙</h1>
          <Badge variant="outline" className="text-xs">
            DEV ONLY
          </Badge>
        </div>
        <p className="text-muted-foreground">
          43개 통계 페이지 표준 패턴 (useStatisticsPage + PyodideCore)
        </p>
        <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
          <span>출처:</span>
          <span className="font-mono">STATISTICS_CODING_STANDARDS.md</span>
          <span className="font-mono">AI-CODING-RULES.md</span>
          <span className="font-mono">TROUBLESHOOTING_ISANALYZING_BUG.md</span>
        </div>
      </div>

      {/* ========================================
          Good vs Bad 비교
      ======================================== */}
      <Card>
        <CardHeader>
          <CardTitle>Good vs Bad 패턴</CardTitle>
          <CardDescription>
            반드시 지켜야 할 규칙과 금지 패턴
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Bad */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">
                  ❌ Bad (금지 패턴)
                </h3>
              </div>

              {Object.entries(CODE_EXAMPLES.bad).map(([key, code]) => (
                <div key={key} className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
                  <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded overflow-x-auto">
                    <code>{code}</code>
                  </pre>
                </div>
              ))}
            </div>

            {/* Good */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
                  ✅ Good (권장 패턴)
                </h3>
              </div>

              {Object.entries(CODE_EXAMPLES.good).map(([key, code]) => (
                <div key={key} className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                  <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded overflow-x-auto">
                    <code>{code}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          전체 템플릿
      ======================================== */}
      <Card>
        <CardHeader>
          <CardTitle>전체 템플릿</CardTitle>
          <CardDescription>
            새 통계 페이지 작성 시 이 템플릿을 복사하여 시작하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-[600px]">
              <code>{STATISTICS_PAGE_TEMPLATE}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(STATISTICS_PAGE_TEMPLATE, '템플릿')}
            >
              {copiedCode === '템플릿' ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              복사
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          필수 규칙
      ======================================== */}
      <Card>
        <CardHeader>
          <CardTitle>필수 규칙 ({statsMetadata.mandatoryRules.length}개)</CardTitle>
          <CardDescription>
            반드시 지켜야 하는 코딩 규칙
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statsMetadata.mandatoryRules.map((rule, index) => (
              <div
                key={rule.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Badge
                    variant={
                      rule.severity === 'critical' ? 'destructive' :
                      rule.severity === 'error' ? 'destructive' :
                      'secondary'
                    }
                    className="mt-1"
                  >
                    {rule.severity}
                  </Badge>
                  <div className="flex-1 space-y-2">
                    <h4 className="font-semibold">{index + 1}. {rule.rule}</h4>
                    <p className="text-sm text-muted-foreground">{rule.reason}</p>

                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                      <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded">
                        <div className="text-xs text-green-700 dark:text-green-300 font-semibold mb-1">
                          ✅ Correct
                        </div>
                        <pre className="text-xs overflow-x-auto">
                          <code>{rule.correct}</code>
                        </pre>
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded">
                        <div className="text-xs text-red-700 dark:text-red-300 font-semibold mb-1">
                          ❌ Forbidden
                        </div>
                        <pre className="text-xs overflow-x-auto">
                          <code>{rule.forbidden}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          Critical Bugs 경고
      ======================================== */}
      <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Critical Bugs (반드시 회피)
          </CardTitle>
          <CardDescription>
            과거 10개 페이지에서 발생한 치명적 버그
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statsMetadata.criticalBugs.map((bug, index) => (
              <div
                key={index}
                className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 bg-white dark:bg-gray-900"
              >
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                  {index + 1}. {bug.name}
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">증상:</span> {bug.symptom}
                  </div>
                  <div>
                    <span className="font-medium">원인:</span> {bug.cause}
                  </div>
                  <div>
                    <span className="font-medium">해결:</span> {bug.fix}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    참고: {bug.reference}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          관련 APIs
      ======================================== */}
      <Card>
        <CardHeader>
          <CardTitle>관련 APIs</CardTitle>
          <CardDescription>
            통계 페이지 작성 시 사용하는 주요 APIs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Hooks</h4>
              <div className="space-y-2">
                {statsMetadata.relatedAPIs.hooks.map((hook) => (
                  <div key={hook} className="text-sm">
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {hook}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Utilities</h4>
              <div className="space-y-2">
                {statsMetadata.relatedAPIs.utilities.map((util) => (
                  <div key={util} className="text-sm">
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {util}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Types</h4>
              <div className="space-y-2">
                {statsMetadata.relatedAPIs.types.map((type) => (
                  <div key={type} className="text-sm">
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {type}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Services</h4>
              <div className="space-y-2">
                {statsMetadata.relatedAPIs.services.map((service) => (
                  <div key={service} className="text-sm">
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {service}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================
          AI용 메타데이터 (숨김 - Claude Code가 읽음)
      ======================================== */}
      <div
        className="hidden"
        data-ai-context="statistics-page-pattern"
        data-version={statsMetadata.version}
        data-last-updated={statsMetadata.lastUpdated}
      >
        <pre>{JSON.stringify(statsMetadata, null, 2)}</pre>
      </div>
    </div>
  );
}
