---
name: commit-workflow
description: AI 코딩 품질 보증 워크플로우. 코드 수정 → 검증 → 리뷰 → 커밋 → 푸시 절차. 커밋, 코드 리뷰, 품질 검증 작업 시 자동 적용.
user-invocable: false
---

# AI 코딩 품질 보증 워크플로우

**핵심 흐름**: 수정 → 검증 → 리뷰 → 커밋 → (사용자 승인) → 푸시

## Step 1: 코드 수정

- Write/Edit Tool 사용
- VSCode TypeScript 서버가 문법 에러 자동 감지

## Step 2: 검증

**TypeScript 체크** (필수):
```bash
cd stats
pnpm tsc --noEmit
```

**테스트 실행** (로직 변경 시):
```bash
pnpm test [파일명]
```

## Step 3: 코드 리뷰

**AI 자체 리뷰**:
1. 수정 파일 목록 (파일명 + 라인 번호)
2. 주요 변경 사항 요약 (무엇을, 왜, 어떻게)
3. 예상 영향 범위 분석
4. 알려진 이슈 문서화

**체크리스트**:
- [ ] `any` 타입 사용 없음
- [ ] try-catch 적절히 사용
- [ ] Optional chaining (`?.`) 사용
- [ ] 기존 코드 패턴 준수
- [ ] 다른 파일에 부작용 없음

## Step 4: Git 커밋

```bash
git add [specific files]
git commit -m "커밋 메시지"
```

**커밋 메시지 형식**:
```
feat/fix/refactor: 작업 요약 (1줄)

변경 내역:
- 파일 1 (Line X-Y): 변경 내용

검증 결과:
- TypeScript: 0 errors

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Step 5: 푸시 (사용자 승인 필요)

**AI가 자동으로 푸시하지 않음.**
- 커밋 완료 후 사용자에게 보고
- 사용자가 명시적으로 "푸시해" 요청 시에만 푸시