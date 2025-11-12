#!/usr/bin/env python3
"""
wilcoxon/page.tsx의 2개 테이블을 StatisticsTable로 변환하는 스크립트
"""

import re

# 파일 경로
FILE_PATH = "app/(dashboard)/statistics/wilcoxon/page.tsx"

# Table 1: 통계량 테이블 (Lines 420-461)
TABLE1_OLD = '''                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">통계량</th>
                          <th className="border p-2 text-right">값</th>
                          <th className="border p-2 text-center">설명</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-2 font-medium">W 통계량</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.statistic.toFixed(1)}</td>
                          <td className="border p-2 text-sm text-muted-foreground">부호순위합</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">Z 점수</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.zScore.toFixed(4)}</td>
                          <td className="border p-2 text-sm text-muted-foreground">표준화된 검정통계량</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">p-값</td>
                          <td className="border p-2 text-right">
                            <PValueBadge value={analysisResult.pValue} />
                          </td>
                          <td className="border p-2 text-sm text-muted-foreground">양측 검정</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">유효 표본 수</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.nobs}</td>
                          <td className="border p-2 text-sm text-muted-foreground">동점 제외</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">중위수 차이</td>
                          <td className="border p-2 text-right font-mono">
                            {analysisResult.medianDiff > 0 ? '+' : ''}{analysisResult.medianDiff.toFixed(3)}
                          </td>
                          <td className="border p-2 text-sm text-muted-foreground">사후 - 사전</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>'''

TABLE1_NEW = '''                  <StatisticsTable
                    title="Wilcoxon 검정 통계량"
                    description="W 통계량과 검정 결과"
                    columns={[
                      { key: 'name', header: '통계량', type: 'text', align: 'left' },
                      { key: 'value', header: '값', type: 'custom', align: 'right', formatter: (v) => v },
                      { key: 'description', header: '설명', type: 'text', align: 'center' }
                    ]}
                    data={[
                      { name: 'W 통계량', value: analysisResult.statistic.toFixed(1), description: '부호순위합' },
                      { name: 'Z 점수', value: analysisResult.zScore.toFixed(4), description: '표준화된 검정통계량' },
                      { name: 'p-값', value: <PValueBadge value={analysisResult.pValue} />, description: '양측 검정' },
                      { name: '유효 표본 수', value: analysisResult.nobs, description: '동점 제외' },
                      { name: '중위수 차이', value: `${analysisResult.medianDiff > 0 ? '+' : ''}${analysisResult.medianDiff.toFixed(3)}`, description: '사후 - 사전' }
                    ]}
                    bordered
                    compactMode
                  />'''

# Table 2: 기술통계 테이블 (Lines 473-511)
TABLE2_OLD = '''                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">시점</th>
                          <th className="border p-2 text-right">중위수</th>
                          <th className="border p-2 text-right">평균</th>
                          <th className="border p-2 text-right">Q1</th>
                          <th className="border p-2 text-right">Q3</th>
                          <th className="border p-2 text-right">IQR</th>
                          <th className="border p-2 text-right">범위</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-2 font-medium">사전</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.before.median.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.before.mean.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.before.q1.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.before.q3.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.before.iqr.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">
                            {analysisResult.descriptives.before.min.toFixed(2)} - {analysisResult.descriptives.before.max.toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">사후</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.after.median.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.after.mean.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.after.q1.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.after.q3.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.after.iqr.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">
                            {analysisResult.descriptives.after.min.toFixed(2)} - {analysisResult.descriptives.after.max.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>'''

TABLE2_NEW = '''                  <StatisticsTable
                    title="사전-사후 기술통계량"
                    columns={[
                      { key: 'timepoint', header: '시점', type: 'text', align: 'left' },
                      { key: 'median', header: '중위수', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'mean', header: '평균', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'q1', header: 'Q1', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'q3', header: 'Q3', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'iqr', header: 'IQR', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'range', header: '범위', type: 'custom', align: 'right', formatter: (v: string) => v }
                    ]}
                    data={[
                      {
                        timepoint: '사전',
                        median: analysisResult.descriptives.before.median,
                        mean: analysisResult.descriptives.before.mean,
                        q1: analysisResult.descriptives.before.q1,
                        q3: analysisResult.descriptives.before.q3,
                        iqr: analysisResult.descriptives.before.iqr,
                        range: `${analysisResult.descriptives.before.min.toFixed(2)} - ${analysisResult.descriptives.before.max.toFixed(2)}`
                      },
                      {
                        timepoint: '사후',
                        median: analysisResult.descriptives.after.median,
                        mean: analysisResult.descriptives.after.mean,
                        q1: analysisResult.descriptives.after.q1,
                        q3: analysisResult.descriptives.after.q3,
                        iqr: analysisResult.descriptives.after.iqr,
                        range: `${analysisResult.descriptives.after.min.toFixed(2)} - ${analysisResult.descriptives.after.max.toFixed(2)}`
                      }
                    ]}
                    bordered
                    compactMode
                  />'''

def main():
    # 파일 읽기
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # 교체 수행
    content = content.replace(TABLE1_OLD, TABLE1_NEW)
    content = content.replace(TABLE2_OLD, TABLE2_NEW)

    # 파일 쓰기
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(content)

    print("[OK] wilcoxon/page.tsx - 2 tables converted")

if __name__ == '__main__':
    main()
