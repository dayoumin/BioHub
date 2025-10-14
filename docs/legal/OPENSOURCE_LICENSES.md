# 오픈소스 라이선스 가이드

## 📋 개요
본 문서는 통계 분석 플랫폼에서 사용하는 주요 오픈소스 라이브러리의 라이선스 정보와 상업적 사용 가능 여부를 명시합니다.

---

## 🎨 Plotly.js

### 라이선스 정보
- **라이선스 타입**: MIT License
- **저작권자**: Plotly, Inc.
- **라이선스 URL**: https://github.com/plotly/plotly.js/blob/master/LICENSE

### 상업적 사용
✅ **완전 허용** - 다음 조건 하에 무제한 사용 가능:
- 상업적 사용 허용
- 수정 및 배포 허용
- 특허 사용 허용
- 사적 사용 허용

### 의무사항
- 저작권 표시 유지 (라이브러리 내부에 포함됨)
- 라이선스 사본 포함
- 소스코드 공개 의무 **없음**

### 주의사항
- Plotly.js (무료) ≠ Plotly Chart Studio (유료 서비스)
- Plotly.js 라이브러리 자체는 100% 무료
- 온라인 호스팅 서비스만 유료

### 기업 사용 사례
- Microsoft, Google, NASA 등 Fortune 500 기업 사용
- 논문, 연구, 상업 제품에 광범위하게 활용

---

## 🐍 SciPy

### 라이선스 정보
- **라이선스 타입**: BSD 3-Clause License
- **저작권자**: SciPy Developers
- **라이선스 URL**: https://github.com/scipy/scipy/blob/main/LICENSE.txt

### 상업적 사용
✅ **완전 허용** - BSD 라이선스는 MIT와 유사하게 관대함:
- 상업적 사용 허용
- 수정 및 재배포 허용
- 특허 사용 허용
- 바이너리 형태 배포 허용

### 의무사항
- 저작권 표시 유지
- 라이선스 조항 포함
- 소스코드 공개 의무 **없음**
- 홍보에 기여자 이름 사용 금지 (승인 없이)

### 신뢰성
- 수십 년간 과학계 표준 라이브러리
- 전 세계 대학, 연구소, 기업에서 검증
- 논문 인용 가능한 신뢰성

---

## 📊 NumPy

### 라이선스 정보
- **라이선스 타입**: BSD 3-Clause License
- **저작권자**: NumPy Developers
- **라이선스 URL**: https://github.com/numpy/numpy/blob/main/LICENSE.txt

### 상업적 사용
✅ **완전 허용** - SciPy와 동일한 BSD 라이선스

---

## 📈 Pandas

### 라이선스 정보
- **라이선스 타입**: BSD 3-Clause License
- **저작권자**: pandas Development Team
- **라이선스 URL**: https://github.com/pandas-dev/pandas/blob/main/LICENSE

### 상업적 사용
✅ **완전 허용** - SciPy와 동일한 BSD 라이선스

---

## ⚡ Pyodide

### 라이선스 정보
- **라이선스 타입**: Mozilla Public License 2.0 (MPL-2.0)
- **저작권자**: Pyodide contributors
- **라이선스 URL**: https://github.com/pyodide/pyodide/blob/main/LICENSE

### 상업적 사용
✅ **허용** - 단, MPL 조건 준수 필요:
- 상업적 사용 허용
- 수정 파일만 공개 (전체 소스 공개 불필요)
- 특허 사용 허용

### 의무사항
- Pyodide 자체를 수정한 경우만 해당 수정사항 공개
- 사용하는 애플리케이션 코드는 공개 의무 없음

---

## 🎯 Next.js

### 라이선스 정보
- **라이선스 타입**: MIT License
- **저작권자**: Vercel, Inc.
- **라이선스 URL**: https://github.com/vercel/next.js/blob/canary/LICENSE

### 상업적 사용
✅ **완전 허용** - Plotly와 동일한 MIT 라이선스

---

## 🎨 shadcn/ui

### 라이선스 정보
- **라이선스 타입**: MIT License
- **저작권자**: shadcn
- **특이사항**: 컴포넌트를 복사하여 사용하는 방식

### 상업적 사용
✅ **완전 허용** - 복사한 코드는 자유롭게 수정 가능

---

## 📝 라이선스 요약 표

| 라이브러리 | 라이선스 | 상업 사용 | 수정 허용 | 소스 공개 | 특허 보호 |
|-----------|---------|----------|----------|----------|-----------|
| Plotly.js | MIT | ✅ | ✅ | ❌ | ✅ |
| SciPy | BSD-3 | ✅ | ✅ | ❌ | ✅ |
| NumPy | BSD-3 | ✅ | ✅ | ❌ | ✅ |
| Pandas | BSD-3 | ✅ | ✅ | ❌ | ✅ |
| Pyodide | MPL-2.0 | ✅ | ✅ | ⚠️ 수정시만 | ✅ |
| Next.js | MIT | ✅ | ✅ | ❌ | ✅ |
| shadcn/ui | MIT | ✅ | ✅ | ❌ | ✅ |

---

## ⚖️ 법적 고지

### 권장사항
1. **라이선스 파일 유지**: 각 라이브러리의 LICENSE 파일을 프로젝트에 포함
2. **저작권 표시**: 배포 시 NOTICE 또는 CREDITS 파일 생성
3. **변경사항 명시**: 라이브러리를 수정한 경우 변경 내역 기록

### 면책조항
- 본 문서는 일반적인 가이드라인이며 법적 조언이 아닙니다
- 중요한 상업 프로젝트의 경우 법률 전문가 상담 권장
- 라이선스는 변경될 수 있으므로 최신 버전 확인 필요

---

## 🔗 참고 자료

### 라이선스 비교 사이트
- [Choose a License](https://choosealicense.com/)
- [TLDRLegal](https://tldrlegal.com/)
- [OSI Approved Licenses](https://opensource.org/licenses)

### 각 프로젝트 공식 라이선스
- [Plotly.js License](https://github.com/plotly/plotly.js/blob/master/LICENSE)
- [SciPy License](https://github.com/scipy/scipy/blob/main/LICENSE.txt)
- [NumPy License](https://github.com/numpy/numpy/blob/main/LICENSE.txt)
- [Pandas License](https://github.com/pandas-dev/pandas/blob/main/LICENSE)
- [Pyodide License](https://github.com/pyodide/pyodide/blob/main/LICENSE)
- [Next.js License](https://github.com/vercel/next.js/blob/canary/LICENSE)

---

## 📅 문서 정보
- **작성일**: 2025-09-16
- **최종 수정일**: 2025-09-16
- **검토 주기**: 6개월

---

## ✅ 결론

**본 프로젝트에서 사용하는 모든 핵심 라이브러리는 상업적 사용이 가능합니다.**

- 소스코드 공개 의무가 없는 MIT/BSD 라이선스가 대부분
- Pyodide(MPL)도 수정하지 않는 한 공개 의무 없음
- 특허 소송 위험 없음
- 기업/연구소/교육기관 모두 안전하게 사용 가능

**안심하고 개발 및 배포하실 수 있습니다.**