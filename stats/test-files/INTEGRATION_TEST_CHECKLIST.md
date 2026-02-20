# 📋 통합 테스트 체크리스트

## 🚀 사전 준비

### 1. 개발 서버 시작
```bash
cd stats
npm run dev
```

### 2. 브라우저 접속
```
http://localhost:3000/rag/documents
```

### 3. Python 환경 체크 (PDF 테스트용, 선택)
```bash
# Docling 설치 확인
pip show docling

# 미설치 시
pip install docling
```

---

## ✅ 테스트 시나리오

### 시나리오 1: Markdown 파일 업로드 (기본 플로우)

**파일**: `test-files/scipy-statistics-ttest.md`

**단계**:
1. [ ] "업로드" 버튼 클릭
2. [ ] 파일 선택: `scipy-statistics-ttest.md`
3. [ ] 파싱 진행 상태 확인 (로딩 표시)
4. [ ] 파싱 완료 확인 (✓ 초록색 체크)
5. [ ] 메타데이터 확인:
   - doc_id: `user_{timestamp}_scipy-statistics-ttest`
   - title: `scipy-statistics-ttest` (자동 추출)
   - library: `scipy` (자동 추출)
   - category: `statistics` (자동 추출)
6. [ ] 파싱된 내용 미리보기 확인 (첫 1000자)
7. [ ] 메타데이터 수정 (선택):
   - title → `scipy.stats.ttest_ind`
   - summary → `Independent t-test for two samples`
8. [ ] "문서 추가" 버튼 클릭
9. [ ] 성공 알림 확인
10. [ ] 문서 목록에 추가 확인 (좌측 패널)

**예상 결과**:
- ✅ 파싱 성공
- ✅ 메타데이터 자동 생성
- ✅ 문서 DB 추가 완료

---

### 시나리오 2: 한글 파일명 처리 (UUID Fallback)

**파일**: `test-files/test-korean-filename-통계기초.txt`

**단계**:
1. [ ] "업로드" 버튼 클릭
2. [ ] 파일 선택: `test-korean-filename-통계기초.txt`
3. [ ] 파싱 진행 상태 확인
4. [ ] 파싱 완료 확인
5. [ ] 메타데이터 확인:
   - doc_id: `user_{timestamp}_{uuid}` ← **UUID 사용 확인**
   - title: `test-korean-filename-통계기초` (한글 유지)
   - library: `test` 또는 `custom`
6. [ ] "문서 추가" 버튼 클릭
7. [ ] 성공 알림 확인

**예상 결과**:
- ✅ 한글 파일명 → UUID fallback 동작
- ✅ doc_id에 한글 없음 (UUID로 대체)
- ✅ title에는 한글 유지

---

### 시나리오 3: 파일 크기 제한 (50MB)

**테스트 방법**: 대용량 파일 생성 (선택)

```bash
# Windows (PowerShell)
fsutil file createnew test-files/large-file.txt 52428800  # 50MB
fsutil file createnew test-files/huge-file.txt 104857600 # 100MB

# Linux/Mac
dd if=/dev/zero of=test-files/large-file.txt bs=1M count=50   # 50MB
dd if=/dev/zero of=test-files/huge-file.txt bs=1M count=100  # 100MB
```

**단계**:
1. [ ] 50MB 파일 업로드 시도
   - **예상**: 허용 (파싱 진행)
2. [ ] 100MB 파일 업로드 시도
   - **예상**: 거부 (에러 메시지)
   - 메시지: `파일 크기가 너무 큽니다.\n현재 크기: 100.0MB\n최대 크기: 50MB`

**예상 결과**:
- ✅ 50MB 이하: 허용
- ✅ 50MB 초과: 명확한 에러 메시지

---

### 시나리오 4: 미지원 파일 형식 거부

**테스트 파일**: `.docx`, `.xlsx` 등 (있다면)

**단계**:
1. [ ] 미지원 파일 선택 시도
2. [ ] 에러 메시지 확인:
   - `지원하지 않는 파일 형식입니다.`
   - `지원 형식: .hwp, .hwpx, .pdf, .md, .txt`

**예상 결과**:
- ✅ 미지원 형식 거부
- ✅ 지원 형식 목록 표시

---

### 시나리오 5: PDF 파일 업로드 (Docling, 선택)

**파일**: 작은 PDF 파일 (사용자 준비)

**사전 조건**:
```bash
pip install docling  # Python 환경 필수
```

**단계**:
1. [ ] PDF 파일 업로드
2. [ ] 파싱 진행 (시간 소요 가능, ~10초)
3. [ ] 파싱 완료 확인
4. [ ] Markdown 형식 텍스트 확인 (Docling 특징)
5. [ ] 문서 추가 완료

**예상 결과**:
- ✅ Docling 정상 동작
- ✅ PDF → Markdown 변환 성공

**실패 시**:
- ❌ Docling 미설치: 에러 메시지 확인
- 해결: `pip install docling`

---

### 시나리오 6: HWP 파일 업로드 (선택)

**파일**: 작은 HWP 파일 (사용자 준비)

**단계**:
1. [ ] HWP 파일 업로드
2. [ ] 파싱 진행
3. [ ] 파싱 완료 확인
4. [ ] 한글 텍스트 정상 추출 확인
5. [ ] 문서 추가 완료

**예상 결과**:
- ✅ hwp.js 정상 동작
- ✅ 한글 텍스트 추출 성공

---

## 🔍 추가 확인 사항

### 1. Vector Store 재구축
1. [ ] 문서 추가 후 "Vector Store 재구축" 버튼 클릭
2. [ ] 진행률 표시 확인
3. [ ] 재구축 완료 알림 확인
4. [ ] 에러 패널 확인 (실패 문서 있는 경우)

### 2. 문서 검색 (RAG 챗봇)
1. [ ] RAG 챗봇 페이지 이동: `/rag`
2. [ ] 업로드한 문서 내용으로 질문
3. [ ] 검색 결과 확인 (Sources 패널)
4. [ ] 업로드한 문서가 검색되는지 확인

### 3. 에러 핸들링
1. [ ] 파싱 실패 시 에러 메시지 확인
2. [ ] 재시도 가능 여부 확인
3. [ ] 에러 상세 정보 표시 확인

---

## 📊 테스트 결과 기록

### Markdown 파일 (필수)
- [ ] ✅ 성공
- [ ] ❌ 실패 (사유: _________________)

### 한글 파일명 (필수)
- [ ] ✅ UUID fallback 동작
- [ ] ❌ 실패 (사유: _________________)

### 파일 크기 제한 (필수)
- [ ] ✅ 50MB 이하 허용
- [ ] ✅ 50MB 초과 거부
- [ ] ❌ 실패 (사유: _________________)

### PDF 파일 (선택)
- [ ] ✅ Docling 정상 동작
- [ ] ❌ Docling 미설치
- [ ] ⏭️ 테스트 생략

### HWP 파일 (선택)
- [ ] ✅ hwp.js 정상 동작
- [ ] ❌ 실패 (사유: _________________)
- [ ] ⏭️ 테스트 생략

---

## 🐛 발견된 이슈

| 번호 | 시나리오 | 이슈 내용 | 심각도 |
|------|---------|----------|--------|
| 1 | | | |
| 2 | | | |

---

## ✅ 최종 승인

- [ ] 모든 필수 시나리오 통과
- [ ] 발견된 이슈 문서화
- [ ] 다음 단계 진행 가능

**테스트 일시**: _______________
**테스터**: _______________
