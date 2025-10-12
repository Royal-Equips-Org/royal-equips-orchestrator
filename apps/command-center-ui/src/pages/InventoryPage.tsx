import React, { Suspense } from 'react';
import InventoryModule from '../modules/inventory/InventoryModule';
import PageLayout from '../components/layout/PageLayout';

export const InventoryPage: React.FC = () => {
  return (
    <PageLayout 
      title="Inventory Management"
      breadcrumbs={[{ id: 'inventory', label: 'Inventory', path: '/inventory' }]}
    >
      <Suspense fallback={<div className="h-full flex items-center justify-center text-cyan-300 font-mono text-sm">Loading Inventory...</div>}>
        <InventoryModule />
      </Suspense>
    </PageLayout>
  );
};
export default InventoryPage;
