"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/landing/Header';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import PricingSection from '@/components/landing/PricingSection';
import FaqSection from '@/components/landing/FaqSection';
import Footer from '@/components/landing/Footer';
import AOSInitializer from '@/components/landing/AOSInitializer';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/common/Loading';

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) {
    return <Loading />;
  }

  return (
    <div className="bg-white text-gray-800">
      <AOSInitializer />
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
