'use client';

import { ReactNode } from 'react';
import StaffLayout from '@/components/StaffLayout';

export default function StaffSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <StaffLayout>{children}</StaffLayout>;
}
