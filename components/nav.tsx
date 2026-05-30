'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useTaskStore } from '@/lib/store';

const LINKS: { href: Route; label: string }[] = [
  { href: '/dashboard' as Route, label: 'Dashboard' },
  { href: '/calendar' as Route, label: 'Calendar' },
  { href: '/inbox' as Route, label: 'Inbox' },
  { href: '/views' as Route, label: 'Views' },
  { href: '/profile' as Route, label: 'Profile' },
];

export function Nav() {
  const pathname = usePathname();
  const user = useTaskStore(s => s.user);

  return (
    <nav className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-900 mr-4">Pulse</span>
          {LINKS.map(l => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/');
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <span className="text-sm text-gray-600">{user?.name || user?.email || ''}</span>
      </div>
    </nav>
  );
}
