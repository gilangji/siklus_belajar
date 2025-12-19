import React, { useState, useMemo } from 'react';
import { generateFlashcards, generateQuiz } from '../services/geminiService';
import { Flashcard, QuizQuestion, StudySession } from '../types';
import { BrainCircuit, Loader2, RotateCw, Check, X, ArrowRight, Layers, FileText, Sparkles, ChevronLeft } from 'lucide-react';

interface ReviewCenterProps {
  initialTopic?: string;
  sessions: StudySession[];
}

const ReviewCenter: React.FC<ReviewCenterProps> = ({ initialTopic, sessions }) => {
  const [topic, setTopic] = useState(initialTopic || '');
  const [mode, setMode] = useState<'SELECT' | 'FLASHCARDS' | 'QUIZ'>('SELECT');
  const [loading, setLoading] = useState(false);
  const [usePersonalNotes, setUsePersonalNotes] = useState(true);
  
  // Flashcard State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  // Derive unique topics from sessions
  const previousTopics = useMemo(() => {
    return Array.from(new Set(sessions.map(s => s.topic)));
  }, [sessions]);

  // Find if current topic exists in history
  const matchedSession = useMemo(() => {
    if (!topic) return null;
    // Find the latest session with this topic
    return sessions
      .filter(s => s.topic.toLowerCase() === topic.toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [topic, sessions]);

  const startReview = async (selectedMode: 'FLASHCARDS' | 'QUIZ') => {
    if (!topic) return;
    setLoading(true);
    
    try {
      if (selectedMode === 'FLASHCARDS') {
        const cards = await generateFlashcards(topic);
        setFlashcards(cards);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setMode('FLASHCARDS');
      } else {
        // Determine context: use notes if available and selected, otherwise undefined
        const notesContext = (usePersonalNotes && matchedSession) ? matchedSession.notes : undefined;
        
        const quiz = await generateQuiz(topic, notesContext);
        setQuizQuestions(quiz);
        setCurrentQuizIndex(0);
        setScore(0);
        setQuizComplete(false);
        setMode('QUIZ');
      }
    } catch (e) {
      alert("Gagal membuat materi latihan.");
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'SELECT') {
    return (
      <div className="max-w-3xl mx-auto p-4 animate-fade-in mt-10">
        <h2 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 rounded-xl text-primary"><BrainCircuit size={32} /></div>
          Pusat Latihan
        </h2>
        <p className="text-txt-muted text-lg mb-10 ml-16">Uji ingatan dan pemahaman Anda.</p>

        <div className="glass-card p-10 rounded-2xl shadow-2xl border border-line relative overflow-hidden">
           {/* Decorative bg */}
           <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-8">
            <div>
              <label className="block text-sm font-bold text-txt-muted uppercase tracking-wider mb-3">Topik Latihan</label>
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="cth: Bias Kognitif"
                className="w-full p-4 bg-surfaceLight border border-line rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-white placeholder-txt-dim text-lg transition-all shadow-inner"
              />
              {previousTopics.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs text-txt-dim py-1">Pilihan Cepat:</span>
                  {previousTopics.slice(0, 5).map((t, i) => (
                    <button 
                      key={i} 
                      onClick={() => setTopic(t)}
                      className="text-xs bg-surfaceLight hover:bg-white/10 text-txt-muted hover:text-white px-3 py-1 rounded-full transition border border-line"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Context Option: Only show if topic matches history */}
            {matchedSession && (
              <div className="bg-primary/5 p-5 rounded-xl border border-primary/20 flex items-start gap-4">
                <div className="p-2 bg-primary/20 text-primary rounded-lg mt-0.5">
                  <FileText size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-white">Catatan Belajar Ditemukan</h4>
                  <p className="text-sm text-txt-muted mt-1 leading-relaxed">
                    Sistem menemukan catatan dari sesi <span className="text-white font-medium">{new Date(matchedSession.date).toLocaleDateString('id-ID')}</span>. Centang di bawah untuk menggunakan materi ini sebagai basis kuis.
                  </p>
                  
                  <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${usePersonalNotes ? 'bg-primary border-primary' : 'bg-surfaceLight border-line group-hover:border-white/40'}`}>
                      {usePersonalNotes && <Check size={14} className="text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      checked={usePersonalNotes}
                      onChange={(e) => setUsePersonalNotes(e.target.checked)}
                      className="hidden"
                    />
                    <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">Personalisasi materi latihan</span>
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              <button
                onClick={() => startReview('FLASHCARDS')}
                disabled={loading || !topic}
                className="relative group p-6 border border-line rounded-xl hover:border-primary/50 bg-surfaceLight/30 hover:bg-surfaceLight transition-all text-left overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                   <div className="w-12 h-12 rounded-lg bg-surfaceLight border border-line flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-txt-muted group-hover:text-primary">
                      <Layers size={24} />
                   </div>
                   <span className="block text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">Flashcards</span>
                   <span className="text-sm text-txt-muted">Metode repetisi untuk menghafal istilah kunci.</span>
                </div>
              </button>

              <button
                onClick={() => startReview('QUIZ')}
                disabled={loading || !topic}
                className="relative group p-6 border border-line rounded-xl hover:border-accent/50 bg-surfaceLight/30 hover:bg-surfaceLight transition-all text-left overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {usePersonalNotes && matchedSession && (
                   <div className="absolute top-3 right-3 text-yellow-400 animate-pulse">
                     <Sparkles size={16} fill="currentColor" />
                   </div>
                )}
                <div className="relative z-10">
                   <div className="w-12 h-12 rounded-lg bg-surfaceLight border border-line flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-txt-muted group-hover:text-accent">
                      <Check size={24} />
                   </div>
                   <span className="block text-lg font-bold text-white mb-1 group-hover:text-accent transition-colors">Kuis Latihan</span>
                   <span className="text-sm text-txt-muted">
                      {usePersonalNotes && matchedSession ? 'Soal spesifik dari catatan Anda.' : 'Uji logika dan pemahaman umum.'}
                   </span>
                </div>
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-3 text-txt-muted pt-6 animate-pulse">
                <Loader2 className="animate-spin text-primary" /> Menyiapkan ruang latihan...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'FLASHCARDS') {
    const card = flashcards[currentCardIndex];
    return (
      <div className="max-w-2xl mx-auto mt-10 animate-fade-in flex flex-col h-[600px]">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setMode('SELECT')} className="text-txt-muted hover:text-white text-sm flex items-center gap-1 transition-colors">
             <ChevronLeft size={16} /> Kembali
          </button>
          <span className="bg-surfaceLight px-3 py-1 rounded-full text-xs font-mono text-txt-dim border border-line">{currentCardIndex + 1} / {flashcards.length}</span>
        </div>

        <div className="relative flex-1 perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full duration-500 preserve-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* Front */}
            <div className="absolute w-full h-full backface-hidden glass-card rounded-3xl flex flex-col items-center justify-center p-12 text-center border border-line/50 hover:border-primary/30 transition-colors shadow-2xl">
              <span className="text-xs uppercase tracking-widest text-txt-dim mb-6 font-bold border border-line px-2 py-1 rounded">Pertanyaan</span>
              <h3 className="text-3xl font-bold text-white leading-relaxed">{card.front}</h3>
              <p className="mt-12 text-primary text-sm flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                <RotateCw size={14} /> Klik kartu untuk melihat jawaban
              </p>
            </div>

            {/* Back */}
            <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-primary to-primaryHover shadow-2xl rounded-3xl flex flex-col items-center justify-center p-12 text-center text-white border border-white/10">
              <span className="text-xs uppercase tracking-widest text-white/60 mb-6 font-bold bg-black/10 px-2 py-1 rounded">Jawaban</span>
              <p className="text-2xl font-medium leading-relaxed">{card.back}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-10 px-4">
           <button 
             onClick={() => {
               if (currentCardIndex > 0) {
                 setCurrentCardIndex(prev => prev - 1);
                 setIsFlipped(false);
               }
             }}
             disabled={currentCardIndex === 0}
             className="px-8 py-3 rounded-full border border-line hover:bg-surfaceLight text-txt-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
           >
             Sebelumnya
           </button>

           <div className="h-1 flex-1 mx-8 bg-surfaceLight rounded-full overflow-hidden">
              <div 
                 className="h-full bg-primary transition-all duration-300"
                 style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
              />
           </div>

           <button 
             onClick={() => {
               if (currentCardIndex < flashcards.length - 1) {
                 setCurrentCardIndex(prev => prev + 1);
                 setIsFlipped(false);
               } else {
                 setMode('SELECT'); // Done
               }
             }}
             className="px-8 py-3 rounded-full bg-white text-black hover:bg-gray-200 font-bold transition-all shadow-lg shadow-white/10"
           >
             {currentCardIndex < flashcards.length - 1 ? 'Berikutnya' : 'Selesai'}
           </button>
        </div>
      </div>
    );
  }

  if (mode === 'QUIZ') {
    if (quizComplete) {
       return (
        <div className="max-w-md mx-auto mt-20 text-center glass-card p-10 rounded-3xl shadow-2xl border border-line relative overflow-hidden">
           <div className="absolute inset-0 bg-primary/5"></div>
           <h2 className="text-3xl font-bold text-white mb-2 relative z-10">Hasil Kuis</h2>
           <div className="my-8 relative z-10">
              <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">{Math.round((score / quizQuestions.length) * 100)}</span>
              <span className="text-2xl text-txt-dim">%</span>
           </div>
           <p className="text-txt-muted mb-8 relative z-10">Anda menjawab <strong className="text-white">{score}</strong> dari {quizQuestions.length} pertanyaan dengan benar.</p>
           <button onClick={() => setMode('SELECT')} className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors relative z-10 w-full">Kembali ke Menu</button>
        </div>
       );
    }

    const question = quizQuestions[currentQuizIndex];
    return (
      <div className="max-w-2xl mx-auto mt-12 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => setMode('SELECT')} className="text-txt-muted text-sm hover:text-white transition-colors flex items-center gap-1">
             <X size={16} /> Keluar
          </button>
          <span className="bg-surfaceLight px-4 py-1.5 rounded-full text-xs font-bold border border-line text-txt-muted">
            {currentQuizIndex + 1} / {quizQuestions.length}
          </span>
        </div>

        <div className="glass-card p-10 rounded-2xl shadow-xl border border-line relative">
          <h3 className="text-xl font-bold text-white mb-8 leading-relaxed">{question.question}</h3>
          <div className="space-y-3">
            {question.options.map((opt, idx) => (
               <button
                 key={idx}
                 onClick={() => {
                    if (idx === question.correctAnswerIndex) setScore(s => s + 1);
                    if (currentQuizIndex < quizQuestions.length - 1) {
                      setCurrentQuizIndex(prev => prev + 1);
                    } else {
                      setQuizComplete(true);
                    }
                 }}
                 className="w-full text-left p-5 rounded-xl border border-line bg-surfaceLight/30 hover:border-primary hover:bg-primary/10 text-txt-muted hover:text-white transition-all group"
               >
                 <div className="flex items-center gap-4">
                    <span className="w-6 h-6 rounded flex items-center justify-center border border-line text-xs font-bold text-txt-dim group-hover:border-primary group-hover:text-primary transition-colors">
                       {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                 </div>
               </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ReviewCenter;