import React, { Suspense } from 'react';
import FinanceModule from '../modules/finance/FinanceModule';
import PageLayout from '../components/layout/PageLayout';

export const FinancePage: React.FC = () => {
  return (
    <PageLayout 
      title="Financial Intelligence"
      breadcrumbs={[{ id: 'finance', label: 'Finance', path: '/finance' }]}
    >
      <Suspense fallback={<div className="h-full flex items-center justify-center text-cyan-300 font-mono text-sm">Loading Finance...</div>}>
        <FinanceModule />
      </Suspense>
    </PageLayout>
  );
};
export default FinancePage;
