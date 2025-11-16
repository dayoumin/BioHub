# 챗봇 수동 테스트 가이드

**목적**: RAG 챗봇 시스템의 실제 동작 검증

## 🎯 테스트 환경

- **URL**: http://localhost:3005
- **브라우저**: Chrome, Edge (권장)
- **Ollama**: 필수 (qwen3:4b, qwen3-embedding:0.6b)

---

## ✅ 테스트 시나리오 1: 가로 스크롤 제거 검증

### 목적
우측 패널 챗봇에서 가로 스크롤이 제거되었는지 확인

### 단계
1. http://localhost:3005 접속
2. 통계 페이지 이동 (예: t-test, ANOVA 등)
3. 우측 패널 챗봇 확인

### 예상 결과
- ✅ 상단에 **현재 세션 제목만** 표시
- ✅ **가로 스크롤 없음**
- ✅ 새 대화 버튼: **아이콘만** (Plus 아이콘)
- ✅ 제목에 마우스 올리면 **툴팁** 표시

### 스크린샷
- [ ] Before: 가로 스크롤 탭 (5개 세션)
- [ ] After: 현재 세션만 표시

---

## ✅ 테스트 시나리오 2: Hydration 에러 없음

### 목적
전용 챗봇 페이지에서 Hydration 에러가 발생하지 않는지 확인

### 단계
1. http://localhost:3005/chatbot 접속
2. 브라우저 콘솔 열기 (F12)
3. 페이지 새로고침 (Ctrl+R)

### 예상 결과
- ✅ **Hydration 에러 없음**
- ✅ "Loading..." 표시 후 정상 렌더링
- ✅ 좌측 사이드바 정상 표시
- ✅ 세션 목록 정상 로드

### 콘솔 확인 사항
```
❌ Hydration failed because the server rendered HTML didn't match the client
✅ (에러 없음)
```

---

## ✅ 테스트 시나리오 3: SQL.js WASM 로딩 확인

### 목적
RAG 시스템이 sql.js WASM을 정상적으로 로드하는지 확인

### 단계
1. http://localhost:3005/chatbot 접속
2. 브라우저 콘솔 열기 (F12)
3. Network 탭 확인 (필터: WS, Fetch/XHR)

### 예상 결과
- ✅ `/sql-wasm/sql-wasm.js` 로드 성공 (200 OK)
- ✅ `/sql-wasm/sql-wasm.wasm` 로드 성공 (200 OK)
- ✅ 콘솔 에러 없음

### 에러가 있다면
```
❌ LinkError: WebAssembly.instantiate(): Import #37 "a" "L": function import requires a callable
→ 해결: npm run setup:sql-wasm 실행
```

---

## ✅ 테스트 시나리오 4: RAG 챗봇 질의응답

### 목적
RAG 시스템이 실제로 질문에 답변하는지 확인

### 전제 조건
- ✅ Ollama 실행 중 (`ollama serve`)
- ✅ 모델 다운로드 완료
  ```bash
  ollama pull qwen3-embedding:0.6b
  ollama pull qwen3:4b
  ```

### 단계 1: Ollama 연결 확인
1. http://localhost:3005/chatbot 접속
2. 빈 화면에서 Ollama 상태 확인

### 예상 결과
- ✅ Ollama 연결 성공 시: "AI 통계 챗봇" 웰컴 메시지
- ❌ Ollama 미설치 시: 노란색 경고 박스 (설치 안내)

### 단계 2: 간단한 질문
입력 예시:
```
t-test의 가정은 무엇인가요?
```

### 예상 결과
- ✅ "생각 중..." 표시
- ✅ 5-10초 내 답변 생성
- ✅ 답변 하단에 **참조 문서** 표시 (Citations)
- ✅ 세션 제목 자동 생성 (예: "t-test의 가정은...")

### 단계 3: 복잡한 질문
입력 예시:
```
ANOVA와 t-test의 차이점을 설명해주세요. 어떤 경우에 각각 사용해야 하나요?
```

### 예상 결과
- ✅ 구조화된 답변 (마크다운 포맷)
- ✅ 코드 블록 (필요 시)
- ✅ 수식 렌더링 (KaTeX)

### 단계 4: 새 대화 생성
1. "새 대화" 버튼 클릭 (좌측 상단)
2. 다른 질문 입력

