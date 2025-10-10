import React, { Suspense } from 'react';
import DashboardModule from '../modules/dashboard/DashboardModule';
import PageLayout from '../components/layout/PageLayout';

export const DashboardPage: React.FC = () => {
  return (
    <PageLayout 
      title="Command Dashboard"
      breadcrumbs={[
        { id: 'dashboard', label: 'Dashboard', path: '/dashboard' }
      ]}
    >
      <Suspense fallback={
        <div className="h-full flex items-center justify-center text-cyan-300 font-mono text-sm">
          Loading Dashboard...
        </div>
      }>
        <DashboardModule />
      </Suspense>
    </PageLayout>
  );
};

export default DashboardPage;