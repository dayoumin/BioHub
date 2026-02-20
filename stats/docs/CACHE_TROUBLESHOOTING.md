# Next.js 캐시 문제 해결 가이드

## 🔍 문제 증상

- 코드 수정 후 `npm run dev` 실행 시 변경사항이 반영되지 않음
- 브라우저에서 이전 버전의 페이지가 계속 표시됨
- TypeScript 타입 에러가 사라지지 않거나 잘못 표시됨
- 빌드는 성공하지만 실제 동작이 예상과 다름

## ✅ 해결 방법 (단계별)

### 1️⃣ **캐시 클린 후 개발 서버 시작** (가장 추천!)

```bash
npm run dev:clean
```

**효과**:
- `.next` 폴더 삭제 (Next.js 빌드 캐시)
- `node_modules/.cache` 삭제 (Babel, Webpack 캐시)
- `tsconfig.tsbuildinfo` 삭제 (TypeScript 증분 빌드 정보)
- `.turbo` 삭제 (Turbopack 캐시)
- 자동으로 개발 서버 시작

### 2️⃣ **브라우저 캐시 강제 새로고침**

**Windows/Linux**: `Ctrl + Shift + R`
**Mac**: `Cmd + Shift + R`

**또는**:
1. 개발자 도구 열기 (`F12`)
2. Network 탭 이동
3. "Disable cache" 체크박스 활성화
4. 새로고침

### 3️⃣ **수동 캐시 클린** (스크립트 없이)

```bash
# Windows (PowerShell)
cd stats
Remove-Item -Recurse -Force .next, node_modules\.cache, .turbo, out -ErrorAction SilentlyContinue
Remove-Item tsconfig.tsbuildinfo, .eslintcache -ErrorAction SilentlyContinue
npm run dev

# Linux/Mac
cd stats
rm -rf .next node_modules/.cache .turbo out
rm -f tsconfig.tsbuildinfo .eslintcache
npm run dev
```

### 4️⃣ **TypeScript 캐시만 클린** (타입 에러 문제 시)

```bash
cd stats
npx tsc --build --clean
npm run dev
```

### 5️⃣ **완전 초기화** (극단적인 경우)

```bash
cd stats

# 1. node_modules 삭제 + 재설치
rm -rf node_modules package-lock.json
npm install

# 2. 모든 캐시 삭제
npm run dev:clean
```

---

## 🎯 캐시 종류별 문제 해결

### **Next.js 빌드 캐시** (`.next/`)

**증상**: 페이지 라우팅, 컴포넌트 렌더링 문제
**해결**:
```bash
rm -rf .next
npm run dev
```

### **Webpack/Babel 캐시** (`node_modules/.cache/`)

**증상**: JavaScript 번들링 문제, 모듈 임포트 에러
**해결**:
```bash
rm -rf node_modules/.cache
npm run dev
```

### **TypeScript 캐시** (`tsconfig.tsbuildinfo`)

**증상**: 타입 에러가 사라지지 않음, 잘못된 타입 추론
**해결**:
```bash
rm tsconfig.tsbuildinfo
npx tsc --noEmit
npm run dev
```

### **브라우저 캐시**

**증상**: HTML/CSS/JS 파일이 업데이트되지 않음
**해결**:
- `Ctrl + Shift + R` (강제 새로고침)
- 개발자 도구 → "Disable cache" 활성화

---

## 🛠️ 자동화 설정 (권장)

### **VSCode 개발자용**

`.vscode/tasks.json` 생성:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Clean & Dev",
      "type": "shell",
      "command": "npm run dev:clean",
      "problemMatcher": [],
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
```

이제 `Ctrl + Shift + B` → "Clean & Dev" 선택!

---

## 🔍 캐시 문제 진단 체크리스트

문제가 계속되면 다음을 확인하세요:

- [ ] `npm run dev:clean` 실행했는가?
- [ ] 브라우저 강제 새로고침 (`Ctrl + Shift + R`) 했는가?
- [ ] 개발자 도구에서 "Disable cache" 활성화했는가?
- [ ] 여러 개의 개발 서버가 동시에 실행 중인가? (`lsof -i :3000`)
- [ ] `.env` 파일 변경 후 서버 재시작했는가?
- [ ] `node_modules` 손상 여부 (`npm install` 재실행)

---

## 📊 캐시 파일 크기 확인

```bash
# .next 폴더 크기 확인
du -sh .next

# 전체 캐시 크기 확인
du -sh .next node_modules/.cache .turbo
```

---

## ⚡ 성능 vs 캐시 트레이드오프

### **개발 중**:
- 캐시 비활성화 권장 (`npm run dev:clean`)
- 변경사항 즉시 반영 > 빌드 속도

### **빌드 테스트 중**:
- 캐시 활성화 (`npm run build`)
- 빌드 속도 최적화 > 즉시 반영

---

## 🚨 알려진 이슈

### **Issue #1: RAG 서비스 캐시 문제**

**증상**: `rag-service.ts` 수정 후 변경사항 반영 안됨
**원인**: SQL.js WASM 파일이 브라우저 캐시에 저장됨
**해결**:
```bash
# 1. 서버 재시작
npm run dev:clean

# 2. 브라우저 Application 탭 → Clear Storage
```

### **Issue #2: Pyodide 모듈 캐시**

**증상**: Python Worker 코드 변경 후 이전 버전 실행됨
**원인**: Pyodide가 IndexedDB에 패키지 캐시
**해결**:
```bash
# 브라우저 개발자 도구 → Application → IndexedDB → pyodide 삭제
```

---

## 📚 참고 문서

- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Webpack Caching](https://webpack.js.org/configuration/cache/)
- [TypeScript Build Mode](https://www.typescriptlang.org/docs/handbook/project-references.html)
