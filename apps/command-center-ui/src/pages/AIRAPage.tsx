import React, { Suspense } from 'react';
import AiraModule from '../modules/aira/AiraModule';
import PageLayout from '../components/layout/PageLayout';

export const AIRAPage: React.FC = () => {
  return (
    <PageLayout 
      title="AIRA Intelligence Core"
      breadcrumbs={[
        { id: 'aira', label: 'AIRA Core', path: '/aira' }
      ]}
    >
      <Suspense fallback={
        <div className="h-full flex items-center justify-center text-cyan-300 font-mono text-sm">
          Initializing AIRA Core...
        </div>
      }>
        <AiraModule />
      </Suspense>
    </PageLayout>
  );
};

export default AIRAPage;