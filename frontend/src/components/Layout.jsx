import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { label: 'Tender Dashboard', path: '/officer', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Create Tender', path: '/officer/tenders/new', icon: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { label: 'Bidder Workspace', path: '/bidder/dashboard', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-navy-800 text-white flex flex-col shadow-xl z-10 sticky top-0 h-screen">
        <div className="p-6 border-b border-navy-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gold-600 flex items-center justify-center font-bold text-navy-900">
              G
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">GeM Portal</h1>
              <p className="text-xs text-gold-500 font-mono">COMPLIANCE ENGINE</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname.startsWith('/officer') && item.path === '/officer' && location.pathname !== '/officer/tenders/new');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-navy-900 text-white shadow-md' : 'text-neutral-400 hover:bg-navy-900/50 hover:text-white'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-navy-900/50">
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-500">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            System Online
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-50">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-neutral-200 px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900">
            {navItems.find(i => location.pathname === i.path || (location.pathname.startsWith('/officer') && i.path === '/officer' && location.pathname !== '/officer/tenders/new'))?.label || 'Procurement Console'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-neutral-500">Authorized Officer</span>
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-navy-900 font-bold">
              AO
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
