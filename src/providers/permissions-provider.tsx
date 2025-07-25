'use client';
import { useSession } from 'next-auth/react';
import { PermissionsProvider } from '@/context/PermissionsContext';

export default function PermissionsProviderWrapper({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  if (!userId) return <>{children}</>;
  return <PermissionsProvider userId={userId}>{children}</PermissionsProvider>;
} 