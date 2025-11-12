#!/usr/bin/env python3
"""
partial-correlation/page.tsx의 2개 테이블을 StatisticsTable로 변환하는 스크립트
"""

import re

# 파일 경로
FILE_PATH = "app/(dashboard)/statistics/partial-correlation/page.tsx"

# Table 1: 편상관계수 테이블 (Lines 468-509)
TABLE1_OLD = '''                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">변수 1</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">변수 2</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">편상관계수</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">t 통계량</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">p값</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">자유도</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">강도</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.correlations.map((corr, index) => {
                        const strength = getCorrelationStrength(corr.partial_corr)
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">{corr.variable1}</td>
                            <td className="border border-gray-300 px-4 py-2 font-medium">{corr.variable2}</td>
                            <td className={`border border-gray-300 px-4 py-2 text-right font-semibold ${strength.color}`}>
                              {corr.partial_corr.toFixed(3)}
                              {corr.p_value < 0.05 && <span className="text-red-500">*</span>}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{corr.t_stat.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              <span className={corr.p_value < 0.05 ? 'text-muted-foreground font-medium' : ''}>
                                {corr.p_value.toFixed(4)}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{corr.df}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <Badge className={`${strength.bgColor} ${strength.color} border-0`}>
                                {strength.level}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>'''

TABLE1_NEW = '''                <StatisticsTable
                  title="편상관계수"
                  columns={[
                    { key: 'variable1', header: '변수 1', type: 'text', align: 'left' },
                    { key: 'variable2', header: '변수 2', type: 'text', align: 'left' },
                    { key: 'partialCorr', header: '편상관계수', type: 'custom', align: 'right', formatter: (v) => v },
                    { key: 'tStat', header: 't 통계량', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                    { key: 'pValue', header: 'p값', type: 'custom', align: 'right', formatter: (v) => v },
                    { key: 'df', header: '자유도', type: 'number', align: 'right' },
                    { key: 'strength', header: '강도', type: 'custom', align: 'center', formatter: (v) => v }
                  ] as const}
                  data={results.correlations.map((corr, index) => {
                    const strength = getCorrelationStrength(corr.partial_corr)
                    return {
                      variable1: corr.variable1,
                      variable2: corr.variable2,
                      partialCorr: (
                        <span className={`font-semibold ${strength.color}`}>
                          {corr.partial_corr.toFixed(3)}
                          {corr.p_value < 0.05 && <span className="text-red-500">*</span>}
                        </span>
                      ),
                      tStat: corr.t_stat,
                      pValue: (
                        <span className={corr.p_value < 0.05 ? 'text-muted-foreground font-medium' : ''}>
                          {corr.p_value.toFixed(4)}
                        </span>
                      ),
                      df: corr.df,
                      strength: (
                        <Badge className={`${strength.bgColor} ${strength.color} border-0`}>
                          {strength.level}
                        </Badge>
                      )
                    }
                  })}
                  bordered
                  compactMode
                />'''

# Table 2: 편상관 vs 단순상관 비교 (Lines 524-576)
TABLE2_OLD = '''                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">변수 쌍</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">단순상관</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">편상관</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">차이</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">해석</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.correlations.map((corr, index) => {
                        const zeroOrder = results.zero_order_correlations[index]
                        const difference = corr.partial_corr - zeroOrder.correlation
                        const absChange = Math.abs(difference)

                        let changeInterpretation = { text: '변화 없음', color: 'text-gray-600', bg: 'bg-gray-50' }
                        if (absChange > 0.2) {
                          changeInterpretation = { text: '큰 변화', color: 'text-muted-foreground', bg: 'bg-muted' }
                        } else if (absChange > 0.1) {
                          changeInterpretation = { text: '중간 변화', color: 'text-muted-foreground', bg: 'bg-muted' }
                        } else if (absChange > 0.05) {
                          changeInterpretation = { text: '작은 변화', color: 'text-muted-foreground', bg: 'bg-muted' }
                        }

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2">
                              {corr.variable1} - {corr.variable2}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {zeroOrder.correlation.toFixed(3)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                              {corr.partial_corr.toFixed(3)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-medium">
                              <span className={changeInterpretation.color}>
                                {difference > 0 ? '+' : ''}{difference.toFixed(3)}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <Badge className={`${changeInterpretation.bg} ${changeInterpretation.color} border-0`}>
                                {changeInterpretation.text}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>'''

TABLE2_NEW = '''                <StatisticsTable
                  title="편상관 vs 단순상관 비교"
                  columns={[
                    { key: 'variablePair', header: '변수 쌍', type: 'text', align: 'left' },
                    { key: 'zeroOrder', header: '단순상관', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                    { key: 'partial', header: '편상관', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                    { key: 'difference', header: '차이', type: 'custom', align: 'right', formatter: (v) => v },
                    { key: 'interpretation', header: '해석', type: 'custom', align: 'center', formatter: (v) => v }
                  ] as const}
                  data={results.correlations.map((corr, index) => {
                    const zeroOrder = results.zero_order_correlations[index]
                    const difference = corr.partial_corr - zeroOrder.correlation
                    const absChange = Math.abs(difference)

                    let changeInterpretation = { text: '변화 없음', color: 'text-gray-600', bg: 'bg-gray-50' }
                    if (absChange > 0.2) {
                      changeInterpretation = { text: '큰 변화', color: 'text-muted-foreground', bg: 'bg-muted' }
                    } else if (absChange > 0.1) {
                      changeInterpretation = { text: '중간 변화', color: 'text-muted-foreground', bg: 'bg-muted' }
                    } else if (absChange > 0.05) {
                      changeInterpretation = { text: '작은 변화', color: 'text-muted-foreground', bg: 'bg-muted' }
                    }

                    return {
                      variablePair: `${corr.variable1} - ${corr.variable2}`,
                      zeroOrder: zeroOrder.correlation,
                      partial: corr.partial_corr,
                      difference: (
                        <span className={`font-medium ${changeInterpretation.color}`}>
                          {difference > 0 ? '+' : ''}{difference.toFixed(3)}
                        </span>
                      ),
                      interpretation: (
                        <Badge className={`${changeInterpretation.bg} ${changeInterpretation.color} border-0`}>
                          {changeInterpretation.text}
                        </Badge>
                      )
                    }
                  })}
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

    print("[OK] partial-correlation/page.tsx - 2 tables converted")

if __name__ == '__main__':
    main()
