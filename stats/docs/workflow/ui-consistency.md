# 통계 워크플로우 UI 일관성 가이드

**버전**: 1.0.0
**최종 수정일**: 2025-01-17
**목적**: 5단계 워크플로우에서 기존 디자인 시스템과 공통 컴포넌트의 일관된 사용

---

## 1. 기반 시스템

### 1.1 디자인 시스템 참조
```typescript
// 기존 시스템 위치
import { colors, spacing, typography } from '@/lib/design-tokens'
import * as UI from '@/components/ui'  // shadcn/ui 컴포넌트
```

### 1.2 사용 컴포넌트 목록
| 컴포넌트 | 용도 | 위치 |
|---------|------|------|
| Card | 섹션 구분 | @/components/ui/card |
| Button | 액션 버튼 | @/components/ui/button |
| Tabs | 탭 네비게이션 | @/components/ui/tabs |
| Table | 데이터 표시 | @/components/ui/table |
| Progress | 진행률 표시 | @/components/ui/progress |
| Alert | 알림 메시지 | @/components/ui/alert |
| Badge | 상태 표시 | @/components/ui/badge |
| Dialog | 모달 창 | @/components/ui/dialog |

## 2. 5단계별 컴포넌트 조합 규칙

### 2.1 Step 1: 데이터 업로드

#### 사용 컴포넌트
```tsx
<Card>
  <CardHeader>
    <CardTitle>데이터 업로드</CardTitle>
    <CardDescription>분석할 파일 선택</CardDescription>
  </CardHeader>
  <CardContent>
    <FileUploader />  // 커스텀 컴포넌트
  </CardContent>
  <CardFooter>
    <Button variant="default">다음 단계</Button>
  </CardFooter>
</Card>
```

#### 레이아웃 규칙
- 파일 드롭존: 중앙 배치, 점선 테두리
- 진행 버튼: CardFooter 우측 정렬
- 에러 메시지: Alert 컴포넌트 사용

### 2.2 Step 2: 데이터 확인

#### 사용 컴포넌트
```tsx
<Card>
  <CardHeader>
    <CardTitle>데이터 확인</CardTitle>
  </CardHeader>
  <CardContent>
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">데이터 프로파일</TabsTrigger>
        <TabsTrigger value="distribution">분포 진단</TabsTrigger>
        <TabsTrigger value="roadmap">분석 로드맵</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <Table>...</Table>
      </TabsContent>
    </Tabs>
  </CardContent>
</Card>
```

#### 레이아웃 규칙
- 3개 탭 구조 고정
- 자동 진행: Progress 컴포넌트 상단 표시
- 데이터 테이블: shadcn Table 사용

### 2.3 Step 3: 분석 목표 설정

#### 사용 컴포넌트
```tsx
<Card>
  <CardContent>
    <RadioGroup>
      <RadioGroupItem value="comparison" />
      <RadioGroupItem value="relationship" />
      <RadioGroupItem value="prediction" />
    </RadioGroup>

    <Select>
      <SelectTrigger>통계 방법 선택</SelectTrigger>
      <SelectContent>...</SelectContent>
    </Select>
  </CardContent>
</Card>
```

#### 레이아웃 규칙
- 2단계 선택: 질문 유형 → 구체적 방법
- RadioGroup으로 단일 선택
- Select 컴포넌트로 드롭다운

### 2.4 Step 4: 분석 수행

#### 사용 컴포넌트
```tsx
<Card>
  <CardContent>
    <Progress value={progress} className="mb-4" />
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {currentStatus}
      </p>
      <p className="text-xs text-muted-foreground">
        예상 시간: {estimatedTime}초
      </p>
    </div>
  </CardContent>
  <CardFooter>
    <Button variant="outline" size="sm">취소</Button>
  </CardFooter>
</Card>
```

#### 레이아웃 규칙
- Progress 바 최상단
- 상태 텍스트 중앙
- 취소 버튼만 표시 (자동 진행)

### 2.5 Step 5: 결과 해석

#### 사용 컴포넌트
```tsx
<Card>
  <CardContent>
    <Tabs>
      <TabsList>
        <TabsTrigger>요약</TabsTrigger>
        <TabsTrigger>상세</TabsTrigger>
        <TabsTrigger>시각화</TabsTrigger>
        <TabsTrigger>추천</TabsTrigger>
      </TabsList>
      <TabsContent>
        <Alert>
          <AlertTitle>분석 결과</AlertTitle>
          <AlertDescription>{summary}</AlertDescription>
        </Alert>
      </TabsContent>
    </Tabs>
  </CardContent>
  <CardFooter className="justify-between">
    <Button variant="outline">새 분석</Button>
    <Button>보고서 저장</Button>
  </CardFooter>
</Card>
```

## 3. 공통 UI 패턴

