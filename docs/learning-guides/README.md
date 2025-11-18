# 학습 가이드

**작성일**: 2024-11-18
**목적**: 초보자가 AI 기반 프로젝트를 이해하고 구현하는 방법 안내

---

## 🎯 이 가이드의 목표

**"프로젝트 하면서 틈틈이 배우기"**

현재 프로젝트(통계 플랫폼)를 진행하면서 **하루 10-20분씩** AI 관련 개념을 학습하여, 향후 프로젝트(Multi-tenant RAG + Process Automation)를 직접 구현할 수 있는 수준까지 도달하는 것이 목표입니다.

---

## 📚 학습 문서 목록

### 1. [BEGINNER_ROADMAP.md](./BEGINNER_ROADMAP.md) ⭐ 필독
**내용**: 초보자를 위한 4단계 학습 로드맵
- Level 1: AI와 대화 기초 (1-2주)
- Level 2: 프로세스 빌더 준비 (2-3주)
- Level 3: Agentic AI 이해 (3-4주)
- Level 4: 고급 통합 (4주 이후)

**대상**: AI/RAG/LLM을 처음 접하는 분

### 2. [AI_CONVERSATION_GUIDE.md](./AI_CONVERSATION_GUIDE.md)
**내용**: AI와 효과적으로 대화하는 방법
- 좋은 질문 vs 나쁜 질문
- 프롬프트 엔지니어링 기초
- 구체적인 예시 요청하기
- 내 상황 설명하기

**대상**: AI 챗봇을 더 잘 활용하고 싶은 분

### 3. [PRACTICAL_EXERCISES.md](./PRACTICAL_EXERCISES.md)
**내용**: 실습 예제 모음
- RAG 시스템 분석
- 간단한 프로세스 JSON 만들기
- 자동 분기 판단 프로토타입
- 체크리스트 컴포넌트 구현

**대상**: 코드를 직접 작성하면서 배우고 싶은 분

---

## 🗓️ 추천 학습 순서

```
Week 1-2: BEGINNER_ROADMAP (Level 1) + AI_CONVERSATION_GUIDE
  ↓
Week 3-4: BEGINNER_ROADMAP (Level 2) + PRACTICAL_EXERCISES (실습 1-3)
  ↓
Week 5-6: BEGINNER_ROADMAP (Level 3) + PRACTICAL_EXERCISES (실습 4-6)
  ↓
Week 7+: BEGINNER_ROADMAP (Level 4) + 실제 프로젝트 구현
```

---

## 🎓 학습 방법

### 방법 1: 하루 10분 "틈틈이 학습"
```
월: 10분 - AI_CONVERSATION_GUIDE 읽기
화: 10분 - 현재 프로젝트 코드 읽기 (rag-service.ts)
수: 10분 - AI에게 질문하기 ("RAG가 뭐야?")
목: 10분 - 개발자 도구로 RAG API 관찰
금: 15분 - PRACTICAL_EXERCISES 실습 1개

주말: 30분 - BEGINNER_ROADMAP 복습
```

### 방법 2: 주말 집중 학습
```
토요일 오전 (2시간):
- BEGINNER_ROADMAP (Level 1) 정독
- AI_CONVERSATION_GUIDE 실습

토요일 오후 (2시간):
- PRACTICAL_EXERCISES 실습 3개
- 현재 프로젝트 코드 분석

일요일 (2시간):
- 간단한 프로토타입 만들기
- AI에게 질문하면서 디버깅
```

---

## 🔗 관련 프로젝트

### 현재 프로젝트 (학습 자료)
- **통계 플랫폼** (statistical-platform/)
  - RAG 시스템: `lib/rag/`
  - Ollama 연동: `lib/rag/providers/ollama-provider.ts`
  - UI 컴포넌트: `components/rag-assistant-compact.tsx`

### 향후 프로젝트 (목표)
- **Multi-tenant RAG** ([../multi-tenant-rag/](../multi-tenant-rag/))
  - 부서별 RAG DB 공유
  - 벡터 스토어 메타데이터 관리

- **Process Automation** ([../process-rag/](../process-rag/))
  - ReactFlow 드래그앤드롭 빌더
  - JSON 기반 프로세스 공유
  - Agentic AI 자동화

---

## 📋 체크리스트

학습을 시작하기 전에 확인하세요!

### 사전 준비
- [ ] 현재 프로젝트(통계 플랫폼) 실행 가능
- [ ] Ollama 로컬 서버 설치 완료
- [ ] 개발자 도구 (F12) 사용법 알고 있음
- [ ] 기본적인 JavaScript/TypeScript 문법 이해

### 학습 목표 설정
- [ ] 하루 학습 시간 결정 (10분 / 20분 / 주말 2시간)
- [ ] 목표 기간 설정 (2개월 / 3개월)
- [ ] 최종 목표 정하기 (RAG 이해 / 프로세스 빌더 / Agentic AI)

---

## 💡 학습 팁

### Tip 1: 완벽주의 버리기
```
❌ "모든 개념을 완벽하게 이해하고 넘어가야지"
✅ "대충 이해했으면 일단 실습해보고, 나중에 다시 읽자"
```

### Tip 2: 현재 프로젝트 코드가 최고의 교재
```
❌ "온라인 강의를 다 들어야 시작할 수 있어"
✅ "우리 프로젝트 코드를 읽고 AI에게 설명 요청하자"
```

### Tip 3: AI와 대화하면서 배우기
```
❌ "문서를 다 읽고 질문해야지"
✅ "일단 AI에게 물어보고, 이해 안 되면 다시 물어보자"
```

### Tip 4: 작은 실험 자주하기
```
❌ "완벽한 프로토타입을 만들어야지"
✅ "10줄짜리 코드로 일단 동작하는지 확인하자"
```

---

## 🚀 시작하기

1. **BEGINNER_ROADMAP.md** 먼저 읽기 (10분)
2. **AI_CONVERSATION_GUIDE.md** 읽고 AI에게 질문 한 번 해보기 (5분)
3. **PRACTICAL_EXERCISES.md** 중 실습 1개 따라하기 (15분)

**총 30분이면 시작 가능합니다!**

---

## 📞 도움말

- **막히면**: AI에게 구체적으로 질문하기
  - "이 에러가 왜 나는지 설명해줘: [에러 메시지]"
  - "이 코드를 초보자에게 설명한다면?"

- **복습하기**: 주말마다 BEGINNER_ROADMAP 체크리스트 확인

- **실습 자료**: 현재 프로젝트 코드 (`statistical-platform/lib/rag/`)

---

**작성자**: Claude Code
**최종 업데이트**: 2024-11-18
