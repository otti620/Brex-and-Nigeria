import React from 'react';
import { Screen } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  hideNav?: boolean;
  isAdmin?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeScreen, onNavigate, hideNav = false, isAdmin = false }) => {
  const navItems = [
    { 
      id: Screen.Dashboard, 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-[#8CEE47]' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ), 
      label: 'Home' 
    },
    { 
      id: Screen.Market, 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-[#8CEE47]' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
        </svg>
      ), 
      label: 'Market' 
    },
    { 
      id: Screen.Portfolio, 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-[#8CEE47]' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ), 
      label: 'Team' 
    },
    { 
      id: Screen.Fund, 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-[#8CEE47]' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ), 
      label: 'Fund' 
    },
    { 
      id: Screen.Profile, 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-[#8CEE47]' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ), 
      label: 'My' 
    },
  ];

  if (isAdmin) {
    navItems.push({
      id: Screen.Admin,
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-amber-400' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: 'Admin'
    });
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden bg-[#0C1017] shadow-2xl border-x border-[#1E293B]/20 gpu text-white">
      
      {/* SEC Educational Banner */}
      <div className="bg-red-500 text-white text-[9px] font-bold text-center px-2 py-1.5 z-50 relative flex items-center justify-center gap-2">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="uppercase tracking-widest bg-red-700/50 px-1 py-0.5 rounded leading-none">SEC Educational Tool</span>
        <span className="truncate flex-1 text-left opacity-90 leading-tight block hidden sm:block">This is a simulated High-Yield Investment Program (HYIP) environment for consumer education purposes only.</span>
      </div>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-24 safe-pb bg-[#0C1017]">
        {children}
      </main>

      {!hideNav && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-[#131926] border-t border-[#1E293B]/60 pb-safe">
          <nav className="flex items-center justify-around py-2 px-3">
            {navItems.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex flex-col items-center justify-center py-1 px-3 w-16 transition-transform duration-100 active:scale-95 outline-none"
                >
                  <div className="mb-0.5">
                    {item.icon(isActive)}
                  </div>
                  <span className={`text-[10px] font-bold tracking-tight transition-colors duration-200 ${isActive ? 'text-[#8CEE47]' : 'text-[#64748B]'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
};

export default Layout;
