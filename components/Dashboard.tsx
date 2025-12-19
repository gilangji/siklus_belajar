import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { UserProgress, StudySession, AppView } from '../types';
import { Trophy, Clock, Target, Book, TrendingUp, PieChart, Compass, Map, Zap, BrainCircuit, ArrowRight, Lightbulb, ChevronRight } from 'lucide-react';

interface DashboardProps {
  sessions: StudySession[];
  progress: UserProgress;
  onChangeView: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ sessions, progress, onChangeView }) => {
  const [activeGuide, setActiveGuide] = useState<string | null>(null);

  // 1. Prepare Data for Bar Chart: Total Study Time per Topic
  const getTopicStudyDistribution = () => {
    const topicMap: Record<string, number> = {};
    
    sessions.forEach(session => {
      const topicName = session.topic.length > 15 
        ? session.topic.substring(0, 15) + '...' 
        : session.topic;
        
      topicMap[topicName] = (topicMap[topicName] || 0) + session.durationMinutes;
    });

    return Object.entries(topicMap)
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 6);
  };

  // 2. Prepare Data for Line Chart: Score Trend Over Time
  const getScoreTrend = () => {
    return sessions
      .filter(s => s.quizScore !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((s) => ({
        date: new Date(s.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        fullDate: new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        topic: s.topic,
        score: s.quizScore || 0
      }));
  };

  const topicData = getTopicStudyDistribution();
  const scoreData = getScoreTrend();
  
  // Custom Modern Colors
  const colors = ['#5c65e6', '#818cf8', '#2dd4bf', '#f472b6', '#fbbf24', '#f87171'];

  const CustomLineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-line shadow-2xl rounded-lg p-3">
          <p className="text-xs text-txt-muted mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-sm text-white font-semibold mb-1">{payload[0].payload.topic}</p>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-primary"></div>
             <p className="text-lg font-bold text-primary">
               {payload[0].value}%
             </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="mb-4">
        <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight mb-2">
          Ringkasan Belajar
        </h2>
        <p className="text-txt-muted text-lg">Pantau kemajuan Anda, pertahankan siklus, dan raih penguasaan.</p>
      </header>

      {/* --- SMART LEARNING COMPASS (GUIDE) --- */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surfaceLight/30 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50 pointer-events-none" />
        <div className="absolute -right-20 -top-20 opacity-20 pointer-events-none">
           <div className="w-96 h-96 bg-primary rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 p-8">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
            <Compass className="text-primary" size={24} /> 
            Kompas Belajar
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Option 1 */}
            <div 
              className={`group relative p-5 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden transform hover:scale-[1.03] ${activeGuide === 'plan' ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(92,101,230,0.2)]' : 'bg-surface border-line hover:border-white/20'}`}
              onClick={() => setActiveGuide('plan')}
            >
              <div className="flex items-start justify-between mb-4">
                 <div className="p-2.5 bg-surfaceLight rounded-lg text-primary border border-white/5"><Map size={20} /></div>
                 {activeGuide === 'plan' && <div className="text-primary animate-pulse"><Lightbulb size={16} /></div>}
              </div>
              <h4 className="font-semibold text-white mb-1">Saya bingung mulai dari mana</h4>
              <p className="text-xs text-txt-muted mb-4 leading-relaxed">Dapatkan struktur belajar sistematis yang dirancang oleh AI.</p>
              
              {activeGuide === 'plan' ? (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onChangeView(AppView.PLANNER); }}
                    className="w-full py-2 bg-primary hover:bg-primaryHover text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/30"
                  >
                    Buat Rencana <ArrowRight size={14} />
                  </button>
              ) : (
                <div className="h-8 flex items-end">
                   <span className="text-xs font-medium text-txt-dim group-hover:text-primary transition-colors flex items-center gap-1">Pilih jalur ini <ChevronRight size={12}/></span>
                </div>
              )}
            </div>

            {/* Option 2 */}
            <div 
              className={`group relative p-5 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden transform hover:scale-[1.03] ${activeGuide === 'study' ? 'bg-primary/10 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'bg-surface border-line hover:border-white/20'}`}
              onClick={() => setActiveGuide('study')}
            >
              <div className="flex items-start justify-between mb-4">
                 <div className="p-2.5 bg-surfaceLight rounded-lg text-green-400 border border-white/5"><Zap size={20} /></div>
                 {activeGuide === 'study' && <div className="text-green-400 animate-pulse"><Lightbulb size={16} /></div>}
              </div>
              <h4 className="font-semibold text-white mb-1">Saya sudah punya materi</h4>
              <p className="text-xs text-txt-muted mb-4 leading-relaxed">Analisis dokumen atau video YouTube secara instan.</p>
              
              {activeGuide === 'study' ? (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onChangeView(AppView.STUDY_SESSION); }}
                    className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-600/30"
                  >
                    Mulai Sesi <ArrowRight size={14} />
                  </button>
              ) : (
                <div className="h-8 flex items-end">
                   <span className="text-xs font-medium text-txt-dim group-hover:text-green-400 transition-colors flex items-center gap-1">Pilih jalur ini <ChevronRight size={12}/></span>
                </div>
              )}
            </div>

            {/* Option 3 */}
            <div 
              className={`group relative p-5 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden transform hover:scale-[1.03] ${activeGuide === 'quiz' ? 'bg-primary/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'bg-surface border-line hover:border-white/20'}`}
              onClick={() => setActiveGuide('quiz')}
            >
              <div className="flex items-start justify-between mb-4">
                 <div className="p-2.5 bg-surfaceLight rounded-lg text-purple-400 border border-white/5"><BrainCircuit size={20} /></div>
                 {activeGuide === 'quiz' && <div className="text-purple-400 animate-pulse"><Lightbulb size={16} /></div>}
              </div>
              <h4 className="font-semibold text-white mb-1">Saya ingin tes ingatan</h4>
              <p className="text-xs text-txt-muted mb-4 leading-relaxed">Evaluasi pemahaman dengan kuis dan flashcards.</p>
              
              {activeGuide === 'quiz' ? (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onChangeView(AppView.QUIZ_MODE); }}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-600/30"
                  >
                    Latihan Soal <ArrowRight size={14} />
                  </button>
              ) : (
                <div className="h-8 flex items-end">
                   <span className="text-xs font-medium text-txt-dim group-hover:text-purple-400 transition-colors flex items-center gap-1">Pilih jalur ini <ChevronRight size={12}/></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Clock, label: "Total Sesi", value: progress.totalSessions, color: "text-blue-400" },
          { icon: Book, label: "Topik Dikuasai", value: progress.topicsLearned, color: "text-green-400" },
          { icon: Trophy, label: "Skor Rata-rata", value: `${Math.round(progress.averageQuizScore)}%`, color: "text-purple-400" },
          { icon: Target, label: "Level", value: progress.topicsLearned > 20 ? 'Mahir' : progress.topicsLearned > 10 ? 'Menengah' : 'Pemula', color: "text-orange-400" }
        ].map((stat, idx) => (
          <div key={idx} className="glass-card p-6 rounded-xl flex items-center space-x-4 hover:bg-white/5 transition-all duration-300 hover:scale-[1.02]">
            <div className={`p-3 rounded-lg bg-surfaceLight border border-line ${stat.color}`}>
              <stat.icon size={22} />
            </div>
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider font-semibold">{stat.label}</p>
              <p className="text-xl font-bold text-white mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Time per Topic */}
        <div className="glass-card p-6 rounded-xl flex flex-col h-[400px] hover:border-white/10 transition-colors">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <PieChart size={18} className="text-primary" /> Distribusi Fokus
          </h3>
          <p className="text-xs text-txt-muted mb-6">Alokasi waktu belajar per topik.</p>
          
          <div className="flex-1 w-full">
            {topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={100}
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}} 
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#0B0F17', borderRadius: '8px', border: '1px solid #1f2937', color: '#f8fafc' }}
                  />
                  <Bar dataKey="minutes" radius={[0, 4, 4, 0]} barSize={20} name="Total Menit">
                    {topicData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-txt-dim text-sm border-2 border-dashed border-line rounded-lg">
                Belum ada data visual.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Score Trend */}
        <div className="glass-card p-6 rounded-xl flex flex-col h-[400px] hover:border-white/10 transition-colors">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <TrendingUp size={18} className="text-accent" /> Performa
          </h3>
          <p className="text-xs text-txt-muted mb-6">Tren nilai kuis dari waktu ke waktu.</p>
          
          <div className="flex-1 w-full">
            {scoreData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5c65e6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#5c65e6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 10}} 
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 10}} 
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#5c65e6" 
                    strokeWidth={3} 
                    dot={{fill: '#030508', stroke: '#5c65e6', strokeWidth: 2, r: 4}} 
                    activeDot={{r: 6, fill: '#818cf8', stroke: '#fff', strokeWidth: 2}}
                    name="Skor"
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-txt-dim text-sm border-2 border-dashed border-line rounded-lg">
                Selesaikan kuis untuk melihat tren.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions List */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-6 border-b border-line">
          <h3 className="text-lg font-semibold text-white">Aktivitas Terkini</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surfaceLight/50 text-txt-muted text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-medium">Topik</th>
                <th className="py-4 px-6 font-medium">Tanggal</th>
                <th className="py-4 px-6 font-medium">Durasi</th>
                <th className="py-4 px-6 font-medium">Kuis</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-line">
              {sessions.slice().reverse().slice(0, 10).map((session) => (
                <tr key={session.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 text-white font-medium">
                    <div className="flex items-center gap-2">
                       {session.topic}
                       {session.referenceLink && <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded ml-2">LINK</span>}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-txt-muted">{new Date(session.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</td>
                  <td className="py-4 px-6 text-txt-muted">{session.durationMinutes} min</td>
                  <td className="py-4 px-6">
                    {session.quizScore !== undefined ? (
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                        (session.quizScore || 0) >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        (session.quizScore || 0) >= 60 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {session.quizScore}%
                      </span>
                    ) : (
                      <span className="text-txt-dim text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-txt-dim">
                      <Book size={40} className="mb-3 opacity-20" />
                      <p>Belum ada sesi tercatat.</p>
                      <button onClick={() => onChangeView(AppView.STUDY_SESSION)} className="text-primary text-xs mt-2 hover:underline">Mulai sesi pertama →</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;