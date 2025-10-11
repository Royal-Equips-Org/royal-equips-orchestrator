import React, { Suspense } from 'react';
import AnalyticsModule from '../modules/analytics/AnalyticsModule';
import PageLayout from '../components/layout/PageLayout';

export const AnalyticsPage: React.FC = () => {
  return (
    <PageLayout 
      title="Analytics Dashboard"
      breadcrumbs={[
        { id: 'analytics', label: 'Analytics', path: '/analytics' }
      ]}
    >
      <Suspense fallback={<div className="h-full flex items-center justify-center text-cyan-300 font-mono text-sm">Loading Analytics...</div>}>
        <AnalyticsModule />
      </Suspense>
    </PageLayout>
  );
};

export default AnalyticsPage;
