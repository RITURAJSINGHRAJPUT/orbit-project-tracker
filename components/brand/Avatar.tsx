'use client';

import { useState } from 'react';
import { PROFILE, profileInitials } from '@/lib/profile';

interface AvatarProps {
  /** Rendered size in CSS pixels. */
  size?: number;
  className?: string;
}

/**
 * Profile photo, falling back to initials on a brand gradient if the image is
 * missing or fails to load — so the circle is never empty.
 *
 * Uses a plain <img> rather than next/image on purpose: next/image routes
 * through /_next/image, which the service worker deliberately does not
 * intercept, so the avatar would break offline. A static file under public/ is
 * covered by the worker's cache-first rule. The source is pre-sized to 192px by
 * scripts/generate-icons.mjs, so there's nothing for the optimizer to do.
 */
export function Avatar({ size = 36, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const shared = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
  } as const;

  if (failed) {
    return (
      <span
        className={className}
        aria-hidden="true"
        style={{
          ...shared,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
          color: 'white',
          fontSize: Math.round(size * 0.36),
          fontWeight: 600,
        }}
      >
        {profileInitials()}
      </span>
    );
  }

  return (
    // next/image routes through /_next/image, which the service worker
    // intentionally skips — the avatar would fail offline. The file is already
    // pre-sized to 192px, so there is nothing for the optimizer to do.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/avatar-192.jpg"
      alt={PROFILE.name}
      width={size}
      height={size}
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      style={{ ...shared, objectFit: 'cover' }}
    />
  );
}
