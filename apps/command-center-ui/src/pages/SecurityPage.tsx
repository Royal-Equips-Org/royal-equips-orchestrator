import React, { Suspense } from 'react';
import SecurityModule from '../modules/security/SecurityModule';
import PageLayout from '../components/layout/PageLayout';

export const SecurityPage: React.FC = () => {
  return (
    <PageLayout 
      title="Security Center"
      breadcrumbs={[{ id: 'security', label: 'Security', path: '/security' }]}
    >
      <Suspense fallback={<div className="h-full flex items-center justify-center text-cyan-300 font-mono text-sm">Loading Security...</div>}>
        <SecurityModule />
      </Suspense>
    </PageLayout>
  );
};
export default SecurityPage;
