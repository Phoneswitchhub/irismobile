'use client';

import React from 'react';

interface MobileLayoutProps {
  children: React.ReactNode;
  paddingBottom?: string;
  paddingTop?: string;
}

export default function MobileLayout({ children, paddingBottom, paddingTop }: MobileLayoutProps) {
  return (
    <div 
      className="app-shell" 
      style={{ 
        paddingBottom: paddingBottom ?? '74px',
        paddingTop: paddingTop ?? '68px',
      }}
    >
      {children}
    </div>
  );
}
