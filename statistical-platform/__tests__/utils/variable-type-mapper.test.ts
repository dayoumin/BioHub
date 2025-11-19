/**
 * variable-type-mapper 유틸리티 테스트
 */

import {
  isTypeCompatible,
  variableTypeToUIType,
  getCompatibleUITypes,
  getUITypeName,
  getVariableTypeName,
  isBinaryColumn,
  isTypeCompatibleWithValues,
} from '@/lib/utils/variable-type-mapper'
import { VariableType } from '@/lib/statistics/variable-requirements'

describe('isTypeCompatible', () => {
  describe('number 타입 호환성', () => {
    it('number는 continuous와 호환된다', () => {
      expect(isTypeCompatible('number', ['continuous'])).toBe(true)
    })

    it('number는 ordinal과 호환된다', () => {
      expect(isTypeCompatible('number', ['ordinal'])).toBe(true)
    })

    it('number는 count와 호환된다', () => {
      expect(isTypeCompatible('number', ['count'])).toBe(true)
    })

    it('number는 categorical과 호환되지 않는다', () => {
      expect(isTypeCompatible('number', ['categorical'])).toBe(false)
    })

    it('number는 binary와 호환된다 (0/1 값)', () => {
      expect(isTypeCompatible('number', ['binary'])).toBe(true)
    })

    it('number는 여러 타입 중 하나와 호환되면 true', () => {
      expect(isTypeCompatible('number', ['categorical', 'continuous'])).toBe(true)
    })
  })

  describe('string 타입 호환성', () => {
    it('string은 categorical과 호환된다', () => {
      expect(isTypeCompatible('string', ['categorical'])).toBe(true)
    })

    it('string은 continuous와 호환되지 않는다', () => {
      expect(isTypeCompatible('string', ['continuous'])).toBe(false)
    })

    it('string은 binary와 호환된다 (Yes/No 값)', () => {
      expect(isTypeCompatible('string', ['binary'])).toBe(true)
    })
  })

  describe('boolean 타입 호환성', () => {
    it('boolean은 binary와 호환된다', () => {
      expect(isTypeCompatible('boolean', ['binary'])).toBe(true)
    })

    it('boolean은 categorical과 호환된다', () => {
      expect(isTypeCompatible('boolean', ['categorical'])).toBe(true)
    })

    it('boolean은 continuous와 호환되지 않는다', () => {
      expect(isTypeCompatible('boolean', ['continuous'])).toBe(false)
    })
  })

  describe('date 타입 호환성', () => {
    it('date는 date와 호환된다', () => {
      expect(isTypeCompatible('date', ['date'])).toBe(true)
    })

    it('date는 continuous와 호환되지 않는다', () => {
      expect(isTypeCompatible('date', ['continuous'])).toBe(false)
    })

    it('date는 categorical과 호환되지 않는다', () => {
      expect(isTypeCompatible('date', ['categorical'])).toBe(false)
    })
  })

  describe('엣지 케이스', () => {
    it('빈 allowedTypes 배열은 false 반환', () => {
      expect(isTypeCompatible('number', [])).toBe(false)
    })

    it('매핑되지 않은 columnType은 false 반환', () => {
      // @ts-expect-error 의도적으로 잘못된 타입 테스트
      expect(isTypeCompatible('unknown', ['continuous'])).toBe(false)
    })
  })
})

describe('variableTypeToUIType', () => {
  describe('number로 변환되는 타입', () => {
    it('continuous는 number로 변환', () => {
      expect(variableTypeToUIType('continuous')).toBe('number')
    })

    it('ordinal은 number로 변환', () => {
      expect(variableTypeToUIType('ordinal')).toBe('number')
    })

    it('count는 number로 변환', () => {
      expect(variableTypeToUIType('count')).toBe('number')
    })
  })

  describe('string으로 변환되는 타입', () => {
    it('categorical은 string으로 변환', () => {
      expect(variableTypeToUIType('categorical')).toBe('string')
    })
  })

  describe('boolean으로 변환되는 타입', () => {
    it('binary는 boolean으로 변환', () => {
      expect(variableTypeToUIType('binary')).toBe('boolean')
    })
  })

  describe('date로 변환되는 타입', () => {
    it('date는 date로 변환', () => {
      expect(variableTypeToUIType('date')).toBe('date')
    })
  })

  describe('기본값', () => {
    it('알 수 없는 타입은 string으로 변환', () => {
      // @ts-expect-error 의도적으로 잘못된 타입 테스트
      expect(variableTypeToUIType('unknown')).toBe('string')
    })
  })
})

