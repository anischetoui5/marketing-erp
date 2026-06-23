'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePortalAuthStore } from '@/store/auth.store';

export default function PortalDashboardPage() {
  const router = useRouter();
  const user = usePortalAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) router.replace('/portal/login');
    else router.replace('/portal/dashboard/projects');
  }, [user, router]);

  return null;
}
