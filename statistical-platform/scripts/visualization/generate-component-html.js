/**
 * 통계 플랫폼 컴포넌트 HTML 시각화 생성기
 *
 * 목적:
 * - 스마트 통계 & 통계별 처리의 단계 컴포넌트를 HTML로 시각화
 * - 각 컴포넌트의 구조, props, 사용 예시를 시각적으로 확인
 *
 * 생성 파일:
 * - statistical-platform/visualization/components/
 *   - index.html (메인 인덱스)
 *   - step-indicator.html
 *   - progress-stepper.html
 *   - statistics-page-layout.html
 *   - variable-selector.html
 *   - smart-flow-steps.html
 */

const fs = require('fs');
const path = require('path');

// 출력 디렉토리
const OUTPUT_DIR = path.join(__dirname, '../../visualization/components');

// 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✅ 출력 디렉토리 생성: ${OUTPUT_DIR}`);
}

/**
 * HTML 템플릿 생성 함수
 */
function createHTMLTemplate(title, content, styles = '') {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - 통계 플랫폼 컴포넌트 시각화</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      background: #fafafa;
      color: #1a1a1a;
      line-height: 1.6;
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      border: 1px solid #e5e5e5;
    }

    .header {
      background: #ffffff;
      color: #1a1a1a;
      padding: 2rem 3rem;
      border-bottom: 1px solid #e5e5e5;
    }

    .header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .header p {
      font-size: 0.95rem;
      color: #737373;
    }

    .nav {
      background: #fafafa;
      padding: 1rem 3rem;
      border-bottom: 1px solid #e5e5e5;
    }

    .nav a {
      display: inline-block;
      margin-right: 1rem;
      padding: 0.5rem 0.75rem;
      background: transparent;
      color: #525252;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      font-size: 0.9rem;
      transition: all 0.15s;
      border: 1px solid transparent;
    }

    .nav a:hover {
      background: #f5f5f5;
      color: #1a1a1a;
      border-color: #e5e5e5;
    }

    .content {
      padding: 3rem;
    }

    .section {
      margin-bottom: 3rem;
    }

    .section h2 {
      font-size: 1.5rem;
      color: #1a1a1a;
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #e5e5e5;
      font-weight: 600;
    }

    .section h3 {
      font-size: 1.1rem;
      color: #1a1a1a;
      margin-top: 2rem;
      margin-bottom: 1rem;
      font-weight: 600;
    }

    .code-block {
      background: #fafafa;
      color: #1a1a1a;
      padding: 1.5rem;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
      font-size: 0.85rem;
      line-height: 1.6;
      margin-bottom: 1rem;
      border: 1px solid #e5e5e5;
    }

    .code-block .keyword {
      color: #525252;
      font-weight: 600;
    }

    .code-block .string {
      color: #737373;
    }

    .code-block .comment {
      color: #a3a3a3;
      font-style: italic;
    }

    .preview {
      background: #ffffff;
      padding: 2rem;
      border-radius: 6px;
      border: 1px solid #e5e5e5;
      margin-bottom: 1.5rem;
    }

    .info-box {
      background: #fafafa;
      border-left: 2px solid #1a1a1a;
      padding: 1rem 1.5rem;
      margin-bottom: 1.5rem;
      border-radius: 4px;
    }

    .info-box strong {
      color: #1a1a1a;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.5rem;
    }

    .table th,
    .table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e5e5;
    }

    .table th {
      background: #fafafa;
      font-weight: 600;
      color: #1a1a1a;
      font-size: 0.9rem;
    }

    .table tr:hover {
      background: #fafafa;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: #1a1a1a;
      color: white;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .badge.success {
      background: #525252;
    }

    .badge.warning {
      background: #737373;
    }

    .badge.info {
      background: #404040;
    }

    ${styles}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <p>통계 분석 플랫폼 - 컴포넌트 시각화 문서</p>
    </div>
    <div class="nav">
      <a href="index.html">홈</a>
      <a href="step-indicator.html">StepIndicator</a>
      <a href="progress-stepper.html">ProgressStepper</a>
      <a href="statistics-page-layout.html">StatisticsPageLayout</a>
      <a href="variable-selector.html">VariableSelector</a>
      <a href="smart-flow-steps.html">Smart Flow Steps</a>
    </div>
    <div class="content">
      ${content}
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. 메인 인덱스 페이지
 */
function generateIndexPage() {
  const content = `
    <div class="section">
      <h2>📚 컴포넌트 시각화 문서</h2>
      <p>이 문서는 통계 분석 플랫폼의 주요 컴포넌트를 시각적으로 이해하기 위한 HTML 가이드입니다.</p>
    </div>

    <div class="section">
      <h2>🎯 주요 컴포넌트</h2>

      <div class="info-box">
        <strong>총 5개 카테고리</strong>의 컴포넌트를 시각화했습니다. 각 페이지에서 구조, Props, 사용 예시를 확인하세요.
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>컴포넌트</th>
            <th>설명</th>
            <th>사용 위치</th>
            <th>링크</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>StepIndicator</strong></td>
            <td>통합 단계 표시 컴포넌트 (3가지 색상 variant)</td>
            <td>모든 통계 페이지</td>
            <td><a href="step-indicator.html">보기</a></td>
          </tr>
          <tr>
            <td><strong>ProgressStepper</strong></td>
            <td>스마트 플로우 단계 진행 표시 (6단계)</td>
            <td>스마트 통계 플로우</td>
            <td><a href="progress-stepper.html">보기</a></td>
          </tr>
          <tr>
            <td><strong>StatisticsPageLayout</strong></td>
            <td>통계 페이지 공통 레이아웃</td>
            <td>41개 통계 페이지</td>
            <td><a href="statistics-page-layout.html">보기</a></td>
          </tr>
          <tr>
            <td><strong>VariableSelector</strong></td>
            <td>변수 선택 UI (Simple/Advanced/Premium)</td>
            <td>변수 선택 단계</td>
            <td><a href="variable-selector.html">보기</a></td>
          </tr>
          <tr>
            <td><strong>Smart Flow Steps</strong></td>
            <td>스마트 플로우 6단계 컴포넌트</td>
            <td>스마트 통계</td>
            <td><a href="smart-flow-steps.html">보기</a></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>🏗️ 아키텍처 개요</h2>

      <h3>디렉토리 구조</h3>
      <div class="code-block">
<span class="comment">// 컴포넌트 위치</span>
statistical-platform/
├── components/
│   ├── common/
│   │   └── StepIndicator.tsx          <span class="comment">// 통합 단계 표시</span>
│   ├── smart-flow/
│   │   ├── ProgressStepper.tsx        <span class="comment">// 스마트 플로우 진행 표시</span>
│   │   └── steps/                     <span class="comment">// 6개 단계 컴포넌트</span>
│   ├── statistics/
│   │   ├── StatisticsPageLayout.tsx   <span class="comment">// 통계 페이지 레이아웃</span>
│   │   └── StepCard.tsx               <span class="comment">// 단계 카드</span>
│   └── variable-selection/
│       ├── VariableSelector.tsx       <span class="comment">// 드래그앤드롭</span>
│       ├── VariableSelectorSimple.tsx <span class="comment">// 드롭다운</span>
│       └── VariableSelectorPremium.tsx <span class="comment">// 프리미엄 UX</span>
      </div>

      <h3>Hook & 유틸리티</h3>
      <div class="code-block">
<span class="comment">// 공통 Hook</span>
hooks/
├── use-statistics-page.ts             <span class="comment">// 통계 페이지 상태 관리</span>
└── use-pyodide-service.ts             <span class="comment">// Pyodide 서비스 호출</span>

<span class="comment">// 유틸리티</span>
lib/
├── design-tokens/
│   └── step-flow.ts                   <span class="comment">// Step 디자인 토큰</span>
└── utils/
    └── statistics-handlers.ts         <span class="comment">// 핸들러 유틸</span>
      </div>
    </div>

    <div class="section">
      <h2>📊 현재 상태</h2>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 1.5rem;">
        <div style="background: #ebf8ff; padding: 1.5rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 2.5rem; font-weight: 700; color: #2c5282;">41</div>
          <div style="color: #2d5a7b; margin-top: 0.5rem;">통계 페이지</div>
          <div style="margin-top: 0.5rem;"><span class="badge success">100%</span></div>
        </div>
        <div style="background: #f0fff4; padding: 1.5rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 2.5rem; font-weight: 700; color: #22543d;">208</div>
          <div style="color: #22543d; margin-top: 0.5rem;">테스트 통과</div>
          <div style="margin-top: 0.5rem;"><span class="badge success">All Pass</span></div>
        </div>
        <div style="background: #fffaf0; padding: 1.5rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 2.5rem; font-weight: 700; color: #7c2d12;">0</div>
          <div style="color: #7c2d12; margin-top: 0.5rem;">TypeScript 에러</div>
          <div style="margin-top: 0.5rem;"><span class="badge success">Clean</span></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🎨 디자인 토큰</h2>

      <h3>색상 Variant</h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 1rem;">
        <div style="background: linear-gradient(135deg, #f7fafc 0%, #e2e8f0 100%); padding: 1.5rem; border-radius: 8px;">
          <strong>gray</strong> (기본값)
          <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #4a5568;">그레이 그래디언트</div>
        </div>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 8px;">
          <strong>blue-purple</strong>
          <div style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.9;">파랑-보라 그래디언트</div>
        </div>
        <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); color: white; padding: 1.5rem; border-radius: 8px;">
          <strong>emerald-cyan</strong>
          <div style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.9;">에메랄드-청록 그래디언트</div>
        </div>
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 1.5rem; border-radius: 8px;">
          <strong>custom</strong>
          <div style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.9;">테마 기반 색상</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>📖 참고 문서</h2>

      <table class="table">
        <thead>
          <tr>
            <th>문서</th>
            <th>설명</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>STEP_FLOW_STANDARDIZATION.md</strong></td>
            <td>Step 흐름 표준화 가이드</td>
          </tr>
          <tr>
            <td><strong>STATISTICS_PAGE_CODING_STANDARDS.md</strong></td>
            <td>통계 페이지 코딩 표준</td>
          </tr>
          <tr>
            <td><strong>TROUBLESHOOTING_ISANALYZING_BUG.md</strong></td>
            <td>Critical 버그 예방 가이드</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const html = createHTMLTemplate('컴포넌트 시각화 홈', content);
  const filePath = path.join(OUTPUT_DIR, 'index.html');
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`✅ 생성 완료: index.html`);
}

/**
 * 2. StepIndicator 페이지
 */
function generateStepIndicatorPage() {
  const content = `
    <div class="section">
      <h2>🎯 StepIndicator 컴포넌트</h2>
      <p>통합 단계 표시 컴포넌트로, 모든 레이아웃과 색상 variant를 지원합니다.</p>

      <div class="info-box">
        <strong>파일 위치:</strong> components/common/StepIndicator.tsx
      </div>
    </div>

    <div class="section">
      <h2>📝 Props 인터페이스</h2>

      <div class="code-block">
<span class="keyword">interface</span> Step {
  id: <span class="keyword">string</span> | <span class="keyword">number</span>
  title: <span class="keyword">string</span>
  description?: <span class="keyword">string</span>
  icon?: LucideIcon | ReactNode
  status?: <span class="string">'pending'</span> | <span class="string">'current'</span> | <span class="string">'completed'</span> | <span class="string">'error'</span>
}

<span class="keyword">interface</span> StepIndicatorProps {
  steps: Step[]
  currentStep: <span class="keyword">number</span>
  onStepClick?: (stepIndex: <span class="keyword">number</span>) => <span class="keyword">void</span>
  layout?: <span class="string">'horizontal'</span> | <span class="string">'vertical'</span> | <span class="string">'compact'</span>
  variant?: <span class="string">'gray'</span> | <span class="string">'blue-purple'</span> | <span class="string">'emerald-cyan'</span> | <span class="string">'custom'</span>
  className?: <span class="keyword">string</span>
}
      </div>
    </div>

    <div class="section">
      <h2>🎨 사용 예시</h2>

      <h3>1. 기본 사용 (Horizontal + Gray)</h3>
      <div class="code-block">
<span class="keyword">const</span> steps: Step[] = [
  { id: <span class="string">'upload'</span>, title: <span class="string">'데이터 업로드'</span>, status: <span class="string">'completed'</span> },
  { id: <span class="string">'select'</span>, title: <span class="string">'변수 선택'</span>, status: <span class="string">'current'</span> },
  { id: <span class="string">'analyze'</span>, title: <span class="string">'분석 실행'</span>, status: <span class="string">'pending'</span> },
]

&lt;StepIndicator
  steps={steps}
  currentStep={1}
  onStepClick={(index) => setCurrentStep(index)}
/&gt;
      </div>

      <div class="preview">
        <div style="display: flex; gap: 1rem; align-items: center;">
          <!-- Step 1 (Completed) -->
          <div style="flex: 1; text-align: center;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto;">✓</div>
            <div style="margin-top: 0.5rem; font-weight: 600; color: #10b981;">데이터 업로드</div>
          </div>

          <!-- Connector -->
          <div style="flex: 1; height: 2px; background: #e2e8f0; margin-bottom: 2rem;"></div>

          <!-- Step 2 (Current) -->
          <div style="flex: 1; text-align: center;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto; box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);">2</div>
            <div style="margin-top: 0.5rem; font-weight: 600; color: #667eea;">변수 선택</div>
          </div>

          <!-- Connector -->
          <div style="flex: 1; height: 2px; background: #e2e8f0; margin-bottom: 2rem;"></div>

          <!-- Step 3 (Pending) -->
          <div style="flex: 1; text-align: center;">
            <div style="width: 48px; height: 48px; background: #f7fafc; color: #a0aec0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto; border: 2px solid #e2e8f0;">3</div>
            <div style="margin-top: 0.5rem; color: #a0aec0;">분석 실행</div>
          </div>
        </div>
      </div>

      <h3>2. Vertical 레이아웃</h3>
      <div class="code-block">
&lt;StepIndicator
  steps={steps}
  currentStep={1}
  layout=<span class="string">"vertical"</span>
  variant=<span class="string">"blue-purple"</span>
/&gt;
      </div>

      <div class="preview">
        <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 400px;">
          <!-- Step 1 -->
          <div style="display: flex; gap: 1rem; align-items: flex-start;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">✓</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #10b981; margin-bottom: 0.25rem;">데이터 업로드</div>
              <div style="font-size: 0.9rem; color: #718096;">CSV 또는 Excel 파일을 업로드하세요</div>
            </div>
          </div>

          <!-- Vertical Connector -->
          <div style="width: 2px; height: 24px; background: #e2e8f0; margin-left: 23px;"></div>

          <!-- Step 2 -->
          <div style="display: flex; gap: 1rem; align-items: flex-start;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);">2</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #667eea; margin-bottom: 0.25rem;">변수 선택</div>
              <div style="font-size: 0.9rem; color: #718096;">분석에 사용할 변수를 선택하세요</div>
            </div>
          </div>

          <!-- Vertical Connector -->
          <div style="width: 2px; height: 24px; background: #e2e8f0; margin-left: 23px;"></div>

          <!-- Step 3 -->
          <div style="display: flex; gap: 1rem; align-items: flex-start;">
            <div style="width: 48px; height: 48px; background: #f7fafc; color: #a0aec0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; border: 2px solid #e2e8f0;">3</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #a0aec0; margin-bottom: 0.25rem;">분석 실행</div>
              <div style="font-size: 0.9rem; color: #a0aec0;">통계 분석을 실행하세요</div>
            </div>
          </div>
        </div>
      </div>

      <h3>3. Compact 레이아웃</h3>
      <div class="code-block">
&lt;StepIndicator
  steps={steps}
  currentStep={1}
  layout=<span class="string">"compact"</span>
  variant=<span class="string">"emerald-cyan"</span>
/&gt;
      </div>

      <div class="preview">
        <div style="display: flex; gap: 0.5rem; align-items: center; justify-content: center;">
          <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700;">✓</div>
          <div style="width: 48px; height: 2px; background: #10b981;"></div>
          <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);">2</div>
          <div style="width: 48px; height: 2px; background: #e2e8f0;"></div>
          <div style="width: 32px; height: 32px; background: #f7fafc; color: #a0aec0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; border: 2px solid #e2e8f0;">3</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🎨 색상 Variant</h2>

      <table class="table">
        <thead>
          <tr>
            <th>Variant</th>
            <th>색상</th>
            <th>사용 위치</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge">gray</span></td>
            <td>그레이 그래디언트</td>
            <td>기본 통계 페이지</td>
          </tr>
          <tr>
            <td><span class="badge">blue-purple</span></td>
            <td>파랑-보라 그래디언트</td>
            <td>스마트 플로우</td>
          </tr>
          <tr>
            <td><span class="badge success">emerald-cyan</span></td>
            <td>에메랄드-청록 그래디언트</td>
            <td>고급 분석</td>
          </tr>
          <tr>
            <td><span class="badge info">custom</span></td>
            <td>테마 기반 색상</td>
            <td>커스텀 테마</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>💡 특징</h2>

      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>3가지 레이아웃</strong>: Horizontal, Vertical, Compact</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>4가지 색상 Variant</strong>: 상황에 맞는 색상 선택</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>클릭 가능</strong>: onStepClick으로 단계 이동</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>상태 표시</strong>: pending, current, completed, error</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>아이콘 지원</strong>: Lucide 아이콘 또는 커스텀 ReactNode</li>
        <li style="padding: 0.5rem 0;">✅ <strong>반응형</strong>: 모바일/태블릿/데스크탑 대응</li>
      </ul>
    </div>
  `;

  const html = createHTMLTemplate('StepIndicator', content);
  const filePath = path.join(OUTPUT_DIR, 'step-indicator.html');
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`✅ 생성 완료: step-indicator.html`);
}

/**
 * 3. ProgressStepper 페이지
 */
function generateProgressStepperPage() {
  const content = `
    <div class="section">
      <h2>🎯 ProgressStepper 컴포넌트</h2>
      <p>스마트 플로우 전용 단계 진행 표시 컴포넌트입니다. 6단계 플로우를 시각화합니다.</p>

      <div class="info-box">
        <strong>파일 위치:</strong> components/smart-flow/ProgressStepper.tsx
      </div>
    </div>

    <div class="section">
      <h2>📝 Props 인터페이스</h2>

      <div class="code-block">
<span class="keyword">interface</span> StepConfig {
  id: <span class="keyword">number</span>
  name: <span class="keyword">string</span>
  description: <span class="keyword">string</span>
  icon: LucideIcon
}

<span class="keyword">interface</span> ProgressStepperProps {
  currentStep: <span class="keyword">number</span>
  steps: StepConfig[]
  onStepClick?: (step: <span class="keyword">number</span>) => <span class="keyword">void</span>
}
      </div>
    </div>

    <div class="section">
      <h2>🎨 스마트 플로우 6단계</h2>

      <table class="table">
        <thead>
          <tr>
            <th>단계</th>
            <th>이름</th>
            <th>설명</th>
            <th>아이콘</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge">1</span></td>
            <td><strong>데이터 업로드</strong></td>
            <td>CSV/Excel 파일 업로드</td>
            <td>📤 Upload</td>
          </tr>
          <tr>
            <td><span class="badge">2</span></td>
            <td><strong>데이터 검증</strong></td>
            <td>정규성, 이분산성 검정</td>
            <td>✓ CheckCircle</td>
          </tr>
          <tr>
            <td><span class="badge">3</span></td>
            <td><strong>목적 입력</strong></td>
            <td>분석 목적 입력 → AI 추천</td>
            <td>🎯 Target</td>
          </tr>
          <tr>
            <td><span class="badge">4</span></td>
            <td><strong>변수 선택</strong></td>
            <td>분석 변수 선택</td>
            <td>🔧 Settings</td>
          </tr>
          <tr>
            <td><span class="badge">5</span></td>
            <td><strong>분석 실행</strong></td>
            <td>통계 분석 실행</td>
            <td>▶ Play</td>
          </tr>
          <tr>
            <td><span class="badge success">6</span></td>
            <td><strong>결과 확인</strong></td>
            <td>결과 보기, 내보내기, 공유</td>
            <td>📊 BarChart</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>🎨 사용 예시</h2>

      <div class="code-block">
<span class="keyword">import</span> { ProgressStepper } <span class="keyword">from</span> <span class="string">'@/components/smart-flow/ProgressStepper'</span>
<span class="keyword">import</span> { Upload, CheckCircle, Target, Settings, Play, BarChart } <span class="keyword">from</span> <span class="string">'lucide-react'</span>

<span class="keyword">const</span> SMART_FLOW_STEPS: StepConfig[] = [
  {
    id: 1,
    name: <span class="string">'데이터 업로드'</span>,
    description: <span class="string">'CSV/Excel 파일 업로드'</span>,
    icon: Upload
  },
  {
    id: 2,
    name: <span class="string">'데이터 검증'</span>,
    description: <span class="string">'정규성, 이분산성 검정'</span>,
    icon: CheckCircle
  },
  <span class="comment">// ... 나머지 단계</span>
]

&lt;ProgressStepper
  currentStep={currentStep}
  steps={SMART_FLOW_STEPS}
  onStepClick={(step) => setCurrentStep(step)}
/&gt;
      </div>

      <h3>시각적 미리보기</h3>
      <div class="preview">
        <div style="display: flex; gap: 0.5rem; align-items: center; overflow-x: auto; padding: 1rem;">
          <!-- Step 1 (Completed) -->
          <div style="flex-shrink: 0; text-align: center; min-width: 120px;">
            <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto; font-size: 1.25rem;">✓</div>
            <div style="margin-top: 0.75rem; font-weight: 600; color: #10b981; font-size: 0.9rem;">데이터 업로드</div>
            <div style="margin-top: 0.25rem; font-size: 0.75rem; color: #718096;">CSV/Excel</div>
          </div>

          <!-- Connector -->
          <div style="flex: 1; height: 3px; background: linear-gradient(90deg, #10b981 0%, #667eea 100%); margin-bottom: 3rem; min-width: 40px;"></div>

          <!-- Step 2 (Completed) -->
          <div style="flex-shrink: 0; text-align: center; min-width: 120px;">
            <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto; font-size: 1.25rem;">✓</div>
            <div style="margin-top: 0.75rem; font-weight: 600; color: #10b981; font-size: 0.9rem;">데이터 검증</div>
            <div style="margin-top: 0.25rem; font-size: 0.75rem; color: #718096;">정규성 검정</div>
          </div>

          <!-- Connector -->
          <div style="flex: 1; height: 3px; background: linear-gradient(90deg, #10b981 0%, #667eea 100%); margin-bottom: 3rem; min-width: 40px;"></div>

          <!-- Step 3 (Current) -->
          <div style="flex-shrink: 0; text-align: center; min-width: 120px;">
            <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto; font-size: 1.25rem; box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.3); animation: pulse 2s infinite;">3</div>
            <div style="margin-top: 0.75rem; font-weight: 600; color: #667eea; font-size: 0.9rem;">목적 입력</div>
            <div style="margin-top: 0.25rem; font-size: 0.75rem; color: #718096;">AI 추천</div>
          </div>

          <!-- Connector -->
          <div style="flex: 1; height: 3px; background: #e2e8f0; margin-bottom: 3rem; min-width: 40px;"></div>

          <!-- Step 4 (Pending) -->
          <div style="flex-shrink: 0; text-align: center; min-width: 120px;">
            <div style="width: 56px; height: 56px; background: #f7fafc; color: #a0aec0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto; font-size: 1.25rem; border: 2px solid #e2e8f0;">4</div>
            <div style="margin-top: 0.75rem; font-weight: 600; color: #a0aec0; font-size: 0.9rem;">변수 선택</div>
            <div style="margin-top: 0.25rem; font-size: 0.75rem; color: #cbd5e0;">분석 변수</div>
          </div>

          <!-- Connector -->
          <div style="flex: 1; height: 3px; background: #e2e8f0; margin-bottom: 3rem; min-width: 40px;"></div>

          <!-- Step 5 (Pending) -->
          <div style="flex-shrink: 0; text-align: center; min-width: 120px;">
            <div style="width: 56px; height: 56px; background: #f7fafc; color: #a0aec0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto; font-size: 1.25rem; border: 2px solid #e2e8f0;">5</div>
            <div style="margin-top: 0.75rem; font-weight: 600; color: #a0aec0; font-size: 0.9rem;">분석 실행</div>
            <div style="margin-top: 0.25rem; font-size: 0.75rem; color: #cbd5e0;">통계 분석</div>
          </div>

          <!-- Connector -->
          <div style="flex: 1; height: 3px; background: #e2e8f0; margin-bottom: 3rem; min-width: 40px;"></div>

          <!-- Step 6 (Pending) -->
          <div style="flex-shrink: 0; text-align: center; min-width: 120px;">
            <div style="width: 56px; height: 56px; background: #f7fafc; color: #a0aec0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto; font-size: 1.25rem; border: 2px solid #e2e8f0;">6</div>
            <div style="margin-top: 0.75rem; font-weight: 600; color: #a0aec0; font-size: 0.9rem;">결과 확인</div>
            <div style="margin-top: 0.25rem; font-size: 0.75rem; color: #cbd5e0;">내보내기</div>
          </div>
        </div>
      </div>

      <style>
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(102, 126, 234, 0.1);
          }
        }
      </style>
    </div>

    <div class="section">
      <h2>💡 특징</h2>

      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>고정 6단계</strong>: 스마트 플로우 전용</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>그래디언트 연결선</strong>: 진행 상황 시각화</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>Pulse 애니메이션</strong>: 현재 단계 강조</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>Horizontal Only</strong>: 가로 레이아웃만 지원</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>Lucide 아이콘</strong>: 각 단계별 아이콘</li>
        <li style="padding: 0.5rem 0;">✅ <strong>반응형 Scroll</strong>: 모바일에서 좌우 스크롤</li>
      </ul>
    </div>

    <div class="section">
      <h2>🔍 StepIndicator와 차이점</h2>

      <table class="table">
        <thead>
          <tr>
            <th>특징</th>
            <th>ProgressStepper</th>
            <th>StepIndicator</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>용도</strong></td>
            <td>스마트 플로우 전용</td>
            <td>범용 단계 표시</td>
          </tr>
          <tr>
            <td><strong>단계 수</strong></td>
            <td>고정 6단계</td>
            <td>가변 (1~N단계)</td>
          </tr>
          <tr>
            <td><strong>레이아웃</strong></td>
            <td>Horizontal만</td>
            <td>Horizontal/Vertical/Compact</td>
          </tr>
          <tr>
            <td><strong>색상</strong></td>
            <td>Blue-Purple 고정</td>
            <td>4가지 variant</td>
          </tr>
          <tr>
            <td><strong>애니메이션</strong></td>
            <td>Pulse 효과</td>
            <td>기본 전환</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const html = createHTMLTemplate('ProgressStepper', content);
  const filePath = path.join(OUTPUT_DIR, 'progress-stepper.html');
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`✅ 생성 완료: progress-stepper.html`);
}

