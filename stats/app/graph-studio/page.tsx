'use client';

import dynamic from 'next/dynamic';

/** useSearchParams() 사용 컴포넌트를 dynamic import — static export prerender 우회 */
const GraphStudioPageInner = dynamic(() => import('./GraphStudioContent'), { ssr: false });

export default function GraphStudioPage(): React.ReactElement {
  return <GraphStudioPageInner />;
}
