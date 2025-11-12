#!/usr/bin/env python3
"""
kruskal-wallis/page.tsx의 3개 테이블을 StatisticsTable로 변환하는 스크립트
"""

import re

# 파일 경로
FILE_PATH = "app/(dashboard)/statistics/kruskal-wallis/page.tsx"

# Table 1: 통계량 테이블 (Lines 475-512)
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
                          <td className="border p-2 font-medium">H 통계량</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.statistic.toFixed(4)}</td>
                          <td className="border p-2 text-sm text-muted-foreground">Kruskal-Wallis H 값</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">자유도</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.degreesOfFreedom}</td>
                          <td className="border p-2 text-sm text-muted-foreground">df = k - 1</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">p-값</td>
                          <td className="border p-2 text-right">
                            <PValueBadge value={analysisResult.pValue} />
                          </td>
                          <td className="border p-2 text-sm text-muted-foreground">카이제곱 분포</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">집단 수</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.nGroups}</td>
                          <td className="border p-2 text-sm text-muted-foreground">비교 집단 개수</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">총 표본 수</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.totalN}</td>
                          <td className="border p-2 text-sm text-muted-foreground">전체 관측값</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>'''

TABLE1_NEW = '''                  <StatisticsTable
                    title="Kruskal-Wallis 검정 통계량"
                    description="H 통계량과 검정 결과"
                    columns={[
                      { key: 'name', header: '통계량', type: 'text', align: 'left' },
                      { key: 'value', header: '값', type: 'custom', align: 'right', formatter: (v) => v },
                      { key: 'description', header: '설명', type: 'text', align: 'center' }
                    ]}
                    data={[
                      { name: 'H 통계량', value: analysisResult.statistic.toFixed(4), description: 'Kruskal-Wallis H 값' },
                      { name: '자유도', value: analysisResult.degreesOfFreedom, description: 'df = k - 1' },
                      { name: 'p-값', value: <PValueBadge value={analysisResult.pValue} />, description: '카이제곱 분포' },
                      { name: '집단 수', value: analysisResult.nGroups, description: '비교 집단 개수' },
                      { name: '총 표본 수', value: analysisResult.totalN, description: '전체 관측값' }
                    ]}
                    bordered
                    compactMode
                  />'''

# Table 2: 기술통계 테이블 (Lines 525-556)
TABLE2_OLD = '''                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">집단</th>
                          <th className="border p-2 text-right">N</th>
                          <th className="border p-2 text-right">중위수</th>
                          <th className="border p-2 text-right">평균</th>
                          <th className="border p-2 text-right">평균순위</th>
                          <th className="border p-2 text-right">Q1</th>
                          <th className="border p-2 text-right">Q3</th>
                          <th className="border p-2 text-right">범위</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(analysisResult.descriptives).map(([groupName, stats], index) => (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="border p-2 font-medium">{groupName}</td>
                            <td className="border p-2 text-right">{stats.n}</td>
                            <td className="border p-2 text-right font-mono">{stats.median.toFixed(3)}</td>
                            <td className="border p-2 text-right font-mono">{stats.mean.toFixed(3)}</td>
                            <td className="border p-2 text-right font-mono">{stats.meanRank.toFixed(2)}</td>
                            <td className="border p-2 text-right font-mono">{stats.q1.toFixed(3)}</td>
                            <td className="border p-2 text-right font-mono">{stats.q3.toFixed(3)}</td>
                            <td className="border p-2 text-right font-mono text-xs">
                              {stats.min.toFixed(2)} - {stats.max.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>'''

TABLE2_NEW = '''                  <StatisticsTable
                    title="집단별 기술통계량"
                    columns={[
                      { key: 'groupName', header: '집단', type: 'text', align: 'left' },
                      { key: 'n', header: 'N', type: 'number', align: 'right' },
                      { key: 'median', header: '중위수', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'mean', header: '평균', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'meanRank', header: '평균순위', type: 'number', align: 'right', formatter: (v) => v.toFixed(2) },
                      { key: 'q1', header: 'Q1', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'q3', header: 'Q3', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'range', header: '범위', type: 'custom', align: 'right', formatter: (v: string) => v }
                    ]}
                    data={Object.entries(analysisResult.descriptives).map(([groupName, stats]) => ({
                      groupName,
                      n: stats.n,
                      median: stats.median,
                      mean: stats.mean,
                      meanRank: stats.meanRank,
                      q1: stats.q1,
                      q3: stats.q3,
                      range: `${stats.min.toFixed(2)} - ${stats.max.toFixed(2)}`
                    }))}
                    bordered
                    compactMode
                  />'''

# Table 3: 사후검정 테이블 (Lines 636-665)
TABLE3_OLD = '''                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border p-2 text-left">비교</th>
                              <th className="border p-2 text-right">평균순위 차이</th>
                              <th className="border p-2 text-right">p-값</th>
                              <th className="border p-2 text-center">유의성</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisResult.postHoc.comparisons.map((comp, index) => (
                              <tr key={index} className="hover:bg-muted/50">
                                <td className="border p-2 font-medium">
                                  {comp.group1} vs {comp.group2}
                                </td>
                                <td className="border p-2 text-right font-mono">
                                  {comp.meanRankDiff > 0 ? '+' : ''}{comp.meanRankDiff.toFixed(2)}
                                </td>
                                <td className="border p-2 text-right">
                                  <PValueBadge value={comp.pValue} size="sm" />
                                </td>
                                <td className="border p-2 text-center">
                                  <Badge variant={comp.significant ? "default" : "outline"}>
                                    {comp.significant ? "유의" : "비유의"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>'''

TABLE3_NEW = '''                      <StatisticsTable
                        title="사후검정"
                        columns={[
                          { key: 'comparison', header: '비교', type: 'text', align: 'left' },
                          { key: 'meanRankDiff', header: '평균순위 차이', type: 'number', align: 'right', formatter: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}` },
                          { key: 'pValue', header: 'p-값', type: 'custom', align: 'right', formatter: (v) => v },
                          { key: 'significant', header: '유의성', type: 'custom', align: 'center', formatter: (v) => v }
                        ]}
                        data={analysisResult.postHoc.comparisons.map(comp => ({
                          comparison: `${comp.group1} vs ${comp.group2}`,
                          meanRankDiff: comp.meanRankDiff,
                          pValue: <PValueBadge value={comp.pValue} size="sm" />,
                          significant: <Badge variant={comp.significant ? "default" : "outline"}>{comp.significant ? "유의" : "비유의"}</Badge>
                        }))}
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
    content = content.replace(TABLE3_OLD, TABLE3_NEW)

    # 파일 쓰기
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(content)

    print("[OK] kruskal-wallis/page.tsx: 3개 테이블 변환 완료")

if __name__ == '__main__':
    main()
