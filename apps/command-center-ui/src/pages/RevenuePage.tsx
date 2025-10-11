import React, { Suspense } from 'react';
import RevenueModule from '../modules/revenue/RevenueModule';
import PageLayout from '../components/layout/PageLayout';

export const RevenuePage: React.FC = () => {
  return (
    <PageLayout 
      title="Revenue Analytics"
      breadcrumbs={[{ id: 'revenue', label: 'Revenue', path: '/revenue' }]}
    >
      <Suspense fallback={<div className="h-full flex items-center justify-center text-cyan-300 font-mono text-sm">Loading Revenue...</div>}>
        <RevenueModule />
      </Suspense>
    </PageLayout>
  );
};
export default RevenuePage;
