import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from '../components/ui/toast-interface';
import { StartupProvider } from './providers';
import { AuthProvider } from '@/contexts/AuthContext';
import { PWAProvider } from '@/components/PWAProvider';
import dynamic from 'next/dynamic';
import { ToastProvider } from '@/components/ui/toast-interface';

// Dynamically import the MobileMenu component with no SSR
const MobileMenu = dynamic(() => import('@/components/layout/MobileMenu'), { 
  ssr: false 
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: "MedJourney - Sua jornada de estudos médicos",
  description: "Uma plataforma inteligente para estudantes de medicina",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <meta name="application-name" content="MedJourney" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <meta name="apple-mobile-web-app-title" content="MedJourney" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#3b82f6" />

        {/* PWA Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/apple-icon-167x167.png" />

        {/* Splash Screens */}
        <link
          rel="apple-touch-startup-image"
          href="/icons/apple-splash-2048-2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/apple-splash-1668-2388.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/apple-splash-1536-2048.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/apple-splash-1125-2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/apple-splash-1242-2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/apple-splash-750-1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/apple-splash-640-1136.png"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />

        {/* Script para registrar o service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-gradient-to-br from-blue-100 to-indigo-100 min-h-screen pb-16 md:pb-0">
        <AuthProvider>
          <PWAProvider>
            <StartupProvider>
              <ToastProvider>
                {children}
                
                {/* Mobile Menu - Only visible on mobile devices */}
                <MobileMenu />
              </ToastProvider>
            </StartupProvider>
          </PWAProvider>
        </AuthProvider>
        {/* Componente de Toast para notificações */}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
