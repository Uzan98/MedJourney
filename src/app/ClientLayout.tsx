'use client';

import React from 'react';
import { SupabaseProvider } from '@/contexts/SupabaseProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { PWAProvider } from '@/components/PWAProvider';
import { StartupProvider } from './providers';
import dynamic from 'next/dynamic';

// Dynamically import the MobileMenu component with no SSR
const MobileMenu = dynamic(() => import('@/components/layout/MobileMenu'), { 
  ssr: false 
});

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <PWAProvider>
            <StartupProvider>
              {children}
              
              {/* Mobile Menu - Only visible on mobile devices */}
              <MobileMenu />
            </StartupProvider>
          </PWAProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
} 