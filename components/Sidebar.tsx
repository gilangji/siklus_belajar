import React, { useState } from 'react';
import { BookOpen, Calendar, LayoutDashboard, BrainCircuit, LogOut, User, History, X, Clock, ChevronRight, Home } from 'lucide-react';
import { AppView, StudySession } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  session: any;
  isGuest: boolean;
  onLogout: () => void;
  userSessions: StudySession[]; // Received to show history in menu
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onChangeView, 
  isOpen, 
  setIsOpen, 
  session, 
  isGuest, 
  onLogout,
  userSessions 
}) => {
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const navItems = [
    { view: AppView.DASHBOARD, label: 'Beranda', icon: LayoutDashboard },
    { view: AppView.PLANNER, label: 'Rencana Belajar', icon: Calendar },
    { view: AppView.STUDY_SESSION, label: 'Mulai Belajar', icon: BookOpen },
    { view: AppView.QUIZ_MODE, label: 'Pusat Latihan', icon: BrainCircuit },
    { view: AppView.CHARACTER, label: 'Ruang Saya', icon: Home }, // New Menu
  ];

  // Determine Display Name
  const displayName = isGuest 
    ? "Pengguna Tamu" 
    : (session?.user?.user_metadata?.username || "Pengguna");

  const emailDisplay = isGuest 
    ? "Mode Demo (Tidak Disimpan)" 
    : "Akun Terdaftar";

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Content */}
      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-72 border-r border-line bg-void/95 backdrop-blur-xl lg:bg-transparent transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col h-full shadow-2xl lg:shadow-none`}>
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-1">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primaryHover flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(92,101,230,0.5)] border border-white/10">
               S
             </div>
             <div>
               <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                StudyFlow
              </h1>
              <span className="text-[10px] text-primary font-medium tracking-widest uppercase">Mastery System</span>
             </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => {
                onChangeView(item.view);
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                currentView === item.view 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(92,101,230,0.1)] font-semibold' 
                  : 'text-txt-muted hover:text-white hover:bg-white/5 font-medium'
              }`}
            >
              <item.icon size={20} className={`transition-colors ${currentView === item.view ? 'text-primary' : 'text-txt-dim group-hover:text-white'}`} />
              <span className="text-sm">{item.label}</span>
              
              {/* Special indicator for Character Room */}
              {item.view === AppView.CHARACTER && (
                 <span className="ml-auto flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
              )}
            </button>
          ))}
        </nav>

        {/* User Profile & Menu Section */}
        <div className="p-4 border-t border-line bg-surface/30">
          <div className="bg-surfaceLight border border-line rounded-xl p-4 transition-all hover:border-primary/30 group relative">
            
            {/* User Info Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center text-txt-muted group-hover:text-white group-hover:border-primary transition-colors">
                <User size={20} />
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-white text-sm truncate">{displayName}</p>
                <p className={`text-xs truncate ${isGuest ? 'text-orange-400' : 'text-green-400'}`}>{emailDisplay}</p>
              </div>
            </div>

            {/* Menu Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setShowHistoryModal(true)}
                className="flex flex-col items-center justify-center gap-1 bg-surface border border-line hover:bg-white/5 hover:border-white/20 rounded-lg p-2 text-xs text-txt-muted hover:text-white transition-all"
              >
                <History size={16} />
                <span>Riwayat</span>
              </button>
              <button 
                onClick={onLogout}
                className="flex flex-col items-center justify-center gap-1 bg-surface border border-line hover:bg-red-500/10 hover:border-red-500/30 rounded-lg p-2 text-xs text-txt-muted hover:text-red-400 transition-all"
              >
                <LogOut size={16} />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- HISTORY MODAL (IN-MENU) --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-line flex justify-between items-center bg-surfaceLight/30">
              <h3 className="font-bold text-white flex items-center gap-2">
                <History size={18} className="text-primary" /> Riwayat Belajar
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-txt-dim hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-2 flex-1 space-y-2">
              {userSessions.length === 0 ? (
                <div className="p-8 text-center text-txt-dim">
                  <p>Belum ada riwayat sesi.</p>
                </div>
              ) : (
                [...userSessions].reverse().map((s) => (
                  <div key={s.id} className="p-3 rounded-xl bg-surfaceLight/20 border border-line hover:border-primary/30 transition-all flex justify-between items-center group">
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-white truncate">{s.topic}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-txt-dim bg-surface px-1.5 py-0.5 rounded border border-line">
                           {new Date(s.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}
                        </span>
                        <span className="text-[10px] text-txt-dim flex items-center gap-1">
                          <Clock size={10} /> {s.durationMinutes}m
                          {s.breakMinutes && s.breakMinutes > 0 && (
                            <span className="text-green-400">+ {s.breakMinutes}m Rest</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className={`text-sm font-bold px-2 py-1 rounded ${
                      (s.quizScore || 0) >= 70 ? 'text-green-400 bg-green-900/10' : 'text-orange-400 bg-orange-900/10'
                    }`}>
                      {s.quizScore || 0}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;