import React, { useState, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { UserProgress, StudySession, AppView } from '../types';
import { Trophy, Clock, Target, Book, TrendingUp, PieChart, Compass, Map, Zap, BrainCircuit, ArrowRight, Lightbulb, ChevronRight, PlayCircle, RotateCw, FileText, X, Eye, Download, Flame, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DashboardProps {
  sessions: StudySession[];
  progress: UserProgress;
  onChangeView: (view: AppView) => void;
  onStartStudy: (topic: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ sessions, progress, onChangeView, onStartStudy }) => {
  const [activeGuide, setActiveGuide] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const noteContentRef = useRef<HTMLDivElement>(null);

  // Get the most recent session
  const lastSession = sessions.length > 0 
    ? [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  // --- Calculate Daily Quests Status ---
  const today = new Date().toISOString().split('T')[0];
  const todaysSessions = sessions.filter(s => s.date.startsWith(today));
  
  const quests = [
    { id: 1, label: "Mulai 1 Sesi Belajar", completed: todaysSessions.length > 0, xp: 50 },
    { id: 2, label: "Fokus Minimal 25 Menit", completed: todaysSessions.some(s => s.durationMinutes >= 25), xp: 100 },
    { id: 3, label: "Skor Kuis > 80%", completed: todaysSessions.some(s => (s.quizScore || 0) >= 80), xp: 150 },
  ];
  
  const completedQuestsCount = quests.filter(q => q.completed).length;

  // --- Calculate Streak (Simple Logic) ---
  const calculateStreak = () => {
    if (sessions.length === 0) return 0;
    const uniqueDates = Array.from(new Set(sessions.map(s => s.date.split('T')[0]))).sort().reverse();
    const hasStudiedToday = uniqueDates[0] === today;
    let streak = hasStudiedToday ? 1 : 0;
    
    let tempStreak = 0;
    let lastDate = new Date(); // Start from today
    
    for (let i = 0; i < 30; i++) { 
       const dateStr = lastDate.toISOString().split('T')[0];
       if (uniqueDates.includes(dateStr)) {
         tempStreak++;
         lastDate.setDate(lastDate.getDate() - 1); 
       } else {
         if (i === 0 && !uniqueDates.includes(today)) {
            lastDate.setDate(lastDate.getDate() - 1);
            continue; 
         }
         break;
       }
    }
    return tempStreak;
  };

  const streak = calculateStreak();

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
          <p className="text-sm text-txt-main font-semibold mb-1">{payload[0].payload.topic}</p>
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

  const handleDownloadPDF = (session: StudySession) => {
    if (!noteContentRef.current) return;
    
    const originalElement = noteContentRef.current;
    const clone = originalElement.cloneNode(true) as HTMLElement;

    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#000000';
    clone.style.padding = '40px';
    clone.style.width = '100%';

    const article = clone.querySelector('article');
    if (article) {
      article.classList.remove('prose-invert'); 
      article.classList.add('prose-slate'); 
      
      article.classList.remove('prose-headings:text-white');
      article.classList.remove('prose-strong:text-white');
      article.classList.remove('text-txt-muted');
      
      article.classList.add('prose-headings:text-black');
      article.classList.add('prose-strong:text-black');
      article.style.color = '#000000';
    }

    const tables = clone.querySelectorAll('table');
    tables.forEach((t) => {
       if (t instanceof HTMLElement) {
          t.style.color = '#000000';
          t.style.borderColor = '#cbd5e1'; 
       }
    });

    const ths = clone.querySelectorAll('th');
    ths.forEach((t) => {
       if (t instanceof HTMLElement) {
          t.style.backgroundColor = '#f1f5f9';
          t.style.color = '#000000';
          t.style.border = '1px solid #cbd5e1';
       }
    });
    const tds = clone.querySelectorAll('td');
    tds.forEach((t) => {
       if (t instanceof HTMLElement) {
          t.style.color = '#334155';
          t.style.border = '1px solid #e2e8f0';
       }
    });

    const opt = {
      margin: 15,
      filename: `Riwayat_Belajar_${session.topic.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // @ts-ignore
    if (window.html2pdf) {
      // @ts-ignore
      window.html2pdf().set(opt).from(clone).save();
    } else {
      alert("Library PDF belum dimuat. Coba refresh halaman.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <header className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
           <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-txt-main to-txt-muted tracking-tight mb-2">
             Ringkasan Belajar
           </h2>
           <p className="text-txt-muted text-lg">Pantau kemajuan Anda, pertahankan siklus, dan raih penguasaan.</p>
        </div>
        
        {/* STREAK BADGE */}
        <div className="flex items-center gap-3 bg-surfaceLight/50 border border-line px-5 py-3 rounded-2xl shadow-lg">
           <div className={`p-2 rounded-full ${streak > 0 ? 'bg-orange-500/20 text-orange-500 animate-pulse' : 'bg-surface/5 text-txt-dim'}`}>
              <Flame size={20} fill={streak > 0 ? "currentColor" : "none"} />
           </div>
           <div>
              <p className="text-xs text-txt-muted font-bold uppercase tracking-wider">Streak</p>
              <p className="text-xl font-black text-txt-main">{streak} <span className="text-xs font-normal text-txt-dim">Hari</span></p>
           </div>
        </div>
      </header>
      
      {/* --- DAILY QUESTS SECTION (NEW) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Quests Card */}
         <div className="md:col-span-2 glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <Target size={100} className="text-txt-main" />
            </div>
            
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold text-txt-main flex items-center gap-2">
                  <Zap size={20} className="text-yellow-400" fill="currentColor" /> Misi Harian
               </h3>
               <span className="text-xs font-bold bg-surfaceLight px-3 py-1 rounded-full border border-line text-txt-muted">
                  {completedQuestsCount}/{quests.length} Selesai
               </span>
            </div>

            <div className="space-y-3 relative z-10">
               {quests.map((quest) => (
                  <div key={quest.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${quest.completed ? 'bg-green-500/10 border-green-500/30' : 'bg-surfaceLight/30 border-line'}`}>
                     <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${quest.completed ? 'bg-green-500 border-green-500 text-white' : 'border-line text-transparent'}`}>
                           <CheckCircle2 size={14} />
                        </div>
                        <span className={`text-sm font-medium ${quest.completed ? 'text-txt-main line-through decoration-txt-muted' : 'text-txt-muted'}`}>{quest.label}</span>
                     </div>
                     <span className={`text-xs font-bold ${quest.completed ? 'text-green-500' : 'text-txt-dim'}`}>+{quest.xp} XP</span>
                  </div>
               ))}
            </div>
         </div>
         
         {/* Quick Continue Card */}
         <div className="glass-card p-6 rounded-2xl flex flex-col justify-between group cursor-pointer hover:border-primary/50 transition-all" onClick={() => lastSession ? onStartStudy(lastSession.topic) : onChangeView(AppView.STUDY_SESSION)}>
            <div>
               <p className="text-xs font-bold text-txt-dim uppercase tracking-wider mb-2">Lanjutkan</p>
               <h3 className="text-xl font-bold text-txt-main leading-tight mb-1">
                 {lastSession ? lastSession.topic : "Mulai Sesi Baru"}
               </h3>
               {lastSession && <p className="text-xs text-txt-muted">Terakhir: {new Date(lastSession.date).toLocaleDateString('id-ID')}</p>}
            </div>
            <div className="mt-4 flex justify-end">
               <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                  <PlayCircle size={20} />
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
          <div key={idx} className="glass-card p-6 rounded-xl flex items-center space-x-4 hover:bg-surfaceLight/30 transition-all duration-300 hover:scale-[1.03] hover:border-txt-muted/20">
            <div className={`p-3 rounded-lg bg-surfaceLight border border-line ${stat.color}`}>
              <stat.icon size={22} />
            </div>
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider font-semibold">{stat.label}</p>
              <p className="text-xl font-bold text-txt-main mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Time per Topic */}
        <div className="glass-card p-6 rounded-xl flex flex-col h-[400px] transition-all duration-300 hover:scale-[1.03] hover:bg-surfaceLight/10 hover:border-txt-muted/20">
          <h3 className="text-lg font-semibold text-txt-main mb-2 flex items-center gap-2">
            <PieChart size={18} className="text-primary" /> Distribusi Fokus
          </h3>
          <p className="text-xs text-txt-muted mb-6">Alokasi waktu belajar per topik.</p>
          <div className="flex-1 w-full">
            {topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-line)" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={100}
                    tick={{fill: 'var(--color-txt-muted)', fontSize: 11, fontWeight: 500}} 
                  />
                  <Tooltip 
                    cursor={{fill: 'var(--color-surface-light)'}}
                    contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-line)', color: 'var(--color-txt-main)' }}
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
        <div className="glass-card p-6 rounded-xl flex flex-col h-[400px] transition-all duration-300 hover:scale-[1.03] hover:bg-surfaceLight/10 hover:border-txt-muted/20">
          <h3 className="text-lg font-semibold text-txt-main mb-2 flex items-center gap-2">
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'var(--color-txt-muted)', fontSize: 10}} 
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'var(--color-txt-muted)', fontSize: 10}} 
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#5c65e6" 
                    strokeWidth={3} 
                    dot={{fill: 'var(--color-surface)', stroke: '#5c65e6', strokeWidth: 2, r: 4}} 
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

      {/* Recent Sessions List (Interactive History) */}
      <div className="glass-card rounded-xl overflow-hidden transition-all duration-300 hover:border-txt-muted/20 hover:shadow-2xl">
        <div className="p-6 border-b border-line flex justify-between items-center">
          <h3 className="text-lg font-semibold text-txt-main">Riwayat Belajar</h3>
          <span className="text-xs text-txt-muted bg-surfaceLight px-2 py-1 rounded">Klik baris untuk detail</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surfaceLight/50 text-txt-muted text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-medium">Topik</th>
                <th className="py-4 px-6 font-medium">Tanggal</th>
                <th className="py-4 px-6 font-medium">Durasi</th>
                <th className="py-4 px-6 font-medium">Kuis</th>
                <th className="py-4 px-6 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-line">
              {sessions.slice().reverse().map((session) => (
                <tr 
                  key={session.id} 
                  onClick={() => setSelectedSession(session)}
                  className="hover:bg-surfaceLight/30 transition-colors cursor-pointer group"
                >
                  <td className="py-4 px-6 text-txt-main font-medium">
                    <div className="flex items-center gap-2">
                       <FileText size={16} className="text-primary/60" />
                       {session.topic}
                       {session.referenceLink && <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded ml-2">LINK</span>}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-txt-muted">{new Date(session.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</td>
                  <td className="py-4 px-6 text-txt-muted">{session.durationMinutes} min</td>
                  <td className="py-4 px-6">
                    {session.quizScore !== undefined ? (
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                        (session.quizScore || 0) >= 80 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                        (session.quizScore || 0) >= 60 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {session.quizScore}%
                      </span>
                    ) : (
                      <span className="text-txt-dim text-xs">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="p-2 text-txt-dim group-hover:text-primary transition-colors hover:bg-primary/10 rounded-full">
                       <ArrowRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
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

      {/* --- SESSION DETAIL MODAL --- */}
      {selectedSession && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden">
             {/* Header */}
             <div className="flex justify-between items-start p-6 border-b border-line bg-surfaceLight/30 shrink-0">
               <div>
                 <h3 className="text-2xl font-bold text-txt-main flex items-center gap-2">
                   <FileText className="text-primary" size={24} />
                   Detail Sesi: {selectedSession.topic}
                 </h3>
                 <p className="text-sm text-txt-muted mt-1">
                   {new Date(selectedSession.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                   {' • '}{selectedSession.durationMinutes} Menit
                 </p>
               </div>
               <button 
                 onClick={() => setSelectedSession(null)}
                 className="p-2 bg-surfaceLight hover:bg-surfaceLight/80 rounded-full text-txt-muted hover:text-txt-main transition-colors"
               >
                 <X size={20} />
               </button>
             </div>

             {/* Content Scrollable */}
             <div className="overflow-y-auto p-8 custom-markdown flex-1 bg-surface" ref={noteContentRef}>
                {/* Result Summary */}
                <div className="flex gap-4 mb-8">
                   <div className="flex-1 bg-surfaceLight/50 p-4 rounded-xl border border-line">
                      <p className="text-xs uppercase text-txt-dim font-bold mb-1">Skor Kuis</p>
                      <p className={`text-3xl font-bold ${
                        (selectedSession.quizScore || 0) >= 80 ? 'text-green-500' : 
                        (selectedSession.quizScore || 0) >= 60 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {selectedSession.quizScore || 0}%
                      </p>
                   </div>
                   <div className="flex-1 bg-surfaceLight/50 p-4 rounded-xl border border-line">
                      <p className="text-xs uppercase text-txt-dim font-bold mb-1">Status</p>
                      <p className="text-3xl font-bold text-txt-main">Selesai</p>
                   </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-bold text-txt-main mb-4 border-b border-line pb-2">Catatan Pembelajaran (Arsip)</h4>
                  <article className="prose dark:prose-invert prose-lg max-w-none text-txt-muted">
                     <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({node, ...props}) => (
                            <div className="overflow-x-auto my-6 border border-line rounded-lg">
                              <table className="w-full text-left border-collapse" {...props} />
                            </div>
                          ),
                          thead: ({node, ...props}) => <thead className="bg-surfaceLight" {...props} />,
                          tbody: ({node, ...props}) => <tbody className="divide-y divide-line" {...props} />,
                          tr: ({node, ...props}) => <tr className="hover:bg-surfaceLight/50" {...props} />,
                          th: ({node, ...props}) => <th className="p-3 font-bold text-xs uppercase text-primary border-b border-line" {...props} />,
                          td: ({node, ...props}) => <td className="p-3 text-sm text-txt-muted border-r border-line last:border-r-0" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-txt-main" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-txt-main" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-txt-main" {...props} />,
                          strong: ({node, ...props}) => <strong className="text-txt-main" {...props} />,
                        }}
                     >
                       {selectedSession.notes}
                     </ReactMarkdown>
                  </article>
                </div>
             </div>

             {/* Footer Actions */}
             <div className="p-6 border-t border-line bg-surfaceLight/30 shrink-0 flex justify-between gap-3">
               <div>
                  <button 
                    onClick={() => handleDownloadPDF(selectedSession)}
                    className="px-4 py-2.5 rounded-xl border border-line text-txt-muted hover:text-txt-main hover:bg-surfaceLight font-semibold transition-all flex items-center gap-2 text-sm"
                  >
                    <Download size={16} />
                    Unduh PDF
                  </button>
               </div>
               
               <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectedSession(null)}
                    className="px-5 py-2.5 rounded-xl border border-line text-txt-muted hover:text-txt-main hover:bg-surfaceLight font-semibold transition-all"
                  >
                    Tutup
                  </button>
                  <button 
                    onClick={() => {
                      onStartStudy(selectedSession.topic);
                      setSelectedSession(null);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primaryHover text-white font-bold transition-all shadow-lg shadow-primary/25 flex items-center gap-2"
                  >
                    <RotateCw size={18} />
                    Pelajari Topik Ini Lagi
                  </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
