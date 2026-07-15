import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { PublicToaster } from '../ui/BrandToaster';

export const PublicLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicToaster />
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
