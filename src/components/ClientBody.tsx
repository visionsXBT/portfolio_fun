'use client';

import { useScrollbarFade } from '@/hooks/useScrollbarFade';

interface ClientBodyProps {
  children: React.ReactNode;
  className: string;
}

export default function ClientBody({ children, className }: ClientBodyProps) {
  useScrollbarFade(); // Apply scrollbar fade effect globally

  return (
    <body
      className={className}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </body>
  );
}
