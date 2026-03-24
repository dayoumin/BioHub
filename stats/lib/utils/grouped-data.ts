/**
 * 그룹별 수치 데이터 추출 유틸
 *
 * assumption-testing-service.ts와 use-levene-test.ts에서 공통 사용.
 */

import type { DataRow } from '@/types/analysis'

/**
 * 데이터에서 그룹 변수 기준으로 종속 변수의 수치값을 그룹별로 분리.
 * null/undefined/빈 문자열/NaN은 제외.
 *
 * @returns Map<그룹명, 수치값 배열>
 */
export function extractGroupedNumericData(
  data: readonly DataRow[],
  dependentVar: string,
  groupVar: string,
): Map<string, number[]> {
  const groupMap = new Map<string, number[]>()

  for (const row of data) {
    const groupVal = row[groupVar]
    if (groupVal === null || groupVal === undefined || groupVal === '') continue

    const depVal = row[dependentVar]
    if (depVal === null || depVal === undefined || depVal === '') continue

    const num = typeof depVal === 'number' ? depVal : Number(depVal)
    if (Number.isNaN(num) || !Number.isFinite(num)) continue

    const key = String(groupVal)
    let arr = groupMap.get(key)
    if (!arr) {
      arr = []
      groupMap.set(key, arr)
    }
    arr.push(num)
  }

  return groupMap
}
