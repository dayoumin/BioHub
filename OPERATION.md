# 운영 기술 조사 노트

**목적**: 배포 후 검토가 필요한 기술 조사 결과 및 아키텍처 결정 근거 보관

---

## [2026-03-04] AI 채팅 → 페이지 이동 패턴 조사

**배경**: Smart Flow AI 추천 → Graph Studio 직접 이동 패턴이 2026년 기준으로 적절한지 검토

### 현재 BioHub 방식

```
AI 추천 완료
→ store.loadDataPackageWithSpec(pkg, spec)
→ router.push('/graph-studio')
→ Graph Studio가 Zustand store에서 DataPackage 읽음
```

### 2026년 업계 4대 패턴

| 패턴 | 상태 이동 | 성숙도 | BioHub 적용성 |
|------|---------|-------|------------|
| **Store → router.push** (현재) | Zustand | 프로덕션 표준 | 현재 사용 중, 유효 |
| **URL params** (nuqs) | searchParams | 프로덕션 표준 | 단순 ID/메서드명에 적합 |
| **useCopilotAction** | 핸들러 함수 직접 | 프로덕션 | CopilotKit 도입 시 고려 |
| **WebMCP** | DOM 이벤트 | Chrome 146 early preview | 2027~2028 검토 |

### 결론

**현재 store-first 방식 유지 결정 (이유):**
1. DataPackage는 대용량 객체 — URL에 넣기 불가능
2. 분석 파라미터는 프라이버시 민감 데이터
3. 기존 Zustand 아키텍처와 일관성 유지
4. WebMCP 등 신규 표준은 아직 프로덕션 미성숙

### 향후 검토 시점 (트리거)

- "분석 결과 URL 공유" 기능 요청 시 → URL params 하이브리드 도입
  ```
  router.push('/graph-studio?from=smart-flow&sessionId={uuid}')
  → sessionId로 서버/로컬스토리지에서 DataPackage 복원
  ```
- WebMCP가 Chrome stable 릴리스 시 → 재검토
- CopilotKit 도입 결정 시 → `useCopilotAction` 패턴 마이그레이션

### 참고 자료

- [Designing for Agentic AI: Practical UX Patterns — Smashing Magazine](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/)
- [AG-UI: The Agent-User Interaction Protocol](https://docs.ag-ui.com/introduction)
- [WebMCP available for early preview — Chrome for Developers](https://developer.chrome.com/blog/webmcp-epp)
- [React Stack Patterns 2026 — patterns.dev](https://www.patterns.dev/react/react-2026/)
- [Your URL Is Your State — alfy.blog](https://alfy.blog/2025/10/31/your-url-is-your-state.html)
- [Introducing A2UI — Google Developers Blog](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/)

---

## [템플릿] 조사 항목 추가 방법

```markdown
## [YYYY-MM-DD] 주제

**배경**: 왜 조사했는지

### 현재 방식
...

### 조사 결과
...

### 결론 및 결정
...

### 향후 검토 시점
...
```
