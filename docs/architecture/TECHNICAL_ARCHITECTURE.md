# 🏗️ Technical Architecture Specification

**버전**: 2.0  
**업데이트**: 2025-09-12  
**프로젝트**: statistical-platform

## 시스템 아키텍처 개요

### 전체 시스템 구성도
```
┌─────────────────────────────────────┐
│           Frontend Layer            │
├─────────────────────────────────────┤
│  Next.js 15 + TypeScript + shadcn  │
│  ├── App Router (React 19)          │
│  ├── Server Components (RSC)        │
│  ├── Client Components (상호작용)   │
│  └── API Routes (내부 API)          │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│          Computation Layer          │
├─────────────────────────────────────┤
│  Pyodide + Web Workers             │
│  ├── Python 3.11 (WebAssembly)     │
│  ├── scipy.stats (통계 연산)        │
│  ├── numpy (수치 계산)              │
│  ├── pandas (데이터 처리)           │
│  └── Web Workers (백그라운드 실행)  │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│           Data Layer               │
├─────────────────────────────────────┤
│  Browser Storage + File System     │
│  ├── IndexedDB (대용량 데이터)      │
│  ├── LocalStorage (설정/캐시)       │
│  ├── File API (파일 업로드)         │
│  └── Tauri FS (데스크탑 파일 접근)  │
└─────────────────────────────────────┘
```

## Frontend 아키텍처

### Next.js 15 App Router 구조
```
statistical-platform/             # 프로젝트 루트
├── app/                          # Next.js 15 App Router
│   ├── globals.css               # 전역 스타일 (Tailwind CSS)
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 홈페이지 (캐러셀 UI)
│   ├── favicon.ico               # 파비콘
│   └── (dashboard)/              # 대시보드 라우트 그룹
│       ├── layout.tsx            # 대시보드 레이아웃
│       ├── dashboard/            # 메인 대시보드
│       │   └── page.tsx          
│       ├── analysis/             # 통계 분석
│       │   ├── page.tsx          # 분석 메인
│       │   └── [type]/           # 동적 라우트
│       ├── smart-analysis/       # AI 기반 스마트 분석
│       │   └── page.tsx          
│       ├── smart-flow/           # 🆕 단일 페이지 통합 분석
│       │   ├── page.tsx          # 5단계 플로우 메인
│       │   └── components/       # 단계별 컴포넌트
│       ├── data/                 # 데이터 관리
│       │   └── page.tsx          
│       ├── results/              # 분석 결과
│       │   └── page.tsx          
│       ├── settings/             # 환경 설정
│       │   └── page.tsx          
│       └── help/                 # 도움말
│           └── page.tsx          
```

### 컴포넌트 구조
```
components/                       # 재사용 컴포넌트
├── ui/                          # shadcn/ui 기본 컴포넌트
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   └── chart.tsx
├── layout/                      # 레이아웃 컴포넌트
│   ├── header.tsx
│   ├── sidebar.tsx
│   ├── breadcrumb.tsx
│   └── footer.tsx
├── data/                        # 데이터 관련
│   ├── data-table.tsx
│   ├── file-upload.tsx
│   ├── data-preview.tsx
│   └── data-validator.tsx
├── analysis/                    # 분석 관련
│   ├── analysis-wizard.tsx
│   ├── test-selector.tsx
│   ├── assumptions-checker.tsx
│   └── results-viewer.tsx
├── charts/                      # 시각화 컴포넌트
│   ├── histogram.tsx
│   ├── boxplot.tsx
│   ├── scatterplot.tsx
│   ├── qqplot.tsx
│   └── interaction-plot.tsx
└── forms/                       # 폼 컴포넌트
    ├── analysis-form.tsx
    ├── options-form.tsx
    └── export-form.tsx
```

## 상태 관리 아키텍처

### Zustand Store 구조
```typescript
// stores/app-store.ts
interface AppStore {
  // 데이터 상태
  data: {
    raw: DataSet | null
    processed: ProcessedData | null
    columns: ColumnInfo[]
    rowCount: number
  }
  
  // 분석 상태
  analysis: {
    type: AnalysisType
    options: AnalysisOptions
    results: AnalysisResults | null
    isRunning: boolean
    progress: number
  }
  
  // UI 상태
  ui: {
    theme: 'light' | 'dark'
    sidebarOpen: boolean
    activeView: string
    loading: boolean
  }
  
  // 액션들
  actions: {
    setData: (data: DataSet) => void
    runAnalysis: (type: AnalysisType, options: AnalysisOptions) => Promise<void>
    toggleTheme: () => void
    setLoading: (loading: boolean) => void
  }
}
```

