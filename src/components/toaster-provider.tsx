
'use client';

import { Toaster } from '@/components/ui/toaster';

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
