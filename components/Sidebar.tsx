import React from 'react';
import { BookOpen, Calendar, LayoutDashboard, BrainCircuit } from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, setIsOpen }) => {
  const navItems = [
    { view: AppView.DASHBOARD, label: 'Beranda', icon: LayoutDashboard },
    { view: AppView.PLANNER, label: 'Rencana Belajar', icon: Calendar },
    { view: AppView.STUDY_SESSION, label: 'Mulai Belajar', icon: BookOpen },
    { view: AppView.QUIZ_MODE, label: 'Pusat Latihan', icon: BrainCircuit },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Content */}
      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-64 border-r border-line bg-void/50 backdrop-blur-xl lg:bg-transparent transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col h-full`}>
        <div className="p-8 pb-4">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(92,101,230,0.5)]">
               S
             </div>
             <h1 className="text-xl font-bold tracking-tight text-white">
              StudyFlow
            </h1>
          </div>
          <p className="text-xs text-txt-dim mt-2 pl-1 uppercase tracking-widest font-semibold">Workspace</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => {
                onChangeView(item.view);
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${
                currentView === item.view 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(92,101,230,0.1)]' 
                  : 'text-txt-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={18} className={`transition-colors ${currentView === item.view ? 'text-primary' : 'text-txt-dim group-hover:text-txt-muted'}`} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-line">
          <div className="bg-gradient-to-br from-surfaceLight to-surface border border-line rounded-xl p-4 text-xs">
            <p className="font-semibold text-white mb-1">Status Pro</p>
            <p className="text-txt-muted leading-relaxed">Persiapan LPDP Anda sedang berlangsung. Terus semangat!</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;