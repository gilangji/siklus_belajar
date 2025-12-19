import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Planner from './components/Planner';
import StudySessionView from './components/StudySessionView';
import ReviewCenter from './components/ReviewCenter';
import Auth from './components/Auth';
import { AppView, StudyModule, StudySession, UserProgress } from './types';
import { Menu, Loader2 } from 'lucide-react';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // App Data
  const [modules, setModules] = useState<StudyModule[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sessionTopicIntent, setSessionTopicIntent] = useState<string>('');

  // 1. Check Auth Session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
           console.warn("Session check error:", error.message);
        } else {
           setSession(data.session);
        }
      } catch (err) {
        console.warn("Failed to check session (likely missing Supabase config):", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Reset guest mode if user logs in via auth flow
      if (session) setIsGuest(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Data from Supabase when Logged In
  useEffect(() => {
    if (session?.user && !isGuest) {
      fetchUserData();
    } else if (isGuest) {
      // If guest, ensure local state is clean or load from local storage if implemented later
      // For now, Guest starts fresh on reload as per standard secure behavior
    }
  }, [session, isGuest]);

  const fetchUserData = async () => {
    if (!session?.user) return;

    try {
      // Fetch Modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .order('week', { ascending: true });
      
      if (modulesData) setModules(modulesData);
      if (modulesError) console.error('Error fetching modules:', modulesError);

      // Fetch Sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: true });

      if (sessionsData) setSessions(sessionsData);
      if (sessionsError) console.error('Error fetching sessions:', sessionsError);

    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  const progress: UserProgress = {
    totalSessions: sessions.length,
    topicsLearned: new Set(sessions.map(s => s.topic)).size,
    averageQuizScore: sessions.length > 0 
      ? sessions.reduce((acc, s) => acc + (s.quizScore || 0), 0) / sessions.length 
      : 0
  };

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
    setLoading(false);
  };

  // --- SUPABASE SYNC FUNCTIONS ---

  const handleSaveSession = async (newSession: StudySession) => {
    // 1. Update Local State (Optimistic UI)
    setSessions(prev => [...prev, newSession]);

    // 2. Sync to Database if Logged In
    if (session?.user && !isGuest) {
      try {
        const { error } = await supabase.from('sessions').insert({
          ...newSession,
          user_id: session.user.id
        });
        
        if (error) {
          console.error("Failed to save session to DB:", error.message);
          alert("Gagal menyimpan ke database cloud. Pastikan koneksi internet stabil.");
        }
      } catch (err) {
         console.error("Exception saving session:", err);
      }
    } else if (isGuest) {
      // Optional: Inform guest user that data is volatile
      // alert("Sesi disimpan sementara. Buat akun agar data tidak hilang saat refresh.");
    }
  };

  const handleUpdateModules = async (updatedModules: StudyModule[]) => {
    setModules(updatedModules);

    if (session?.user && !isGuest) {
      const payload = updatedModules.map(m => ({
        id: m.id,
        user_id: session.user.id,
        week: m.week,
        title: m.title,
        description: m.description,
        topics: m.topics,
        completed: m.completed
      }));

      const { error } = await supabase.from('modules').upsert(payload);
      if (error) console.error("Failed to sync modules:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center text-primary">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  // Show Auth if no session AND not in Guest mode
  if (!session && !isGuest) {
    return <Auth onGuestLogin={() => setIsGuest(true)} />;
  }

  return (
    <div className="flex h-screen overflow-hidden text-txt-main">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        session={session}
        isGuest={isGuest}
        onLogout={handleLogout}
        userSessions={sessions}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Mobile Header */}
        <header className="lg:hidden bg-surface/80 backdrop-blur-md border-b border-line p-4 flex items-center justify-between sticky top-0 z-50">
          <h1 className="font-bold text-txt-main">StudyFlow</h1>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-txt-muted hover:text-white transition-colors">
            <Menu />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
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
              />
            )}
            
            {currentView === AppView.STUDY_SESSION && (
              <StudySessionView 
                initialTopic={sessionTopicIntent} 
                onSaveSession={handleSaveSession} 
              />
            )}

            {currentView === AppView.QUIZ_MODE && (
              <ReviewCenter 
                initialTopic={sessionTopicIntent}
                sessions={sessions}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;