### TanStack Query 구성
```typescript
// hooks/queries.ts
export const queryKeys = {
  pyodide: ['pyodide'] as const,
  analysis: (type: string) => ['analysis', type] as const,
  data: (id: string) => ['data', id] as const,
} as const

// Pyodide 로딩
export const usePyodideQuery = () => 
  useQuery({
    queryKey: queryKeys.pyodide,
    queryFn: loadPyodide,
    staleTime: Infinity, // 한번 로드되면 캐시 유지
  })

// 분석 실행
export const useAnalysisMutation = () => 
  useMutation({
    mutationFn: runPythonAnalysis,
    onSuccess: (results) => {
      // 결과를 상태에 저장
    }
  })
```

## Pyodide 통계 엔진

### ⚠️ 극히 중요: 모든 통계 계산은 반드시 Pyodide + SciPy 사용
**절대 JavaScript/TypeScript로 통계 함수를 직접 구현하지 마세요!**
- ✅ 올바른 방법: Pyodide를 통해 SciPy 사용
- ❌ 잘못된 방법: JavaScript로 통계 공식 구현
- 이유: 정확도, 신뢰성, 검증된 알고리즘

### Python 통계 모듈 구조
```python
# pyodide/statistical_engine.py
import scipy.stats as stats
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple

class StatisticalEngine:
    """통계 분석 엔진 메인 클래스"""
    
    def __init__(self):
        self.data = None
        self.results = {}
    
    # 기술통계
    def descriptive_stats(self, data: np.ndarray) -> Dict:
        return {
            'mean': np.mean(data),
            'std': np.std(data, ddof=1),
            'median': np.median(data),
            'q1': np.percentile(data, 25),
            'q3': np.percentile(data, 75),
            'skewness': stats.skew(data),
            'kurtosis': stats.kurtosis(data),
            'ci_95': stats.t.interval(0.95, len(data)-1, 
                                    np.mean(data), 
                                    stats.sem(data))
        }
    
    # 가정 검정
    def test_normality(self, data: np.ndarray) -> Dict:
        """정규성 검정"""
        if len(data) < 3:
            return {'error': 'Insufficient data'}
        
        if len(data) <= 50:
            stat, p = stats.shapiro(data)
            test_name = 'Shapiro-Wilk'
        else:
            stat, p = stats.kstest(data, 'norm')
            test_name = 'Kolmogorov-Smirnov'
        
        return {
            'test': test_name,
            'statistic': stat,
            'p_value': p,
            'is_normal': p > 0.05,
            'alpha': 0.05
        }
    
    def test_homogeneity(self, *groups) -> Dict:
        """등분산성 검정"""
        # Levene's test
        stat_levene, p_levene = stats.levene(*groups)
        
        # Bartlett's test (정규분포 가정)
        stat_bartlett, p_bartlett = stats.bartlett(*groups)
        
        return {
            'levene': {
                'statistic': stat_levene,
                'p_value': p_levene,
                'is_homogeneous': p_levene > 0.05
            },
            'bartlett': {
                'statistic': stat_bartlett,
                'p_value': p_bartlett,
                'is_homogeneous': p_bartlett > 0.05
            }
        }
    
    # 기본 검정
    def t_test_independent(self, group1: np.ndarray, group2: np.ndarray, 
                          equal_var: bool = True) -> Dict:
        """독립표본 t-검정"""
        if equal_var:
            stat, p = stats.ttest_ind(group1, group2)
            test_type = "Independent t-test"
        else:
            stat, p = stats.ttest_ind(group1, group2, equal_var=False)
            test_type = "Welch's t-test"
        
        # Cohen's d 계산
        pooled_std = np.sqrt(((len(group1)-1)*np.var(group1, ddof=1) + 
                             (len(group2)-1)*np.var(group2, ddof=1)) / 
                             (len(group1)+len(group2)-2))
        cohens_d = (np.mean(group1) - np.mean(group2)) / pooled_std
        
        return {
            'test_type': test_type,
            'statistic': stat,
            'p_value': p,
            'degrees_of_freedom': len(group1) + len(group2) - 2,
            'effect_size': {
                'cohens_d': cohens_d,
                'interpretation': self._interpret_cohens_d(cohens_d)
            },
            'means': {
                'group1': np.mean(group1),
                'group2': np.mean(group2),
                'difference': np.mean(group1) - np.mean(group2)
            }
        }
    
    # ANOVA
    def one_way_anova(self, *groups) -> Dict:
        """일원분산분석"""
        # 기본 ANOVA
        f_stat, p_value = stats.f_oneway(*groups)
        
        # 그룹별 통계
        group_stats = []
        for i, group in enumerate(groups):
            group_stats.append({
                'group': f'Group_{i+1}',
                'n': len(group),
                'mean': np.mean(group),
                'std': np.std(group, ddof=1),
                'se': stats.sem(group)
            })
        
        # 효과크기 (eta-squared)
        ss_total = sum(np.sum((group - np.mean(np.concatenate(groups)))**2) 
                      for group in groups)
        ss_within = sum(np.sum((group - np.mean(group))**2) 
                       for group in groups)
        eta_squared = (ss_total - ss_within) / ss_total
        
        result = {
            'test_type': 'One-way ANOVA',
            'f_statistic': f_stat,
            'p_value': p_value,
            'degrees_of_freedom': {
                'between': len(groups) - 1,
                'within': sum(len(g) for g in groups) - len(groups),
                'total': sum(len(g) for g in groups) - 1
            },
            'effect_size': {
                'eta_squared': eta_squared,
                'interpretation': self._interpret_eta_squared(eta_squared)
            },
            'group_statistics': group_stats,
            'significant': p_value < 0.05
        }
        
        # 유의하면 사후분석 수행
        if p_value < 0.05:
            result['post_hoc'] = self.post_hoc_tukey(*groups)
        
        return result
    
    def post_hoc_tukey(self, *groups) -> Dict:
        """Tukey HSD 사후분석"""
        from itertools import combinations
        
        # 모든 쌍별 비교
        comparisons = []
        group_names = [f'Group_{i+1}' for i in range(len(groups))]
        
        for i, j in combinations(range(len(groups)), 2):
            group1, group2 = groups[i], groups[j]
            
            # Tukey HSD 계산
            n1, n2 = len(group1), len(group2)
            mean1, mean2 = np.mean(group1), np.mean(group2)
            
            # MSE 계산 (모든 그룹 포함)
            all_data = np.concatenate(groups)
            grand_mean = np.mean(all_data)
            ss_within = sum(np.sum((group - np.mean(group))**2) 
                           for group in groups)
            df_within = sum(len(g) for g in groups) - len(groups)
            mse = ss_within / df_within
            
            # Tukey HSD 통계량
            se = np.sqrt(mse * (1/n1 + 1/n2) / 2)
            q_stat = (mean1 - mean2) / se
            
            # p-value는 근사치 (정확한 계산을 위해서는 studentized range distribution 필요)
            p_value = 2 * (1 - stats.norm.cdf(abs(q_stat)))
            
            comparisons.append({
                'groups': f'{group_names[i]} vs {group_names[j]}',
                'mean_difference': mean1 - mean2,
                'se': se,
                'q_statistic': q_stat,
                'p_value': p_value,
                'significant': p_value < 0.05
            })
        
        return {
            'method': 'Tukey HSD',
            'comparisons': comparisons,
            'alpha': 0.05
        }
    
    # 비모수 검정
    def mann_whitney_u(self, group1: np.ndarray, group2: np.ndarray) -> Dict:
        """Mann-Whitney U 검정"""
        stat, p = stats.mannwhitneyu(group1, group2, alternative='two-sided')
        
        # 효과크기 (r)
        n1, n2 = len(group1), len(group2)
        z_score = stats.norm.ppf(p/2)  # 근사치
        r = abs(z_score) / np.sqrt(n1 + n2)
        
        return {
            'test_type': 'Mann-Whitney U test',
            'u_statistic': stat,
            'p_value': p,
            'effect_size': {
                'r': r,
                'interpretation': self._interpret_r(r)
            },
            'medians': {
                'group1': np.median(group1),
                'group2': np.median(group2)
            }
        }
    
    def kruskal_wallis(self, *groups) -> Dict:
        """Kruskal-Wallis 검정"""
        stat, p = stats.kruskal(*groups)
        
        result = {
            'test_type': 'Kruskal-Wallis H test',
            'h_statistic': stat,
            'p_value': p,
            'degrees_of_freedom': len(groups) - 1,
            'significant': p < 0.05
        }
        
        # 유의하면 Dunn's test 수행
        if p < 0.05:
            result['post_hoc'] = self.post_hoc_dunn(*groups)
        
        return result
    
    def post_hoc_dunn(self, *groups) -> Dict:
        """Dunn's test 사후분석"""
        from itertools import combinations
        
        # 전체 데이터 순위 계산
        all_data = np.concatenate(groups)
        ranks = stats.rankdata(all_data)
        
        # 그룹별 순위 합
        group_rank_sums = []
        start_idx = 0
        for group in groups:
            end_idx = start_idx + len(group)
            rank_sum = np.sum(ranks[start_idx:end_idx])
            group_rank_sums.append(rank_sum)
            start_idx = end_idx
        
        n = len(all_data)
        comparisons = []
        
        for i, j in combinations(range(len(groups)), 2):
            n1, n2 = len(groups[i]), len(groups[j])
            R1, R2 = group_rank_sums[i], group_rank_sums[j]
            
            # Dunn's test 통계량
            se = np.sqrt((n * (n + 1) / 12) * (1/n1 + 1/n2))
            z_stat = (R1/n1 - R2/n2) / se
            p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))
            
            comparisons.append({
                'groups': f'Group_{i+1} vs Group_{j+1}',
                'z_statistic': z_stat,
                'p_value': p_value,
                'significant': p_value < 0.05
            })
        
        return {
            'method': 'Dunn\'s test',
            'comparisons': comparisons,
            'alpha': 0.05
        }
    
    # 해석 함수들
    def _interpret_cohens_d(self, d: float) -> str:
        """Cohen's d 해석"""
        abs_d = abs(d)
        if abs_d < 0.2:
            return 'negligible'
        elif abs_d < 0.5:
            return 'small'
        elif abs_d < 0.8:
            return 'medium'
        else:
            return 'large'
    
    def _interpret_eta_squared(self, eta: float) -> str:
        """Eta-squared 해석"""
        if eta < 0.01:
            return 'negligible'
        elif eta < 0.06:
            return 'small'
        elif eta < 0.14:
            return 'medium'
        else:
            return 'large'
    
    def _interpret_r(self, r: float) -> str:
        """효과크기 r 해석"""
        if r < 0.1:
            return 'negligible'
        elif r < 0.3:
            return 'small'
        elif r < 0.5:
            return 'medium'
        else:
            return 'large'

# 전역 인스턴스
engine = StatisticalEngine()

# JavaScript에서 호출할 함수들
def run_descriptive_analysis(data_json: str) -> str:
    """기술통계 분석"""
    import json
    data = np.array(json.loads(data_json))
    result = engine.descriptive_stats(data)
    return json.dumps(result, cls=NumpyEncoder)

def run_t_test(group1_json: str, group2_json: str, equal_var: bool = True) -> str:
    """t-검정"""
    import json
    group1 = np.array(json.loads(group1_json))
    group2 = np.array(json.loads(group2_json))
    result = engine.t_test_independent(group1, group2, equal_var)
    return json.dumps(result, cls=NumpyEncoder)

def run_anova(*groups_json) -> str:
    """일원분산분석"""
    import json
    groups = [np.array(json.loads(group)) for group in groups_json]
    result = engine.one_way_anova(*groups)
    return json.dumps(result, cls=NumpyEncoder)

# JSON 직렬화용 클래스
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.integer):
            return int(obj)
        return super().default(obj)
```

