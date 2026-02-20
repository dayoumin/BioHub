/**
 * Document Parser 인터페이스
 *
 * 파일 타입별로 텍스트를 추출하는 파서의 기본 인터페이스
 * Parsing과 Chunking을 분리하여 관심사를 명확히 함
 */

/**
 * 파서 메타데이터
 */
export interface ParserMetadata {
  name: string
  version: string
  supportedFormats: string[]
  description?: string
  url?: string
}

/**
 * Document Parser 인터페이스
 */
export interface DocumentParser {
  /**
   * 파서 이름 (예: 'hwp-parser', 'markdown-parser')
   */
  name: string

  /**
   * 지원하는 파일 확장자 목록 (예: ['.hwp', '.hwpx'])
   */
  supportedFormats: string[]

  /**
   * 파일에서 텍스트를 추출
   *
   * @param filePath - 파싱할 파일의 절대 경로
   * @returns 추출된 텍스트 (구조 정보 포함 가능, \n\n\n으로 섹션 구분)
   */
  parse(filePath: string): Promise<string>

  /**
   * 파서 메타데이터 반환
   */
  getMetadata(): ParserMetadata
}

/**
 * Parser Registry 인터페이스
 */
export interface ParserRegistry {
  /**
   * 파서 등록
   */
  register(parser: DocumentParser): void

  /**
   * 파일 확장자로 파서 찾기
   */
  getParser(filePathOrExtension: string): DocumentParser | null

  /**
   * 등록된 모든 파서 목록
   */
  getAllParsers(): DocumentParser[]
}
