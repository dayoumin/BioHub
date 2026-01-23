// Fix EffectSizeGuidelines default value and guidelines keys
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'components/statistics/common/EffectSizeCard.tsx';
let content = readFileSync(filePath, 'utf8');

// 1. Fix default value from 'cohen_d' to 'cohens_d'
const oldDefault = `export function EffectSizeGuidelines({ type = 'cohen_d', className }: EffectSizeGuidelinesProps) {`;
const newDefault = `export function EffectSizeGuidelines({ type = 'cohens_d', className }: EffectSizeGuidelinesProps) {`;

if (content.includes(oldDefault)) {
  content = content.replace(oldDefault, newDefault);
  console.log('✅ Fixed default value to cohens_d');
} else {
  console.log('❌ Could not find default value');
}

// 2. Add cohens_d key to guidelines (alias for cohen_d)
const oldGuidelines = `  const guidelines = {
    cohen_d: [
      { label: '무시할 만함', range: '< 0.2', color: 'bg-gray-100' },
      { label: '작음', range: '0.2 - 0.5', color: 'bg-yellow-100' },
      { label: '중간', range: '0.5 - 0.8', color: 'bg-orange-100' },
      { label: '큼', range: '> 0.8', color: 'bg-red-100' }
    ],
    eta_squared: [
      { label: '작음', range: '< 0.01', color: 'bg-gray-100' },
      { label: '중간', range: '0.01 - 0.06', color: 'bg-yellow-100' },
      { label: '큼', range: '> 0.14', color: 'bg-orange-100' }
    ],
    r: [
      { label: '약함', range: '< 0.3', color: 'bg-gray-100' },
      { label: '중간', range: '0.3 - 0.5', color: 'bg-yellow-100' },
      { label: '강함', range: '> 0.5', color: 'bg-orange-100' }
    ]
  }`;

const cohenDGuideline = [
  { label: '무시할 만함', range: '< 0.2', color: 'bg-gray-100' },
  { label: '작음', range: '0.2 - 0.5', color: 'bg-yellow-100' },
  { label: '중간', range: '0.5 - 0.8', color: 'bg-orange-100' },
  { label: '큼', range: '> 0.8', color: 'bg-red-100' }
];

const newGuidelines = `  const guidelines = {
    cohens_d: [
      { label: '무시할 만함', range: '< 0.2', color: 'bg-gray-100' },
      { label: '작음', range: '0.2 - 0.5', color: 'bg-yellow-100' },
      { label: '중간', range: '0.5 - 0.8', color: 'bg-orange-100' },
      { label: '큼', range: '> 0.8', color: 'bg-red-100' }
    ],
    cohen_d: [
      { label: '무시할 만함', range: '< 0.2', color: 'bg-gray-100' },
      { label: '작음', range: '0.2 - 0.5', color: 'bg-yellow-100' },
      { label: '중간', range: '0.5 - 0.8', color: 'bg-orange-100' },
      { label: '큼', range: '> 0.8', color: 'bg-red-100' }
    ],
    hedges_g: [
      { label: '무시할 만함', range: '< 0.2', color: 'bg-gray-100' },
      { label: '작음', range: '0.2 - 0.5', color: 'bg-yellow-100' },
      { label: '중간', range: '0.5 - 0.8', color: 'bg-orange-100' },
      { label: '큼', range: '> 0.8', color: 'bg-red-100' }
    ],
    glass_delta: [
      { label: '무시할 만함', range: '< 0.2', color: 'bg-gray-100' },
      { label: '작음', range: '0.2 - 0.5', color: 'bg-yellow-100' },
      { label: '중간', range: '0.5 - 0.8', color: 'bg-orange-100' },
      { label: '큼', range: '> 0.8', color: 'bg-red-100' }
    ],
    eta_squared: [
      { label: '작음', range: '< 0.01', color: 'bg-gray-100' },
      { label: '중간', range: '0.01 - 0.06', color: 'bg-yellow-100' },
      { label: '큼', range: '> 0.14', color: 'bg-orange-100' }
    ],
    partial_eta_squared: [
      { label: '작음', range: '< 0.01', color: 'bg-gray-100' },
      { label: '중간', range: '0.01 - 0.06', color: 'bg-yellow-100' },
      { label: '큼', range: '> 0.14', color: 'bg-orange-100' }
    ],
    omega_squared: [
      { label: '작음', range: '< 0.01', color: 'bg-gray-100' },
      { label: '중간', range: '0.01 - 0.06', color: 'bg-yellow-100' },
      { label: '큼', range: '> 0.14', color: 'bg-orange-100' }
    ],
    epsilon_squared: [
      { label: '작음', range: '< 0.01', color: 'bg-gray-100' },
      { label: '중간', range: '0.01 - 0.06', color: 'bg-yellow-100' },
      { label: '큼', range: '> 0.14', color: 'bg-orange-100' }
    ],
    r: [
      { label: '약함', range: '< 0.3', color: 'bg-gray-100' },
      { label: '중간', range: '0.3 - 0.5', color: 'bg-yellow-100' },
      { label: '강함', range: '> 0.5', color: 'bg-orange-100' }
    ],
    r_squared: [
      { label: '작음', range: '< 0.09', color: 'bg-gray-100' },
      { label: '중간', range: '0.09 - 0.25', color: 'bg-yellow-100' },
      { label: '큼', range: '> 0.25', color: 'bg-orange-100' }
    ],
    phi: [
      { label: '약함', range: '< 0.3', color: 'bg-gray-100' },
      { label: '중간', range: '0.3 - 0.5', color: 'bg-yellow-100' },
      { label: '강함', range: '> 0.5', color: 'bg-orange-100' }
    ],
    cramers_v: [
      { label: '약함', range: '< 0.3', color: 'bg-gray-100' },
      { label: '중간', range: '0.3 - 0.5', color: 'bg-yellow-100' },
      { label: '강함', range: '> 0.5', color: 'bg-orange-100' }
    ],
    w: [
      { label: '약한 일치', range: '< 0.3', color: 'bg-gray-100' },
      { label: '보통 일치', range: '0.3 - 0.5', color: 'bg-yellow-100' },
      { label: '강한 일치', range: '0.5 - 0.7', color: 'bg-orange-100' },
      { label: '매우 강한 일치', range: '> 0.7', color: 'bg-red-100' }
    ]
  }`;

if (content.includes(oldGuidelines)) {
  content = content.replace(oldGuidelines, newGuidelines);
  console.log('✅ Added all effect size types to guidelines');
} else {
  console.log('❌ Could not find guidelines block');
}

// 3. Fix fallback to use cohens_d
const oldFallback = `const currentGuidelines = guidelines[type as keyof typeof guidelines] || guidelines.cohen_d`;
const newFallback = `const currentGuidelines = guidelines[type as keyof typeof guidelines] || guidelines.cohens_d`;

if (content.includes(oldFallback)) {
  content = content.replace(oldFallback, newFallback);
  console.log('✅ Fixed fallback to cohens_d');
} else {
  console.log('❌ Could not find fallback');
}

writeFileSync(filePath, content, 'utf8');
console.log('✅ EffectSizeGuidelines updated successfully');
