# Terminology System 사용 가이드

**버전**: 1.0
**작성일**: 2026-02-09

---

## 📖 개요

도메인별 용어 사전 시스템은 UI 텍스트를 **중앙 집중식**으로 관리하여, 도메인(수산과학, 범용 통계 등)에 따라 자동으로 텍스트를 변경합니다.

### 핵심 장점

✅ **중앙 관리**: 한 파일만 수정하면 모든 컴포넌트에 즉시 반영
✅ **런타임 전환**: 사용자가 도메인을 실시간으로 전환 가능
✅ **타입 안전**: TypeScript 완벽 지원
✅ **확장 가능**: 새 도메인 추가가 매우 쉬움
✅ **테스트 가능**: Mock 용어로 테스트 간편

---

## 🚀 빠른 시작

### 1. 컴포넌트에서 사용

```tsx
'use client'

import { useTerminology } from '@/hooks/use-terminology'

export function MyComponent() {
  const t = useTerminology()

  return (
    <div>
      <h2>{t.variables.group.title}</h2>
      <p>{t.variables.group.description}</p>

      {/* 유효성 검증 메시지 */}
      {!groupVar && <p>{t.validation.groupRequired}</p>}

      {/* 성공 메시지 */}
      {isValid && <p>{t.success.allVariablesSelected}</p>}
    </div>
  )
}
```

### 2. 도메인 전환

```tsx
import { useTerminologyContext } from '@/hooks/use-terminology'

function Settings() {
  const { setDomain, currentDomain } = useTerminologyContext()

  return (
    <select
      value={currentDomain}
      onChange={(e) => setDomain(e.target.value)}
    >
      <option value="aquaculture">수산과학</option>
      <option value="generic">범용 통계</option>
    </select>
  )
}
```

---

## 📂 파일 구조

```
lib/terminology/
├── terminology-types.ts          # 타입 정의
├── terminology-context.tsx       # Context & Provider
├── domains/
│   ├── aquaculture.ts           # 수산과학 용어
│   ├── generic.ts               # 범용 통계 용어
│   ├── medical.ts               # (미래) 의학 용어
│   └── agriculture.ts           # (미래) 농업 용어
└── index.ts

hooks/
└── use-terminology.ts           # Custom Hook

components/terminology/
└── DomainSwitcher.tsx           # 도메인 전환 UI
```

---

## 🎨 새 도메인 추가

### 예시: 의학 연구 도메인 추가

**1. 용어 사전 생성**

```typescript
// lib/terminology/domains/medical.ts
import type { TerminologyDictionary } from '../terminology-types'

export const medical: TerminologyDictionary = {
  domain: 'medical',
  displayName: '의학 연구',

  variables: {
    group: {
      title: '환자군 변수',
      description: '비교할 환자군 (예: 대조군, 치료군)',
      shortLabel: '환자군'
    },
    dependent: {
      title: '측정 지표',
      description: '분석할 임상 지표 (예: 혈압, 혈당, 생존율)',
      shortLabel: '지표'
    },
    // ... 나머지 변수
  },

  validation: {
    groupRequired: '환자군을 선택해야 합니다',
    dependentRequired: '측정 지표를 선택해야 합니다',
    // ...
  },

  // ... 나머지 섹션
}
```

**2. 레지스트리에 등록**

```typescript
// lib/terminology/terminology-context.tsx
import { medical } from './domains/medical'

const TERMINOLOGY_REGISTRY: Record<string, TerminologyDictionary> = {
  aquaculture,
  generic,
  medical  // 추가
}
```

**3. 완료!**

이제 `setDomain('medical')`로 전환 가능합니다.

---

## 🌍 다국어 지원 (미래 확장)

### 구조 제안

```typescript
// lib/terminology/domains/aquaculture.en.ts
export const aquacultureEN: TerminologyDictionary = {
  domain: 'aquaculture',
  locale: 'en',
  displayName: 'Aquaculture Science',

  variables: {
    group: {
      title: 'Experimental Group',
      description: 'Experimental group variable (e.g., farm, treatment)',
    },
    // ...
  }
}

// 사용
<TerminologyProvider
  initialDomain="aquaculture"
  initialLocale="en"
>
```

---

## 🧪 테스트

### Mock Terminology

```typescript
// __tests__/mocks/terminology.ts
export const mockTerminology: TerminologyDictionary = {
  domain: 'test',
  displayName: 'Test',
  variables: {
    group: { title: 'Test Group', description: 'Test' },
    // ...
  },
  // ...
}

// 테스트에서 사용
<TerminologyProvider initialDomain="test">
  <YourComponent />
</TerminologyProvider>
```

---

## 📋 체크리스트: 컴포넌트에 Terminology 적용

- [ ] `useTerminology()` import
- [ ] 하드코딩된 텍스트를 `t.변수명`으로 교체
- [ ] Props의 default 값을 `t.selectorUI` 사용
- [ ] 유효성 검증 메시지를 `t.validation` 사용
- [ ] 성공 메시지를 `t.success` 사용
- [ ] TypeScript 에러 0개 확인
- [ ] 브라우저에서 동작 확인

---

## 🔧 문제 해결

### Q: "useTerminology must be used within a TerminologyProvider" 에러

**A**: `app/layout.tsx`에 `<TerminologyProvider>`가 추가되었는지 확인

### Q: 새 도메인이 선택 안 됨

**A**: `terminology-context.tsx`의 `TERMINOLOGY_REGISTRY`에 등록했는지 확인

### Q: 도메인 전환 후 텍스트가 안 바뀜

**A**: 컴포넌트가 `useTerminology()`를 사용하고 있는지 확인. 하드코딩된 텍스트는 자동으로 바뀌지 않습니다.

---

## 📚 참고

- **타입 정의**: `lib/terminology/terminology-types.ts`
- **기본 도메인 변경**: `app/layout.tsx`의 `initialDomain` prop
- **환경 변수**: `.env.local`에 `NEXT_PUBLIC_TERMINOLOGY_DOMAIN=generic` 설정

---

**작성자**: Claude Code
**업데이트**: 도메인 추가 시 이 문서도 업데이트하세요