### Web Workers 통합
```typescript
// lib/workers/pyodide-worker.ts
self.onmessage = async (event) => {
  const { type, data } = event.data
  
  try {
    switch (type) {
      case 'LOAD_PYODIDE':
        await loadPyodide()
        self.postMessage({ type: 'PYODIDE_LOADED' })
        break
        
      case 'RUN_ANALYSIS':
        const results = await runPythonFunction(data.funcName, data.args)
        self.postMessage({ 
          type: 'ANALYSIS_COMPLETE', 
          data: results 
        })
        break
        
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      error: error.message 
    })
  }
}
```

## 데이터 처리 아키텍처

### 파일 처리 파이프라인
```typescript
// lib/data-processing.ts
export class DataProcessor {
  static async processFile(file: File): Promise<ProcessedData> {
    // 1. 파일 타입 검증
    const fileType = this.detectFileType(file)
    
    // 2. 파싱
    const rawData = await this.parseFile(file, fileType)
    
    // 3. 검증
    const validationResult = this.validateData(rawData)
    
    // 4. 전처리
    const processedData = this.preprocessData(rawData, validationResult)
    
    return processedData
  }
  
  private static detectFileType(file: File): 'csv' | 'xlsx' | 'json' {
    const extension = file.name.split('.').pop()?.toLowerCase()
    // 파일 타입 감지 로직
  }
  
  private static async parseFile(file: File, type: string): Promise<RawData> {
    switch (type) {
      case 'csv':
        return this.parseCSV(file)
      case 'xlsx':
        return this.parseExcel(file)
      default:
        throw new Error('Unsupported file type')
    }
  }
  
  private static validateData(data: RawData): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    }
  }
}
```

