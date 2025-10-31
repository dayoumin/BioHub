# 빌드 후 동적 기능 추가 가이드 (게시판 등)

Static HTML로 빌드된 통계 플랫폼에 게시판, 댓글, 로그인 등 **동적 기능**을 추가하는 방법입니다.

## 목차
1. [Static Export의 제약 사항](#1-static-export의-제약-사항)
2. [해결책: 외부 백엔드 서비스 사용](#2-해결책-외부-백엔드-서비스-사용)
3. [게시판 구현 방법 (3가지)](#3-게시판-구현-방법-3가지)
4. [실전 예시: Firebase 게시판](#4-실전-예시-firebase-게시판)
5. [실전 예시: Supabase 게시판](#5-실전-예시-supabase-게시판)
6. [배포 워크플로우](#6-배포-워크플로우)

---

## 1. Static Export의 제약 사항

### ❌ Static Export에서 불가능한 것들

| 기능 | 이유 | 대안 |
|------|------|------|
| **API Routes** | Next.js 서버 필요 | Firebase/Supabase API |
| **Server Actions** | 서버 사이드 실행 | 클라이언트 SDK |
| **Database 직접 연결** | 서버 환경 필요 | BaaS (Backend as a Service) |
| **서버 사이드 인증** | 서버 세션 관리 | Firebase Auth, Supabase Auth |
| **서버 사이드 렌더링** | 서버 필요 | Static Generation (빌드 시) |

**현재 설정** (`next.config.ts`):
```typescript
const nextConfig: NextConfig = {
  output: 'export',  // ← Static HTML만 생성
  // ...
}
```

**결과:**
```
out/
├── index.html              # 정적 HTML
├── statistics/
│   └── index.html          # 정적 HTML
└── _next/
    └── static/
        └── chunks/
            └── app-*.js    # 클라이언트 JavaScript
```

**서버가 없음!**
- `app/api/` 폴더는 빌드에 포함 안 됨
- `fetch('/api/posts')` 같은 호출 불가능
- 데이터베이스 직접 연결 불가

---

### ✅ Static Export에서 가능한 것들

| 기능 | 방법 |
|------|------|
| **통계 계산** | ✅ Pyodide (브라우저에서 Python 실행) |
| **CSV 업로드** | ✅ 클라이언트 사이드 (`FileReader`) |
| **차트 생성** | ✅ Recharts (클라이언트 사이드) |
| **로컬 저장** | ✅ LocalStorage, IndexedDB |
| **외부 API 호출** | ✅ `fetch()` (CORS 허용된 API) |
| **게시판 (외부 DB)** | ✅ Firebase, Supabase |
| **인증 (외부)** | ✅ Firebase Auth, Supabase Auth |
| **댓글 (외부)** | ✅ Disqus, Utterances, Giscus |

---

## 2. 해결책: 외부 백엔드 서비스 사용

### 핵심 원칙

```
Static HTML (통계 플랫폼) + 외부 BaaS (게시판/인증)
```

**BaaS (Backend as a Service)란?**
- 서버 코드 없이 백엔드 기능 제공
- 클라이언트 SDK로 직접 호출
- 예: Firebase, Supabase, Appwrite

---

### 아키텍처 비교

#### ❌ 불가능한 방식 (API Routes)

```
사용자 → Static HTML → API Routes (/api/posts)
                         ↓
                      ❌ 서버 없음 (404 에러)
```

#### ✅ 가능한 방식 (외부 BaaS)

```
사용자 → Static HTML → Firebase SDK
                         ↓
                      Firebase 서버
                         ↓
                      Firestore DB
```

---

## 3. 게시판 구현 방법 (3가지)

### Option A: Firebase (무료 Spark Plan)

**장점:**
- ✅ 무료 플랜 (10GB 저장, 50K 읽기/일)
- ✅ 실시간 데이터 동기화
- ✅ 클라이언트 SDK (JavaScript)
- ✅ 인증 기능 내장 (Google, 이메일 등)

**단점:**
- ⚠️ NoSQL (Firestore) - SQL 쿼리 제한적
- ⚠️ Google 계정 필요

**비용** (무료 플랜):
- 저장: 1 GB
- 읽기: 50,000 documents/day
- 쓰기: 20,000 documents/day
- → **일반 게시판에 충분**

---

### Option B: Supabase (무료 Free Plan)

**장점:**
- ✅ 무료 플랜 (500 MB DB, 무제한 API 요청)
- ✅ PostgreSQL (완전한 SQL 지원)
- ✅ RESTful API 자동 생성
- ✅ 실시간 구독 (Realtime API)
- ✅ Row Level Security (RLS) - 세밀한 권한 제어

**단점:**
- ⚠️ 7일간 미사용 시 프로젝트 일시 정지 (무료 플랜)

**비용** (무료 플랜):
- 데이터베이스: 500 MB
- API 요청: 무제한
- 저장 공간: 1 GB
- → **중소형 게시판에 적합**

---

### Option C: Utterances / Giscus (GitHub 기반 댓글)

**장점:**
- ✅ 완전 무료 (GitHub Issues 활용)
- ✅ GitHub 로그인만 지원
- ✅ 마크다운 지원
- ✅ 설정 초간단 (5분)

**단점:**
- ⚠️ 게시판 불가 (댓글만 가능)
- ⚠️ GitHub 계정 필수
- ⚠️ 비공개 저장소 불가 (공개 저장소만)

**사용 사례:**
- 개발자 커뮤니티
- 오픈소스 프로젝트 문서
- 기술 블로그

---

## 4. 실전 예시: Firebase 게시판

### Step 1: Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `statistics-platform-board`
4. Google Analytics 비활성화 (선택)
5. 생성 완료

---

### Step 2: Firestore Database 생성

1. 왼쪽 메뉴 → "Firestore Database"
2. "데이터베이스 만들기" 클릭
3. **프로덕션 모드 시작** 선택
4. 위치: `asia-northeast3` (서울)
5. 생성 완료

---

### Step 3: 보안 규칙 설정

Firestore → "규칙" 탭:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 게시글 (모두 읽기 가능, 로그인 사용자만 쓰기)
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.authorId;
    }

    // 댓글 (모두 읽기 가능, 로그인 사용자만 쓰기)
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.authorId;
    }
  }
}
```

**규칙 설명:**
- `allow read: if true` - 누구나 읽기 가능 (게시판 공개)
- `allow create: if request.auth != null` - 로그인 필수 (스팸 방지)
- `request.auth.uid == resource.data.authorId` - 작성자만 수정/삭제

---

### Step 4: Firebase SDK 설치

```bash
cd statistical-platform

# Firebase SDK 설치
npm install firebase
```

**package.json** (dependencies에 추가됨):
```json
{
  "dependencies": {
    "firebase": "^10.7.0",
    ...
  }
}
```

---

### Step 5: Firebase 설정 파일 생성

파일: `lib/firebase/config.ts`

```typescript
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Firebase 설정 (Firebase Console → 프로젝트 설정 → SDK 구성)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
}

// Firebase 초기화 (싱글톤 패턴)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Firestore 및 Auth 인스턴스
export const db = getFirestore(app)
export const auth = getAuth(app)
```

---

### Step 6: 환경 변수 설정

파일: `.env.local`

```bash
# Firebase 설정 (Firebase Console에서 복사)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=statistics-platform-board.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=statistics-platform-board
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=statistics-platform-board.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**⚠️ 주의:**
- `.env.local`은 빌드 시 번들에 포함됨
- API Key는 공개되어도 괜찮음 (Firestore 규칙으로 보호)

---

### Step 7: 게시판 타입 정의

파일: `types/board.ts`

```typescript
export interface Post {
  id: string
  title: string
  content: string
  authorId: string
  authorName: string
  createdAt: Date
  updatedAt: Date
  views: number
  likes: number
}

export interface Comment {
  id: string
  postId: string
  content: string
  authorId: string
  authorName: string
  createdAt: Date
}
```

---

### Step 8: 게시판 서비스 구현

파일: `lib/firebase/board-service.ts`

```typescript
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  limit,
  Timestamp,
  updateDoc,
  deleteDoc
} from 'firebase/firestore'
import { db } from './config'
import type { Post, Comment } from '@/types/board'

// 게시글 목록 가져오기
export async function getPosts(limitCount = 10): Promise<Post[]> {
  const q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate()
  })) as Post[]
}

// 게시글 생성
export async function createPost(
  title: string,
  content: string,
  authorId: string,
  authorName: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'posts'), {
    title,
    content,
    authorId,
    authorName,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    views: 0,
    likes: 0
  })

  return docRef.id
}

// 게시글 상세 조회
export async function getPost(postId: string): Promise<Post | null> {
  const docRef = doc(db, 'posts', postId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return null
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
    createdAt: snapshot.data().createdAt.toDate(),
    updatedAt: snapshot.data().updatedAt.toDate()
  } as Post
}

// 게시글 수정
export async function updatePost(
  postId: string,
  title: string,
  content: string
): Promise<void> {
  const docRef = doc(db, 'posts', postId)

  await updateDoc(docRef, {
    title,
    content,
    updatedAt: Timestamp.now()
  })
}

// 게시글 삭제
export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId))
}

// 조회수 증가
export async function incrementViews(postId: string): Promise<void> {
  const docRef = doc(db, 'posts', postId)
  const snapshot = await getDoc(docRef)

  if (snapshot.exists()) {
    await updateDoc(docRef, {
      views: (snapshot.data().views || 0) + 1
    })
  }
}
```

---

### Step 9: 게시판 UI 컴포넌트

파일: `app/(dashboard)/board/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPosts } from '@/lib/firebase/board-service'
import { auth } from '@/lib/firebase/config'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import type { Post } from '@/types/board'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function BoardPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(auth.currentUser)
  const router = useRouter()

  useEffect(() => {
    // 게시글 목록 로드
    async function loadPosts() {
      const data = await getPosts(20)
      setPosts(data)
      setLoading(false)
    }

    loadPosts()

    // 인증 상태 감지
    const unsubscribe = auth.onAuthStateChanged(setUser)
    return () => unsubscribe()
  }, [])

  // Google 로그인
  async function handleLogin() {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  // 로그아웃
  async function handleLogout() {
    await auth.signOut()
  }

  if (loading) {
    return <div>로딩 중...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">게시판</h1>

        <div className="flex gap-2">
          {user ? (
            <>
              <span>안녕하세요, {user.displayName}님</span>
              <Button onClick={() => router.push('/board/new')}>글쓰기</Button>
              <Button variant="outline" onClick={handleLogout}>로그아웃</Button>
            </>
          ) : (
            <Button onClick={handleLogin}>로그인</Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {posts.map(post => (
          <Card key={post.id} className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/board/${post.id}`)}>
            <h2 className="text-xl font-semibold">{post.title}</h2>
            <div className="flex gap-4 text-sm text-gray-500 mt-2">
              <span>작성자: {post.authorName}</span>
              <span>조회: {post.views}</span>
              <span>작성일: {post.createdAt.toLocaleDateString()}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

