'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderKanban, BarChart3, Clock, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  // 'startsWith' matching, so this must not prefix-collide with another route.
  { href: '/extra-hours', label: 'Extra Hrs', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="orbit-glass fixed bottom-0 left-0 right-0 z-50"
      style={{
        // Extra height + padding keeps the items clear of the iOS home indicator.
        height: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {/* max-w matches the content column in AppShell so nav items line up with it.
          Horizontal insets keep the outer items clear of the rounded corners in
          landscape on notched devices. */}
      <div
        className="flex items-center justify-around h-full px-2 max-w-2xl mx-auto"
        style={{
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
        }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              id={`nav-${label.toLowerCase()}`}
              className="flex flex-col items-center gap-1 flex-1 py-2 relative transition-colors"
              style={{ color: isActive ? 'var(--primary)' : 'var(--muted)' }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: 'var(--primary)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              </motion.div>
              <span
                className="text-xs font-medium"
                style={{ fontWeight: isActive ? 600 : 400 }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
