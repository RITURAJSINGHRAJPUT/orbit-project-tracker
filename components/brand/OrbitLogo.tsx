'use client';

import { useId } from 'react';

interface OrbitLogoProps {
  className?: string;
  /**
   * Colour the node dots are filled with so the orbit lines read as passing
   * behind them. Should match whatever surface the mark sits on.
   */
  surface?: string;
  title?: string;
}

/**
 * Orbit brand mark — a sphere of crossing orbital rings with satellite nodes,
 * drawn in the blue→cyan brand gradient. Pure SVG so it stays crisp at any size
 * and inherits theme colours for the node fills.
 */
export function OrbitLogo({ className, surface = 'var(--card)', title }: OrbitLogoProps) {
  // useId keeps the gradient unique when the mark renders more than once.
  const gradientId = `orbit-mark-${useId().replace(/:/g, '')}`;

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="8" y1="40" x2="40" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="0.55" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>

      {/* Orbit cage */}
      <g stroke={`url(#${gradientId})`} strokeWidth="1.7" strokeLinecap="round">
        <circle cx="24" cy="24" r="14" />
        <ellipse cx="24" cy="24" rx="7" ry="14" transform="rotate(-24 24 24)" />
        <ellipse cx="24" cy="24" rx="7" ry="14" transform="rotate(24 24 24)" />
        <ellipse cx="24" cy="24" rx="14" ry="7.5" transform="rotate(-32 24 24)" />
      </g>

      {/* Satellite nodes — filled with the surface colour to cut the lines */}
      <g stroke={`url(#${gradientId})`} strokeWidth="1.6" fill={surface}>
        <circle cx="37.5" cy="11.5" r="2.9" />
        <circle cx="10.5" cy="36.5" r="2.9" />
        <circle cx="32.2" cy="19.4" r="2.2" />
        <circle cx="15.8" cy="28.6" r="2.2" />
        <circle cx="30.6" cy="28.9" r="2.2" />
      </g>
    </svg>
  );
}