### 예상 결과
- ✅ 이전 대화 유지
- ✅ 새 세션 생성
- ✅ 좌측 사이드바에 세션 목록 추가

---

## ✅ 테스트 시나리오 5: 문서 관리 (RAG)

### 목적
사용자 정의 문서를 업로드하고 RAG에서 활용하는지 확인

### 단계 1: 문서 업로드
1. http://localhost:3005/chatbot 접속
2. 하단 "문서 관리" 버튼 클릭
3. PDF/TXT 파일 업로드

### 예상 결과
- ✅ 파일 업로드 성공
- ✅ IndexedDB에 저장 확인
- ✅ 임베딩 생성 (qwen3-embedding:0.6b)

### 단계 2: 업로드한 문서로 질문
입력 예시:
```
방금 업로드한 문서의 내용을 요약해주세요.
```

### 예상 결과
- ✅ 업로드한 문서 내용 기반 답변
- ✅ Citations에 업로드한 문서 표시

---

## ✅ 테스트 시나리오 6: 세션 관리

### 목적
세션 생성, 이름 변경, 삭제 기능 확인

### 단계 1: 세션 이름 변경
1. 현재 세션 옆 "..." 버튼 클릭
2. "이름 변경" 선택
3. 새 이름 입력 (예: "통계 기초 질문")

### 예상 결과
- ✅ 세션 제목 즉시 변경
- ✅ localStorage 저장 확인

### 단계 2: 즐겨찾기 추가
1. 세션 옆 "..." 버튼 클릭
2. "즐겨찾기 추가" 선택

### 예상 결과
- ✅ 좌측 사이드바 "즐겨찾기" 섹션에 추가
- ✅ 별 아이콘 표시

### 단계 3: 세션 삭제
1. 세션 옆 "..." 버튼 클릭
2. "삭제" 선택
3. 확인 팝업에서 "삭제" 클릭

### 예상 결과
- ✅ 세션 목록에서 제거
- ✅ 다음 세션으로 자동 전환

---

## 🐛 알려진 이슈

### 1. Ollama 연결 실패
**증상**: "RAG 챗봇을 사용하려면 Ollama 설치가 필요합니다" 경고

**해결**:
```bash
# Ollama 설치 확인
ollama --version

# Ollama 서버 실행
ollama serve

# 모델 다운로드
ollama pull qwen3-embedding:0.6b
ollama pull qwen3:4b
```

### 2. WASM 로딩 실패
**증상**: `LinkError: function import requires a callable`

**해결**:
```bash
cd statistical-platform
npm run setup:sql-wasm
npm run dev
```

### 3. Hydration 에러
**증상**: `Hydration failed because the server rendered HTML didn't match the client`

**해결**: 이미 수정 완료 (isMounted 패턴 적용)

---

## 📊 테스트 체크리스트

### UI 개선
- [ ] 가로 스크롤 제거 확인
- [ ] 현재 세션만 표시 확인
- [ ] 툴팁 동작 확인
- [ ] 새 대화 버튼 아이콘만 표시 확인

### Hydration
- [ ] /chatbot 페이지 Hydration 에러 없음
- [ ] 브라우저 콘솔 에러 없음
- [ ] 세션 목록 정상 로드

### RAG 시스템
- [ ] sql.js WASM 로딩 성공
- [ ] Ollama 연결 성공
- [ ] 질문 응답 정상
- [ ] Citations 표시 확인

### 세션 관리
- [ ] 새 대화 생성
- [ ] 이름 변경
- [ ] 즐겨찾기 추가/제거
- [ ] 세션 삭제

---

## 🎥 테스트 결과 기록

### 테스트 일시
```
날짜: 2025-11-16
테스터: [이름]
브라우저: Chrome/Edge [버전]
```

### 스크린샷
1. 가로 스크롤 제거 (Before/After)
2. Hydration 에러 없음 (콘솔)
3. RAG 질의응답 (채팅 화면)
4. 문서 관리 (업로드 화면)

### 발견된 버그
```
1. [버그 설명]
   - 재현 방법: ...
   - 예상 결과: ...
   - 실제 결과: ...

2. [버그 설명]
   - ...
```

---

**Updated**: 2025-11-16
**Version**: Phase 9 Complete
