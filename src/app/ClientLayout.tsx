'use client';

import React, { useEffect } from 'react';
import { SupabaseProvider } from '@/contexts/SupabaseProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { PWAProvider } from '@/components/PWAProvider';
import { QueryProvider } from '@/contexts/QueryProvider';
import { StartupProvider } from './providers';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import PWABanner from '@/components/PWABanner';
import { registerServiceWorker } from '@/lib/utils/offline';
// import { UpdateNotification } from '@/components/ui/update-notification'; // Removido - atualização automática
import dynamic from 'next/dynamic';

// Dynamically import the MobileMenu component with no SSR
const MobileMenu = dynamic(() => import('@/components/layout/MobileMenu'), { 
  ssr: false 
});

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Registrar o service worker para funcionalidades PWA
    registerServiceWorker();
  }, []);

  return (
    <QueryProvider>
      <SupabaseProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <NotificationProvider>
              <PWAProvider>
                <StartupProvider>
                  {children}
                  
                  {/* Mobile Menu - Only visible on mobile devices */}
                  <MobileMenu />
                  
                  {/* PWA Components */}
                   <PWABanner />
                   <PWAInstallPrompt />
                   
                   {/* Update Notification - Removido: atualização automática silenciosa */}
                </StartupProvider>
              </PWAProvider>
            </NotificationProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </SupabaseProvider>
    </QueryProvider>
  );
}