# Vector Store 초기화 가이드

## 개요

Ollama 임베딩 모델을 변경한 경우 (예: qwen3-embedding 업데이트), 기존 벡터 데이터와 호환되지 않으므로 Vector Store를 초기화해야 합니다.

## 언제 초기화가 필요한가?

- ✅ 임베딩 모델을 변경한 경우 (예: nomic-embed-text → qwen3-embedding)
- ✅ 임베딩 모델을 재설치한 경우 (예: qwen3-embedding:0.6b → qwen3-embedding:4b)
- ✅ RAG 검색 결과가 이상하거나 오류가 발생하는 경우
- ❌ 추론 모델(LLM)만 변경한 경우 (초기화 불필요)

## 초기화 방법

### 방법 1: HTML 도구 사용 (권장)

1. **브라우저에서 초기화 도구 열기**:
   ```bash
   # 파일 탐색기에서 다음 파일을 더블클릭
   stats/scripts/reset-vector-store.html
   ```

2. **상태 확인** (선택):
   - "현재 상태 확인" 버튼 클릭
   - 현재 저장된 Vector Store 정보 확인

3. **초기화 실행**:
   - "Vector Store 초기화" 버튼 클릭
   - 확인 대화상자에서 "확인" 클릭
   - 로그에서 진행 상황 확인

4. **완료 후**:
   - 브라우저 새로고침 (F5)
   - 애플리케이션에서 문서 재인덱싱

### 방법 2: 브라우저 개발자 도구 (고급)

1. **애플리케이션 페이지 열기**:
   ```
   http://localhost:3000
   ```

2. **개발자 도구 열기** (F12)

3. **콘솔 탭에서 다음 코드 실행**:
   ```javascript
   // IndexedDB 삭제
   indexedDB.deleteDatabase('rag-storage')
   indexedDB.deleteDatabase('sqljs-persistent-storage')

   // localStorage 초기화
   localStorage.removeItem('statPlatform_embeddingModel')
   localStorage.removeItem('statPlatform_inferenceModel')
   localStorage.removeItem('statPlatform_ollamaEndpoint')
   localStorage.removeItem('statPlatform_topK')

   // 페이지 새로고침
   location.reload()
   ```

## 초기화 후 확인사항

1. **브라우저 콘솔 로그 확인**:
   ```
   [OllamaProvider] 추천 임베딩 모델 사용: qwen3-embedding:4b
   [OllamaProvider] ✓ 임베딩 모델: qwen3-embedding:4b
   ```

2. **RAG 설정 페이지에서 확인**:
   - Settings → RAG 설정
   - 임베딩 모델: `qwen3-embedding:4b` 확인

3. **문서 재인덱싱**:
   - 채팅 인터페이스에서 문서 업로드
   - 자동으로 새 임베딩 모델로 인덱싱됨

## 문제 해결

### "데이터베이스 삭제 차단됨" 경고

**원인**: 다른 브라우저 탭에서 애플리케이션이 실행 중입니다.

**해결**:
1. 모든 애플리케이션 탭 닫기
2. 브라우저 완전 종료
3. 다시 초기화 도구 실행

### 초기화 후에도 오류 발생

**해결**:
1. 브라우저 캐시 완전 삭제 (Ctrl+Shift+Delete)
2. Ollama 재시작:
   ```bash
   # Windows
   taskkill /F /IM ollama.exe
   ollama serve

   # Linux/Mac
   sudo systemctl restart ollama
   ```
3. 애플리케이션 개발 서버 재시작:
   ```bash
   npm run dev
   ```

## 참고

- **데이터 손실**: 초기화 시 모든 벡터 임베딩이 삭제되며 복구할 수 없습니다
- **백업**: 중요한 문서는 원본 파일을 별도로 보관하세요
- **자동 감지**: 프로젝트는 Ollama에 설치된 모델을 자동으로 감지합니다
- **호환성**: 동일한 임베딩 모델을 사용하면 Vector Store 재사용 가능

## 관련 파일

- 초기화 도구: `scripts/reset-vector-store.html`
- RAG 설정: `lib/rag/rag-config.ts`
- Ollama Provider: `lib/rag/providers/ollama-provider.ts`
- 모델 추천: `lib/rag/utils/model-recommender.ts`