/**
 * BLOB 유틸리티
 *
 * SQLite BLOB 형식으로 임베딩 벡터를 저장/로드합니다.
 * - Float32Array ↔ BLOB 변환
 * - Hex 인코딩 (X'...' 형식)
 *
 * **Endianness**: Little-endian 사용
 * - 이유: sql.js는 WebAssembly 기반이며, WASM은 Little-endian 사용
 * - SQLite BLOB은 byte order에 중립적 (애플리케이션이 일관되게 사용하면 됨)
 * - JavaScript DataView도 Little-endian이 기본값
 */

/**
 * Float32Array를 SQLite BLOB로 변환
 *
 * @param vector 임베딩 벡터 (Float32Array)
 * @returns Hex 문자열 (SQLite BLOB용)
 *
 * @example
 * ```typescript
 * const vector = new Float32Array([0.1, 0.2, 0.3])
 * const blob = vectorToBlob(vector)
 * // → "3dcccccd3e4ccccd3e99999a" (12 bytes hex)
 * ```
 */
export function vectorToBlob(vector: Float32Array): string {
  // Float32Array → ArrayBuffer → Uint8Array
  const buffer = new ArrayBuffer(vector.length * 4) // 4 bytes per float
  const view = new DataView(buffer)

  // Little-endian으로 Float32 쓰기
  for (let i = 0; i < vector.length; i++) {
    view.setFloat32(i * 4, vector[i], true) // true = little-endian
  }

  // ArrayBuffer → Hex string
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * SQLite BLOB를 Float32Array로 변환
 *
 * @param hexString Hex 문자열 (BLOB)
 * @returns Float32Array 벡터
 * @throws Error Hex 문자열이 유효하지 않으면 에러
 *
 * @example
 * ```typescript
 * const blob = "3dcccccd3e4ccccd3e99999a"
 * const vector = blobToVector(blob)
 * // → Float32Array [0.1, 0.2, 0.3]
 * ```
 */
export function blobToVector(hexString: string): Float32Array {
  // Hex 문자열 유효성 검증
  if (hexString.length % 8 !== 0) {
    throw new Error(
      `잘못된 BLOB 형식: Hex 문자열 길이는 8의 배수여야 합니다 (Float32 = 8 hex chars). 실제: ${hexString.length}`
    )
  }

  // Hex string → Uint8Array
  const bytes = new Uint8Array(hexString.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexString.slice(i * 2, i * 2 + 2), 16)
  }

  // Uint8Array → Float32Array
  const floats = new Float32Array(bytes.length / 4)
  const view = new DataView(bytes.buffer)

  for (let i = 0; i < floats.length; i++) {
    floats[i] = view.getFloat32(i * 4, true) // true = little-endian
  }

  return floats
}

/**
 * SQLite INSERT/UPDATE 쿼리용 BLOB 리터럴 생성
 *
 * @param vector 임베딩 벡터
 * @returns SQLite BLOB 리터럴 (X'hexstring')
 *
 * @example
 * ```typescript
 * const vector = new Float32Array([0.1, 0.2, 0.3])
 * const literal = toSQLiteBlobLiteral(vector)
 * // → "X'3dcccccd3e4ccccd3e99999a'"
 *
 * // SQL에서 사용:
 * db.run(`INSERT INTO embeddings (embedding) VALUES (${literal})`)
 * ```
 */
export function toSQLiteBlobLiteral(vector: Float32Array): string {
  const hexString = vectorToBlob(vector)
  return `X'${hexString}'`
}

/**
 * BLOB 크기 계산 (바이트)
 *
 * @param vector 임베딩 벡터
 * @returns BLOB 크기 (bytes)
 *
 * @example
 * ```typescript
 * const vector = new Float32Array(1024) // 1024 dimensions
 * const size = getBlobSize(vector)
 * // → 4096 bytes (4KB)
 * ```
 */
export function getBlobSize(vector: Float32Array): number {
  return vector.length * 4 // 4 bytes per float
}

/**
 * 벡터 차원 검증
 *
 * @param vector 임베딩 벡터
 * @param expectedDimensions 예상 차원 수
 * @throws Error 차원이 일치하지 않으면 에러
 *
 * @example
 * ```typescript
 * const vector = new Float32Array(1024)
 * validateVectorDimensions(vector, 1024) // ✓ OK
 * validateVectorDimensions(vector, 512)  // ✗ Error!
 * ```
 */
export function validateVectorDimensions(
  vector: Float32Array,
  expectedDimensions: number
): void {
  if (vector.length !== expectedDimensions) {
    throw new Error(
      `벡터 차원 불일치: 예상 ${expectedDimensions}, 실제 ${vector.length}`
    )
  }
}
