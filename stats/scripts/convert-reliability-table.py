#!/usr/bin/env python3
"""
reliability/page.tsx의 1개 테이블을 StatisticsTable로 변환하는 스크립트
"""

import re

# 파일 경로
FILE_PATH = "app/(dashboard)/statistics/reliability/page.tsx"

# Table: 항목별 통계량 (Lines 533-560)
TABLE_OLD = '''                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">항목</th>
                          <th className="border p-2 text-right">평균</th>
                          <th className="border p-2 text-right">표준편차</th>
                          <th className="border p-2 text-right">항목-전체 상관</th>
                          <th className="border p-2 text-right">삭제 시 α</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.itemStatistics.map((item, index) => (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="border p-2 font-medium">{item.item}</td>
                            <td className="border p-2 text-right font-mono">{item.mean.toFixed(2)}</td>
                            <td className="border p-2 text-right font-mono">{item.stdDev.toFixed(2)}</td>
                            <td className="border p-2 text-right font-mono">{item.correctedItemTotal.toFixed(3)}</td>
                            <td className="border p-2 text-right font-mono">
                              <span className={item.alphaIfDeleted > analysisResult.cronbachAlpha ? 'text-muted-foreground' : 'text-muted-foreground'}>
                                {item.alphaIfDeleted.toFixed(3)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>'''

TABLE_NEW = '''                  <StatisticsTable
                    title="항목별 통계량"
                    columns={[
                      { key: 'item', header: '항목', type: 'text', align: 'left' },
                      { key: 'mean', header: '평균', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(2) },
                      { key: 'stdDev', header: '표준편차', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(2) },
                      { key: 'correctedItemTotal', header: '항목-전체 상관', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                      { key: 'alphaIfDeleted', header: '삭제 시 α', type: 'custom', align: 'right', formatter: (v) => v }
                    ] as const}
                    data={analysisResult.itemStatistics.map((item, index) => ({
                      item: item.item,
                      mean: item.mean,
                      stdDev: item.stdDev,
                      correctedItemTotal: item.correctedItemTotal,
                      alphaIfDeleted: (
                        <span className={item.alphaIfDeleted > analysisResult.cronbachAlpha ? 'text-muted-foreground' : 'text-muted-foreground'}>
                          {item.alphaIfDeleted.toFixed(3)}
                        </span>
                      )
                    }))}
                    bordered
                    compactMode
                  />'''

def main():
    # 파일 읽기
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # 교체 수행
    content = content.replace(TABLE_OLD, TABLE_NEW)

    # 파일 쓰기
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(content)

    print("[OK] reliability/page.tsx - 1 table converted")

if __name__ == '__main__':
    main()
