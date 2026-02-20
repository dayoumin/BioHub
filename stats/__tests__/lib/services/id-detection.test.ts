/**
 * ID/일련번호 감지 기능 테스트
 *
 * 테스트 케이스:
 * 1. 이름 기반 감지 (대소문자 무시)
 * 2. 연속 정수 패턴 감지 (고유값 비율과 무관)
 * 3. 코드/UUID 패턴 감지
 * 4. 고유값 비율 기반 감지
 * 5. False positive 방지 (실제 측정값이 ID로 오탐되지 않아야 함)
 */

import {
  detectIdColumn,
  isIdColumnByValue
} from '@/lib/services/variable-type-detector'

describe('ID/일련번호 감지', () => {
  describe('이름 기반 감지 (대소문자 무시)', () => {
    // 이름 기반 테스트에서는 값이 ID로 감지되면 안 됨
    // 반복되는 값 사용 (연속 정수 아님, 고유값 비율 낮음)
    const testValues = ['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C', 'A']

    test.each([
      ['id', true],
      ['ID', true],
      ['Id', true],
      ['_id', true],
      ['user_id', true],
      ['userId', true],
      ['USER_ID', true],
      ['index', true],
      ['INDEX', true],
      ['Index', true],
      ['idx', true],
      ['IDX', true],
      ['uuid', true],
      ['UUID', true],
      ['guid', true],
      ['GUID', true],
      ['primary_key', true],
      ['PRIMARY_KEY', true],
      ['번호', true],
      ['일련번호', true],
      ['순번', true],
      ['자원번호', true],
      ['표본번호', true],
      ['No', true],
      ['NO', true],
      ['seq', true],
      ['SEQ', true],
      ['rownum', true],
      ['ROWNUM', true],
      // 일반 변수명 (ID가 아님)
      ['name', false],
      ['age', false],
      ['weight', false],
      ['temperature', false],
      ['species', false],
      ['group', false],
    ])('열 이름 "%s" → isId: %s', (columnName, expectedIsId) => {
      const result = detectIdColumn(columnName, testValues)
      expect(result.isId).toBe(expectedIsId)
      if (expectedIsId) {
        expect(result.source).toBe('name')
      }
    })
  })

  describe('연속 정수 패턴 감지 (High 이슈 수정 확인)', () => {
    test('완벽한 연속 정수 [1..100]', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1)
      const result = isIdColumnByValue(values, 'data')

      expect(result.isId).toBe(true)
      expect(result.reason).toContain('연속 정수')
      expect(result.confidence).toBeGreaterThanOrEqual(0.9)
    })

    test('연속 정수 + 약간의 중복 [1..90] + 중복 10개 (unique ratio ~0.9)', () => {
      // High 이슈: 이 케이스가 이전에는 감지 안 됐음
      const values = [
        ...Array.from({ length: 90 }, (_, i) => i + 1),
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10 // 중복
      ]
      const result = isIdColumnByValue(values, 'data')

      expect(result.isId).toBe(true)
      expect(result.reason).toContain('연속 정수')
    })

    test('0부터 시작하는 연속 정수 [0..99]', () => {
      const values = Array.from({ length: 100 }, (_, i) => i)
      const result = isIdColumnByValue(values, 'data')

      expect(result.isId).toBe(true)
    })

    test('10부터 시작하는 연속 정수 [10..109]', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 10)
      const result = isIdColumnByValue(values, 'data')

      expect(result.isId).toBe(true)
    })

    test('시작값이 너무 큰 경우 (100부터 시작) - ID 아님', () => {
      // 시작값이 10보다 크면 일반 측정값일 수 있음
      // 연속 정수 + 시작값 체크에서 걸러짐
      const values = Array.from({ length: 100 }, (_, i) => i + 100)
      const result = isIdColumnByValue(values, 'data')

      // 시작값 100 > 10 이므로 ID가 아님
      expect(result.isId).toBe(false)
    })

    test('11부터 시작하는 연속 정수 - ID 아님 (시작값 > 10)', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 11)
      const result = isIdColumnByValue(values, 'data')

      expect(result.isId).toBe(false)
    })
  })

  describe('코드/UUID 패턴 감지', () => {
    test('S001, S002, S003 패턴', () => {
      const values = Array.from({ length: 50 }, (_, i) =>
        `S${String(i + 1).padStart(3, '0')}`
      )
      const result = isIdColumnByValue(values, 'sample')

      expect(result.isId).toBe(true)
      expect(result.reason).toContain('코드')
    })

    test('A-001, A-002 패턴', () => {
      const values = Array.from({ length: 50 }, (_, i) =>
        `A-${String(i + 1).padStart(3, '0')}`
      )
      const result = isIdColumnByValue(values, 'code')

      expect(result.isId).toBe(true)
    })

    test('FISH0001, FISH0002 패턴', () => {
      const values = Array.from({ length: 50 }, (_, i) =>
        `FISH${String(i + 1).padStart(4, '0')}`
      )
      const result = isIdColumnByValue(values, 'specimen')

      expect(result.isId).toBe(true)
    })

    test('UUID 패턴', () => {
      const values = Array.from({ length: 50 }, (_, i) =>
        `${i.toString(16).padStart(8, '0')}-1234-5678-9abc-def012345678`
      )
      const result = isIdColumnByValue(values, 'uuid')

      expect(result.isId).toBe(true)
    })
  })

  describe('고유값 비율 기반 감지', () => {
    test('99% 이상 고유값 (문자열) - 문자열은 코드 패턴이 아니면 ID 아님', () => {
      // 문자열 고유값은 코드 패턴이 아니면 ID로 감지하지 않음 (이름일 수 있음)
      const values = Array.from({ length: 100 }, (_, i) => `item_${i}`)
      const result = isIdColumnByValue(values, 'label')

      // 코드 패턴(S001 등)이 아니므로 ID가 아님
      expect(result.isId).toBe(false)
    })

    test('99% 이상 고유값 (정수, 시작값 작음) - ID임', () => {
      // 정수 + 시작값 작음 + 고유값 99% = ID
      const values = Array.from({ length: 100 }, (_, i) => i + 1)
      const result = isIdColumnByValue(values, 'data')

      expect(result.isId).toBe(true)
    })

    test('80% 고유값 - ID 아님', () => {
      const values = [
        ...Array.from({ length: 80 }, (_, i) => `item_${i}`),
        ...Array.from({ length: 20 }, () => 'duplicate')
      ]
      const result = isIdColumnByValue(values, 'label')

      expect(result.isId).toBe(false)
    })
  })

  describe('False Positive 방지 (실제 측정값이 ID로 오탐되면 안 됨)', () => {
    test('체중 데이터 (소수점 포함) - 소수점은 ID가 아님', () => {
      // 소수점 데이터는 측정값이므로 ID가 아님
      const values = [
        52.3, 67.8, 45.2, 78.9, 55.1, 62.4, 71.0, 48.5, 59.7, 64.3,
        53.2, 68.7, 46.1, 79.8, 56.0, 63.3, 72.0, 49.4, 60.6, 65.2
      ]
      const result = isIdColumnByValue(values, 'weight')

      // 소수점 포함이므로 ID가 아님
      expect(result.isId).toBe(false)
    })

    test('온도 데이터 (소수점 포함)', () => {
      const values = [
        15.2, 16.8, 14.5, 17.3, 15.9, 16.1, 14.8, 17.0, 15.5, 16.4,
        15.3, 16.9, 14.6, 17.4, 16.0, 16.2, 14.9, 17.1, 15.6, 16.5
      ]
      const result = isIdColumnByValue(values, 'temperature')

      expect(result.isId).toBe(false)
    })

    test('Likert 척도 (1-5 반복) - 반복되는 값은 ID가 아님', () => {
      // 고유값이 5개뿐이므로 고유값 비율이 낮음 → ID 아님
      const values = [
        1, 2, 3, 4, 5, 3, 4, 2, 5, 1,
        3, 4, 2, 5, 3, 4, 1, 2, 5, 3
      ]
      const result = isIdColumnByValue(values, 'satisfaction')

      // 고유값 5개 / 20개 = 25% → ID 아님
      expect(result.isId).toBe(false)
    })

    test('범주형 코드 (반복되는 그룹 코드)', () => {
      const values = [
        'A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C', 'A',
        'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C', 'A', 'B'
      ]
      const result = isIdColumnByValue(values, 'group')

      expect(result.isId).toBe(false)
    })

    test('연도 데이터 (2020, 2021, 2022...)', () => {
      // 연도는 시작값이 커서 ID로 감지되면 안 됨
      const values = [
        2020, 2021, 2022, 2023, 2024, 2020, 2021, 2022, 2023, 2024,
        2020, 2021, 2022, 2023, 2024, 2020, 2021, 2022, 2023, 2024
      ]
      const result = isIdColumnByValue(values, 'year')

      expect(result.isId).toBe(false)
    })

    test('실제 측정값처럼 보이는 연속 정수 (시작값이 큼)', () => {
      // 길이 측정값이 우연히 100, 101, 102... 일 수 있음
      // 시작값이 10보다 크면 ID로 감지하지 않음
      const values = Array.from({ length: 50 }, (_, i) => 100 + i)
      const result = isIdColumnByValue(values, 'length_mm')

      expect(result.isId).toBe(false)
    })
  })

  describe('통합 감지 (detectIdColumn)', () => {
    test('이름 + 값 모두 ID 패턴인 경우 → 이름 우선', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1)
      const result = detectIdColumn('id', values)

      expect(result.isId).toBe(true)
      expect(result.source).toBe('name') // 이름이 우선
    })

    test('이름은 일반, 값이 ID 패턴인 경우', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1)
      const result = detectIdColumn('data', values)

      expect(result.isId).toBe(true)
      expect(result.source).toBe('value')
    })

    test('이름도 일반, 값도 일반인 경우 (반복되는 정수)', () => {
      // 반복되는 값 → 고유값 비율 낮음 → ID 아님
      const values = [1, 2, 3, 4, 5, 3, 4, 2, 5, 1, 3, 4, 2, 5, 3]
      const result = detectIdColumn('score', values)

      expect(result.isId).toBe(false)
      expect(result.source).toBe('none')
    })

    test('이름도 일반, 소수점 값인 경우', () => {
      // 소수점 데이터 → ID 아님
      const values = Array.from({ length: 50 }, (_, i) => 10.5 + i * 0.1)
      const result = detectIdColumn('measurement', values)

      expect(result.isId).toBe(false)
      expect(result.source).toBe('none')
    })
  })

  describe('엣지 케이스', () => {
    test('샘플 수가 10 미만인 경우', () => {
      const values = [1, 2, 3, 4, 5]
      const result = isIdColumnByValue(values, 'data')

      expect(result.isId).toBe(false)
      expect(result.reason).toContain('샘플 수 부족')
    })

    test('빈 배열', () => {
      const result = isIdColumnByValue([], 'data')

      expect(result.isId).toBe(false)
    })

    test('null/undefined 포함된 데이터', () => {
      const values = [1, 2, null, 4, 5, undefined, 7, 8, '', 10, 11, 12, 13, 14, 15]
      const result = isIdColumnByValue(values, 'data')

      // null/undefined/빈문자열 제외하고 분석
      expect(result).toBeDefined()
    })
  })
})
