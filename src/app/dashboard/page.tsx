import { Metadata } from 'next';
import DashboardApp from '../../components/dashboard/DashboardApp';

export const metadata: Metadata = {
  title: 'Dashboard | MedJourney',
  description: 'Dashboard de estudos da MedJourney',
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 pt-6 pb-16">
      <DashboardApp />
    </main>
  );
} 