---

### Step 10: 빌드 및 배포

```bash
# 1. TypeScript 체크
npx tsc --noEmit

# 2. 빌드
npm run build

# 3. 결과 확인
ls -lh out/
```

**빌드 결과**:
```
out/
├── board/
│   ├── index.html          # 게시판 메인
│   └── [id]/
│       └── index.html      # 게시글 상세 (동적 라우트)
├── _next/
│   └── static/
│       └── chunks/
│           └── board-*.js  # Firebase SDK 포함
└── ...
```

**Firebase SDK가 번들에 포함됨!**
- `board-*.js` 파일에 Firebase 클라이언트 코드 포함
- 브라우저에서 직접 Firestore API 호출
- 서버 불필요

---

## 5. 실전 예시: Supabase 게시판

### Step 1: Supabase 프로젝트 생성

1. [Supabase](https://supabase.com/) 가입
2. "New Project" 클릭
3. Organization: 새로 생성 또는 기존 선택
4. Project name: `statistics-platform-board`
5. Database Password: 강력한 비밀번호 생성
6. Region: `Northeast Asia (Seoul)`
7. 생성 완료 (2분 소요)

---

### Step 2: 테이블 생성 (SQL Editor)

Supabase Dashboard → SQL Editor:

```sql
-- 게시글 테이블
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0
);

-- 댓글 테이블
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON comments(post_id);
```

---

### Step 3: Row Level Security (RLS) 설정

```sql
-- RLS 활성화
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 게시글 읽기: 누구나 가능
CREATE POLICY "Anyone can read posts"
ON posts FOR SELECT
USING (true);

-- 게시글 생성: 로그인 사용자만
CREATE POLICY "Authenticated users can create posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 게시글 수정: 작성자만
CREATE POLICY "Authors can update their posts"
ON posts FOR UPDATE
USING (auth.uid() = author_id);

-- 게시글 삭제: 작성자만
CREATE POLICY "Authors can delete their posts"
ON posts FOR DELETE
USING (auth.uid() = author_id);

-- 댓글도 동일한 규칙 적용
CREATE POLICY "Anyone can read comments"
ON comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create comments"
ON comments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authors can update their comments"
ON comments FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their comments"
ON comments FOR DELETE
USING (auth.uid() = author_id);
```

---

### Step 4: Supabase SDK 설치

```bash
npm install @supabase/supabase-js
```

---

### Step 5: Supabase 클라이언트 설정

파일: `lib/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

파일: `.env.local`

```bash
# Supabase 설정 (Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Step 6: 게시판 서비스 구현

파일: `lib/supabase/board-service.ts`

```typescript
import { supabase } from './client'
import type { Post, Comment } from '@/types/board'

// 게시글 목록 가져오기
export async function getPosts(limitCount = 10): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limitCount)

  if (error) {
    throw error
  }

  return data as Post[]
}

// 게시글 생성
export async function createPost(
  title: string,
  content: string,
  authorId: string,
  authorName: string
): Promise<string> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      title,
      content,
      author_id: authorId,
      author_name: authorName
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data.id
}

// 게시글 상세 조회
export async function getPost(postId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (error) {
    return null
  }

  // 조회수 증가 (별도 요청)
  await supabase
    .from('posts')
    .update({ views: data.views + 1 })
    .eq('id', postId)

  return data as Post
}

// 게시글 수정
export async function updatePost(
  postId: string,
  title: string,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq('id', postId)

  if (error) {
    throw error
  }
}

// 게시글 삭제
export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (error) {
    throw error
  }
}
```

---

## 6. 배포 워크플로우

### 빌드 전 체크리스트

- [ ] Firebase 또는 Supabase 프로젝트 생성
- [ ] 데이터베이스 테이블 생성 (Supabase만)
- [ ] 보안 규칙 설정 (Firestore 또는 RLS)
- [ ] SDK 설치 (`npm install firebase` 또는 `@supabase/supabase-js`)
- [ ] 환경 변수 설정 (`.env.local`)
- [ ] 게시판 페이지 구현 (`app/board/page.tsx`)
- [ ] TypeScript 컴파일 체크 (`npx tsc --noEmit`)

---

### 빌드 명령어

```bash
# 1. 의존성 설치 (Firebase/Supabase SDK 포함)
npm install

# 2. 빌드
npm run build

# 3. 결과 확인
ls -lh out/
```

**빌드 결과**:
```
out/
├── index.html
├── statistics/
├── board/                     # ← 게시판 추가됨
│   ├── index.html            # 게시판 메인
│   ├── new/
│   │   └── index.html        # 글쓰기
│   └── [id]/
│       └── index.html        # 게시글 상세
├── _next/
│   └── static/
│       └── chunks/
│           ├── board-*.js    # Firebase/Supabase SDK 포함
│           └── ...
└── ...

총 크기: ~7 MB (Firebase SDK 약 2 MB 추가)
```

---

### 배포 (GitHub Pages 예시)

```bash
# 1. 빌드
npm run build

# 2. GitHub Pages 배포
gh-pages -d out

# 3. 접속
# https://{username}.github.io/{repo}/board
```

**작동 흐름**:
```
사용자
  ↓
브라우저에서 https://{username}.github.io/{repo}/board 접속
  ↓
GitHub Pages에서 out/board/index.html 전달
  ↓
브라우저에서 board-*.js 실행
  ↓
Firebase/Supabase SDK로 게시판 데이터 로드
  ↓
Firestore/Supabase DB에서 데이터 가져오기
  ↓
게시판 렌더링
```

---

## 7. 비용 비교

### Firebase vs Supabase (무료 플랜)

| 항목 | Firebase (Spark) | Supabase (Free) |
|------|------------------|-----------------|
| **데이터베이스** | Firestore (NoSQL) | PostgreSQL (SQL) |
| **저장 용량** | 1 GB | 500 MB |
| **읽기** | 50,000/day | 무제한 |
| **쓰기** | 20,000/day | 무제한 |
| **인증** | 무제한 | 50,000 users |
| **파일 저장** | 5 GB | 1 GB |
| **유료 전환** | 사용량 초과 시 | 프로젝트 일시 정지 (7일 미사용) |

**게시판 사용량 예측** (사용자 100명 기준):
- 읽기: 100명 × 20회/일 = 2,000 reads/day → 무료 플랜 충분
- 쓰기: 100명 × 2회/일 = 200 writes/day → 무료 플랜 충분

---

## 8. 정리

### ✅ 핵심 요약

1. **Static Export 제약**: API Routes 사용 불가
2. **해결책**: Firebase/Supabase 같은 BaaS 사용
3. **빌드 영향**: SDK가 클라이언트 번들에 포함 (~2 MB)
4. **배포**: 빌드 후 GitHub Pages/Netlify에 배포 가능
5. **비용**: 무료 플랜으로 중소형 게시판 운영 가능

---

### 📋 체크리스트

빌드 전:
- [ ] BaaS 선택 (Firebase 또는 Supabase)
- [ ] 프로젝트 생성 및 DB 설정
- [ ] SDK 설치 및 환경 변수 설정
- [ ] 게시판 페이지 구현
- [ ] TypeScript 컴파일 체크

빌드 후:
- [ ] `npm run build` 성공
- [ ] `out/board/` 폴더 존재 확인
- [ ] 로컬 테스트 (`npx serve out`)
- [ ] 게시판 기능 테스트 (로그인, 글쓰기, 조회)

배포 후:
- [ ] URL 접속 확인
- [ ] Firebase/Supabase 연결 확인 (브라우저 콘솔)
- [ ] 게시판 정상 작동 확인

---

**문서 작성일**: 2025-10-31
**버전**: 1.0
**작성자**: Claude Code