/**
 * 4. StatisticsPageLayout 페이지
 */
function generateStatisticsPageLayoutPage() {
  const content = `
    <div class="section">
      <h2>🎯 StatisticsPageLayout 컴포넌트</h2>
      <p>41개 통계 페이지의 공통 레이아웃 컴포넌트입니다. 단계 관리, 진행률 표시, 일관된 UI를 제공합니다.</p>

      <div class="info-box">
        <strong>파일 위치:</strong> components/statistics/StatisticsPageLayout.tsx
      </div>
    </div>

    <div class="section">
      <h2>📝 Props 인터페이스</h2>

      <div class="code-block">
<span class="keyword">interface</span> StatisticsStep {
  id: <span class="keyword">string</span>
  number: <span class="keyword">number</span>
  title: <span class="keyword">string</span>
  description?: <span class="keyword">string</span>
  icon?: ReactNode
  status: <span class="string">'pending'</span> | <span class="string">'current'</span> | <span class="string">'completed'</span> | <span class="string">'error'</span>
}

<span class="keyword">interface</span> StatisticsPageLayoutProps {
  title: <span class="keyword">string</span>
  description?: <span class="keyword">string</span>
  steps: StatisticsStep[]
  currentStep: <span class="keyword">number</span>
  children: ReactNode
  onStepChange?: (step: <span class="keyword">number</span>) => <span class="keyword">void</span>
  isAnalyzing?: <span class="keyword">boolean</span>
  className?: <span class="keyword">string</span>
}
      </div>
    </div>

    <div class="section">
      <h2>🎨 사용 예시</h2>

      <div class="code-block">
<span class="keyword">import</span> { StatisticsPageLayout } <span class="keyword">from</span> <span class="string">'@/components/statistics/StatisticsPageLayout'</span>
<span class="keyword">import</span> { useStatisticsPage } <span class="keyword">from</span> <span class="string">'@/hooks/use-statistics-page'</span>

<span class="keyword">export default function</span> <span class="keyword">DescriptivePage</span>() {
  <span class="comment">// 1. useStatisticsPage Hook 사용</span>
  <span class="keyword">const</span> { state, actions } = useStatisticsPage&lt;ResultType, VariableType&gt;({
    withUploadedData: <span class="keyword">true</span>,
    withError: <span class="keyword">true</span>
  })

  <span class="comment">// 2. 단계 정의</span>
  <span class="keyword">const</span> steps: StatisticsStep[] = [
    {
      id: <span class="string">'upload-data'</span>,
      number: 1,
      title: <span class="string">'데이터 업로드'</span>,
      description: <span class="string">'CSV 또는 Excel 파일을 업로드하세요'</span>,
      status: state.currentStep === 0 ? <span class="string">'current'</span> :
              state.currentStep > 0 ? <span class="string">'completed'</span> : <span class="string">'pending'</span>
    },
    {
      id: <span class="string">'select-variables'</span>,
      number: 2,
      title: <span class="string">'변수 선택'</span>,
      description: <span class="string">'분석할 변수를 선택하세요'</span>,
      status: state.currentStep === 1 ? <span class="string">'current'</span> :
              state.currentStep > 1 ? <span class="string">'completed'</span> : <span class="string">'pending'</span>
    },
    <span class="comment">// ... 나머지 단계</span>
  ]

  <span class="comment">// 3. 레이아웃으로 감싸기</span>
  <span class="keyword">return</span> (
    &lt;StatisticsPageLayout
      title=<span class="string">"기술통계"</span>
      description=<span class="string">"데이터의 기본적인 통계량을 분석합니다"</span>
      steps={steps}
      currentStep={state.currentStep}
      onStepChange={actions.setCurrentStep}
      isAnalyzing={state.isAnalyzing}
    &gt;
      {state.currentStep === 0 && &lt;DataUploadStep /&gt;}
      {state.currentStep === 1 && &lt;VariableSelectionStep /&gt;}
      {state.currentStep === 2 && &lt;AnalysisStep /&gt;}
      {state.currentStep === 3 && &lt;ResultsStep /&gt;}
    &lt;/StatisticsPageLayout&gt;
  )
}
      </div>

      <h3>시각적 미리보기</h3>
      <div class="preview">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <!-- 헤더 -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem;">
            <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem;">기술통계</h2>
            <p style="opacity: 0.9;">데이터의 기본적인 통계량을 분석합니다</p>
          </div>

          <!-- StepIndicator -->
          <div style="padding: 2rem; border-bottom: 1px solid #e2e8f0;">
            <div style="display: flex; gap: 1rem; align-items: center;">
              <!-- Step 1 (Completed) -->
              <div style="flex: 1; text-align: center;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto; font-size: 0.9rem;">✓</div>
                <div style="margin-top: 0.5rem; font-size: 0.85rem; font-weight: 600; color: #10b981;">업로드</div>
              </div>

              <div style="flex: 1; height: 2px; background: #10b981; margin-bottom: 1.75rem;"></div>

              <!-- Step 2 (Current) -->
              <div style="flex: 1; text-align: center;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto; font-size: 0.9rem; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);">2</div>
                <div style="margin-top: 0.5rem; font-size: 0.85rem; font-weight: 600; color: #667eea;">변수 선택</div>
              </div>

              <div style="flex: 1; height: 2px; background: #e2e8f0; margin-bottom: 1.75rem;"></div>

              <!-- Step 3 (Pending) -->
              <div style="flex: 1; text-align: center;">
                <div style="width: 40px; height: 40px; background: #f7fafc; color: #a0aec0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto; font-size: 0.9rem; border: 2px solid #e2e8f0;">3</div>
                <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #a0aec0;">분석</div>
              </div>

              <div style="flex: 1; height: 2px; background: #e2e8f0; margin-bottom: 1.75rem;"></div>

              <!-- Step 4 (Pending) -->
              <div style="flex: 1; text-align: center;">
                <div style="width: 40px; height: 40px; background: #f7fafc; color: #a0aec0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; margin: 0 auto; font-size: 0.9rem; border: 2px solid #e2e8f0;">4</div>
                <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #a0aec0;">결과</div>
              </div>
            </div>
          </div>

          <!-- 컨텐츠 영역 -->
          <div style="padding: 2rem;">
            <div style="background: #f7fafc; padding: 3rem; border-radius: 8px; text-align: center; border: 2px dashed #cbd5e0;">
              <div style="font-size: 1.1rem; color: #4a5568; font-weight: 600; margin-bottom: 0.5rem;">현재 단계 컨텐츠</div>
              <div style="color: #718096;">단계별 컴포넌트가 여기에 렌더링됩니다</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🏗️ 레이아웃 구조</h2>

      <div class="code-block">
&lt;div className=<span class="string">"statistics-page-layout"</span>&gt;
  <span class="comment">{/* 헤더 */}</span>
  &lt;header className=<span class="string">"page-header"</span>&gt;
    &lt;h1&gt;{title}&lt;/h1&gt;
    &lt;p&gt;{description}&lt;/p&gt;
  &lt;/header&gt;

  <span class="comment">{/* StepIndicator */}</span>
  &lt;StepIndicator
    steps={steps}
    currentStep={currentStep}
    onStepClick={onStepChange}
    variant=<span class="string">"gray"</span>
  /&gt;

  <span class="comment">{/* 컨텐츠 영역 */}</span>
  &lt;main className=<span class="string">"page-content"</span>&gt;
    {children}
  &lt;/main&gt;

  <span class="comment">{/* 로딩 오버레이 (isAnalyzing=true일 때) */}</span>
  {isAnalyzing && (
    &lt;div className=<span class="string">"loading-overlay"</span>&gt;
      &lt;Spinner /&gt;
      &lt;p&gt;분석 중...&lt;/p&gt;
    &lt;/div&gt;
  )}
&lt;/div&gt;
      </div>
    </div>

    <div class="section">
      <h2>💡 특징</h2>

      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>일관된 UI</strong>: 41개 통계 페이지 동일한 레이아웃</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>StepIndicator 통합</strong>: 자동 단계 표시</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>로딩 오버레이</strong>: isAnalyzing 중 UI 차단</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>반응형</strong>: 모바일/태블릿/데스크탑 대응</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ <strong>에러 처리</strong>: 에러 상태 표시 지원</li>
        <li style="padding: 0.5rem 0;">✅ <strong>접근성</strong>: ARIA 라벨, 키보드 네비게이션</li>
      </ul>
    </div>

    <div class="section">
      <h2>📊 사용 통계</h2>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-top: 1.5rem;">
        <div style="background: #ebf8ff; padding: 1.5rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 2.5rem; font-weight: 700; color: #2c5282;">41</div>
          <div style="color: #2d5a7b; margin-top: 0.5rem;">통계 페이지</div>
          <div style="margin-top: 0.5rem;"><span class="badge info">100% 적용</span></div>
        </div>
        <div style="background: #f0fff4; padding: 1.5rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 2.5rem; font-weight: 700; color: #22543d;">0</div>
          <div style="color: #22543d; margin-top: 0.5rem;">TypeScript 에러</div>
          <div style="margin-top: 0.5rem;"><span class="badge success">Clean</span></div>
        </div>
      </div>
    </div>
  `;

  const html = createHTMLTemplate('StatisticsPageLayout', content);
  const filePath = path.join(OUTPUT_DIR, 'statistics-page-layout.html');
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`✅ 생성 완료: statistics-page-layout.html`);
}

