# 🚀 향후 검토 작업 목록

**작성일**: 2025-09-18
**프로젝트**: Statistical Analysis Platform

## 📊 Phase 2 - 성능 모니터링 및 최적화

### 4️⃣ 성능 모니터링 도구 추가

#### 번들 크기 분석
- [ ] webpack-bundle-analyzer 설치 및 설정
- [ ] 번들 크기 최적화 목표 설정 (< 500KB initial load)
- [ ] Tree shaking 최적화
- [ ] Dynamic imports 추가 검토
- [ ] 사용하지 않는 dependencies 제거

#### 렌더링 성능 측정
- [ ] React DevTools Profiler 활용
- [ ] Core Web Vitals 측정 도구 통합
  - [ ] LCP (Largest Contentful Paint) < 2.5s
  - [ ] FID (First Input Delay) < 100ms
  - [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] Performance API 활용한 커스텀 메트릭
- [ ] 느린 컴포넌트 식별 및 최적화

#### 메모리 사용량 추적
- [ ] Chrome DevTools Memory Profiler 활용
- [ ] 메모리 누수 감지 자동화
- [ ] 대용량 데이터 처리 시 메모리 최적화
- [ ] WeakMap/WeakSet 활용 검토
- [ ] 가비지 컬렉션 최적화

#### 권장 도구
```bash
# 설치할 패키지들
npm install --save-dev webpack-bundle-analyzer
npm install --save-dev @next/bundle-analyzer
npm install web-vitals
```

---

## 🚢 Phase 3 - 배포 준비

### 5️⃣ 배포 인프라 구축

#### 환경 변수 설정
- [ ] `.env.local` - 로컬 개발 환경
- [ ] `.env.production` - 프로덕션 환경
- [ ] `.env.test` - 테스트 환경
- [ ] 민감한 정보 암호화 (API 키, DB 연결 정보)
- [ ] 환경별 설정 검증 스크립트

```typescript
// 예시: env.config.ts
const envConfig = {
  PYODIDE_CDN_URL: process.env.NEXT_PUBLIC_PYODIDE_CDN_URL,
  API_ENDPOINT: process.env.NEXT_PUBLIC_API_ENDPOINT,
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  MAX_FILE_SIZE: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '52428800'),
}
```

#### 빌드 최적화
- [ ] Next.js 프로덕션 빌드 설정
- [ ] 이미지 최적화 (next/image, WebP 변환)
- [ ] 폰트 최적화 (next/font)
- [ ] CSS 최소화 및 purge
- [ ] JavaScript minification
- [ ] Compression (gzip/brotli)
- [ ] CDN 설정 (정적 자산)

```javascript
// next.config.js 최적화 예시
module.exports = {
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
  },
}
```

#### Docker 설정
- [ ] Multi-stage Dockerfile 작성
- [ ] .dockerignore 설정
- [ ] 컨테이너 크기 최적화 (Alpine Linux)
- [ ] 헬스체크 설정
- [ ] docker-compose.yml (개발/프로덕션)

```dockerfile
# Dockerfile 예시
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

#### CI/CD 파이프라인
- [ ] GitHub Actions 워크플로우 설정
  - [ ] 빌드 및 테스트 자동화
  - [ ] 코드 품질 검사 (ESLint, TypeScript)
  - [ ] 보안 취약점 스캔
  - [ ] 자동 배포 (main 브랜치)
- [ ] 배포 플랫폼 선택
  - [ ] Vercel (Next.js 최적화)
  - [ ] AWS (EC2/ECS/Lambda)
  - [ ] Google Cloud Run
  - [ ] Azure App Service

```yaml
# .github/workflows/deploy.yml 예시
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm run deploy
```

---

## 📅 예상 일정

### Phase 2 (성능 모니터링)
- **예상 소요 시간**: 1주
- **우선순위**: 중간
- **선행 조건**: 핵심 기능 완성 및 테스트

### Phase 3 (배포 준비)
- **예상 소요 시간**: 1-2주
- **우선순위**: 높음 (프로덕션 출시 전 필수)
- **선행 조건**: Phase 2 완료, 전체 기능 테스트 완료

---

## 📝 참고 사항

1. **성능 목표**
   - 초기 로딩: < 3초
   - 통계 분석 실행: < 5초 (10MB 데이터 기준)
   - 메모리 사용: < 500MB (일반 사용)

2. **배포 체크리스트**
   - [ ] 보안 감사 완료
   - [ ] 성능 테스트 통과
   - [ ] 접근성 검증 (WCAG 2.1 AA)
   - [ ] 브라우저 호환성 테스트
   - [ ] 모바일 반응형 검증
   - [ ] 백업 및 롤백 계획
   - [ ] 모니터링 대시보드 구축
   - [ ] 사용자 문서 준비

3. **모니터링 대시보드 구축**
   - [ ] Sentry (에러 추적)
   - [ ] Google Analytics (사용자 분석)
   - [ ] Datadog/New Relic (APM)
   - [ ] CloudWatch/Grafana (인프라)

---

*이 문서는 프로젝트 진행 상황에 따라 업데이트됩니다.*
*Last Updated: 2025-09-18*