describe('getCompatibleUITypes', () => {
  it('빈 배열은 빈 배열 반환', () => {
    expect(getCompatibleUITypes([])).toEqual([])
  })

  it('continuous만 허용하면 number만 호환', () => {
    expect(getCompatibleUITypes(['continuous'])).toEqual(['number'])
  })

  it('categorical만 허용하면 string, boolean 호환', () => {
    // string은 categorical과 호환, boolean도 categorical과 호환
    const result = getCompatibleUITypes(['categorical'])
    expect(result).toContain('string')
    expect(result).toContain('boolean')
    expect(result).not.toContain('number')
    expect(result).not.toContain('date')
  })

  it('binary만 허용하면 number, string, boolean 모두 호환', () => {
    // number는 binary와 호환 (0/1), string도 호환 (Yes/No), boolean도 호환
    const result = getCompatibleUITypes(['binary'])
    expect(result).toContain('number')
    expect(result).toContain('string')
    expect(result).toContain('boolean')
    expect(result).not.toContain('date')
  })

  it('date만 허용하면 date만 호환', () => {
    expect(getCompatibleUITypes(['date'])).toEqual(['date'])
  })

  it('categorical, binary 모두 허용하면 number, string, boolean 호환', () => {
    // 실제 사용 케이스: 카이제곱 행/열 변수
    const result = getCompatibleUITypes(['categorical', 'binary'])
    expect(result).toContain('number')
    expect(result).toContain('string')
    expect(result).toContain('boolean')
    expect(result).not.toContain('date')
  })

  it('continuous, ordinal 모두 허용하면 number만 호환', () => {
    // 실제 사용 케이스: 기술통계 분석 변수
    expect(getCompatibleUITypes(['continuous', 'ordinal'])).toEqual(['number'])
  })
})

describe('getUITypeName', () => {
  it('number는 "숫자" 반환', () => {
    expect(getUITypeName('number')).toBe('숫자')
  })

  it('string은 "문자" 반환', () => {
    expect(getUITypeName('string')).toBe('문자')
  })

  it('date는 "날짜" 반환', () => {
    expect(getUITypeName('date')).toBe('날짜')
  })

  it('boolean은 "논리값" 반환', () => {
    expect(getUITypeName('boolean')).toBe('논리값')
  })
})

describe('getVariableTypeName', () => {
  it('continuous는 "연속형" 반환', () => {
    expect(getVariableTypeName('continuous')).toBe('연속형')
  })

  it('categorical은 "범주형" 반환', () => {
    expect(getVariableTypeName('categorical')).toBe('범주형')
  })

  it('binary는 "이진형" 반환', () => {
    expect(getVariableTypeName('binary')).toBe('이진형')
  })

  it('ordinal은 "서열형" 반환', () => {
    expect(getVariableTypeName('ordinal')).toBe('서열형')
  })

  it('date는 "날짜" 반환', () => {
    expect(getVariableTypeName('date')).toBe('날짜')
  })

  it('count는 "카운트" 반환', () => {
    expect(getVariableTypeName('count')).toBe('카운트')
  })
})

describe('실제 사용 시나리오', () => {
  it('기술통계: number 열이 continuous 역할과 호환', () => {
    // 기술통계는 continuous, ordinal 타입 허용
    const allowedTypes: VariableType[] = ['continuous', 'ordinal']
    expect(isTypeCompatible('number', allowedTypes)).toBe(true)
    expect(isTypeCompatible('string', allowedTypes)).toBe(false)
  })

  it('카이제곱: 다양한 열이 categorical/binary 역할과 호환', () => {
    // 카이제곱은 categorical, binary 타입 허용
    const allowedTypes: VariableType[] = ['categorical', 'binary']
    expect(isTypeCompatible('string', allowedTypes)).toBe(true)   // 문자열 범주
    expect(isTypeCompatible('boolean', allowedTypes)).toBe(true)  // true/false
    expect(isTypeCompatible('number', allowedTypes)).toBe(true)   // 0/1 이진값
    expect(isTypeCompatible('date', allowedTypes)).toBe(false)    // 날짜는 불가
  })

  it('회귀분석: number 열이 continuous 역할과 호환', () => {
    // 회귀분석 종속변수는 continuous만 허용
    const allowedTypes: VariableType[] = ['continuous']
    expect(isTypeCompatible('number', allowedTypes)).toBe(true)
    expect(isTypeCompatible('string', allowedTypes)).toBe(false)
  })

  it('로지스틱 회귀: 다양한 열이 binary 역할과 호환', () => {
    // 로지스틱 회귀 종속변수는 binary 허용
    // 실제 데이터에서 0/1(number), Yes/No(string), true/false(boolean) 모두 사용됨
    const allowedTypes: VariableType[] = ['binary']
    expect(isTypeCompatible('boolean', allowedTypes)).toBe(true)  // true/false
    expect(isTypeCompatible('number', allowedTypes)).toBe(true)   // 0/1
    expect(isTypeCompatible('string', allowedTypes)).toBe(true)   // Yes/No
    expect(isTypeCompatible('date', allowedTypes)).toBe(false)    // 날짜는 불가
  })
})

