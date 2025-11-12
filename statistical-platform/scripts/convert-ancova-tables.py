#!/usr/bin/env python3
"""
ancova/page.tsx의 3개 테이블을 StatisticsTable로 변환하는 스크립트
"""

import re

# 파일 경로
FILE_PATH = "app/(dashboard)/statistics/ancova/page.tsx"

# Table 1: 수정된 평균 테이블 (Lines 566-589)
TABLE1_OLD = '''                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-3 text-left">집단</th>
                          <th className="border p-3 text-center">수정된 평균</th>
                          <th className="border p-3 text-center">표준오차</th>
                          <th className="border p-3 text-center">95% 신뢰구간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.adjustedMeans.map(mean => (
                          <tr key={mean.group} className="hover:bg-muted/50">
                            <td className="border p-3 font-medium">{mean.group}</td>
                            <td className="border p-3 text-center font-mono text-lg">{mean.adjustedMean.toFixed(2)}</td>
                            <td className="border p-3 text-center font-mono">{mean.standardError.toFixed(2)}</td>
                            <td className="border p-3 text-center font-mono">
                              [{mean.ci95Lower.toFixed(2)}, {mean.ci95Upper.toFixed(2)}]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>'''

TABLE1_NEW = '''                <CardContent>
                  <StatisticsTable
                    title="수정된 평균"
                    columns={[
                      { key: 'group', header: '집단', type: 'text', align: 'left' },
                      { key: 'adjustedMean', header: '수정된 평균', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'standardError', header: '표준오차', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'ci95', header: '95% 신뢰구간', type: 'custom', align: 'center', formatter: (v: string) => v }
                    ]}
                    data={analysisResult.adjustedMeans.map(mean => ({
                      group: mean.group,
                      adjustedMean: mean.adjustedMean,
                      standardError: mean.standardError,
                      ci95: `[${mean.ci95Lower.toFixed(2)}, ${mean.ci95Upper.toFixed(2)}]`
                    }))}
                    bordered
                    compactMode
                  />'''

# Table 2: ANCOVA 결과 테이블 (Lines 604-642)
TABLE2_OLD = '''                <CardContent className="space-y-6">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-3 text-left">변수원</th>
                          <th className="border p-3 text-center">자유도</th>
                          <th className="border p-3 text-center">F 통계량</th>
                          <th className="border p-3 text-center">p-값</th>
                          <th className="border p-3 text-center">부분 η²</th>
                          <th className="border p-3 text-center">검정력</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.covariates.map(cov => (
                          <tr key={cov.covariate} className="hover:bg-muted/50">
                            <td className="border p-3 font-medium">{cov.covariate}</td>
                            <td className="border p-3 text-center">{cov.degreesOfFreedom[0]}, {cov.degreesOfFreedom[1]}</td>
                            <td className="border p-3 text-center font-mono">{cov.statistic.toFixed(2)}</td>
                            <td className="border p-3 text-center">
                              <PValueBadge value={cov.pValue} />
                            </td>
                            <td className="border p-3 text-center font-mono">{cov.partialEtaSquared.toFixed(3)}</td>
                            <td className="border p-3 text-center">-</td>
                          </tr>
                        ))}
                        {analysisResult.mainEffects.map(effect => (
                          <tr key={effect.factor} className="hover:bg-muted/50 bg-muted">
                            <td className="border p-3 font-bold">{effect.factor}</td>
                            <td className="border p-3 text-center">{effect.degreesOfFreedom[0]}, {effect.degreesOfFreedom[1]}</td>
                            <td className="border p-3 text-center font-mono font-bold">{effect.statistic.toFixed(2)}</td>
                            <td className="border p-3 text-center">
                              <PValueBadge value={effect.pValue} />
                            </td>
                            <td className="border p-3 text-center font-mono font-bold">{effect.partialEtaSquared.toFixed(3)}</td>
                            <td className="border p-3 text-center font-mono">{(effect.observedPower * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>'''

