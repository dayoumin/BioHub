import { DescriptiveExecutor } from '@/lib/services/executors/descriptive-executor'

describe('Debug extractNumericSeries', () => {
  it('숫자 배열 감지 확인', () => {
    const executor = new DescriptiveExecutor()

    const data1 = [1, 2, 3, 4, 5]
    const data2: unknown[] = [1, 2, 3, 4, 5]

    const result1 = (executor as any).extractNumericSeries(data1, {})
    const result2 = (executor as any).extractNumericSeries(data2, {})

    console.log('data1 type:', typeof data1[0])
    console.log('data2 type:', typeof data2[0])
    console.log('result1:', result1)
    console.log('result2:', result2)

    expect(result1).toEqual([1, 2, 3, 4, 5])
    expect(result2).toEqual([1, 2, 3, 4, 5])
  })
})
