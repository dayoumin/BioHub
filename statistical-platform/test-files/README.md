# 📁 테스트 파일 디렉토리

이 디렉토리는 RAG 파일 업로더 통합 테스트를 위한 샘플 파일을 포함합니다.

## 📂 파일 목록

### 1. Markdown 파일
- `scipy-statistics-ttest.md` - SciPy t-test 문서 (영문)
- `numpy-basic-array.md` - NumPy 배열 기초 (영문)
- `test-korean-filename-통계기초.txt` - 통계학 기초 (한글 + 한글 파일명)

### 2. 테스트 체크리스트
- `INTEGRATION_TEST_CHECKLIST.md` - 통합 테스트 절차 및 체크리스트

## 🚀 빠른 시작

### 1. 개발 서버 시작
```bash
cd statistical-platform
npm run dev
```

### 2. 브라우저 접속
```
http://localhost:3000/rag/documents
```

### 3. 파일 업로드 테스트
1. "업로드" 버튼 클릭
2. `scipy-statistics-ttest.md` 선택
3. 파싱 완료 확인
4. 메타데이터 자동 생성 확인
5. "문서 추가" 버튼 클릭

## 📋 테스트 시나리오

### 필수 테스트 (약 10분)
1. ✅ Markdown 파일 업로드
2. ✅ 한글 파일명 처리 (UUID fallback)
3. ✅ 파일 크기 제한 (50MB)
4. ✅ 미지원 형식 거부

### 선택 테스트 (환경에 따라)
5. ⏭️ PDF 파일 업로드 (Docling 필요)
6. ⏭️ HWP 파일 업로드 (HWP 파일 필요)

## 📊 예상 결과

### 성공 케이스
- **Markdown**: 즉시 파싱 성공 (~1초)
- **한글 파일명**: UUID fallback 동작 확인
- **메타데이터**: 자동 추출 (library, category, title)

### 실패 케이스
- **50MB 초과**: 명확한 에러 메시지
- **미지원 형식**: 지원 형식 목록 표시
- **Docling 미설치**: PDF 파싱 실패 + 설치 안내

## 🐛 문제 해결

### Q1. PDF 파싱 실패 시
```bash
# Docling 설치
pip install docling

# 설치 확인
pip show docling
```

### Q2. 개발 서버 포트 충돌
```bash
# 다른 포트 사용
npm run dev -- -p 3001
```

### Q3. 파일 업로드 후 문서 목록에 안 보임
- Vector Store 재구축 필요 (수동)
- "Vector Store 재구축" 버튼 클릭

## 📝 테스트 결과 기록

테스트 완료 후 `INTEGRATION_TEST_CHECKLIST.md`에 결과 기록

---

**생성 일시**: 2025-11-15
**목적**: RAG 파일 업로더 통합 테스트
**관련 PR**: Phase A 안정화 (#3b4a3cf)
