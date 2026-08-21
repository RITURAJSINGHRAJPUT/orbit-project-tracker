'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { OrbitLogo } from '@/components/brand/OrbitLogo';
import { Avatar } from '@/components/brand/Avatar';
import { useProfile } from '@/lib/profile';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
}

/**
 * Floating header card shared by every page: brand mark, page title, then
 * notifications and profile on the trailing edge.
 */
export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const profile = useProfile();

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-3 py-2"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <OrbitLogo className="h-9 w-9 flex-shrink-0" title="Orbit" />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs leading-tight" style={{ color: 'var(--muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* 44px tap targets with compact visuals, per touch-target guidance */}
      <Link
        href="/settings#toggle-notifications"
        aria-label="Notifications"
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors"
        style={{ color: 'var(--muted)' }}
      >
        <Bell size={19} />
      </Link>

      <Link
        href="/settings"
        aria-label={`Profile — ${profile.name}`}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center"
      >
        <Avatar size={36} />
      </Link>
    </div>
  );
}
