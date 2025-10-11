import React, { Suspense } from 'react';
import MarketingModule from '../modules/marketing/MarketingModule';
import PageLayout from '../components/layout/PageLayout';

export const MarketingPage: React.FC = () => {
  return (
    <PageLayout 
      title="Marketing Automation"
      breadcrumbs={[{ id: 'marketing', label: 'Marketing', path: '/marketing' }]}
    >
      <Suspense fallback={<div className="h-full flex items-center justify-center text-cyan-300 font-mono text-sm">Loading Marketing...</div>}>
        <MarketingModule />
      </Suspense>
    </PageLayout>
  );
};
export default MarketingPage;
