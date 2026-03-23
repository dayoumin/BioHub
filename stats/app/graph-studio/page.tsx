'use client';

import dynamic from 'next/dynamic';

/** static export prerender 우회 — ssr: false로 클라이언트에서만 렌더링 */
const GraphStudioContent = dynamic(() => import('./GraphStudioContent'), { ssr: false });

export default function GraphStudioPage(): React.ReactElement {
  return <GraphStudioContent />;
}
