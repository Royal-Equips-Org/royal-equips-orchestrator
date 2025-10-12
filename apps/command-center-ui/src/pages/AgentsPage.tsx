import React, { Suspense } from 'react';
import AgentsModule from '../modules/agents/AgentsModule';
import PageLayout from '../components/layout/PageLayout';

export const AgentsPage: React.FC = () => {
  return (
    <PageLayout 
      title="Agent Management"
      breadcrumbs={[{ id: 'agents', label: 'Agents', path: '/agents' }]}
    >
      <Suspense fallback={<div className="h-full flex items-center justify-center text-cyan-300 font-mono text-sm">Loading Agents...</div>}>
        <AgentsModule />
      </Suspense>
    </PageLayout>
  );
};
export default AgentsPage;
