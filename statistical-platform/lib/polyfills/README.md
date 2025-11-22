# AsyncLocalStorage Polyfill

브라우저 환경에서 LangGraph.js가 사용하는 `node:async_hooks`를 작동시키기 위한 폴리필입니다.

## ✅ 지원하는 기능

1. **동기 함수에서 컨텍스트 유지**
   ```javascript
   als.run(store, () => {
     console.log(als.getStore()) // store
   })
   ```

2. **Promise/async-await 지원**
   ```javascript
   await als.run(store, async () => {
     console.log(als.getStore()) // store
     await someAsyncOp()
     console.log(als.getStore()) // store (유지됨!)
   })
   ```

3. **중첩된 run() 호출**
   ```javascript
   als.run(store1, () => {
     console.log(als.getStore()) // store1
     als.run(store2, () => {
       console.log(als.getStore()) // store2
     })
     console.log(als.getStore()) // store1 (복원됨)
   })
   ```

4. **기타 API**
   - `enterWith(store)` - 직접 store 설정
   - `disable()` - 컨텍스트 비활성화
   - `exit(callback)` - 일시적으로 컨텍스트 제거

## ⚠️ 제한 사항

### 1. 동시 실행 격리 불완전

**문제**:
```javascript
// ❌ 여러 LangGraph 워크플로우를 동시에 실행하면 컨텍스트 오염 가능
Promise.all([
  langGraph1.invoke(input1),
  langGraph2.invoke(input2),
])
```

**이유**:
- 브라우저는 Node.js의 비동기 리소스 추적 기능이 없음
- 간이 컨텍스트 ID 방식으로 구현했지만 완벽하지 않음

**해결책**:
- ✅ **순차 실행 권장**: `await langGraph1.invoke()` → `await langGraph2.invoke()`
- LangGraph의 일반적인 사용 패턴(단일 워크플로우)에서는 문제없음

### 2. 미지원 API

- `bind()` - no-op (경고만 출력)
- `snapshot()` - no-op (경고만 출력)
- `exit()` - 부분 구현 (경고 출력)

**영향**:
- 현재 LangGraph는 이 API들을 사용하지 않음
- 미래 버전에서 사용 시 문제 가능성

### 3. 성능

- 전역 Map 사용으로 메모리 오버헤드 있음
- 동시 실행 컨텍스트가 5개 이상이면 경고 출력

## 🧪 테스트

```bash
# 간단 테스트
node scripts/test-async-hooks-polyfill.js
```

**테스트 결과**:
- ✅ 동기 함수: PASS
- ✅ async/await: PASS
- ✅ 중첩된 run(): PASS
- ⚠️ 동시 실행 격리: FAIL (알려진 제한)

## 📚 참고

- **Node.js 공식 문서**: https://nodejs.org/api/async_hooks.html
- **LangGraph.js**: https://github.com/langchain-ai/langgraphjs
- **이슈 추적**: [LANGGRAPH_MIGRATION_SUMMARY.md](../../LANGGRAPH_MIGRATION_SUMMARY.md)

## 🎯 사용 환경

- ✅ Next.js Static Export (클라이언트 전용)
- ✅ LangGraph.js RAG 워크플로우
- ✅ 단일 워크플로우 순차 실행
- ⚠️ 복잡한 동시 실행 (권장하지 않음)
