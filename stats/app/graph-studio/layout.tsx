import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Graph Studio | BioHub',
  description: '학술 논문용 데이터 시각화 도구',
};

interface GraphStudioLayoutProps {
  children: React.ReactNode;
}

export default function GraphStudioLayout({ children }: GraphStudioLayoutProps): React.ReactElement {
  return (
    <div className="flex flex-col h-full min-h-0">
      {children}
    </div>
  );
}
