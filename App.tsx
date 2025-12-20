import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Planner from './components/Planner';
import StudySessionView from './components/StudySessionView';
import ReviewCenter from './components/ReviewCenter';
import CharacterRoom, { BASE_ROOM_ITEMS, generateRandomItem } from './components/CharacterRoom'; 
import Auth from './components/Auth';
import { AppView, StudyModule, StudySession, UserProgress, RoomItem } from './types';
import { Menu, Loader2, Timer, Maximize2 } from 'lucide-react';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  // Theme State (Default to Dark)
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // App Data
  const [modules, setModules] = useState<StudyModule[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sessionTopicIntent, setSessionTopicIntent] = useState<string>('');
  
  // Gamification State
  const [unlockedItems, setUnlockedItems] = useState<string[]>(['rug', 'desk']);
  const [generatedItems, setGeneratedItems] = useState<RoomItem[]>([]);

  // Active Session State
  const [activeSessionState, setActiveSessionState] = useState<{
    isActive: boolean;
    topic: string;
    elapsedSeconds: number;
    isBreak: boolean;
  } | null>(null);

  // Theme Toggle Effect
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auth & Data Fetching
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn("Session check error:", error.message);
        else setSession(data.session);
      } catch (err) {
        console.warn("Failed to check session:", err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setIsGuest(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user && !isGuest) {
      fetchUserData();
    }
  }, [session, isGuest]);

  const fetchUserData = async () => {
    if (!session?.user) return;
    try {
      const { data: modulesData } = await supabase.from('modules').select('*').order('week', { ascending: true });
      if (modulesData) setModules(modulesData);

      const { data: sessionsData } = await supabase.from('sessions').select('*').order('date', { ascending: true });
      if (sessionsData) setSessions(sessionsData);
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  const progress: UserProgress = {
    totalSessions: sessions.length,
    topicsLearned: new Set(sessions.map(s => s.topic)).size,
    averageQuizScore: sessions.length > 0 
      ? sessions.reduce((acc, s) => acc + (s.quizScore || 0), 0) / sessions.length 
      : 0,
    unlockedItems: unlockedItems
  };

  const completedTopics = new Set(sessions.map(s => s.topic.trim().toLowerCase()));

  const handleStartStudy = (topic: string) => {
    setSessionTopicIntent(topic);
    setCurrentView(AppView.STUDY_SESSION);
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setIsGuest(false);
    setModules([]);
    setSessions([]);
    setCurrentView(AppView.DASHBOARD);
    setActiveSessionState(null);
    setUnlockedItems(['rug', 'desk']);
    setGeneratedItems([]);
    setLoading(false);
  };

  const handleSaveSession = async (newSession: StudySession) => {
    setSessions(prev => {
      const exists = prev.find(s => s.id === newSession.id);
      if (exists) return prev.map(s => s.id === newSession.id ? newSession : s);
      return [...prev, newSession];
    });
    if (session?.user && !isGuest) {
      try {
        await supabase.from('sessions').upsert({ ...newSession, user_id: session.user.id });
      } catch (err) {
         console.error("Exception saving session:", err);
      }
    }
  };

  const handleUnlockReward = () => {
    const allKnownItems = [...BASE_ROOM_ITEMS, ...generatedItems];
    const lockedItems = allKnownItems.filter(item => !unlockedItems.includes(item.id));
    let reward: RoomItem;

    if (lockedItems.length > 0) {
       const randomIndex = Math.floor(Math.random() * lockedItems.length);
       reward = lockedItems[randomIndex];
    } else {
       reward = generateRandomItem();
       setGeneratedItems(prev => [...prev, reward]);
    }
    setUnlockedItems(prev => [...prev, reward.id]);
    return { id: reward.id, name: reward.name };
  };

  const handleUpdateModules = async (updatedModules: StudyModule[], shouldReplace: boolean = false) => {
    setModules(updatedModules);
    if (session?.user && !isGuest) {
      if (shouldReplace) {
         try { await supabase.from('modules').delete().eq('user_id', session.user.id); } catch (e) {}
      }
      const payload = updatedModules.map(m => ({
        id: m.id,
        user_id: session.user.id,
        week: m.week,
        title: m.title,
        description: m.description,
        topics: m.topics,
        completed: m.completed
      }));
      await supabase.from('modules').upsert(payload);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(Math.abs(totalSeconds) / 60);
    const seconds = Math.abs(totalSeconds) % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center text-primary">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (!session && !isGuest) {
    return <Auth onGuestLogin={() => setIsGuest(true)} />;
  }

  return (
    <div className="flex h-screen overflow-hidden text-txt-main bg-void transition-colors duration-500">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        session={session}
        isGuest={isGuest}
        onLogout={handleLogout}
        userSessions={sessions}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <header className="lg:hidden bg-surface/80 backdrop-blur-md border-b border-line p-4 flex items-center justify-between sticky top-0 z-50">
          <h1 className="font-bold text-txt-main">StudyFlow</h1>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-txt-muted hover:text-white transition-colors">
            <Menu />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative">
          {isGuest && (
            <div className="max-w-7xl mx-auto mb-6 bg-orange-500/10 border border-orange-500/20 text-orange-400 p-3 rounded-lg text-sm flex items-center justify-center gap-2">
              <span>⚠️ Mode Tamu: Data <strong>tidak akan disimpan</strong> permanen.</span>
              <button onClick={handleLogout} className="underline hover:text-orange-300">Buat Akun</button>
            </div>
          )}
          
          <div className="max-w-7xl mx-auto">
            {currentView === AppView.DASHBOARD && (
              <Dashboard 
                sessions={sessions} 
                progress={progress} 
                onChangeView={setCurrentView}
                onStartStudy={handleStartStudy}
              />
            )}
            
            {currentView === AppView.PLANNER && (
              <Planner 
                modules={modules} 
                setModules={handleUpdateModules} 
                onStartStudy={handleStartStudy}
                completedTopics={completedTopics} 
              />
            )}

            {currentView === AppView.CHARACTER && (
              <CharacterRoom 
                unlockedItems={unlockedItems} 
                customItems={generatedItems} 
                isDarkMode={isDarkMode}
              />
            )}
            
            <div style={{ display: currentView === AppView.STUDY_SESSION ? 'block' : 'none' }}>
              <StudySessionView 
                initialTopic={sessionTopicIntent} 
                onSaveSession={handleSaveSession}
                onSessionUpdate={(state) => setActiveSessionState(state)}
                onUnlockReward={handleUnlockReward}
              />
            </div>

            {currentView === AppView.QUIZ_MODE && (
              <ReviewCenter 
                initialTopic={sessionTopicIntent}
                sessions={sessions}
              />
            )}
          </div>
        </main>

        {/* FLOATING TIMER WIDGET */}
        {currentView !== AppView.STUDY_SESSION && activeSessionState && activeSessionState.isActive && (
          <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
            <div className={`backdrop-blur-md border p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm w-full ${activeSessionState.topic.includes('Paused') ? 'bg-yellow-900/40 border-yellow-500/30' : 'bg-surface/90 border-primary/30'}`}>
              <div className={`p-3 rounded-full ${activeSessionState.topic.includes('Paused') ? 'bg-yellow-500/20 text-yellow-500' : activeSessionState.isBreak ? 'bg-orange-500/20 text-orange-500' : 'bg-primary/20 text-primary'} ${!activeSessionState.topic.includes('Paused') && 'animate-pulse'}`}>
                 <Timer size={24} />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-[10px] uppercase font-bold tracking-wider text-txt-dim mb-0.5">
                   {activeSessionState.topic.includes('Paused') ? 'Jeda' : activeSessionState.isBreak ? 'Sedang Istirahat' : 'Sesi Aktif'}
                 </p>
                 <p className="text-sm font-bold text-txt-main truncate">{activeSessionState.topic.replace(' (Paused)', '')}</p>
                 <p className="text-xl font-mono font-bold text-txt-main mt-1">
                   {formatTime(activeSessionState.elapsedSeconds)}
                 </p>
              </div>
              <button 
                onClick={() => setCurrentView(AppView.STUDY_SESSION)}
                className="p-3 bg-white text-black rounded-xl hover:bg-gray-200 transition-colors shadow-lg"
                title="Kembali ke Sesi"
              >
                <Maximize2 size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
