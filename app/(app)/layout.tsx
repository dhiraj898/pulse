'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTaskStore } from '@/lib/store';
import { Nav } from '@/components/nav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const setUser = useTaskStore(s => s.setUser);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        setUser(data.user ?? null);
      } catch {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router, setUser]);

  return (
    <>
      <Nav />
      {children}
    </>
  );
}
