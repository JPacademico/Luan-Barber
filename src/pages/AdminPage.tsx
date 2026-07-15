import React from 'react';
import { AdminGate } from '../components/admin/AdminGate';
import { AdminDashboard } from '../components/admin/AdminDashboard';

export const AdminPage: React.FC = () => {
  return (
    <AdminGate>
      <AdminDashboard />
    </AdminGate>
  );
};