describe('isBinaryColumn', () => {
  describe('숫자형 이진 데이터', () => {
    it('0/1 값은 binary로 인식', () => {
      expect(isBinaryColumn([0, 1, 0, 1, 1, 0])).toBe(true)
    })

    it('1/2 값도 binary로 인식 (2개 고유값)', () => {
      expect(isBinaryColumn([1, 2, 1, 2, 2, 1])).toBe(true)
    })

    it('3개 이상 고유값은 binary 아님', () => {
      expect(isBinaryColumn([1, 2, 3, 1, 2])).toBe(false)
    })

    it('연속형 데이터는 binary 아님', () => {
      expect(isBinaryColumn([10, 20, 30, 40, 50])).toBe(false)
    })
  })

  describe('문자형 이진 데이터', () => {
    it('Yes/No는 binary로 인식', () => {
      expect(isBinaryColumn(['Yes', 'No', 'Yes', 'No'])).toBe(true)
    })

    it('True/False는 binary로 인식', () => {
      expect(isBinaryColumn(['True', 'False', 'True'])).toBe(true)
    })

    it('M/F는 binary로 인식', () => {
      expect(isBinaryColumn(['M', 'F', 'M', 'F', 'M'])).toBe(true)
    })

    it('대소문자 구분 없이 동일 값으로 처리', () => {
      expect(isBinaryColumn(['yes', 'YES', 'Yes', 'no', 'NO'])).toBe(true)
    })

    it('3개 이상 범주는 binary 아님', () => {
      expect(isBinaryColumn(['A', 'B', 'C', 'A', 'B'])).toBe(false)
    })
  })

  describe('불리언 데이터', () => {
    it('true/false는 binary로 인식', () => {
      expect(isBinaryColumn([true, false, true, false])).toBe(true)
    })
  })

  describe('엣지 케이스', () => {
    it('빈 배열은 binary 아님', () => {
      expect(isBinaryColumn([])).toBe(false)
    })

    it('null/undefined 값은 무시', () => {
      expect(isBinaryColumn([0, 1, null, undefined, 0, 1])).toBe(true)
    })

    it('1개 고유값만 있으면 binary 아님 (상수)', () => {
      expect(isBinaryColumn([1, 1, 1, 1])).toBe(false)
    })

    it('빈 문자열은 무시', () => {
      expect(isBinaryColumn(['Yes', 'No', '', 'Yes', ''])).toBe(true)
    })
  })
})

describe('isTypeCompatibleWithValues', () => {
  describe('기본 타입 매핑', () => {
    it('number-continuous 호환', () => {
      expect(isTypeCompatibleWithValues('number', ['continuous'])).toBe(true)
    })

    it('string-categorical 호환', () => {
      expect(isTypeCompatibleWithValues('string', ['categorical'])).toBe(true)
    })

    it('boolean-binary 호환', () => {
      expect(isTypeCompatibleWithValues('boolean', ['binary'])).toBe(true)
    })
  })

  describe('binary 역할 값 검증', () => {
    it('0/1 숫자 컬럼은 binary와 호환', () => {
      const values = [0, 1, 0, 1, 1, 0]
      expect(isTypeCompatibleWithValues('number', ['binary'], values)).toBe(true)
    })

    it('연속형 숫자 컬럼은 binary와 비호환', () => {
      const values = [10, 20, 30, 40, 50]
      expect(isTypeCompatibleWithValues('number', ['binary'], values)).toBe(false)
    })

    it('Yes/No 문자 컬럼은 binary와 호환', () => {
      const values = ['Yes', 'No', 'Yes', 'No']
      expect(isTypeCompatibleWithValues('string', ['binary'], values)).toBe(true)
    })

    it('다중 범주 문자 컬럼은 binary와 비호환', () => {
      const values = ['A', 'B', 'C', 'A', 'B']
      expect(isTypeCompatibleWithValues('string', ['binary'], values)).toBe(false)
    })
  })

  describe('값 없이 호출', () => {
    it('number는 값 없이 binary 비호환 (안전한 기본값)', () => {
      expect(isTypeCompatibleWithValues('number', ['binary'])).toBe(false)
    })

    it('string은 값 없이 binary 비호환 (안전한 기본값)', () => {
      expect(isTypeCompatibleWithValues('string', ['binary'])).toBe(false)
    })

    it('boolean은 값 없이도 binary 호환', () => {
      expect(isTypeCompatibleWithValues('boolean', ['binary'])).toBe(true)
    })

    it('date는 binary와 비호환', () => {
      expect(isTypeCompatibleWithValues('date', ['binary'])).toBe(false)
    })
  })

  describe('로지스틱 회귀 시나리오', () => {
    it('income(연속형)은 binary 종속변수로 부적합', () => {
      const incomeValues = [50000, 75000, 100000, 45000, 80000]
      expect(isTypeCompatibleWithValues('number', ['binary'], incomeValues)).toBe(false)
    })

    it('survived(0/1)는 binary 종속변수로 적합', () => {
      const survivedValues = [0, 1, 1, 0, 1, 0, 1]
      expect(isTypeCompatibleWithValues('number', ['binary'], survivedValues)).toBe(true)
    })

    it('gender(M/F)는 binary 종속변수로 적합', () => {
      const genderValues = ['M', 'F', 'M', 'F', 'M']
      expect(isTypeCompatibleWithValues('string', ['binary'], genderValues)).toBe(true)
    })
  })
})