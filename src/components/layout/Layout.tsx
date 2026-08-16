import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Toast } from '../ui/Toast';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-bg text-text">
      <Sidebar />
      <TopBar />
      
      <main className="lg:ml-[240px] p-4 lg:p-6 pb-24 lg:pb-6 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav could go here */}

      <Toast />
    </div>
  );
};
