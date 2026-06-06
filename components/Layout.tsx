import React from 'react';
import { Screen } from '../types';
import { useFirebase } from './FirebaseProvider';

interface LayoutProps {
  children: React.ReactNode;
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  hideNav?: boolean;
  isAdmin?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeScreen, onNavigate, hideNav = false, isAdmin = false }) => {
  const { isImpersonating, stopImpersonating, userData } = useFirebase();
  const navItems = [
    { 
      id: Screen.Dashboard, 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-indigo-600' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ), 
      label: 'Home' 
    },
    { 
      id: Screen.Market, 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-indigo-600' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
        </svg>
      ), 
      label: 'Market' 
    },
    { 
      id: Screen.Funds, 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-indigo-600' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ), 
      label: 'Funds' 
    },
    { 
      id: Screen.Portfolio, 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-indigo-600' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ), 
      label: 'Team' 
    },
    { 
      id: Screen.Fund, 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-indigo-600' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ), 
      label: 'Fund' 
    },
    { 
      id: Screen.Profile, 
      icon: (active: boolean) => (
        <svg className={`w-6 h-6 transition-colors duration-200 ${active ? 'text-indigo-600' : 'text-[#64748B]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto relative overflow-hidden bg-[#f8f8f8] shadow-2xl border-x border-gray-200 gpu text-[#1a1a1a]">
      
      {/* Live Masquerade View Warning Banner */}
      {isImpersonating && (
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white font-mono text-[11px] font-black py-2.5 px-4 flex items-center justify-between shadow-md border-b border-rose-800 shrink-0 select-none animate-pulse">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[8px] tracking-widest shrink-0">LIVE VIEW</span>
            <span className="truncate uppercase font-black">{userData?.name || 'User'}</span>
          </div>
          <button 
            onClick={() => {
              if (stopImpersonating) stopImpersonating();
              onNavigate(Screen.Admin);
            }}
            className="bg-white text-rose-700 hover:text-rose-800 px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-wider font-extrabold cursor-pointer shadow-sm transition-all"
          >
            Exit ✕
          </button>
        </div>
      )}

      {/* SEC Educational Banner hidden from user view as requested */}
      
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-24 safe-pb bg-[#f8f8f8]">
        {children}
      </main>

      {!hideNav && (
        <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto z-50 bg-white border-x border-t border-gray-200 pb-safe shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.05)]">
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
                  <span className={`text-[10px] font-bold tracking-tight transition-colors duration-200 ${isActive ? 'text-indigo-600' : 'text-[#64748B]'}`}>
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
