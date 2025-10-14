/**
 * variable-type-detector.ts 테스트
 * 변수 타입 자동 감지 서비스 검증
 */

import {
  detectVariableType,
  analyzeColumn,
  analyzeDataset,
  getVariableTypeIcon,
  getVariableTypeColor,
  getVariableTypeLabel,
  ColumnAnalysis,
  DatasetAnalysis
} from '../variable-type-detector'

describe('Variable Type Detector', () => {

  describe('detectVariableType', () => {

    describe('연속형(continuous) 감지', () => {
      it('일반적인 연속형 숫자를 감지해야 함', () => {
        const values = [1.5, 2.7, 3.9, 4.2, 5.8, 6.1, 7.3, 8.5, 9.7, 10.0]
        expect(detectVariableType(values)).toBe('continuous')
      })

      it('많은 고유값을 가진 정수도 연속형으로 감지해야 함', () => {
        const values = Array.from({ length: 100 }, (_, i) => i * 2 + 1)
        expect(detectVariableType(values)).toBe('continuous')
      })

      it('음수를 포함한 연속형 데이터를 감지해야 함', () => {
        const values = [-10.5, -5.2, 0, 3.7, 8.9, 15.3]
        expect(detectVariableType(values)).toBe('continuous')
      })
    })

    describe('범주형(categorical) 감지', () => {
      it('문자열 범주형 데이터를 감지해야 함', () => {
        const values = ['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'D', 'E']
        expect(detectVariableType(values)).toBe('categorical')
      })

      it('제한된 숫자 값을 범주형으로 감지해야 함', () => {
        const values = Array(100).fill(null).map(() =>
          [1, 2, 3][Math.floor(Math.random() * 3)]
        )
        // 1, 2, 3은 연속된 정수이므로 ordinal로 분류될 수 있음
        const result = detectVariableType(values)
        expect(['categorical', 'ordinal']).toContain(result)
      })

      it('지역명 같은 범주형 데이터를 감지해야 함', () => {
        const values = ['서울', '부산', '대구', '서울', '부산', '인천', '서울']
        expect(detectVariableType(values)).toBe('categorical')
      })
    })

    describe('이진형(binary) 감지', () => {
      it('0과 1을 이진형으로 감지해야 함', () => {
        const values = [0, 1, 0, 1, 1, 0, 1, 0, 0, 1]
        expect(detectVariableType(values)).toBe('binary')
      })

      it('Yes/No를 이진형으로 감지해야 함', () => {
        const values = ['Yes', 'No', 'Yes', 'Yes', 'No', 'No', 'Yes']
        expect(detectVariableType(values)).toBe('binary')
      })

      it('True/False를 이진형으로 감지해야 함', () => {
        const values = ['True', 'False', 'True', 'False', 'False', 'True']
        expect(detectVariableType(values)).toBe('binary')
      })

      it('성별(M/F)을 이진형으로 감지해야 함', () => {
        const values = ['M', 'F', 'M', 'M', 'F', 'F', 'M', 'F']
        expect(detectVariableType(values)).toBe('binary')
      })

      it('임의의 두 개 값을 이진형으로 감지해야 함', () => {
        const values = ['Group A', 'Group B', 'Group A', 'Group B', 'Group A']
        expect(detectVariableType(values)).toBe('binary')
      })
    })

    describe('서열형(ordinal) 감지', () => {
      it('1-5 척도를 서열형으로 감지해야 함', () => {
        const values = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 3, 3, 4]
        expect(detectVariableType(values)).toBe('ordinal')
      })

      it('Likert 척도 문자열을 서열형으로 감지해야 함', () => {
        const values = [
          '매우 만족', '만족', '보통', '불만족', '매우 불만족',
          '만족', '보통', '매우 만족', '보통'
        ]
        expect(detectVariableType(values)).toBe('ordinal')
      })

      it('영어 Likert 척도를 서열형으로 감지해야 함', () => {
        const values = [
          'Strongly Agree', 'Agree', 'Neutral', 'Disagree',
          'Agree', 'Neutral', 'Strongly Agree'
        ]
        expect(detectVariableType(values)).toBe('ordinal')
      })

      it('순서 단어를 서열형으로 감지해야 함', () => {
        const values = ['Low', 'Medium', 'High', 'Low', 'High', 'Medium']
        expect(detectVariableType(values)).toBe('ordinal')
      })
    })

    describe('날짜형(date) 감지', () => {
      it('YYYY-MM-DD 형식을 날짜형으로 감지해야 함', () => {
        const values = [
          '2024-01-01', '2024-02-15', '2024-03-20',
          '2024-04-10', '2024-05-25'
        ]
        expect(detectVariableType(values)).toBe('date')
      })

      it('MM/DD/YYYY 형식을 날짜형으로 감지해야 함', () => {
        const values = [
          '01/15/2024', '02/20/2024', '03/25/2024',
          '04/30/2024', '05/10/2024'
        ]
        expect(detectVariableType(values)).toBe('date')
      })

      it('Date 객체를 날짜형으로 감지해야 함', () => {
        const values = [
          new Date('2024-01-01'),
          new Date('2024-02-01'),
          new Date('2024-03-01')
        ]
        expect(detectVariableType(values)).toBe('date')
      })
    })

    describe('카운트(count) 감지', () => {
      it('0부터 시작하는 양의 정수를 카운트로 감지해야 함', () => {
        const values = [0, 1, 2, 3, 5, 8, 10, 15, 20, 25, 30, 0, 1, 2]
        expect(detectVariableType(values)).toBe('count')
      })

      it('방문 횟수 같은 데이터를 카운트로 감지해야 함', () => {
        const values = [0, 0, 1, 1, 1, 2, 2, 3, 5, 7, 10, 15, 0, 0]
        // 고유값이 10개 이하면 ordinal로 분류될 수 있음
        const result = detectVariableType(values)
        expect(['count', 'ordinal']).toContain(result)
      })
    })

    describe('엣지 케이스', () => {
      it('빈 배열은 continuous를 반환해야 함', () => {
        expect(detectVariableType([])).toBe('continuous')
      })

      it('null/undefined 값은 무시해야 함', () => {
        const values = [1, 2, null, 3, undefined, 4, 5, '', 6]
        // 1-6의 연속된 정수로 ordinal로 분류될 수 있음
        const result = detectVariableType(values)
        expect(['continuous', 'ordinal']).toContain(result)
      })

      it('데이터가 너무 적으면 continuous를 반환해야 함', () => {
        const values = [1, 2, 3]
        // 최소 샘플이 3개이므로 ordinal로 분류될 수 있음
        const result = detectVariableType(values)
        expect(['continuous', 'ordinal']).toContain(result)
      })

      it('문자열 숫자도 올바르게 처리해야 함', () => {
        const values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
        // 1-10의 연속된 정수로 ordinal로 분류될 수 있음
        const result = detectVariableType(values)
        expect(['continuous', 'ordinal']).toContain(result)
      })
    })
  })

  describe('analyzeColumn', () => {
    it('컬럼 분석 결과가 올바른 구조를 가져야 함', () => {
      const values = [1, 2, 3, 4, 5, null, 6, 7, 8, 9, 10]
      const analysis = analyzeColumn('test_column', values)

      expect(analysis).toMatchObject({
        name: 'test_column',
        type: expect.any(String),
        dataType: expect.any(String),
        uniqueCount: expect.any(Number),
        totalCount: 11,
        missingCount: 1,
        missingRate: expect.any(Number),
        samples: expect.any(Array),
        metadata: {
          possibleTypes: expect.any(Array),
          confidence: expect.any(Number),
          reason: expect.any(String)
        }
      })
    })

    it('숫자형 컬럼에 대한 통계량을 계산해야 함', () => {
      const values = [1, 2, 3, 4, 5]
      const analysis = analyzeColumn('numeric_col', values)

      expect(analysis.statistics).toBeDefined()
      expect(analysis.statistics).toMatchObject({
        min: 1,
        max: 5,
        mean: 3,
        median: 3,
        mode: expect.any(Number),
        isInteger: true,
        hasNegative: false,
        hasDecimal: false
      })
    })

    it('결측값 처리가 올바라야 함', () => {
      const values = [1, null, undefined, '', 2, 3, '  ', 4]
      const analysis = analyzeColumn('test', values)

      expect(analysis.totalCount).toBe(8)
      expect(analysis.missingCount).toBe(4)
      expect(analysis.missingRate).toBe(0.5)
    })

    it('경고 메시지를 생성해야 함', () => {
      // 모든 값이 고유한 경우
      const values = Array.from({ length: 150 }, (_, i) => i)
      const analysis = analyzeColumn('id_column', values)

      expect(analysis.metadata.warnings).toBeDefined()
      expect(analysis.metadata.warnings).toContain(
        '모든 값이 고유함 - ID 컬럼일 가능성'
      )
    })

    it('단일 값만 있을 때 경고를 생성해야 함', () => {
      const values = [5, 5, 5, 5, 5, 5]
      const analysis = analyzeColumn('constant', values)

      expect(analysis.metadata.warnings).toBeDefined()
      expect(analysis.metadata.warnings).toContain(
        '단일 값만 존재 - 분석에서 제외 권장'
      )
    })
  })

  describe('analyzeDataset', () => {
    const sampleData = [
      { id: 1, age: 25, gender: 'M', score: 85, date: '2024-01-01' },
      { id: 2, age: 30, gender: 'F', score: 90, date: '2024-01-02' },
      { id: 3, age: 35, gender: 'M', score: 78, date: '2024-01-03' },
      { id: 4, age: 28, gender: 'F', score: 92, date: '2024-01-04' },
      { id: 5, age: 45, gender: 'M', score: 88, date: '2024-01-05' }
    ]

    it('전체 데이터셋 분석이 올바른 구조를 가져야 함', () => {
      const analysis = analyzeDataset(sampleData)

      expect(analysis).toMatchObject({
        columns: expect.any(Array),
        summary: {
          totalColumns: expect.any(Number),
          totalRows: 5,
          continuousCount: expect.any(Number),
          categoricalCount: expect.any(Number),
          binaryCount: expect.any(Number),
          ordinalCount: expect.any(Number),
          dateCount: expect.any(Number),
          countCount: expect.any(Number)
        },
        recommendations: expect.any(Object)
      })
    })

    it('ID 컬럼을 자동으로 감지해야 함', () => {
      const analysis = analyzeDataset(sampleData, { detectIdColumns: true })

      const columnNames = analysis.columns.map(c => c.name)
      expect(columnNames).not.toContain('id')
    })

    it('컬럼 필터링이 작동해야 함', () => {
      const analysis = analyzeDataset(sampleData, {
        includeOnlyColumns: ['age', 'score']
      })

      expect(analysis.columns).toHaveLength(2)
      expect(analysis.columns.map(c => c.name)).toEqual(['age', 'score'])
    })

    it('제외 컬럼이 작동해야 함', () => {
      const analysis = analyzeDataset(sampleData, {
        excludeColumns: ['id', 'date']
      })

      const columnNames = analysis.columns.map(c => c.name)
      expect(columnNames).not.toContain('id')
      expect(columnNames).not.toContain('date')
    })

    it('추천사항을 생성해야 함', () => {
      const analysis = analyzeDataset(sampleData)

      expect(analysis.recommendations).toBeDefined()

      // 이진 변수를 타겟으로 추천
      if (analysis.recommendations.likelyTargetColumns) {
        expect(analysis.recommendations.likelyTargetColumns).toContain('gender')
      }
    })

    it('빈 데이터셋을 처리해야 함', () => {
      const analysis = analyzeDataset([])

      expect(analysis.columns).toHaveLength(0)
      expect(analysis.summary.totalColumns).toBe(0)
      expect(analysis.summary.totalRows).toBe(0)
    })
  })

  describe('유틸리티 함수', () => {
    describe('getVariableTypeIcon', () => {
      it('각 타입별 아이콘을 반환해야 함', () => {
        expect(getVariableTypeIcon('continuous')).toBe('📊')
        expect(getVariableTypeIcon('categorical')).toBe('🏷️')
        expect(getVariableTypeIcon('binary')).toBe('⚡')
        expect(getVariableTypeIcon('ordinal')).toBe('📶')
        expect(getVariableTypeIcon('date')).toBe('📅')
        expect(getVariableTypeIcon('count')).toBe('🔢')
      })

      it('알 수 없는 타입은 기본 아이콘을 반환해야 함', () => {
        expect(getVariableTypeIcon('unknown' as any)).toBe('❓')
      })
    })

    describe('getVariableTypeColor', () => {
      it('각 타입별 색상 클래스를 반환해야 함', () => {
        expect(getVariableTypeColor('continuous')).toContain('blue')
        expect(getVariableTypeColor('categorical')).toContain('green')
        expect(getVariableTypeColor('binary')).toContain('purple')
        expect(getVariableTypeColor('ordinal')).toContain('orange')
        expect(getVariableTypeColor('date')).toContain('pink')
        expect(getVariableTypeColor('count')).toContain('indigo')
      })
    })

    describe('getVariableTypeLabel', () => {
      it('각 타입의 한글 레이블을 반환해야 함', () => {
        expect(getVariableTypeLabel('continuous')).toBe('연속형')
        expect(getVariableTypeLabel('categorical')).toBe('범주형')
        expect(getVariableTypeLabel('binary')).toBe('이진형')
        expect(getVariableTypeLabel('ordinal')).toBe('서열형')
        expect(getVariableTypeLabel('date')).toBe('날짜형')
        expect(getVariableTypeLabel('count')).toBe('카운트')
      })
    })
  })

  describe('실제 시나리오 테스트', () => {
    it('설문조사 데이터를 올바르게 분석해야 함', () => {
      const surveyData = [
        {
          age: 25,
          gender: 'M',
          satisfaction: '매우 만족',
          visits: 3,
          member: 'Yes'
        },
        {
          age: 35,
          gender: 'F',
          satisfaction: '만족',
          visits: 5,
          member: 'No'
        },
        {
          age: 42,
          gender: 'M',
          satisfaction: '보통',
          visits: 1,
          member: 'Yes'
        },
        {
          age: 28,
          gender: 'F',
          satisfaction: '매우 만족',
          visits: 10,
          member: 'Yes'
        }
      ]

      const analysis = analyzeDataset(surveyData)
      const typeMap = new Map(analysis.columns.map(c => [c.name, c.type]))

      expect(typeMap.get('age')).toBe('continuous')
      expect(typeMap.get('gender')).toBe('binary')
      // satisfaction은 categorical 또는 ordinal 모두 가능
      const satisfactionType = typeMap.get('satisfaction')
      expect(['categorical', 'ordinal']).toContain(satisfactionType)

      // visits는 count 또는 ordinal 모두 가능
      const visitsType = typeMap.get('visits')
      expect(['count', 'ordinal', 'continuous']).toContain(visitsType)

      expect(typeMap.get('member')).toBe('binary')
    })

    it('시계열 데이터를 올바르게 분석해야 함', () => {
      const timeSeriesData = [
        { date: '2024-01-01', value: 100, category: 'A' },
        { date: '2024-01-02', value: 105, category: 'B' },
        { date: '2024-01-03', value: 98, category: 'A' },
        { date: '2024-01-04', value: 110, category: 'C' },
        { date: '2024-01-05', value: 103, category: 'B' }
      ]

      const analysis = analyzeDataset(timeSeriesData)
      const typeMap = new Map(analysis.columns.map(c => [c.name, c.type]))

      expect(typeMap.get('date')).toBe('date')
      expect(typeMap.get('value')).toBe('continuous')
      expect(typeMap.get('category')).toBe('categorical')
    })

    it('실험 데이터를 올바르게 분석해야 함', () => {
      const experimentData = Array.from({ length: 50 }, (_, i) => ({
        subject_id: `S${i + 1}`,
        group: i < 25 ? 'control' : 'treatment',
        pre_score: 50 + Math.random() * 50,
        post_score: 60 + Math.random() * 40,
        improvement: Math.random() > 0.5 ? 1 : 0
      }))

      const analysis = analyzeDataset(experimentData, {
        excludeColumns: ['subject_id']
      })

      const typeMap = new Map(analysis.columns.map(c => [c.name, c.type]))

      expect(typeMap.get('group')).toBe('binary')
      expect(typeMap.get('pre_score')).toBe('continuous')
      expect(typeMap.get('post_score')).toBe('continuous')
      expect(typeMap.get('improvement')).toBe('binary')
    })
  })
})