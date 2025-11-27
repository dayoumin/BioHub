import { readFileSync, writeFileSync } from 'fs';

const filePath = 'app/(dashboard)/design-system/page.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Add Cpu icon to imports
content = content.replace(
  "Copy, Check, Menu, X, Palette, Type, SquareStack,",
  "Copy, Check, Menu, X, Palette, Type, SquareStack, Cpu,"
);

// 2. Add dynamic import for TechStackSection after other dynamic imports
const techStackImport = `
// Tech Stack Section
const TechStackSection = dynamic(
  () => import('./sections/TechStackSection').then(mod => ({ default: mod.TechStackSection })),
  { ssr: false, loading: LoadingSpinner }
)
`;

content = content.replace(
  "// Layout Prototype 섹션 (항상 사용 가능)",
  `// Tech Stack 섹션
${techStackImport}
// Layout Prototype 섹션 (항상 사용 가능)`
);

// 3. Add to NAV_SECTIONS at the beginning
content = content.replace(
  "const NAV_SECTIONS = [\n  { id: 'colors', label: 'Colors', icon: Palette },",
  "const NAV_SECTIONS = [\n  { id: 'tech-stack', label: 'Tech Stack', icon: Cpu },\n  { id: 'colors', label: 'Colors', icon: Palette },"
);

// 4. Add section rendering before colors section
const techStackSection = `{/* ========================================
              0. Tech Stack
          ======================================== */}
          {activeSection === 'tech-stack' && (
            <TechStackSection />
          )}

          `;

content = content.replace(
  "{/* ========================================\n              1. 색상 시스템",
  techStackSection + "{/* ========================================\n              1. 색상 시스템"
);

writeFileSync(filePath, content, 'utf8');
console.log('Tech Stack section added successfully!');