/**
 * 5. VariableSelector 페이지
 */
function generateVariableSelectorPage() {
  const content = `
    <div class="section">
      <h2>🎯 VariableSelector 컴포넌트</h2>
      <p>3가지 UI 모드를 제공하는 변수 선택 컴포넌트입니다. 사용자 레벨과 디바이스에 따라 최적의 UX를 제공합니다.</p>

      <div class="info-box">
        <strong>파일 위치:</strong> components/variable-selection/
      </div>
    </div>

    <div class="section">
      <h2>🎨 3가지 UI 모드</h2>

      <table class="table">
        <thead>
          <tr>
            <th>모드</th>
            <th>설명</th>
            <th>대상</th>
            <th>특징</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge">Simple</span></td>
            <td>드롭다운 선택</td>
            <td>초보자, 모바일</td>
            <td>간단한 UI, 터치 친화</td>
          </tr>
          <tr>
            <td><span class="badge info">Advanced</span></td>
            <td>드래그 앤 드롭</td>
            <td>일반 사용자, 데스크탑</td>
            <td>시각적 피드백, 직관적</td>
          </tr>
          <tr>
            <td><span class="badge warning">Premium</span></td>
            <td>고급 UX + 미리보기</td>
            <td>전문가, 대형 화면</td>
            <td>변수 타입 표시, 미리보기</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>🎨 1. VariableSelectorSimple</h2>

      <h3>코드 예시</h3>
      <div class="code-block">
<span class="keyword">import</span> { VariableSelectorSimple } <span class="keyword">from</span> <span class="string">'@/components/variable-selection/VariableSelectorSimple'</span>

&lt;VariableSelectorSimple
  columns={uploadedData.columns}
  onVariablesSelected={(mapping) => {
    updateVariableMapping(mapping)
    nextStep()
  }}
  requiredVariables={[<span class="string">'dependent'</span>, <span class="string">'independent'</span>]}
  labels={{
    dependent: <span class="string">'종속 변수'</span>,
    independent: <span class="string">'독립 변수'</span>
  }}
/&gt;
      </div>

      <h3>시각적 미리보기</h3>
      <div class="preview">
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #2d3748;">종속 변수</label>
            <select style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 1rem; background: white; cursor: pointer;">
              <option>변수를 선택하세요</option>
              <option>수온 (Temperature)</option>
              <option>염분 (Salinity)</option>
              <option>DO (Dissolved Oxygen)</option>
            </select>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #2d3748;">독립 변수</label>
            <select style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 1rem; background: white; cursor: pointer;">
              <option>변수를 선택하세요</option>
              <option>깊이 (Depth)</option>
              <option>시간 (Time)</option>
              <option>위치 (Location)</option>
            </select>
          </div>

          <button style="width: 100%; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;">
            다음 단계
          </button>
        </div>
      </div>

      <h3>특징</h3>
      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 드롭다운 선택 UI</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 모바일 친화적</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 간단한 인터페이스</li>
        <li style="padding: 0.5rem 0;">✅ 초보자 추천</li>
      </ul>
    </div>

    <div class="section">
      <h2>🎨 2. VariableSelector (Advanced)</h2>

      <h3>코드 예시</h3>
      <div class="code-block">
<span class="keyword">import</span> { VariableSelector } <span class="keyword">from</span> <span class="string">'@/components/variable-selection/VariableSelector'</span>

&lt;VariableSelector
  columns={uploadedData.columns}
  onVariablesSelected={(mapping) => {
    updateVariableMapping(mapping)
    nextStep()
  }}
  requiredVariables={[<span class="string">'dependent'</span>, <span class="string">'independent'</span>]}
  labels={{
    dependent: <span class="string">'종속 변수'</span>,
    independent: <span class="string">'독립 변수'</span>
  }}
  maxSelections={{
    dependent: 1,
    independent: 5
  }}
/&gt;
      </div>

      <h3>시각적 미리보기</h3>
      <div class="preview">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <!-- 사용 가능한 변수 -->
          <div>
            <h4 style="margin-bottom: 1rem; color: #2d3748; font-weight: 600;">사용 가능한 변수</h4>
            <div style="border: 2px dashed #cbd5e0; border-radius: 8px; padding: 1rem; background: #f7fafc; min-height: 200px;">
              <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; cursor: move; border: 1px solid #e2e8f0; transition: all 0.2s;">
                수온 (Temperature)
              </div>
              <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; cursor: move; border: 1px solid #e2e8f0;">
                염분 (Salinity)
              </div>
              <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; cursor: move; border: 1px solid #e2e8f0;">
                DO (Dissolved Oxygen)
              </div>
              <div style="background: white; padding: 0.75rem; border-radius: 6px; cursor: move; border: 1px solid #e2e8f0;">
                pH
              </div>
            </div>
          </div>

          <!-- 선택된 변수 -->
          <div>
            <h4 style="margin-bottom: 1rem; color: #2d3748; font-weight: 600;">종속 변수</h4>
            <div style="border: 2px dashed #667eea; border-radius: 8px; padding: 1rem; background: #ebf8ff; min-height: 200px;">
              <div style="text-align: center; color: #4a5568; padding: 2rem;">
                변수를 드래그하세요
              </div>
            </div>
          </div>
        </div>
      </div>

      <h3>특징</h3>
      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 드래그 앤 드롭</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 시각적 피드백</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 다중 선택 지원</li>
        <li style="padding: 0.5rem 0;">✅ 직관적 UX</li>
      </ul>
    </div>

    <div class="section">
      <h2>🎨 3. VariableSelectorPremium</h2>

      <h3>코드 예시</h3>
      <div class="code-block">
<span class="keyword">import</span> { VariableSelectorPremium } <span class="keyword">from</span> <span class="string">'@/components/variable-selection/VariableSelectorPremium'</span>

&lt;VariableSelectorPremium
  columns={uploadedData.columns}
  data={uploadedData.data}  <span class="comment">// 데이터 미리보기용</span>
  onVariablesSelected={(mapping) => {
    updateVariableMapping(mapping)
    nextStep()
  }}
  requiredVariables={[<span class="string">'dependent'</span>, <span class="string">'independent'</span>]}
  showDataPreview={<span class="keyword">true</span>}
  showVariableStats={<span class="keyword">true</span>}
/&gt;
      </div>

      <h3>시각적 미리보기</h3>
      <div class="preview">
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
          <!-- 변수 선택 영역 -->
          <div>
            <h4 style="margin-bottom: 1rem; color: #2d3748; font-weight: 600;">변수 선택</h4>
            <div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 1rem; background: white;">
              <div style="background: linear-gradient(135deg, #f7fafc 0%, #ebf8ff 100%); padding: 1rem; border-radius: 6px; margin-bottom: 0.75rem; cursor: move; border: 1px solid #cbd5e0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>수온 (Temperature)</strong>
                    <div style="font-size: 0.85rem; color: #718096; margin-top: 0.25rem;">
                      <span class="badge info">숫자</span>
                      <span style="margin-left: 0.5rem;">평균: 25.3°C</span>
                    </div>
                  </div>
                  <div style="font-size: 1.5rem; color: #cbd5e0;">⋮⋮</div>
                </div>
              </div>

              <div style="background: linear-gradient(135deg, #f7fafc 0%, #ebf8ff 100%); padding: 1rem; border-radius: 6px; margin-bottom: 0.75rem; cursor: move; border: 1px solid #cbd5e0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>염분 (Salinity)</strong>
                    <div style="font-size: 0.85rem; color: #718096; margin-top: 0.25rem;">
                      <span class="badge info">숫자</span>
                      <span style="margin-left: 0.5rem;">평균: 33.5 ppt</span>
                    </div>
                  </div>
                  <div style="font-size: 1.5rem; color: #cbd5e0;">⋮⋮</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 데이터 미리보기 -->
          <div>
            <h4 style="margin-bottom: 1rem; color: #2d3748; font-weight: 600;">데이터 미리보기</h4>
            <div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 1rem; background: #f7fafc;">
              <table style="width: 100%; font-size: 0.85rem;">
                <thead>
                  <tr style="border-bottom: 1px solid #cbd5e0;">
                    <th style="padding: 0.5rem; text-align: left;">수온</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style="padding: 0.5rem;">25.3</td></tr>
                  <tr><td style="padding: 0.5rem;">24.8</td></tr>
                  <tr><td style="padding: 0.5rem;">26.1</td></tr>
                  <tr><td style="padding: 0.5rem; color: #a0aec0;">...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <h3>특징</h3>
      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 변수 타입 표시</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 통계량 미리보기</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 데이터 미리보기</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 고급 드래그앤드롭</li>
        <li style="padding: 0.5rem 0;">✅ 전문가 추천</li>
      </ul>
    </div>

    <div class="section">
      <h2>🔍 모드별 비교</h2>

      <table class="table">
        <thead>
          <tr>
            <th>특징</th>
            <th>Simple</th>
            <th>Advanced</th>
            <th>Premium</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>UI 복잡도</strong></td>
            <td>낮음</td>
            <td>중간</td>
            <td>높음</td>
          </tr>
          <tr>
            <td><strong>드래그앤드롭</strong></td>
            <td>❌</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
          <tr>
            <td><strong>변수 타입 표시</strong></td>
            <td>❌</td>
            <td>❌</td>
            <td>✅</td>
          </tr>
          <tr>
            <td><strong>통계량 미리보기</strong></td>
            <td>❌</td>
            <td>❌</td>
            <td>✅</td>
          </tr>
          <tr>
            <td><strong>데이터 미리보기</strong></td>
            <td>❌</td>
            <td>❌</td>
            <td>✅</td>
          </tr>
          <tr>
            <td><strong>모바일 지원</strong></td>
            <td>✅ 최적화</td>
            <td>🟡 제한적</td>
            <td>❌ 권장 안함</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const html = createHTMLTemplate('VariableSelector', content);
  const filePath = path.join(OUTPUT_DIR, 'variable-selector.html');
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`✅ 생성 완료: variable-selector.html`);
}

/**
 * 6. Smart Flow Steps 페이지
 */
function generateSmartFlowStepsPage() {
  const content = `
    <div class="section">
      <h2>🎯 Smart Flow Steps</h2>
      <p>스마트 통계 플로우의 6개 단계 컴포넌트입니다. AI 기반 통계 방법 추천과 자동화된 워크플로우를 제공합니다.</p>

      <div class="info-box">
        <strong>파일 위치:</strong> components/smart-flow/steps/
      </div>
    </div>

    <div class="section">
      <h2>📋 6단계 개요</h2>

      <table class="table">
        <thead>
          <tr>
            <th>단계</th>
            <th>컴포넌트</th>
            <th>주요 기능</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge">1</span></td>
            <td><strong>DataUploadStep</strong></td>
            <td>CSV/Excel 파일 업로드, 대용량 청크 처리</td>
          </tr>
          <tr>
            <td><span class="badge">2</span></td>
            <td><strong>DataValidationStep</strong></td>
            <td>정규성, 이분산성 검정 + 시각화</td>
          </tr>
          <tr>
            <td><span class="badge">3</span></td>
            <td><strong>PurposeInputStep</strong></td>
            <td>분석 목적 입력 → AI 통계 방법 추천</td>
          </tr>
          <tr>
            <td><span class="badge">4</span></td>
            <td><strong>VariableSelectionStep</strong></td>
            <td>3가지 UI 모드 (Simple/Advanced/Premium)</td>
          </tr>
          <tr>
            <td><span class="badge">5</span></td>
            <td><strong>AnalysisExecutionStep</strong></td>
            <td>분석 실행 + 진행 상황 표시</td>
          </tr>
          <tr>
            <td><span class="badge success">6</span></td>
            <td><strong>ResultsActionStep</strong></td>
            <td>결과 보기, 내보내기, 공유</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>🎨 1. DataUploadStep</h2>

      <h3>주요 기능</h3>
      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ CSV/Excel 파일 업로드</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 대용량 파일 청크 처리</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 드래그 앤 드롭 지원</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 파일 검증 (형식, 크기)</li>
        <li style="padding: 0.5rem 0;">✅ 업로드 진행률 표시</li>
      </ul>

      <div class="code-block">
<span class="keyword">import</span> { DataUploadStep } <span class="keyword">from</span> <span class="string">'@/components/smart-flow/steps/DataUploadStep'</span>

&lt;DataUploadStep
  onDataUploaded={(data) => {
    setUploadedData(data)
    nextStep()
  }}
  maxFileSize={100 * 1024 * 1024}  <span class="comment">// 100MB</span>
  acceptedFormats={[<span class="string">'.csv'</span>, <span class="string">'.xlsx'</span>, <span class="string">'.xls'</span>]}
/&gt;
      </div>
    </div>

    <div class="section">
      <h2>�� 2. DataValidationStep</h2>

      <h3>주요 기능</h3>
      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 정규성 검정 (Shapiro-Wilk)</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 이분산성 검정 (Levene)</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ Q-Q Plot 시각화</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 히스토그램 + 정규분포 곡선</li>
        <li style="padding: 0.5rem 0;">✅ 검정 결과 해석</li>
      </ul>

      <div class="code-block">
<span class="keyword">import</span> { DataValidationStepWithCharts } <span class="keyword">from</span> <span class="string">'@/components/smart-flow/steps/DataValidationStepWithCharts'</span>

&lt;DataValidationStepWithCharts
  data={uploadedData}
  onValidationComplete={(results) => {
    setValidationResults(results)
    nextStep()
  }}
  tests={[<span class="string">'normality'</span>, <span class="string">'homogeneity'</span>]}
/&gt;
      </div>
    </div>

    <div class="section">
      <h2>🎨 3. PurposeInputStep (AI 추천)</h2>

      <h3>주요 기능</h3>
      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 자연어 분석 목적 입력</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ AI 기반 통계 방법 추천</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 추천 이유 설명</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 대안 방법 제시</li>
        <li style="padding: 0.5rem 0;">✅ 추천 신뢰도 표시</li>
      </ul>

      <div class="code-block">
<span class="keyword">import</span> { PurposeInputStep } <span class="keyword">from</span> <span class="string">'@/components/smart-flow/steps/PurposeInputStep'</span>

&lt;PurposeInputStep
  data={uploadedData}
  validationResults={validationResults}
  onMethodSelected={(method) => {
    setSelectedMethod(method)
    nextStep()
  }}
/&gt;
      </div>

      <h3>AI 추천 예시</h3>
      <div class="preview">
        <div style="background: linear-gradient(135deg, #ebf8ff 0%, #f0fff4 100%); padding: 1.5rem; border-radius: 8px; border: 2px solid #10b981;">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🤖</div>
            <div>
              <div style="font-weight: 700; font-size: 1.1rem; color: #065f46;">AI 추천 결과</div>
              <div style="font-size: 0.9rem; color: #047857;">신뢰도: 95%</div>
            </div>
          </div>

          <div style="background: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem;">
            <div style="font-weight: 600; color: #2d3748; margin-bottom: 0.5rem;">추천 방법: <span style="color: #10b981;">독립표본 t-검정</span></div>
            <div style="color: #4a5568; font-size: 0.95rem; line-height: 1.6;">
              두 그룹 간 평균 비교를 목적으로 하고, 데이터가 정규성을 만족하므로 독립표본 t-검정이 적합합니다.
            </div>
          </div>

          <div style="font-weight: 600; color: #2d3748; margin-bottom: 0.75rem;">대안 방법:</div>
          <div style="display: flex; gap: 0.75rem;">
            <div style="background: white; padding: 1rem; border-radius: 6px; flex: 1; border: 1px solid #e2e8f0;">
              <div style="font-weight: 600; font-size: 0.9rem; color: #4a5568;">Mann-Whitney U</div>
              <div style="font-size: 0.8rem; color: #718096; margin-top: 0.25rem;">비모수 대안</div>
            </div>
            <div style="background: white; padding: 1rem; border-radius: 6px; flex: 1; border: 1px solid #e2e8f0;">
              <div style="font-weight: 600; font-size: 0.9rem; color: #4a5568;">Welch's t-test</div>
              <div style="font-size: 0.8rem; color: #718096; margin-top: 0.25rem;">이분산 허용</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🎨 4. VariableSelectionStep</h2>

      <h3>주요 기능</h3>
      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 3가지 UI 모드 전환</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ AI 추천 기반 변수 자동 매핑</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 변수 타입 자동 감지</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 필수/선택 변수 표시</li>
        <li style="padding: 0.5rem 0;">✅ 검증 및 에러 메시지</li>
      </ul>

      <div class="code-block">
<span class="keyword">import</span> { VariableSelectionStep } <span class="keyword">from</span> <span class="string">'@/components/smart-flow/steps/VariableSelectionStep'</span>

&lt;VariableSelectionStep
  data={uploadedData}
  selectedMethod={selectedMethod}
  mode={<span class="string">'advanced'</span>}  <span class="comment">// 'simple' | 'advanced' | 'premium'</span>
  onVariablesSelected={(mapping) => {
    setVariableMapping(mapping)
    nextStep()
  }}
/&gt;
      </div>
    </div>

    <div class="section">
      <h2>🎨 5. AnalysisExecutionStep</h2>

      <h3>주요 기능</h3>
      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 분석 실행 버튼</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 진행 상황 표시 (Progress Bar)</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 단계별 로그 출력</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 에러 처리 및 재시도</li>
        <li style="padding: 0.5rem 0;">✅ 완료 시 자동 다음 단계</li>
      </ul>

      <div class="preview">
        <div style="max-width: 600px; margin: 0 auto; text-align: center;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2rem; border-radius: 12px; color: white; margin-bottom: 1.5rem;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">⚡</div>
            <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">분석 실행 중...</div>
            <div style="opacity: 0.9;">독립표본 t-검정을 수행하고 있습니다</div>
          </div>

          <!-- Progress Bar -->
          <div style="background: #f7fafc; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="font-weight: 600; color: #2d3748;">진행률</span>
              <span style="font-weight: 600; color: #667eea;">65%</span>
            </div>
            <div style="background: #e2e8f0; height: 12px; border-radius: 6px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); width: 65%; height: 100%; transition: width 0.3s;"></div>
            </div>
          </div>

          <!-- 로그 -->
          <div style="background: #2d3748; color: #e2e8f0; padding: 1.5rem; border-radius: 8px; text-align: left; font-family: monospace; font-size: 0.85rem;">
            <div style="color: #10b981; margin-bottom: 0.5rem;">✓ 데이터 로드 완료</div>
            <div style="color: #10b981; margin-bottom: 0.5rem;">✓ 변수 검증 완료</div>
            <div style="color: #667eea; margin-bottom: 0.5rem;">▶ t-검정 실행 중...</div>
            <div style="color: #a0aec0;">⏳ 결과 생성 대기...</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🎨 6. ResultsActionStep</h2>

      <h3>주요 기능</h3>
      <ul style="list-style: none; padding-left: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 분석 결과 시각화 (표, 차트)</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 통계량 해석</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ PDF/Excel 내보내기</li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">✅ 결과 공유 (링크 복사)</li>
        <li style="padding: 0.5rem 0;">✅ 새 분석 시작</li>
      </ul>

      <div class="preview">
        <div style="background: linear-gradient(135deg, #f0fff4 0%, #ebf8ff 100%); padding: 2rem; border-radius: 12px;">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
            <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem;">✓</div>
            <div>
              <div style="font-size: 1.5rem; font-weight: 700; color: #065f46;">분석 완료!</div>
              <div style="color: #047857;">독립표본 t-검정 결과</div>
            </div>
          </div>

          <div style="background: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <table style="width: 100%; font-size: 0.95rem;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 0.75rem; font-weight: 600; color: #2d3748;">t 통계량</td>
                <td style="padding: 0.75rem; text-align: right;">-2.345</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 0.75rem; font-weight: 600; color: #2d3748;">p-value</td>
                <td style="padding: 0.75rem; text-align: right; color: #10b981; font-weight: 700;">0.023</td>
              </tr>
              <tr>
                <td style="padding: 0.75rem; font-weight: 600; color: #2d3748;">결론</td>
                <td style="padding: 0.75rem; text-align: right; color: #10b981;">통계적으로 유의함 ✓</td>
              </tr>
            </table>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
            <button style="padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
              PDF 내보내기
            </button>
            <button style="padding: 1rem; background: white; color: #667eea; border: 2px solid #667eea; border-radius: 8px; font-weight: 600; cursor: pointer;">
              Excel 내보내기
            </button>
            <button style="padding: 1rem; background: white; color: #667eea; border: 2px solid #667eea; border-radius: 8px; font-weight: 600; cursor: pointer;">
              공유하기
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🔄 플로우 요약</h2>

      <div style="background: linear-gradient(135deg, #f7fafc 0%, #ebf8ff 100%); padding: 2rem; border-radius: 12px;">
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">1</div>
            <div style="flex: 1; background: white; padding: 1rem; border-radius: 8px;">
              <strong>데이터 업로드</strong> → CSV/Excel 파일
            </div>
          </div>

          <div style="width: 2px; height: 24px; background: #cbd5e0; margin-left: 19px;"></div>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">2</div>
            <div style="flex: 1; background: white; padding: 1rem; border-radius: 8px;">
              <strong>데이터 검증</strong> → 정규성/이분산성 검정
            </div>
          </div>

          <div style="width: 2px; height: 24px; background: #cbd5e0; margin-left: 19px;"></div>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">3</div>
            <div style="flex: 1; background: white; padding: 1rem; border-radius: 8px;">
              <strong>목적 입력</strong> → AI 통계 방법 추천
            </div>
          </div>

          <div style="width: 2px; height: 24px; background: #cbd5e0; margin-left: 19px;"></div>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">4</div>
            <div style="flex: 1; background: white; padding: 1rem; border-radius: 8px;">
              <strong>변수 선택</strong> → 드래그앤드롭 or 드롭다운
            </div>
          </div>

          <div style="width: 2px; height: 24px; background: #cbd5e0; margin-left: 19px;"></div>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">5</div>
            <div style="flex: 1; background: white; padding: 1rem; border-radius: 8px;">
              <strong>분석 실행</strong> → 진행률 표시
            </div>
          </div>

          <div style="width: 2px; height: 24px; background: #cbd5e0; margin-left: 19px;"></div>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">6</div>
            <div style="flex: 1; background: white; padding: 1rem; border-radius: 8px;">
              <strong>결과 확인</strong> → 내보내기, 공유
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const html = createHTMLTemplate('Smart Flow Steps', content);
  const filePath = path.join(OUTPUT_DIR, 'smart-flow-steps.html');
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`✅ 생성 완료: smart-flow-steps.html`);
}

/**
 * 메인 실행
 */
function main() {
  console.log('\n🚀 통계 플랫폼 컴포넌트 HTML 시각화 생성 시작...\n');

  generateIndexPage();
  generateStepIndicatorPage();
  generateProgressStepperPage();
  generateStatisticsPageLayoutPage();
  generateVariableSelectorPage();
  generateSmartFlowStepsPage();

  console.log('\n✅ 모든 HTML 파일 생성 완료!');
  console.log(`\n📂 출력 위치: ${OUTPUT_DIR}`);
  console.log('\n📋 생성된 파일:');
  console.log('  - index.html (메인 인덱스)');
  console.log('  - step-indicator.html');
  console.log('  - progress-stepper.html');
  console.log('  - statistics-page-layout.html');
  console.log('  - variable-selector.html');
  console.log('  - smart-flow-steps.html');
  console.log('\n💡 브라우저로 index.html을 열어 확인하세요!\n');
}

main();