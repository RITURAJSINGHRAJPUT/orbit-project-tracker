import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { APPLE_SPLASH_SCREENS, splashFileName, splashMedia } from '@/lib/pwa/splash-screens';

// Self-hosted at build time under /_next/static/media, so the font is
// same-origin (cacheable by the service worker, and it survives offline in the
// installed app). Inter is a variable font, so no `weight` list is needed.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Orbit – Personal Project Tracker',
  description:
    'A mobile-first personal project management app for developers, AI engineers, and founders.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Orbit',
    // iOS only shows a launch image when a link matches the device exactly, so
    // one entry per known screen. Next emits these as
    // <link rel="apple-touch-startup-image" media="...">.
    startupImage: APPLE_SPLASH_SCREENS.map((screen) => ({
      url: `/splash/${splashFileName(screen)}`,
      media: splashMedia(screen),
    })),
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    title: 'Orbit – Project Tracker',
    description: 'Track all your software projects in one place.',
    siteName: 'Orbit',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  // Matches manifest background_color so the status bar and the launch splash
  // don't clash with the app surface. ThemeProvider keeps this meta in sync
  // with the in-app theme at runtime.
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Required for env(safe-area-inset-*) to report real values in a standalone
  // shell — without it every inset resolves to 0px and the notch/home-indicator
  // handling across the app is inert.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `inter.variable` (not `.className`) — the latter sets font-family on
    // <html>, which the `body` rule in globals.css would override.
    // data-scroll-behavior tells the App Router that the `scroll-behavior:
    // smooth` in globals.css is intentional, so it can suppress smooth
    // scrolling during route transitions (where it reads as lag) while keeping
    // it for in-page anchors like /settings#toggle-notifications.
    <html
      lang="en"
      className={inter.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme before hydration, so children can render
            server-side without a dark→light flash. */}
        <Script id="orbit-theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('orbit-theme');if(t){document.documentElement.classList.add(t)}}catch(e){}`}
        </Script>
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-inter), sans-serif',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
