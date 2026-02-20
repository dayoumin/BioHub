/**
 * Type definitions for node-hwp
 * node-hwp 라이브러리의 타입 선언
 */

declare module 'node-hwp' {
  /**
   * HWP 문서 내용
   */
  export interface HWPContent {
    /** 텍스트 내용 */
    text: string
    /** 추가 메타데이터 */
    [key: string]: unknown
  }

  /**
   * HWP 파싱 옵션
   */
  export interface HWPParseOptions {
    /** 이미지 추출 여부 */
    extractImages?: boolean
    /** 기타 옵션 */
    [key: string]: unknown
  }

  /**
   * HWP 파일 열기 콜백
   */
  export type HWPOpenCallback = (err: Error | null, doc: unknown) => void

  /**
   * HWP 파일 열기
   * @param filePath - HWP 파일 경로
   * @param callback - 콜백 함수
   */
  export function open(filePath: string, callback: HWPOpenCallback): void

  /**
   * HWP 파일 파싱
   * @param buffer - HWP 파일 버퍼
   * @param options - 파싱 옵션
   * @returns 파싱된 내용
   */
  export function parse(
    buffer: Buffer,
    options?: HWPParseOptions
  ): Promise<HWPContent>

  /**
   * HWP 파일에서 텍스트 추출
   * @param buffer - HWP 파일 버퍼
   * @returns 추출된 텍스트
   */
  export function extractText(buffer: Buffer): Promise<string>

  const hwp: {
    open: typeof open
    parse: typeof parse
    extractText: typeof extractText
  }
  export default hwp
}
