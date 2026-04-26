import type { ReactNode } from 'react';
import { SosSerialCprProvider } from '@/lib/cpr/SosSerialCprContext';

export default function SosLayout({ children }: { children: ReactNode }) {
  return <SosSerialCprProvider>{children}</SosSerialCprProvider>;
}
