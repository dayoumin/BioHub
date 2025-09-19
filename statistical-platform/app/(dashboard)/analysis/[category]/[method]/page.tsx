'use client'

import { useParams } from 'next/navigation'
import { StatisticalAnalysisTemplate } from '@/components/statistics/StatisticalAnalysisTemplate'
import { STATISTICAL_ANALYSIS_CONFIG } from '@/lib/statistics/ui-config'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// 테스트 데이터 경로 매핑 (id 기준으로 통일)
const TEST_DATA_PATHS: Record<string, string> = {
  // 기술통계
  'calculateDescriptiveStats': '/test-data/기술통계량_학생성적.csv',
  'normalityTest': '/test-data/정규성검정_품질측정.csv',
  'homogeneityTest': '/test-data/등분산검정_그룹비교.csv',

  // t-검정
  'oneSampleTTest': '/test-data/일표본t검정_기준점수.csv',
  'twoSampleTTest': '/test-data/독립표본t검정_성별차이.csv',
  'pairedTTest': '/test-data/대응표본t검정_치료전후.csv',
  'welchTTest': '/test-data/Welcht검정_분산차이.csv',

  // 분산분석
  'oneWayANOVA': '/test-data/일원분산분석_치료법비교.csv',
  'twoWayANOVA': '/test-data/이원분산분석_성별교육.csv',
  'tukeyHSD': '/test-data/사후검정_다중비교.csv',
  'bonferroniPostHoc': '/test-data/사후검정_다중비교.csv',
  'gamesHowellPostHoc': '/test-data/사후검정_다중비교.csv',

  // 회귀분석
  'simpleLinearRegression': '/test-data/단순선형회귀_공부시간성적.csv',
  'multipleRegression': '/test-data/다중회귀분석_부동산가격.csv',
  'logisticRegression': '/test-data/로지스틱회귀_합격여부.csv',
  'correlationAnalysis': '/test-data/상관분석_키와몸무게.csv',

  // 비모수검정
  'mannWhitneyU': '/test-data/Mann-Whitney검정_만족도조사.csv',
  'wilcoxonSignedRank': '/test-data/Wilcoxon검정_운동전후.csv',
  'kruskalWallis': '/test-data/Kruskal-Wallis검정_브랜드선호.csv',
  'dunnTest': '/test-data/사후검정_다중비교.csv',
  'chiSquareTest': '/test-data/카이제곱검정_성별선호도.csv',

  // 고급분석
  'principalComponentAnalysis': '/test-data/주성분분석_설문조사.csv',
  'kMeansClustering': '/test-data/클러스터링_고객세분화.csv',
  'hierarchicalClustering': '/test-data/클러스터링_고객세분화.csv'
}

export default function StatisticalMethodPage() {
  const params = useParams()
  const category = params.category as string
  const methodParam = decodeURIComponent(params.method as string)

  // 모든 카테고리에서 해당 메서드 찾기: id 우선, popular는 제외하고 캐논컬 우선
  let method = null as any
  let categoryInfo = null as any

  const nonPopular = STATISTICAL_ANALYSIS_CONFIG.filter(c => c.id !== 'popular')
  // 1) id 완전 일치
  for (const config of nonPopular) {
    const found = config.tests.find(t => t.id === methodParam)
    if (found) { method = found; categoryInfo = config; break }
  }
  // 2) name/nameEn 일치(후방 호환)
  if (!method) {
    for (const config of nonPopular) {
      const found = config.tests.find(t => t.name === methodParam || t.nameEn === methodParam)
      if (found) { method = found; categoryInfo = config; break }
    }
  }
  // 3) popular까지 포함(마지막 보정)
  if (!method) {
    for (const config of STATISTICAL_ANALYSIS_CONFIG) {
      const found = config.tests.find(t => t.id === methodParam || t.name === methodParam || t.nameEn === methodParam)
      if (found) { method = found; categoryInfo = config; break }
    }
  }

  // 메서드를 찾지 못한 경우
  if (!method || !categoryInfo) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>페이지를 찾을 수 없습니다</AlertTitle>
              <AlertDescription className="mt-2">
                요청하신 통계 분석 방법 &quot;{methodName}&quot;을(를) 찾을 수 없습니다.
              </AlertDescription>
            </Alert>
            <div className="mt-6 flex gap-4">
              <Button asChild>
                <Link href="/analysis">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  통계 분석 목록으로
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">홈으로</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 카테고리 URL이 일치하는지 확인
  if (category !== categoryInfo.id) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>잘못된 카테고리</AlertTitle>
              <AlertDescription className="mt-2">
                이 분석 방법은 {categoryInfo.title} 카테고리에 속합니다.
              </AlertDescription>
            </Alert>
            <div className="mt-6">
              <Button asChild>
                <Link href={`/analysis/${categoryInfo.id}/${encodeURIComponent(method.name)}`}>
                  올바른 페이지로 이동
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const testDataPath = TEST_DATA_PATHS[method.id]

  return (
    <div className="container mx-auto py-6">
      {/* 네비게이션 */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">홈</Link>
        <span>/</span>
        <Link href="/analysis" className="hover:text-foreground">통계 분석</Link>
        <span>/</span>
        <Link href={`/analysis/${category}`} className="hover:text-foreground">
          {categoryInfo.title}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{method.name}</span>
      </div>

      {/* 뒤로 가기 버튼 */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/analysis">
            <ArrowLeft className="h-4 w-4 mr-2" />
            통계 분석 목록
          </Link>
        </Button>
      </div>

      {/* 통계 분석 템플릿 */}
      <StatisticalAnalysisTemplate
        method={method}
        testDataPath={testDataPath}
      />

      {/* 관련 통계 방법 추천 */}
      {method.relatedTests && method.relatedTests.length > 0 && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-4">관련 통계 분석</h3>
            <div className="flex flex-wrap gap-2">
              {method.relatedTests.map(relatedId => {
                // 관련 테스트 찾기
                let relatedMethod = null
                let relatedCategory = null

                for (const config of STATISTICAL_ANALYSIS_CONFIG) {
                  const found = config.tests.find(t => t.id === relatedId)
                  if (found) {
                    relatedMethod = found
                    relatedCategory = config
                    break
                  }
                }

                if (!relatedMethod || !relatedCategory) return null

                return (
                  <Button key={relatedId} asChild variant="outline" size="sm">
                    <Link href={`/analysis/${relatedCategory.id}/${encodeURIComponent(relatedMethod.name)}`}>
                      {relatedMethod.name}
                    </Link>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}