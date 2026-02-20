# CLAUDE.md 최적화 가이드

> 조사일: 2026-02-20 | 적용 대상: 모든 Claude Code 프로젝트

## 핵심 원칙

1. **~150줄 이하** 유지 — 초과 시 규칙 무시율 증가
2. **매 줄 자문**: "이 줄을 빼면 Claude가 실수하나?" → 아니면 제거
3. **코드 스니펫 금지** — 금방 outdated됨 → `file:line` 참조로 대체
4. **포인터 > 복사** — 규칙 원본은 한 곳에만, CLAUDE.md에는 링크

## CLAUDE.md에 넣을 것

- 프로젝트 개요 (기술 스택, 구조)
- 위반 시 즉각 문제가 되는 **핵심 규칙**
- 검증/빌드/테스트 **명령어**
- 주요 문서 **링크**

## CLAUDE.md에서 빼야 할 것

- 코드 예제 (outdated 위험)
- 컴포넌트/API 목록 (코드가 source of truth)
- 상세 워크플로우 절차 (Skills로)
- 배포 시나리오 등 가끔 쓰는 정보 (docs 링크로)

## 분리 도구 3가지

### 1. Skills (권장)

```
.claude/skills/<name>/SKILL.md
```

- **description**: 항상 context에 로드 (Claude가 언제 쓸지 판단)
- **SKILL.md 본문**: 관련 작업 시에만 로드 (context bloat 없음)
- `user-invocable: false` → Claude만 자동 사용 (배경 지식용)
- `disable-model-invocation: true` → 사용자가 `/name`으로만 실행

**모노레포 지원**: 하위 프로젝트에 `.claude/skills/` 두면 해당 디렉토리 작업 시 자동 발견

### 2. Hooks (100% 보장 필요 시)

```json
// .claude/settings.json
{ "hooks": { "PostToolUse": [{ "matcher": "Write", "command": "pnpm lint-staged" }] } }
```

- CLAUDE.md 지시는 advisory (무시 가능), hooks는 deterministic

### 3. 하위 CLAUDE.md (비추)

- 공식 문서에는 "하위 디렉토리 파일 접근 시 자동 로드"라고 되어있으나
- **실제 버그 있음**: [Issue #2571](https://github.com/anthropics/claude-code/issues/2571), [Issue #3529](https://github.com/anthropics/claude-code/issues/3529)
- Skills 사용이 더 안정적

## Skill 작성 팁

- SKILL.md는 500줄 이하 권장
- 대용량 참조 자료는 supporting files로 분리 (`reference.md`, `examples.md`)
- `$ARGUMENTS` 치환으로 동적 입력 지원
- `context: fork`로 subagent 실행 가능

## Sources

- [Best Practices for Claude Code](https://code.claude.com/docs/en/best-practices)
- [Extend Claude with Skills](https://code.claude.com/docs/en/skills)
- [Writing a Good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [CLAUDE.md Best Practices - Arize](https://arize.com/blog/claude-md-best-practices-learned-from-optimizing-claude-code-with-prompt-learning/)
- [Claude Code Organize Your Project](https://rajeevpentyala.com/2026/02/11/claude-code-organize-your-project-using-claude-md/)
- [How to Write a Good CLAUDE.md - Builder.io](https://www.builder.io/blog/claude-md-guide)
