# Multi-Tenant RAG - 빠른 시작 가이드

**현재 프로젝트 완료 후 즉시 시작 가능!**

---

## 🚀 1분 안에 시작하기

### Step 1: 프로젝트 복제

```bash
# 현재 통계 프로젝트를 부서별로 복제
cd d:/Projects/

# 시설팀용
cp -r Statics CompanyRAG-Facility
cd CompanyRAG-Facility/statistical-platform
rm public/rag-data/*.db  # 기존 통계 DB 삭제
```

### Step 2: 문서 추가

```bash
# 개발 서버 실행
npm run dev
# → http://localhost:3000 접속

# RAG 관리 페이지에서 문서 추가
# - 시설관리_규정.pdf (100페이지)
# - 참고문헌 100개
# - 부록 100개
# → "벡터 DB 구축" 버튼 클릭
```

### Step 3: DB 공유

```bash
# 파일 서버에 업로드
cp public/rag-data/rag.db //fileserver/shared/rag-facility/
cp public/rag-data/vector-qwen3-*.db //fileserver/shared/rag-facility/
```

### Step 4: 다른 직원 다운로드

```bash
# 파일 서버에서 다운로드
curl //fileserver/shared/rag-facility/rag.db -o public/rag-data/
curl //fileserver/shared/rag-facility/vector-qwen3-*.db -o public/rag-data/

# 즉시 사용 가능!
npm run dev
```

---

## 📁 폴더 구조 (예시)

```
d:/Projects/
├── Statics/                    # 원본 (통계 프로젝트)
├── CompanyRAG-Facility/        # 시설팀
├── CompanyRAG-Budget/          # 예산팀
├── CompanyRAG-Contract/        # 계약팀
└── CompanyRAG-Shared/          # 공유 저장소
    ├── facility-rag.db
    ├── facility-vector-qwen3-0.6b.db
    ├── budget-rag.db
    └── budget-vector-qwen3-0.6b.db
```

---

## 🎯 주요 개선 사항 (향후)

### Phase 1: 메타데이터 추가 ✨
```json
{
  "id": "facility-v1.2",
  "department": "시설팀",
  "version": "1.2",
  "createdBy": "홍길동",
  "docCount": 301,
  "description": "2025 상반기 시설 관리 규정"
}
```

### Phase 2: UI 개선
- DB 선택 드롭다운 (설정 페이지)
- 실시간 전환 (버튼 클릭)
- 메타데이터 표시

### Phase 3: 자동화 스크립트
- `upload-db.sh`: 파일 서버 업로드
- `download-db.sh`: 다운로드
- `create-dept-rag.sh`: 새 부서 RAG 자동 생성

---

## ⚡ 성능 예상

| 항목 | 값 |
|------|-----|
| 문서 수 | 301개 (100 + 100 + 100) |
| 페이지 수 | 3,350페이지 |
| 청크 수 | 4,840개 |
| DB 크기 | 29.2 MB |
| 검색 속도 | ~0.24초 |
| 메모리 사용 | ~58 MB |

---

## 📞 문의

- 상세 계획: [PLAN.md](./PLAN.md)
- 기술 설계: [ARCHITECTURE.md](./ARCHITECTURE.md) (추후 작성)
