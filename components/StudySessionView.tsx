import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateStudyNotes, generateQuiz, askStudyTutor } from '../services/geminiService';
import { StudySession, QuizQuestion } from '../types';
import { Loader2, Youtube, Clock, BookOpen, ArrowRight, Save, PlayCircle, Timer, Coffee, Play, PauseCircle, Upload, FileText, X, Settings2, BarChart3, PenTool, MessageSquare, Send, ChevronRight, ChevronLeft, Hourglass } from 'lucide-react';

interface StudySessionViewProps {
  initialTopic?: string;
  onSaveSession: (session: StudySession) => void;
}

const StudySessionView: React.FC<StudySessionViewProps> = ({ initialTopic, onSaveSession }) => {
  const [step, setStep] = useState<'SETUP' | 'LEARNING' | 'QUIZ' | 'RESULT'>('SETUP');
  
  // Setup State
  const [topic, setTopic] = useState(initialTopic || '');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<{ name: string, mimeType: string, data: string } | null>(null);
  const [difficulty, setDifficulty] = useState('Menengah');
  const [customInstructions, setCustomInstructions] = useState('');
  const [startTime, setStartTime] = useState('');
  
  // Timer Configuration State
  const [targetStudyMinutes, setTargetStudyMinutes] = useState(25);
  const [targetBreakMinutes, setTargetBreakMinutes] = useState(5);

  // Learning State
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizQuestion[]>([]);
  
  // Chat / Tutor State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Timer Logic State
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // Total waktu aktif belajar (akumulatif)
  const [breakSeconds, setBreakSeconds] = useState(0);     // Total waktu istirahat (akumulatif)
  const [sessionSeconds, setSessionSeconds] = useState(0); // Waktu sesi saat ini (untuk countdown)
  const [breakSessionSeconds, setBreakSessionSeconds] = useState(0); // Waktu istirahat saat ini (untuk countdown)
  const [isBreak, setIsBreak] = useState(false);           
  
  // Quiz State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatOpen]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    
    if (step === 'LEARNING') {
      interval = setInterval(() => {
        if (isBreak) {
          setBreakSeconds((prev) => prev + 1);       // Total akumulatif
          setBreakSessionSeconds((prev) => prev + 1); // Sesi istirahat ini
        } else {
          setElapsedSeconds((prev) => prev + 1);     // Total akumulatif
          setSessionSeconds((prev) => prev + 1);     // Sesi belajar ini
        }
      }, 1000);
    } else if (step === 'QUIZ') {
      // Saat kuis, selalu dianggap waktu aktif (bukan istirahat)
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [step, isBreak]);

  // Format Helper: MM:SS
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(Math.abs(totalSeconds) / 60);
    const seconds = Math.abs(totalSeconds) % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        alert("Ukuran file terlalu besar. Maksimal 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setFile({
          name: selectedFile.name,
          mimeType: selectedFile.type,
          data: base64Data
        });
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleStartSession = async () => {
    if (!topic) return;
    
    setStartTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    setLoading(true);
    setElapsedSeconds(0);
    setBreakSeconds(0);
    setSessionSeconds(0);
    setBreakSessionSeconds(0);
    setIsBreak(false);
    setChatHistory([]); 
    
    try {
      const notesResult = await generateStudyNotes(
        topic, 
        link, 
        file ? { mimeType: file.mimeType, data: file.data } : undefined,
        customInstructions,
        difficulty
      );
      setNotes(notesResult);
      
      const quizResult = await generateQuiz(topic, notesResult);
      setGeneratedQuiz(quizResult);
      
      setStep('LEARNING');
    } catch (e) {
      alert("Terjadi kesalahan saat membuat konten. Periksa API Key Anda.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatMessage('');
    setIsChatLoading(true);

    try {
      const response = await askStudyTutor(userMsg, notes);
      setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', text: "Maaf, terjadi kesalahan koneksi." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleFinishReading = () => {
    setIsBreak(false);
    if (generatedQuiz.length > 0) {
      setStep('QUIZ');
    } else {
      finishSession(0);
    }
  };

  const handleAnswer = (optionIdx: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIdx] = optionIdx;
    setUserAnswers(newAnswers);

    if (currentQuestionIdx < generatedQuiz.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      calculateScore(newAnswers);
    }
  };

  const calculateScore = (answers: number[]) => {
    let correct = 0;
    generatedQuiz.forEach((q, idx) => {
      if (q.correctAnswerIndex === answers[idx]) correct++;
    });
    const finalScore = Math.round((correct / generatedQuiz.length) * 100);
    setScore(finalScore);
    finishSession(finalScore);
  };

  const finishSession = (finalScore: number) => {
    const durationMins = Math.max(1, Math.ceil(elapsedSeconds / 60));
    
    const session: StudySession = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      topic,
      referenceLink: link,
      startTime,
      durationMinutes: durationMins, 
      notes,
      quiz: generatedQuiz,
      quizScore: finalScore
    };
    onSaveSession(session);
    setStep('RESULT');
  };

  // --- Calculate Progress for Timer UI ---
  const getTimerStatus = () => {
    if (isBreak) {
      const totalSeconds = targetBreakMinutes * 60;
      const remaining = totalSeconds - breakSessionSeconds;
      const isOvertime = remaining < 0;
      const progress = Math.min(100, Math.max(0, (breakSessionSeconds / totalSeconds) * 100));
      return { remaining, isOvertime, progress, label: 'Waktu Istirahat' };
    } else {
      const totalSeconds = targetStudyMinutes * 60;
      const remaining = totalSeconds - sessionSeconds;
      const isOvertime = remaining < 0;
      const progress = Math.min(100, Math.max(0, (sessionSeconds / totalSeconds) * 100));
      return { remaining, isOvertime, progress, label: 'Fokus Belajar' };
    }
  };

  const timerStatus = getTimerStatus();

  if (step === 'SETUP') {
    return (
      <div className="max-w-3xl mx-auto glass-card p-10 rounded-2xl animate-fade-in mb-10 mt-6">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg shadow-lg shadow-primary/30 text-white"><PlayCircle size={24} /></div>
          Mulai Sesi
        </h2>
        <p className="text-txt-muted mb-8 ml-14">Siapkan materi dan preferensi belajar Anda.</p>
        
        <div className="space-y-8">
          {/* TOPIC INPUT */}
          <div className="group">
            <label className="block text-sm font-semibold text-txt-muted mb-2 group-focus-within:text-primary transition-colors">Topik Pembelajaran</label>
            <input 
              type="text" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="cth: Pengantar Machine Learning, Sejarah Romawi..."
              className="w-full p-3.5 bg-surfaceLight/50 border border-line rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-white placeholder-txt-dim"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LINK INPUT */}
            <div className="group">
              <label className="block text-sm font-semibold text-txt-muted mb-2 group-focus-within:text-primary transition-colors">
                Sumber Referensi (URL)
              </label>
              <div className="relative">
                <Youtube className="absolute left-4 top-3.5 text-txt-dim group-focus-within:text-red-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full pl-12 p-3.5 bg-surfaceLight/50 border border-line rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-white placeholder-txt-dim"
                />
              </div>
            </div>

             {/* FILE UPLOAD INPUT */}
            <div>
               <label className="block text-sm font-semibold text-txt-muted mb-2">
                Unggah Materi
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-line bg-surfaceLight/30 rounded-lg p-3.5 cursor-pointer hover:bg-surfaceLight/60 hover:border-primary/50 transition-all flex items-center justify-between group h-[52px]"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.txt,.epub,image/png,image/jpeg,image/webp"
                />
                
                {!file ? (
                  <div className="flex items-center gap-3 text-txt-muted w-full">
                     <Upload size={18} />
                     <span className="text-sm">Pilih file...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText size={18} className="text-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-white truncate">{file.name}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="p-1 hover:bg-white/10 rounded-full text-txt-dim hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TIME MANAGEMENT SECTION */}
          <div className="p-5 rounded-xl border border-line bg-surfaceLight/20">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Hourglass size={16} className="text-primary" /> Manajemen Waktu
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-txt-dim mb-1.5 uppercase tracking-wider">Durasi Belajar (Menit)</label>
                <div className="relative">
                   <input 
                    type="number" 
                    min="1"
                    value={targetStudyMinutes}
                    onChange={(e) => setTargetStudyMinutes(Number(e.target.value))}
                    className="w-full p-3 bg-surfaceLight border border-line rounded-lg focus:ring-2 focus:ring-primary outline-none text-white font-mono text-center"
                  />
                  <span className="absolute right-3 top-3 text-txt-dim text-xs">min</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-txt-dim mb-1.5 uppercase tracking-wider">Durasi Istirahat (Menit)</label>
                <div className="relative">
                   <input 
                    type="number" 
                    min="1"
                    value={targetBreakMinutes}
                    onChange={(e) => setTargetBreakMinutes(Number(e.target.value))}
                    className="w-full p-3 bg-surfaceLight border border-line rounded-lg focus:ring-2 focus:ring-primary outline-none text-white font-mono text-center"
                  />
                  <span className="absolute right-3 top-3 text-txt-dim text-xs">min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 hidden">
             {/* Hidden options for cleaner UI as requested, defaults are good */}
             <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
               <option value="Menengah">Menengah</option>
             </select>
             <input value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} />
          </div>

          <div className="pt-4">
            <button 
              onClick={handleStartSession}
              disabled={loading || !topic}
              className="w-full bg-primary hover:bg-primaryHover text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:shadow-primary/40"
            >
              {loading ? <Loader2 className="animate-spin" /> : <BookOpen />}
              {loading ? 'Memproses Materi...' : 'Mulai Sesi Belajar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'LEARNING') {
    return (
      <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-fade-in">
        
        {/* Modern Timer Header */}
        <div className="mb-4 glass-card rounded-xl overflow-hidden flex flex-col relative">
          {/* Progress Bar Background */}
          <div className="absolute top-0 left-0 w-full h-1 bg-surfaceLight"></div>
          {/* Active Progress Bar */}
          <div 
            className={`absolute top-0 left-0 h-1 transition-all duration-1000 ease-linear ${isBreak ? 'bg-orange-500' : 'bg-primary'}`}
            style={{ width: `${timerStatus.progress}%` }}
          ></div>

          <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
            
            {/* Left: Topic Info */}
            <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
               <div className={`p-2 rounded-lg flex-shrink-0 ${isBreak ? 'bg-orange-500/10 text-orange-500' : 'bg-primary/10 text-primary'}`}>
                 {isBreak ? <Coffee size={24} /> : <BookOpen size={24} />}
               </div>
               <div className="min-w-0">
                 <p className="text-xs text-txt-dim font-bold uppercase tracking-wider mb-0.5">
                    {timerStatus.label}
                 </p>
                 <h2 className="text-lg font-bold text-white truncate">{topic}</h2>
               </div>
            </div>

            {/* Center/Right: Timer & Controls */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
               
               {/* Countdown Display */}
               <div className={`text-center px-6 py-2 rounded-lg border ${
                 timerStatus.isOvertime 
                  ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                  : 'bg-surfaceLight border-line text-white'
               }`}>
                  <div className="text-2xl font-mono font-bold tracking-widest leading-none">
                    {timerStatus.isOvertime ? '+' : ''}{formatTime(timerStatus.remaining)}
                  </div>
                  {timerStatus.isOvertime && (
                    <div className="text-[10px] font-bold uppercase mt-1">Overtime</div>
                  )}
               </div>

               <div className="h-8 w-px bg-line mx-2 hidden md:block"></div>

               <div className="flex gap-2">
                 <button
                  onClick={() => {
                    // Reset session timer when switching modes for cleaner counting
                    if (isBreak) {
                       setBreakSessionSeconds(0);
                       setIsBreak(false);
                    } else {
                       setSessionSeconds(0);
                       setIsBreak(true);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all border ${
                    isBreak 
                      ? 'bg-primary text-white border-primary hover:bg-primaryHover' 
                      : 'bg-surfaceLight text-txt-muted border-line hover:text-white hover:border-white/30'
                  }`}
                 >
                   {isBreak ? (
                     <><Play size={16} fill="currentColor" /> Lanjut Belajar</>
                   ) : (
                     <><Coffee size={16} /> Istirahat</>
                   )}
                 </button>

                 <button 
                  onClick={handleFinishReading}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg transition-colors font-bold text-sm shadow-lg shadow-green-900/40"
                 >
                   Selesai <ArrowRight size={16} />
                 </button>
               </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden relative">
          
          {/* Main Content Area */}
          <div className={`flex-1 glass-card rounded-xl overflow-hidden flex flex-col relative transition-all duration-300 ${isChatOpen ? 'w-2/3' : 'w-full'}`}>
            {/* Overlay saat istirahat */}
            {isBreak && (
              <div className="absolute inset-0 bg-surface/90 backdrop-blur-md z-20 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500 blur-[60px] opacity-20 rounded-full"></div>
                  <div className="relative bg-surfaceLight border border-orange-500/30 p-8 rounded-full mb-6 shadow-2xl">
                    <Coffee size={64} className="text-orange-500" />
                  </div>
                </div>
                
                <h3 className="text-4xl font-bold text-white mb-3 tracking-tight">Waktunya Istirahat</h3>
                <div className="text-5xl font-mono font-bold text-orange-400 mb-6">
                   {formatTime(timerStatus.remaining)}
                </div>
                <p className="text-txt-muted max-w-md text-lg leading-relaxed mb-8">
                  Jauhkan pandangan dari layar. Regangkan tubuh Anda.
                </p>
                <button 
                  onClick={() => {
                    setBreakSessionSeconds(0);
                    setIsBreak(false);
                  }}
                  className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-all shadow-lg flex items-center gap-2"
                >
                  <PlayCircle size={20} /> Kembali Fokus
                </button>
              </div>
            )}
            
            {/* Markdown Content */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-markdown">
              <article className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-a:text-primary prose-strong:text-white prose-code:text-accent prose-code:bg-surfaceLight prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-surfaceLight prose-pre:border prose-pre:border-line">
                <ReactMarkdown>{notes}</ReactMarkdown>
              </article>
            </div>

            {/* Toggle Chat Button (Floating) */}
            {!isChatOpen && (
              <button 
                onClick={() => setIsChatOpen(true)}
                className="absolute bottom-8 right-8 bg-primary hover:bg-primaryHover text-white p-4 rounded-full shadow-2xl shadow-primary/40 transition-transform hover:scale-110 flex items-center gap-2 z-10"
              >
                <MessageSquare size={24} />
              </button>
            )}
          </div>

          {/* AI Tutor Sidebar */}
          <div className={`glass-card rounded-xl overflow-hidden flex flex-col transition-all duration-300 border-l border-line ${isChatOpen ? 'w-[400px] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full hidden'}`}>
            <div className="p-4 border-b border-line bg-surface/50 backdrop-blur flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <div className="p-1.5 bg-primary/20 rounded text-primary"><MessageSquare size={16} /></div>
                Tutor AI
              </h3>
              <button onClick={() => setIsChatOpen(false)} className="text-txt-dim hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface/30">
              {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-txt-dim px-6 opacity-60">
                  <MessageSquare size={48} className="mb-4 text-line" />
                  <p className="text-sm">Tanyakan apa saja tentang materi ini. Saya siap membantu memperjelas konsep.</p>
                </div>
              )}
              
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white shadow-md' 
                      : 'bg-surfaceLight border border-line text-txt-main shadow-sm'
                  }`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-surfaceLight border border-line rounded-2xl px-4 py-3 shadow-sm flex gap-2 items-center text-txt-dim text-xs">
                    <Loader2 size={14} className="animate-spin text-primary" /> Mengetik...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-surface/50 border-t border-line">
              <div className="relative">
                <input 
                  type="text" 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ketik pertanyaan..."
                  className="w-full bg-surfaceLight border border-line rounded-full pl-5 pr-12 py-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-white placeholder-txt-dim transition-all shadow-inner"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || isChatLoading}
                  className="absolute right-1.5 top-1.5 bg-primary text-white p-1.5 rounded-full hover:bg-primaryHover disabled:opacity-50 disabled:bg-surfaceLight disabled:text-txt-dim transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (step === 'QUIZ') {
    const question = generatedQuiz[currentQuestionIdx];
    return (
      <div className="max-w-3xl mx-auto mt-12 animate-fade-in">
        
        {/* Timer Header for Quiz */}
        <div className="flex justify-center mb-8">
           <div className="flex items-center gap-3 text-white bg-surfaceLight border border-line px-5 py-2 rounded-full font-mono font-bold shadow-lg">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              {formatTime(elapsedSeconds)}
           </div>
        </div>

        <div className="glass-card p-10 rounded-2xl relative overflow-hidden">
           {/* Progress Bar */}
           <div className="absolute top-0 left-0 w-full h-1 bg-surfaceLight">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${((currentQuestionIdx + 1) / generatedQuiz.length) * 100}%` }}
              />
           </div>

          <div className="flex justify-between items-center mb-8">
            <span className="text-xs font-bold text-txt-dim uppercase tracking-widest">Pertanyaan {currentQuestionIdx + 1} / {generatedQuiz.length}</span>
            <span className="text-xs font-mono text-txt-muted bg-surfaceLight px-2 py-1 rounded">Single Choice</span>
          </div>

          <h3 className="text-2xl font-bold text-white mb-10 leading-relaxed">{question.question}</h3>

          <div className="space-y-4">
            {question.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                className="w-full text-left p-5 rounded-xl border border-line bg-surfaceLight/30 hover:border-primary hover:bg-primary/10 text-txt-muted hover:text-white transition-all duration-200 flex items-center group relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-primary transition-colors"></div>
                <span className="w-8 h-8 rounded-lg bg-surfaceLight text-txt-dim flex items-center justify-center mr-5 group-hover:bg-primary group-hover:text-white text-sm font-bold transition-all border border-line group-hover:border-primary">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-lg font-medium">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'RESULT') {
    return (
      <div className="max-w-md mx-auto mt-20 text-center animate-fade-in">
        <div className="glass-card p-12 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
          
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(251,191,36,0.4)]">
            <span className="text-4xl">🎉</span>
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-3">Sesi Selesai!</h2>
          <p className="text-txt-muted mb-8">Anda baru saja menguasai <br/><span className="text-white font-medium">{topic}</span></p>
          
          <div className="flex justify-center gap-3 text-sm mb-10">
             <span className="flex items-center gap-1.5 bg-surfaceLight border border-line px-4 py-2 rounded-lg text-txt-main">
                <Clock size={16} className="text-primary" /> {formatTime(elapsedSeconds)}
             </span>
             {breakSeconds > 0 && (
                <span className="flex items-center gap-1.5 bg-surfaceLight border border-line px-4 py-2 rounded-lg text-txt-main">
                    <Coffee size={16} className="text-orange-400" /> {formatTime(breakSeconds)}
                </span>
             )}
          </div>
          
          <div className="bg-surfaceLight/50 rounded-2xl p-6 mb-10 border border-line relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="text-xs text-txt-dim uppercase tracking-widest font-bold mb-2">Skor Akhir</p>
            <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">{score}%</p>
          </div>

          <button 
            onClick={() => {
              setStep('SETUP');
              setTopic('');
              setLink('');
              setFile(null);
              setNotes('');
              setElapsedSeconds(0);
              setBreakSeconds(0);
              setSessionSeconds(0);
              setBreakSessionSeconds(0);
              setIsBreak(false);
            }}
            className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors shadow-lg"
          >
            Mulai Sesi Baru
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default StudySessionView;