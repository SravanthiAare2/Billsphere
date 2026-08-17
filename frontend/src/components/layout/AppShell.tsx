import React from 'react';

type Props = {
  children: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="page-container py-6">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </div>
    </div>
  );
}
