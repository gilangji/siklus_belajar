import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Planner from './components/Planner';
import StudySessionView from './components/StudySessionView';
import ReviewCenter from './components/ReviewCenter';
import { AppView, StudyModule, StudySession, UserProgress } from './types';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // App Data
  const [modules, setModules] = useState<StudyModule[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sessionTopicIntent, setSessionTopicIntent] = useState<string>('');

  // Load from local storage on mount
  useEffect(() => {
    const savedModules = localStorage.getItem('lpdp_modules');
    const savedSessions = localStorage.getItem('lpdp_sessions');
    if (savedModules) setModules(JSON.parse(savedModules));
    if (savedSessions) setSessions(JSON.parse(savedSessions));
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('lpdp_modules', JSON.stringify(modules));
  }, [modules]);

  useEffect(() => {
    localStorage.setItem('lpdp_sessions', JSON.stringify(sessions));
  }, [sessions]);

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

  const handleSaveSession = (newSession: StudySession) => {
    setSessions([...sessions, newSession]);
  };

  return (
    <div className="flex h-screen overflow-hidden text-txt-main">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
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
          <div className="max-w-7xl mx-auto">
            {currentView === AppView.DASHBOARD && (
              <Dashboard 
                sessions={sessions} 
                progress={progress} 
                onChangeView={setCurrentView}
              />
            )}
            
            {currentView === AppView.PLANNER && (
              <Planner 
                modules={modules} 
                setModules={setModules} 
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