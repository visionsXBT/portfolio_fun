'use client';

interface ClientBodyProps {
  children: React.ReactNode;
  className: string;
}

export default function ClientBody({ children, className }: ClientBodyProps) {
  return (
    <body
      className={className}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </body>
  );
}
