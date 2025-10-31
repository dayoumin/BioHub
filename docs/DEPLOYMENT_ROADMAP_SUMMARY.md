# 배포 로드맵 요약 (Phase 10-1 추가 사항)

**작성일**: 2025-10-31
**상태**: 준비 완료 (문서만 작성, 실제 배포는 나중에)

---

## ✅ 완료한 작업 (2025-10-31)

### 1. 듀얼 모드 배포 지원 구현

**목표**: 하나의 코드베이스로 온라인/오프라인 배포 모두 지원

**구현 내용**:
- ✅ [lib/constants.ts](../statistical-platform/lib/constants.ts:87-116) 수정 - 환경 변수 기반 모드 전환
- ✅ [.env.online.example](../statistical-platform/.env.online.example) - 온라인 배포 템플릿
- ✅ [.env.offline.example](../statistical-platform/.env.offline.example) - 오프라인 배포 템플릿

**핵심 기능**:
```typescript
// lib/constants.ts의 getPyodideCDNUrls() 함수
// 환경 변수에 따라 자동으로 CDN/로컬 경로 선택
const useLocal = process.env?.NEXT_PUBLIC_PYODIDE_USE_LOCAL === 'true'
```

---

## 📋 배포 방식 비교

### 온라인 모드 (CDN 사용)

**빌드 명령**:
```bash
# .env.local 없이 빌드 (기본값)
npm run build
```

**결과**:
- 파일 크기: ~5 MB
- Pyodide CDN 로드 (인터넷 필요)
- 배포 위치: GitHub Pages, Netlify, Vercel

**사용 사례**:
- 대학 통계 수업
- 공개 서비스
- 인터넷 연결 가능한 환경

---

### 오프라인 모드 (로컬 Pyodide)

**빌드 명령**:
```bash
# 1. Pyodide 다운로드 및 복사 (1회만)
cp -r ~/Downloads/pyodide/* public/pyodide/

# 2. 환경 변수 설정
cp .env.offline.example .env.local

# 3. 빌드
npm run build
```

**결과**:
- 파일 크기: ~250 MB (Pyodide 포함)
- 완전 오프라인 작동 (인터넷 불필요)
- 배포 위치: 내부망 서버, USB

**사용 사례**:
- 병원 내부망 (환자 데이터)
- 연구소 내부망 (기밀 데이터)
- 인터넷 차단 환경

---

## 📚 상세 가이드 문서

### 1. [OFFLINE_DEPLOYMENT_GUIDE.md](../statistical-platform/docs/OFFLINE_DEPLOYMENT_GUIDE.md)
**내용**: 완전 오프라인 배포 가이드 (10단계)
- Pyodide 다운로드 및 복사
- 환경 변수 설정
- 빌드 및 배포
- 트러블슈팅 (4가지 문제 해결)
- FAQ (3가지 질문)

### 2. [ADDING_DYNAMIC_FEATURES_AFTER_BUILD.md](../statistical-platform/docs/ADDING_DYNAMIC_FEATURES_AFTER_BUILD.md)
**내용**: 빌드 후 게시판 등 동적 기능 추가 가이드
- Static Export 제약 사항 설명
- Firebase 게시판 구현 (9단계)
- Supabase 게시판 구현 (6단계)
- 배포 워크플로우

---

## 🎯 ROADMAP.md 업데이트 필요

**위치**: [ROADMAP.md](../ROADMAP.md) → Phase 10-1

**추가할 내용**:
```markdown
#### 10-1. 빌드 및 배포 설정
- ✅ 프로덕션 빌드 최적화
- ✅ **듀얼 모드 배포 지원** (2025-10-31 완료)
  - 온라인 모드 (CDN): ~5 MB
  - 오프라인 모드 (로컬): ~250 MB
  - 환경 변수 전환: `.env.local`
  - 상세 가이드:
    - [OFFLINE_DEPLOYMENT_GUIDE.md](statistical-platform/docs/OFFLINE_DEPLOYMENT_GUIDE.md)
    - [ADDING_DYNAMIC_FEATURES_AFTER_BUILD.md](statistical-platform/docs/ADDING_DYNAMIC_FEATURES_AFTER_BUILD.md)
- ✅ CI/CD 파이프라인
- ✅ 호스팅 플랫폼 선정
```

**업데이트 시점**: Phase 2-2 완료 후 또는 다음 세션에서

---

## 🔧 실제 배포 시 체크리스트

### 온라인 배포 (나중에 실행)
- [ ] `.env.local` 삭제 또는 비활성화
- [ ] `npm run build` 실행
- [ ] `out/` 폴더 크기 확인 (~5 MB)
- [ ] GitHub Pages 또는 Netlify 배포
- [ ] 브라우저에서 Pyodide CDN 로드 확인

### 오프라인 배포 (나중에 실행)
- [ ] Pyodide 다운로드 (200 MB)
- [ ] `public/pyodide/` 복사
- [ ] `cp .env.offline.example .env.local`
- [ ] `npm run build` 실행
- [ ] `out/` 폴더 크기 확인 (~250 MB)
- [ ] `out/pyodide/` 폴더 존재 확인
- [ ] ZIP 압축 또는 내부망 서버 업로드
- [ ] 인터넷 연결 끊고 테스트

---

## 📌 중요 사항

### 지금 당장 할 일
❌ **없음** - 배포는 나중에 (Phase 2-2 완료 후)

### 나중에 할 일 (Phase 10-1 시작 시)
1. ROADMAP.md 업데이트 (위 내용 추가)
2. 온라인 배포 테스트 (GitHub Pages)
3. 오프라인 배포 테스트 (로컬 서버)
4. 크로스 브라우저 테스트
5. 성능 측정 (Lighthouse)

---

## 🔗 관련 파일

### 수정된 파일
- [lib/constants.ts](../statistical-platform/lib/constants.ts) - 듀얼 모드 지원

### 새로 생성된 파일
- [.env.online.example](../statistical-platform/.env.online.example)
- [.env.offline.example](../statistical-platform/.env.offline.example)
- [docs/OFFLINE_DEPLOYMENT_GUIDE.md](../statistical-platform/docs/OFFLINE_DEPLOYMENT_GUIDE.md)
- [docs/ADDING_DYNAMIC_FEATURES_AFTER_BUILD.md](../statistical-platform/docs/ADDING_DYNAMIC_FEATURES_AFTER_BUILD.md)
- [docs/DEPLOYMENT_ROADMAP_SUMMARY.md](./DEPLOYMENT_ROADMAP_SUMMARY.md) (이 파일)

---

**최종 업데이트**: 2025-10-31
**다음 작업**: Phase 2-2 (코드 품질 개선) 계속 진행
**배포 예정 시점**: Phase 9-10 (미정)