## 성능 최적화

### 메모리 관리
```typescript
// lib/memory-manager.ts
export class MemoryManager {
  private static instance: MemoryManager
  private pyodideInstance: any
  
  static getInstance(): MemoryManager {
    if (!this.instance) {
      this.instance = new MemoryManager()
    }
    return this.instance
  }
  
  async cleanupPython(): Promise<void> {
    if (this.pyodideInstance) {
      await this.pyodideInstance.runPython(`
        import gc
        gc.collect()
      `)
    }
  }
  
  async monitorMemory(): Promise<MemoryInfo> {
    const memInfo = (performance as any).memory
    return {
      usedJSHeapSize: memInfo.usedJSHeapSize,
      totalJSHeapSize: memInfo.totalJSHeapSize,
      jsHeapSizeLimit: memInfo.jsHeapSizeLimit
    }
  }
}
```

### 캐싱 전략
```typescript
// lib/cache-manager.ts
export class CacheManager {
  private cache = new Map<string, CacheEntry>()
  
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    if (!entry || this.isExpired(entry)) {
      return null
    }
    return entry.data as T
  }
  
  async set<T>(key: string, data: T, ttl: number = 300000): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }
  
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }
}
```

---

## 보안 및 안정성

### CSP (Content Security Policy)
```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:;
              worker-src 'self' blob:;
              child-src 'self' blob:;
              connect-src 'self' data: blob:;
              img-src 'self' data: blob:;
              style-src 'self' 'unsafe-inline';
              font-src 'self' data:;
            `.replace(/\s+/g, ' ').trim()
          }
        ]
      }
    ]
  }
}
```

### 에러 처리
```typescript
// lib/error-handler.ts
export class ErrorHandler {
  static handle(error: Error, context: string): void {
    // 로깅
    console.error(`[${context}] ${error.message}`, error)
    
    // 사용자 알림
    if (error instanceof PyodideError) {
      // Pyodide 특화 에러 처리
    } else if (error instanceof DataValidationError) {
      // 데이터 검증 에러 처리
    }
    
    // 복구 시도
    this.attemptRecovery(error, context)
  }
  
