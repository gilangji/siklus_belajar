import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateStudyNotes, generateQuiz, askStudyTutor } from '../services/geminiService';
import { StudySession, QuizQuestion } from '../types';
import { Loader2, Youtube, Clock, BookOpen, ArrowRight, Save, PlayCircle, Timer, Coffee, Play, PauseCircle, Upload, FileText, X, Settings2, BarChart3, PenTool, MessageSquare, Send, ChevronRight, ChevronLeft, Hourglass, Download, Pause, Sparkles, Music, CloudRain, Flame, Volume2, VolumeX } from 'lucide-react';

interface StudySessionViewProps {
  initialTopic?: string;
  onSaveSession: (session: StudySession) => void;
  // Callback to update parent about timer status for persistent display
  onSessionUpdate?: (state: { isActive: boolean; topic: string; elapsedSeconds: number; isBreak: boolean } | null) => void;
}

const StudySessionView: React.FC<StudySessionViewProps> = ({ initialTopic, onSaveSession, onSessionUpdate }) => {
  const [step, setStep] = useState<'SETUP' | 'LEARNING' | 'QUIZ' | 'RESULT'>('SETUP');
  
  // Setup State
  const [topic, setTopic] = useState(initialTopic || '');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<{ name: string, mimeType: string, data: string } | null>(null);
  const [difficulty, setDifficulty] = useState('Menengah');
  const [customInstructions, setCustomInstructions] = useState('');
  const [startTime, setStartTime] = useState('');
  
  // Internal Session Management
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

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
  const [elapsedSeconds, setElapsedSeconds] = useState(0); 
  const [breakSeconds, setBreakSeconds] = useState(0);     
  const [sessionSeconds, setSessionSeconds] = useState(0); 
  const [breakSessionSeconds, setBreakSessionSeconds] = useState(0); 
  const [isBreak, setIsBreak] = useState(false);           
  const [isPaused, setIsPaused] = useState(false);

  // Ambience State
  const [showAmbienceMenu, setShowAmbienceMenu] = useState(false);
  const [currentAmbience, setCurrentAmbience] = useState<'NONE' | 'RAIN' | 'CAFE' | 'FIRE'>('NONE');
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Quiz State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync initial topic
  useEffect(() => {
    if (initialTopic && step === 'SETUP') {
      setTopic(initialTopic);
    }
  }, [initialTopic, step]);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatOpen]);

  // Ambience Audio Logic
  useEffect(() => {
    if (currentAmbience === 'NONE') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    const audioUrls = {
      RAIN: 'https://cdn.pixabay.com/download/audio/2022/07/04/audio_34d193f412.mp3?filename=rain-and-thunder-16705.mp3', // Rain
      CAFE: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_03d6f14068.mp3?filename=people-talking-in-a-small-room-6225.mp3', // Cafe/Chatter
      FIRE: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_8848243f77.mp3?filename=fireplace-sound-effect-with-crackling-fire-sounds-8628.mp3' // Fireplace
    };

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrls[currentAmbience]);
      audioRef.current.loop = true;
    } else if (audioRef.current.src !== audioUrls[currentAmbience]) {
      audioRef.current.src = audioUrls[currentAmbience];
    }

    audioRef.current.volume = volume;
    audioRef.current.play().catch(e => console.error("Audio play failed:", e));

    return () => {
      // Cleanup on unmount or change
      if (audioRef.current && step !== 'LEARNING') {
         audioRef.current.pause();
      }
    };
  }, [currentAmbience, step]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);


  // Timer Logic
  useEffect(() => {
    let interval: any;
    const isRunning = (step === 'LEARNING' || step === 'QUIZ') && !isPaused;

    if (isRunning) {
      if (onSessionUpdate) {
         onSessionUpdate({
           isActive: true,
           topic: topic,
           elapsedSeconds: step === 'QUIZ' ? elapsedSeconds : (isBreak ? breakSessionSeconds : sessionSeconds),
           isBreak: isBreak && step !== 'QUIZ'
         });
      }

      interval = setInterval(() => {
        if (step === 'LEARNING') {
           if (isBreak) {
             setBreakSeconds((prev) => prev + 1);       
             setBreakSessionSeconds((prev) => prev + 1); 
           } else {
             setElapsedSeconds((prev) => prev + 1);     
             setSessionSeconds((prev) => prev + 1);     
           }
        } else if (step === 'QUIZ') {
           setElapsedSeconds((prev) => prev + 1);
        }

        if (onSessionUpdate) {
           onSessionUpdate({
             isActive: true,
             topic: topic,
             elapsedSeconds: step === 'QUIZ' ? elapsedSeconds + 1 : (isBreak ? breakSessionSeconds + 1 : sessionSeconds + 1),
             isBreak: isBreak && step !== 'QUIZ'
           });
        }
      }, 1000);
    } else {
      if (onSessionUpdate && (step === 'LEARNING' || step === 'QUIZ')) {
        onSessionUpdate({
           isActive: true,
           topic: topic + (isPaused ? " (Paused)" : ""),
           elapsedSeconds: step === 'QUIZ' ? elapsedSeconds : (isBreak ? breakSessionSeconds : sessionSeconds),
           isBreak: isBreak && step !== 'QUIZ'
        });
      } else if (step === 'SETUP' || step === 'RESULT') {
        onSessionUpdate(null);
      }
    }

    return () => clearInterval(interval);
  }, [step, isBreak, topic, elapsedSeconds, sessionSeconds, breakSessionSeconds, isPaused]);

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

        if (!topic.trim()) {
           const nameWithoutExt = selectedFile.name.split('.').slice(0, -1).join('.') || selectedFile.name;
           setTopic(nameWithoutExt);
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleStartSession = async () => {
    let effectiveTopic = topic;
    if (!effectiveTopic.trim() && file) {
       effectiveTopic = file.name;
       setTopic(effectiveTopic);
    }

    if (!effectiveTopic) {
        alert("Mohon masukkan topik atau unggah file.");
        return;
    }
    
    const startTimeVal = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setStartTime(startTimeVal);
    
    const newSessionId = Date.now().toString();
    setCurrentSessionId(newSessionId);

    setLoading(true);
    setElapsedSeconds(0);
    setBreakSeconds(0);
    setSessionSeconds(0);
    setBreakSessionSeconds(0);
    setIsBreak(false);
    setIsPaused(false);
    setChatHistory([]); 
    
    try {
      const notesResult = await generateStudyNotes(
        effectiveTopic, 
        link, 
        file ? { mimeType: file.mimeType, data: file.data } : undefined,
        customInstructions,
        difficulty
      );
      setNotes(notesResult);
      
      const quizResult = await generateQuiz(effectiveTopic, notesResult);
      setGeneratedQuiz(quizResult);
      
      // AUTO SAVE
      const initialSession: StudySession = {
        id: newSessionId,
        date: new Date().toISOString().split('T')[0],
        topic: effectiveTopic,
        referenceLink: link,
        startTime: startTimeVal,
        durationMinutes: 0,
        breakMinutes: 0,
        notes: notesResult,
        quiz: quizResult,
        quizScore: undefined
      };
      onSaveSession(initialSession);

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
    setIsPaused(false);
    // Stop Audio
    setCurrentAmbience('NONE');
    
    const durationMins = Math.max(1, Math.ceil(elapsedSeconds / 60));
    const breakMins = Math.ceil(breakSeconds / 60);

    const interimSession: StudySession = {
      id: currentSessionId,
      date: new Date().toISOString().split('T')[0],
      topic,
      referenceLink: link,
      startTime,
      durationMinutes: durationMins,
      breakMinutes: breakMins,
      notes,
      quiz: generatedQuiz,
      quizScore: undefined
    };
    onSaveSession(interimSession);

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
    const breakMins = Math.ceil(breakSeconds / 60);
    
    const session: StudySession = {
      id: currentSessionId,
      date: new Date().toISOString().split('T')[0],
      topic,
      referenceLink: link,
      startTime,
      durationMinutes: durationMins, 
      breakMinutes: breakMins,
      notes,
      quiz: generatedQuiz,
      quizScore: finalScore
    };
    onSaveSession(session);
    setStep('RESULT');
  };

  const handleDownloadPDF = () => {
    if (!contentRef.current) return;
    const originalElement = contentRef.current;
    const clone = originalElement.cloneNode(true) as HTMLElement;

    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#000000';
    clone.style.padding = '40px';
    clone.style.width = '100%';
    clone.style.maxWidth = '100%';

    const article = clone.querySelector('article');
    if (article) {
      article.classList.remove('prose-invert');
      article.classList.add('prose-slate');
       const allText = clone.querySelectorAll('*');
       allText.forEach((el) => {
          if (el instanceof HTMLElement) {
             el.style.color = '#000000';
          }
       });
    }

    const opt = {
      margin: 15,
      filename: `Materi_${topic.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // @ts-ignore
    if (window.html2pdf) window.html2pdf().set(opt).from(clone).save();
  };

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

  // --- RENDER SETUP ---
  if (step === 'SETUP') {
     return (
      <div className="max-w-3xl mx-auto glass-card p-10 rounded-2xl animate-fade-in mb-10 mt-6">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg shadow-lg shadow-primary/30 text-white"><PlayCircle size={24} /></div>
          Mulai Sesi
        </h2>
        <p className="text-txt-muted mb-8 ml-14">Siapkan materi dan preferensi belajar Anda.</p>
        
        <div className="space-y-8">
           <div>
               <label className="block text-sm font-semibold text-txt-muted mb-2">Unggah Dokumen / Materi (Prioritas)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-lg p-3.5 cursor-pointer transition-all flex items-center justify-between group h-[52px] ${file ? 'bg-primary/10 border-primary/50' : 'bg-surfaceLight/30 border-line hover:bg-surfaceLight/60 hover:border-primary/50'}`}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.txt,.epub,image/png,image/jpeg,image/webp"/>
                {!file ? (
                  <div className="flex items-center gap-3 text-txt-muted w-full"><Upload size={18} /><span className="text-sm">Klik untuk pilih file...</span></div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 overflow-hidden"><FileText size={18} className="text-primary flex-shrink-0" /><span className="text-sm font-medium text-white truncate">{file.name}</span></div>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="p-1 hover:bg-white/10 rounded-full text-txt-dim hover:text-white"><X size={16} /></button>
                  </div>
                )}
              </div>
            </div>

          <div className="group">
            <label className="block text-sm font-semibold text-txt-muted mb-2 group-focus-within:text-primary transition-colors">Topik Pembelajaran</label>
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={file ? `Menggunakan materi dari: ${file.name}` : "cth: Pengantar Machine Learning"} className="w-full p-3.5 bg-surfaceLight/50 border border-line rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-white placeholder-txt-dim"/>
          </div>

          <div className="group">
              <label className="block text-sm font-semibold text-txt-muted mb-2 group-focus-within:text-primary transition-colors">Sumber Referensi (URL Opsional)</label>
              <div className="relative">
                <Youtube className="absolute left-4 top-3.5 text-txt-dim group-focus-within:text-red-500 transition-colors" size={20} />
                <input type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtube.com/..." className="w-full pl-12 p-3.5 bg-surfaceLight/50 border border-line rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-white placeholder-txt-dim"/>
              </div>
          </div>

          <div className="p-5 rounded-xl border border-line bg-surfaceLight/20">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Hourglass size={16} className="text-primary" /> Manajemen Waktu</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-txt-dim mb-1.5 uppercase tracking-wider">Durasi Belajar (Menit)</label>
                <div className="relative">
                   <input type="number" min="1" value={targetStudyMinutes} onChange={(e) => setTargetStudyMinutes(Number(e.target.value))} className="w-full p-3 bg-surfaceLight border border-line rounded-lg focus:ring-2 focus:ring-primary outline-none text-white font-mono text-center"/>
                   <span className="absolute right-3 top-3 text-txt-dim text-xs">min</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-txt-dim mb-1.5 uppercase tracking-wider">Durasi Istirahat (Menit)</label>
                <div className="relative">
                   <input type="number" min="1" value={targetBreakMinutes} onChange={(e) => setTargetBreakMinutes(Number(e.target.value))} className="w-full p-3 bg-surfaceLight border border-line rounded-lg focus:ring-2 focus:ring-primary outline-none text-white font-mono text-center"/>
                   <span className="absolute right-3 top-3 text-txt-dim text-xs">min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button onClick={handleStartSession} disabled={loading || (!topic.trim() && !file)} className="w-full bg-primary hover:bg-primaryHover text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:shadow-primary/40">
              {loading ? <Loader2 className="animate-spin" /> : <BookOpen />}
              {loading ? 'Memproses Materi...' : 'Mulai Sesi Belajar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER LEARNING ---
  if (step === 'LEARNING') {
    return (
      <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-fade-in">
        
        {/* Modern Timer Header */}
        <div className="mb-4 glass-card rounded-xl overflow-hidden flex flex-col relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-surfaceLight"></div>
          <div 
            className={`absolute top-0 left-0 h-1 transition-all duration-1000 ease-linear ${isBreak ? 'bg-orange-500' : isPaused ? 'bg-yellow-500' : 'bg-primary'}`}
            style={{ width: `${timerStatus.progress}%` }}
          ></div>

          <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
            
            <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
               <div className={`p-2 rounded-lg flex-shrink-0 ${isBreak ? 'bg-orange-500/10 text-orange-500' : 'bg-primary/10 text-primary'}`}>
                 {isBreak ? <Coffee size={24} /> : <BookOpen size={24} />}
               </div>
               <div className="min-w-0">
                 <p className="text-xs text-txt-dim font-bold uppercase tracking-wider mb-0.5 flex items-center gap-2">
                    {timerStatus.label}
                    {isPaused && <span className="text-yellow-400 bg-yellow-400/10 px-1.5 rounded text-[10px]">PAUSED</span>}
                 </p>
                 <h2 className="text-lg font-bold text-white truncate">{topic}</h2>
               </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
               
               {/* AMBIENCE CONTROL */}
               <div className="relative">
                  <button 
                    onClick={() => setShowAmbienceMenu(!showAmbienceMenu)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${currentAmbience !== 'NONE' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surfaceLight border-line text-txt-muted hover:text-white'}`}
                    title="Suara Latar (Fokus)"
                  >
                     <Music size={18} />
                     {currentAmbience !== 'NONE' && <span className="text-xs font-bold hidden md:inline">{currentAmbience}</span>}
                  </button>

                  {/* Ambience Dropdown */}
                  {showAmbienceMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-line rounded-xl shadow-2xl p-2 z-50 animate-fade-in">
                       <p className="text-[10px] text-txt-dim font-bold uppercase tracking-wider mb-2 px-2">Suara Latar</p>
                       <div className="space-y-1">
                          <button onClick={() => setCurrentAmbience('NONE')} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currentAmbience === 'NONE' ? 'bg-white/10 text-white' : 'text-txt-muted hover:bg-white/5 hover:text-white'}`}>
                             <VolumeX size={14} /> Hening
                          </button>
                          <button onClick={() => setCurrentAmbience('RAIN')} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currentAmbience === 'RAIN' ? 'bg-primary/20 text-primary' : 'text-txt-muted hover:bg-white/5 hover:text-white'}`}>
                             <CloudRain size={14} /> Hujan
                          </button>
                          <button onClick={() => setCurrentAmbience('FIRE')} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currentAmbience === 'FIRE' ? 'bg-orange-500/20 text-orange-400' : 'text-txt-muted hover:bg-white/5 hover:text-white'}`}>
                             <Flame size={14} /> Api Unggun
                          </button>
                          <button onClick={() => setCurrentAmbience('CAFE')} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currentAmbience === 'CAFE' ? 'bg-amber-500/20 text-amber-400' : 'text-txt-muted hover:bg-white/5 hover:text-white'}`}>
                             <Coffee size={14} /> Kafe
                          </button>
                       </div>
                       {currentAmbience !== 'NONE' && (
                         <div className="px-2 pt-2 mt-2 border-t border-line">
                           <div className="flex items-center gap-2 text-txt-dim">
                              <Volume2 size={12} />
                              <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.1" 
                                value={volume} 
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-full h-1 bg-surfaceLight rounded-lg appearance-none cursor-pointer"
                              />
                           </div>
                         </div>
                       )}
                    </div>
                  )}
               </div>

               <div className="h-8 w-px bg-line mx-2 hidden md:block"></div>

               <div className={`text-center px-6 py-2 rounded-lg border flex items-center gap-3 ${
                 isPaused ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                 timerStatus.isOvertime 
                  ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                  : 'bg-surfaceLight border-line text-white'
               }`}>
                  <div className="text-2xl font-mono font-bold tracking-widest leading-none">
                    {timerStatus.isOvertime ? '+' : ''}{formatTime(timerStatus.remaining)}
                  </div>
               </div>

               <div className="h-8 w-px bg-line mx-2 hidden md:block"></div>

               <div className="flex gap-2">
                 <button 
                   onClick={() => setIsPaused(!isPaused)}
                   className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
                     isPaused 
                       ? 'bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400' 
                       : 'bg-surfaceLight border-line text-txt-muted hover:text-white hover:bg-white/10'
                   }`}
                   title={isPaused ? "Lanjutkan" : "Jeda Waktu"}
                 >
                    {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
                 </button>

                 <button 
                   onClick={handleDownloadPDF}
                   className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surfaceLight border border-line text-txt-muted hover:text-white transition-colors text-sm font-semibold"
                   title="Simpan Catatan sebagai PDF"
                 >
                   <Download size={18} />
                 </button>

                 <button
                  onClick={() => {
                    setIsPaused(false);
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
          <div className={`flex-1 glass-card rounded-xl overflow-hidden flex flex-col relative transition-all duration-300 ${isChatOpen ? 'w-2/3' : 'w-full'}`}>
            
            {/* PAUSE OVERLAY */}
            {isPaused && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center animate-fade-in">
                 <div className="bg-surface border border-line p-8 rounded-2xl text-center shadow-2xl">
                    <PauseCircle size={64} className="text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">Sesi Dijeda</h3>
                    <p className="text-txt-muted mb-6">Waktu berhenti. Ambil nafas sejenak.</p>
                    <button 
                      onClick={() => setIsPaused(false)}
                      className="bg-yellow-400 text-black px-6 py-2 rounded-full font-bold hover:bg-yellow-300 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Play size={18} fill="currentColor" /> Lanjutkan
                    </button>
                 </div>
              </div>
            )}

            {/* BREAK OVERLAY */}
            {isBreak && !isPaused && (
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
                <p className="text-green-400 font-medium mb-2 flex items-center gap-2">
                   <Sparkles size={16} />
                   Istirahat ini juga menambah XP Ruang Anda!
                </p>
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
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-markdown" ref={contentRef}>
              <article className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-a:text-primary prose-strong:text-white prose-code:text-accent prose-code:bg-surfaceLight prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-surfaceLight prose-pre:border prose-pre:border-line">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-8 border border-line rounded-xl shadow-lg">
                        <table className="w-full text-left border-collapse bg-surfaceLight/20" {...props} />
                      </div>
                    ),
                    thead: ({node, ...props}) => <thead className="bg-surfaceLight text-primary" {...props} />,
                    tbody: ({node, ...props}) => <tbody className="divide-y divide-line" {...props} />,
                    tr: ({node, ...props}) => <tr className="hover:bg-white/5 transition-colors" {...props} />,
                    th: ({node, ...props}) => <th className="p-4 font-bold text-sm uppercase tracking-wider border-b border-line" {...props} />,
                    td: ({node, ...props}) => <td className="p-4 text-sm text-txt-muted border-r border-line last:border-r-0" {...props} />,
                  }}
                >
                  {notes}
                </ReactMarkdown>
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

          {/* AI Tutor Sidebar (Unchanged) */}
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
                  <p className="text-sm">Tanyakan apa saja tentang materi ini.</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-white shadow-md' : 'bg-surfaceLight border border-line text-txt-main shadow-sm'}`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {isChatLoading && <div className="text-xs text-txt-dim px-4">Mengetik...</div>}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-surface/50 border-t border-line">
              <div className="relative">
                <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Ketik pertanyaan..." className="w-full bg-surfaceLight border border-line rounded-full pl-5 pr-12 py-3 text-sm focus:ring-1 focus:ring-primary outline-none text-white"/>
                <button onClick={handleSendMessage} disabled={!chatMessage.trim() || isChatLoading} className="absolute right-1.5 top-1.5 bg-primary text-white p-1.5 rounded-full hover:bg-primaryHover"><Send size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // QUIZ & RESULT logic remains same but ensuring formatTime and state is available
  if (step === 'QUIZ') {
    const question = generatedQuiz[currentQuestionIdx];
    return (
      <div className="max-w-3xl mx-auto mt-12 animate-fade-in">
        <div className="flex justify-center mb-8">
           <div className="flex items-center gap-3 text-white bg-surfaceLight border border-line px-5 py-2 rounded-full font-mono font-bold shadow-lg">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              {formatTime(elapsedSeconds)}
           </div>
        </div>
        <div className="glass-card p-10 rounded-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-surfaceLight"><div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${((currentQuestionIdx + 1) / generatedQuiz.length) * 100}%` }}/></div>
          <div className="flex justify-between items-center mb-8"><span className="text-xs font-bold text-txt-dim uppercase tracking-widest">Pertanyaan {currentQuestionIdx + 1} / {generatedQuiz.length}</span></div>
          <h3 className="text-2xl font-bold text-white mb-10 leading-relaxed">{question.question}</h3>
          <div className="space-y-4">
            {question.options.map((opt, idx) => (
              <button key={idx} onClick={() => handleAnswer(idx)} className="w-full text-left p-5 rounded-xl border border-line bg-surfaceLight/30 hover:border-primary hover:bg-primary/10 text-txt-muted hover:text-white transition-all flex items-center group relative overflow-hidden">
                <span className="w-8 h-8 rounded-lg bg-surfaceLight text-txt-dim flex items-center justify-center mr-5 group-hover:bg-primary group-hover:text-white text-sm font-bold border border-line group-hover:border-primary">{String.fromCharCode(65 + idx)}</span>
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
          <h2 className="text-4xl font-bold text-white mb-3">Sesi Selesai!</h2>
          <div className="flex justify-center gap-3 text-sm mb-10">
             <span className="flex items-center gap-1.5 bg-surfaceLight border border-line px-4 py-2 rounded-lg text-txt-main"><Clock size={16} className="text-primary" /> {formatTime(elapsedSeconds)}</span>
             {breakSeconds > 0 && <span className="flex items-center gap-1.5 bg-surfaceLight border border-line px-4 py-2 rounded-lg text-txt-main"><Coffee size={16} className="text-orange-400" /> {formatTime(breakSeconds)}</span>}
          </div>
          <div className="bg-surfaceLight/50 rounded-2xl p-6 mb-10 border border-line"><p className="text-xs text-txt-dim uppercase tracking-widest font-bold mb-2">Skor Akhir</p><p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">{score}%</p></div>
          <button onClick={() => { setStep('SETUP'); setTopic(''); setLink(''); setFile(null); setNotes(''); setElapsedSeconds(0); setBreakSeconds(0); setIsBreak(false); if (onSessionUpdate) onSessionUpdate(null); }} className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors shadow-lg">Mulai Sesi Baru</button>
        </div>
      </div>
    );
  }

  return null;
};

export default StudySessionView;