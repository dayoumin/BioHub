#!/usr/bin/env python3
"""
mann-whitney/page.tsx의 2개 테이블을 StatisticsTable로 변환하는 스크립트
"""

import re

# 파일 경로
FILE_PATH = "app/(dashboard)/statistics/mann-whitney/page.tsx"

# Table 1: U 검정 통계량 테이블 (Lines 456-495)
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
                          <td className="border p-2 font-medium">U 통계량</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.uValue}</td>
                          <td className="border p-2 text-sm text-muted-foreground">Mann-Whitney U 값</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">검정통계량</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.statistic.toFixed(4)}</td>
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
                          <td className="border p-2 font-medium">그룹 1 순위합</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.rankSum1.toFixed(1)}</td>
                          <td className="border p-2 text-sm text-muted-foreground">첫 번째 그룹 순위합</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">그룹 2 순위합</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.rankSum2.toFixed(1)}</td>
                          <td className="border p-2 text-sm text-muted-foreground">두 번째 그룹 순위합</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>'''

TABLE1_NEW = '''                  <StatisticsTable
                    title="Mann-Whitney U 검정 통계량"
                    description="순위합과 U 통계량 결과"
                    columns={[
                      { key: 'name', header: '통계량', type: 'text', align: 'left' },
                      { key: 'value', header: '값', type: 'custom', align: 'right', formatter: (v) => v },
                      { key: 'description', header: '설명', type: 'text', align: 'center' }
                    ]}
                    data={[
                      { name: 'U 통계량', value: analysisResult.uValue, description: 'Mann-Whitney U 값' },
                      { name: '검정통계량', value: analysisResult.statistic.toFixed(4), description: '표준화된 검정통계량' },
                      { name: 'p-값', value: <PValueBadge value={analysisResult.pValue} />, description: '양측 검정' },
                      { name: '그룹 1 순위합', value: analysisResult.rankSum1.toFixed(1), description: '첫 번째 그룹 순위합' },
                      { name: '그룹 2 순위합', value: analysisResult.rankSum2.toFixed(1), description: '두 번째 그룹 순위합' }
                    ]}
                    bordered
                    compactMode
                  />'''

# Table 2: 기술통계 테이블 (Lines 507-548)
TABLE2_OLD = '''                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">집단</th>
                          <th className="border p-2 text-right">N</th>
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
                          <td className="border p-2 font-medium">그룹 1</td>
                          <td className="border p-2 text-right">{analysisResult.nobs1}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group1.median.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group1.mean.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group1.q1.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group1.q3.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group1.iqr.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">
                            {analysisResult.descriptives.group1.min.toFixed(2)} - {analysisResult.descriptives.group1.max.toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">그룹 2</td>
                          <td className="border p-2 text-right">{analysisResult.nobs2}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group2.median.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group2.mean.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group2.q1.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group2.q3.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group2.iqr.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">
                            {analysisResult.descriptives.group2.min.toFixed(2)} - {analysisResult.descriptives.group2.max.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>'''

TABLE2_NEW = '''                  <StatisticsTable
                    title="집단별 기술통계량"
                    columns={[
                      { key: 'group', header: '집단', type: 'text', align: 'left' },
                      { key: 'n', header: 'N', type: 'number', align: 'right' },
                      { key: 'median', header: '중위수', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'mean', header: '평균', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'q1', header: 'Q1', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'q3', header: 'Q3', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'iqr', header: 'IQR', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'range', header: '범위', type: 'custom', align: 'right', formatter: (v: string) => v }
                    ]}
                    data={[
                      {
                        group: '그룹 1',
                        n: analysisResult.nobs1,
                        median: analysisResult.descriptives.group1.median,
                        mean: analysisResult.descriptives.group1.mean,
                        q1: analysisResult.descriptives.group1.q1,
                        q3: analysisResult.descriptives.group1.q3,
                        iqr: analysisResult.descriptives.group1.iqr,
                        range: `${analysisResult.descriptives.group1.min.toFixed(2)} - ${analysisResult.descriptives.group1.max.toFixed(2)}`
                      },
                      {
                        group: '그룹 2',
                        n: analysisResult.nobs2,
                        median: analysisResult.descriptives.group2.median,
                        mean: analysisResult.descriptives.group2.mean,
                        q1: analysisResult.descriptives.group2.q1,
                        q3: analysisResult.descriptives.group2.q3,
                        iqr: analysisResult.descriptives.group2.iqr,
                        range: `${analysisResult.descriptives.group2.min.toFixed(2)} - ${analysisResult.descriptives.group2.max.toFixed(2)}`
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

    print("[OK] mann-whitney/page.tsx - 2 tables converted")

if __name__ == '__main__':
    main()