### 3.1 진행 상태 표시
```tsx
// 자동 진행 단계 (Step 2, 4)
<Progress value={percentage} />
<p className="text-sm text-muted-foreground">
  {statusMessage}
</p>

// 사용자 입력 단계 (Step 1, 3, 5)
// Progress 컴포넌트 사용하지 않음
// 대신 필수 항목 체크 표시
```

### 3.2 상태별 메시지
```tsx
// 성공
<Alert>
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>성공</AlertTitle>
  <AlertDescription>{message}</AlertDescription>
</Alert>

// 경고
<Alert variant="warning">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>주의</AlertTitle>
  <AlertDescription>{message}</AlertDescription>
</Alert>

// 오류
<Alert variant="destructive">
  <XCircle className="h-4 w-4" />
  <AlertTitle>오류</AlertTitle>
  <AlertDescription>{message}</AlertDescription>
</Alert>
```

### 3.3 버튼 배치
```tsx
<CardFooter className="flex justify-between">
  <div className="space-x-2">
    <Button variant="outline">이전</Button>
    <Button variant="ghost">취소</Button>
  </div>
  <Button>다음 단계</Button>
</CardFooter>
```

## 4. 스타일 변수 사용

### 4.1 색상 (Tailwind CSS 클래스)
```css
/* shadcn/ui 기본 색상 사용 */
primary: "bg-primary text-primary-foreground"
secondary: "bg-secondary text-secondary-foreground"
destructive: "bg-destructive text-destructive-foreground"
muted: "bg-muted text-muted-foreground"
```

### 4.2 간격 (Tailwind 클래스)
```css
/* 일관된 간격 사용 */
섹션 간: "space-y-6"
항목 간: "space-y-4"
인라인: "space-x-2"
패딩: "p-4" 또는 "p-6"
```

### 4.3 크기 (컴포넌트 props)
```tsx
// Button 크기
<Button size="default">기본</Button>
<Button size="sm">작게</Button>
<Button size="lg">크게</Button>

// Card 너비
<Card className="w-full max-w-4xl">
```

## 5. 반응형 디자인

### 5.1 브레이크포인트 (Tailwind)
```css
sm: 640px   /* 모바일 */
md: 768px   /* 태블릿 */
lg: 1024px  /* 데스크톱 */
xl: 1280px  /* 와이드 */
```

### 5.2 적응형 레이아웃
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* 모바일: 1열, 태블릿: 2열, 데스크톱: 3열 */}
</div>
```

## 6. 용어 통일

### 6.1 데이터 관련
| 사용 | 금지 |
|-----|------|
| 데이터 | 자료, 데이터셋 |
| 변수 | 컬럼, 열, 필드 |
| 관측치 | 행, 로우, 레코드 |
| 업로드 | 로드, 불러오기 |

### 6.2 액션 관련
| 사용 | 금지 |
|-----|------|
| 다음 단계 | 계속, 진행 |
| 이전 | 뒤로, 돌아가기 |
| 취소 | 중단, 종료 |
| 선택 | 체크, 고르기 |

## 7. 아이콘 사용 (lucide-react)

### 7.1 표준 아이콘
```tsx
import {
  Upload,        // 업로드
  CheckCircle,   // 완료/성공
  AlertTriangle, // 경고
  XCircle,       // 오류
  Info,          // 정보
  BarChart3,     // 통계/차트
  FileText,      // 파일/문서
  Loader2,       // 로딩
  ChevronRight,  // 다음
  ChevronLeft    // 이전
} from 'lucide-react'
```

### 7.2 크기 규칙
```tsx
// 기본 크기
<Icon className="h-4 w-4" />

// 제목 옆
<Icon className="h-5 w-5" />

// 대형 표시
<Icon className="h-8 w-8" />
```

## 8. 접근성

### 8.1 필수 속성
```tsx
// 버튼
<Button aria-label="다음 단계로 이동">
  다음 단계
</Button>

// 진행률
<Progress
  value={60}
  aria-label="분석 진행률"
  aria-valuenow={60}
  aria-valuemin={0}
  aria-valuemax={100}
/>

// 탭
<Tabs aria-label="데이터 검증 결과">
```

### 8.2 키보드 네비게이션
- Tab: 다음 요소
- Shift+Tab: 이전 요소
- Enter/Space: 선택
- Escape: 취소/닫기

## 9. 적용 체크리스트

각 Step 구현 시 확인:
- [ ] shadcn/ui 컴포넌트 사용
- [ ] Tailwind 클래스 사용
- [ ] 표준 아이콘 사용 (lucide-react)
- [ ] 용어 통일 확인
- [ ] 버튼 배치 규칙 준수
- [ ] 접근성 속성 추가
- [ ] 반응형 클래스 적용

---

**참고**: 이 가이드는 기존 디자인 시스템과 shadcn/ui 컴포넌트를 기반으로 5단계 워크플로우의 일관성을 유지하기 위한 사용 규칙입니다.