  private static attemptRecovery(error: Error, context: string): void {
    // 자동 복구 로직
  }
}
```

이 기술 아키텍처를 기반으로 견고하고 확장 가능한 통계 분석 플랫폼을 구축할 수 있습니다.

---

## 기술 스택

### Core Technologies
| Layer | Technology | Version | 용도 |
|-------|-----------|---------|-----|
| Frontend | Next.js | 15.5.2 | React 19 프레임워크 |
| Language | TypeScript | 5.7.3 | 타입 안전성 |
| UI Components | shadcn/ui | Latest | 전문가급 UI 컴포넌트 |
| Styling | Tailwind CSS | 3.4.0 | 유틸리티 CSS |
| State | Zustand | 5.0.3 | 전역 상태 관리 |
| Query | TanStack Query | 5.65.0 | 서버 상태 관리 |
| Charts | Recharts | 2.15.0 | 데이터 시각화 |
| Icons | Lucide React | 0.476.0 | 아이콘 시스템 |
| Python Runtime | Pyodide | 0.26.4 | WebAssembly Python |
| Desktop | Tauri | 2.0 (예정) | 크로스플랫폼 데스크탑 |

### Statistical Libraries (Pyodide)
| Library | Version | 용도 |
|---------|---------|------|
| scipy | 1.14.1 | 통계 함수 |
| numpy | 2.2.1 | 수치 계산 |
| pandas | 2.2.3 | 데이터 처리 |
| statsmodels | 0.14.6 | 고급 통계 |
| scikit-learn | 1.6.1 | 머신러닝 (선택적) |

### Development Tools
| Tool | Version | 용도 |
|------|---------|------|
| Node.js | 20.x | JavaScript 런타임 |
| npm | 10.x | 패키지 관리 |
| ESLint | 9.x | 코드 품질 |
| Prettier | 3.x | 코드 포맷팅 |
| Jest | 29.x | 테스트 프레임워크 |
| Testing Library | 16.x | 컴포넌트 테스트 |

---

*최종 업데이트: 2025-09-12*