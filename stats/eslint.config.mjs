import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // 테스트 / E2E / 스크립트 (빌드 비대상)
      "__tests__/**",
      "e2e/**",
      "scripts/**",
      "test-data/**",
      "public/**",
      // 레거시 / 폴리필
      "lib/statistics/**",
      "lib/polyfills/**",
      // dev/demo 전용 페이지
      "app/(dashboard)/design-system/**",
      "app/rag-test/**",
      // 타입 선언 파일 (jest-dom 등)
      "types/jest-dom.d.ts",
      // 원본 백업 컴포넌트
      "components/feedback/FeedbackPanelOriginal.tsx",
    ],
  },
  {
    rules: {
      // any 타입 — warning으로 (Pyodide·Plotly 등 동적 인터페이스에서 불가피)
      "@typescript-eslint/no-explicit-any": "warn",

      // 미사용 변수도 warning으로 (개발 중)
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],

      // React hooks 의존성 warning으로
      "react-hooks/exhaustive-deps": "warn",

      // 빈 인터페이스 허용
      "@typescript-eslint/no-empty-interface": "off",

      // 빈 함수 허용
      "@typescript-eslint/no-empty-function": "off",

      // console 사용 허용 (개발 중)
      "no-console": "off",

      // React display name 끄기
      "react/display-name": "off",

      // JSX 텍스트의 따옴표 이스케이프 — 스타일 이슈, 비활성화
      "react/no-unescaped-entities": "off",

      // React에서 React import 필수 아님 (React 17+)
      "react/react-in-jsx-scope": "off",

      // 🚨 Critical: actions.setResults() 사용 금지 (isAnalyzing 버그 예방)
      // 참고: stats/docs/TROUBLESHOOTING_ISANALYZING_BUG.md
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.object.name='actions'][callee.property.name='setResults']",
          "message": "❌ Use actions.completeAnalysis() instead of actions.setResults() to properly reset isAnalyzing flag. See: docs/TROUBLESHOOTING_ISANALYZING_BUG.md"
        }
      ],
    }
  }
];

export default eslintConfig;
