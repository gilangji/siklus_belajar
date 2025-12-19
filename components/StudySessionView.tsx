import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateStudyNotes, generateQuiz, askStudyTutor } from '../services/geminiService';
import { StudySession, QuizQuestion } from '../types';
import { Loader2, Youtube, Clock, BookOpen, ArrowRight, Save, PlayCircle, Timer, Coffee, Play, PauseCircle, Upload, FileText, X, Settings2, BarChart3, PenTool, MessageSquare, Send, ChevronRight, ChevronLeft } from 'lucide-react';

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
  
  // Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // Waktu Belajar
  const [breakSeconds, setBreakSeconds] = useState(0);     // Waktu Istirahat
  const [isBreak, setIsBreak] = useState(false);           // Status Istirahat
  
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
          setBreakSeconds((prev) => prev + 1);
        } else {
          setElapsedSeconds((prev) => prev + 1);
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

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
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
        // Remove data URL prefix (e.g., "data:image/png;base64,")
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
    setIsBreak(false);
    setChatHistory([]); // Reset chat
    
    try {
      // 1. Generate Notes with Link, File, and Options
      const notesResult = await generateStudyNotes(
        topic, 
        link, 
        file ? { mimeType: file.mimeType, data: file.data } : undefined,
        customInstructions,
        difficulty
      );
      setNotes(notesResult);
      
      // 2. Generate Quiz
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
    setIsBreak(false); // Pastikan istirahat berhenti saat masuk kuis
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

  if (step === 'SETUP') {
    return (
      <div className="max-w-2xl mx-auto glass-card p-10 rounded-2xl animate-fade-in mb-10 mt-6">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg shadow-lg shadow-primary/30 text-white"><PlayCircle size={24} /></div>
          Mulai Sesi
        </h2>
        <p className="text-txt-muted mb-8 ml-14">Siapkan materi dan preferensi belajar Anda.</p>
        
        <div className="space-y-6">
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
              className="border-2 border-dashed border-line bg-surfaceLight/30 rounded-xl p-8 cursor-pointer hover:bg-surfaceLight/60 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".pdf,.doc,.docx,.txt,.epub,image/png,image/jpeg,image/webp"
              />
              
              {!file ? (
                <>
                  <div className="p-3 bg-surfaceLight rounded-full text-txt-dim group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                    <Upload size={24} />
                  </div>
                  <span className="text-txt-muted text-sm font-medium">Klik untuk upload dokumen atau gambar</span>
                  <span className="text-xs text-txt-dim">PDF, DOCX, TXT, EPUB, PNG, JPG (Max 10MB)</span>
                </>
              ) : (
                <div className="flex items-center justify-between w-full px-4 py-2 bg-surfaceLight rounded-lg border border-line">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded text-green-500">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-green-500">Siap dianalisis</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="p-1 hover:bg-white/10 rounded-full text-txt-dim hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* DIFFICULTY SELECTOR */}
             <div>
               <label className="block text-sm font-semibold text-txt-muted mb-2 flex items-center gap-1">
                 <BarChart3 size={16} /> Kesulitan
               </label>
               <select 
                 value={difficulty}
                 onChange={(e) => setDifficulty(e.target.value)}
                 className="w-full p-3.5 bg-surfaceLight/50 border border-line rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-white appearance-none cursor-pointer hover:bg-surfaceLight transition-colors"
               >
                 <option value="Pemula">Pemula</option>
                 <option value="Menengah">Menengah</option>
                 <option value="Lanjut">Lanjut</option>
               </select>
             </div>

             {/* CUSTOM INSTRUCTIONS */}
             <div>
                <label className="block text-sm font-semibold text-txt-muted mb-2 flex items-center gap-1">
                  <PenTool size={16} /> Instruksi Khusus
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Cth: Fokus pada teori, gunakan analogi..."
                  className="w-full p-3.5 bg-surfaceLight/50 border border-line rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-white placeholder-txt-dim"
                />
             </div>
          </div>

          <div className="pt-6 border-t border-line mt-4">
            <button 
              onClick={handleStartSession}
              disabled={loading || !topic}
              className="w-full bg-primary hover:bg-primaryHover text-white font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:shadow-primary/40"
            >
              {loading ? <Loader2 className="animate-spin" /> : <BookOpen />}
              {loading ? 'Memproses Materi...' : 'Mulai Belajar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'LEARNING') {
    return (
      <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 glass-card p-4 rounded-xl gap-4">
          <div className="flex items-center gap-4 overflow-hidden w-full md:w-auto">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${isBreak ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
              {isBreak ? 'Istirahat' : 'Fase Belajar'}
            </span>
            <h2 className="text-lg font-bold text-white truncate">{topic}</h2>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Timers */}
            <div className="flex bg-surfaceLight rounded-lg p-1 border border-line">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-sm font-medium transition-colors ${isBreak ? 'bg-orange-500/20 text-orange-400' : 'text-txt-dim'}`}>
                <Coffee size={14} />
                {formatTime(breakSeconds)}
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-sm font-medium transition-colors ${!isBreak ? 'bg-primary/20 text-primary' : 'text-txt-dim'}`}>
                <Timer size={14} />
                {formatTime(elapsedSeconds)}
              </div>
            </div>

            {/* Controls */}
            <button
              onClick={() => setIsBreak(!isBreak)}
              className={`p-2.5 rounded-lg transition-all border border-line hover:border-white/20 ${isBreak ? 'bg-primary text-white hover:bg-primaryHover' : 'bg-surfaceLight text-txt-muted hover:text-white'}`}
              title={isBreak ? "Lanjut Belajar" : "Mulai Istirahat"}
            >
              {isBreak ? <Play size={18} fill="currentColor" /> : <Coffee size={18} />}
            </button>

            <button 
              onClick={handleFinishReading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-lg transition-colors font-bold text-sm shadow-lg shadow-green-900/40 ml-2"
            >
              Kuis <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden relative">
          
          {/* Main Content Area */}
          <div className={`flex-1 glass-card rounded-xl overflow-hidden flex flex-col relative transition-all duration-300 ${isChatOpen ? 'w-2/3' : 'w-full'}`}>
            {/* Overlay saat istirahat */}
            {isBreak && (
              <div className="absolute inset-0 bg-surface/90 backdrop-blur-md z-20 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
                <div className="bg-orange-500/10 p-6 rounded-full mb-6 border border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
                  <Coffee size={48} className="text-orange-500" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">Recharge</h3>
                <p className="text-txt-muted max-w-md text-lg leading-relaxed">
                  Istirahatkan mata dan pikiran Anda sejenak. Otak memproses informasi paling baik saat istirahat.
                </p>
                <button 
                  onClick={() => setIsBreak(false)}
                  className="mt-10 bg-primary text-white px-10 py-3 rounded-full font-bold hover:bg-primaryHover transition-all shadow-lg shadow-primary/30 flex items-center gap-2"
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
                className="w-full text-left p-5 rounded-xl border border-line bg-surfaceLight/30 hover:bg-primary/10 hover:border-primary/50 text-txt-muted hover:text-white transition-all duration-200 flex items-center group relative overflow-hidden"
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