TABLE2_NEW = '''                <CardContent className="space-y-6">
                  <StatisticsTable
                    title="ANCOVA 분산표"
                    columns={[
                      { key: 'source', header: '변수원', type: 'text', align: 'left' },
                      { key: 'df', header: '자유도', type: 'custom', align: 'center', formatter: (v: string) => v },
                      { key: 'statistic', header: 'F 통계량', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'pValue', header: 'p-값', type: 'custom', align: 'center', formatter: (v) => v },
                      { key: 'partialEtaSquared', header: '부분 η²', type: 'number', align: 'center', formatter: (v) => v.toFixed(3) },
                      { key: 'power', header: '검정력', type: 'custom', align: 'center', formatter: (v) => v }
                    ]}
                    data={[
                      ...analysisResult.covariates.map(cov => ({
                        source: cov.covariate,
                        df: `${cov.degreesOfFreedom[0]}, ${cov.degreesOfFreedom[1]}`,
                        statistic: cov.statistic,
                        pValue: <PValueBadge value={cov.pValue} />,
                        partialEtaSquared: cov.partialEtaSquared,
                        power: '-'
                      })),
                      ...analysisResult.mainEffects.map(effect => ({
                        source: effect.factor,
                        df: `${effect.degreesOfFreedom[0]}, ${effect.degreesOfFreedom[1]}`,
                        statistic: effect.statistic,
                        pValue: <PValueBadge value={effect.pValue} />,
                        partialEtaSquared: effect.partialEtaSquared,
                        power: `${(effect.observedPower * 100).toFixed(0)}%`
                      }))
                    ]}
                    bordered
                    compactMode
                  />'''

# Table 3: 사후검정 테이블 (Lines 677-714)
TABLE3_OLD = '''                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-3 text-left">비교</th>
                          <th className="border p-3 text-center">평균차</th>
                          <th className="border p-3 text-center">표준오차</th>
                          <th className="border p-3 text-center">t값</th>
                          <th className="border p-3 text-center">보정 p-값</th>
                          <th className="border p-3 text-center">Cohen&apos;s d</th>
                          <th className="border p-3 text-center">95% 신뢰구간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.postHoc.map((result, index) => (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="border p-3 font-medium">{result.comparison}</td>
                            <td className="border p-3 text-center font-mono">{result.meanDiff.toFixed(2)}</td>
                            <td className="border p-3 text-center font-mono">{result.standardError.toFixed(2)}</td>
                            <td className="border p-3 text-center font-mono">{result.tValue.toFixed(2)}</td>
                            <td className="border p-3 text-center">
                              <PValueBadge value={result.adjustedPValue} />
                            </td>
                            <td className="border p-3 text-center">
                              <div className="space-y-1">
                                <span className="font-mono">{result.cohensD.toFixed(2)}</span>
                                <Badge variant="outline" className="text-xs block">
                                  {getCohensInterpretation(result.cohensD)}
                                </Badge>
                              </div>
                            </td>
                            <td className="border p-3 text-center font-mono text-xs">
                              [{result.lowerCI.toFixed(2)}, {result.upperCI.toFixed(2)}]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>'''

TABLE3_NEW = '''                <CardContent>
                  <StatisticsTable
                    title="사후검정"
                    columns={[
                      { key: 'comparison', header: '비교', type: 'text', align: 'left' },
                      { key: 'meanDiff', header: '평균차', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'standardError', header: '표준오차', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'tValue', header: 't값', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'adjustedPValue', header: '보정 p-값', type: 'custom', align: 'center', formatter: (v) => v },
                      { key: 'cohensD', header: "Cohen's d", type: 'custom', align: 'center', formatter: (v) => v },
                      { key: 'ci95', header: '95% 신뢰구간', type: 'custom', align: 'center', formatter: (v: string) => v }
                    ]}
                    data={analysisResult.postHoc.map((result, index) => ({
                      comparison: result.comparison,
                      meanDiff: result.meanDiff,
                      standardError: result.standardError,
                      tValue: result.tValue,
                      adjustedPValue: <PValueBadge value={result.adjustedPValue} />,
                      cohensD: (
                        <div className="space-y-1">
                          <span className="font-mono">{result.cohensD.toFixed(2)}</span>
                          <Badge variant="outline" className="text-xs block">
                            {getCohensInterpretation(result.cohensD)}
                          </Badge>
                        </div>
                      ),
                      ci95: `[${result.lowerCI.toFixed(2)}, ${result.upperCI.toFixed(2)}]`
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

    print("[OK] ancova/page.tsx - 3 tables converted")

if __name__ == '__main__':
    main()
