import React, { useState } from 'react';
import { StudyModule } from '../types';
import { generateSyllabus } from '../services/geminiService';
import { CheckCircle2, Circle, Loader2, Sparkles, AlertCircle, Settings2, X, GraduationCap, ArrowRight, Check, History, Library, FlaskConical, Rocket } from 'lucide-react';

interface PlannerProps {
  modules: StudyModule[];
  setModules: (modules: StudyModule[], shouldReplace?: boolean) => void;
  onStartStudy: (topic: string) => void;
  completedTopics?: Set<string>; // New prop
}

const Planner: React.FC<PlannerProps> = ({ modules, setModules, onStartStudy, completedTopics = new Set() }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Form State
  const [customTopic, setCustomTopic] = useState("");
  const [duration, setDuration] = useState("1 jam per hari");
  const [intensity, setIntensity] = useState("Seimbang dengan pengulangan");

  const handleGenerate = async (useCustom: boolean) => {
    if (useCustom && !customTopic.trim()) {
      setError("Silakan masukkan topik untuk dipelajari.");
      return;
    }

    setLoading(true);
    setError(null);
    setShowWizard(false);
    
    try {
      const config = useCustom 
        ? { topic: customTopic, duration, intensity } 
        : { topic: "Belajar Efektif & Berpikir Kritis", duration: "Fleksibel", intensity: "Seimbang" };
        
      const newModules = await generateSyllabus(config);
      // IMPORTANT: Pass 'true' as second argument to indicate this is a REPLACEMENT plan
      setModules(newModules, true);
    } catch (err: any) {
      // Display specific error message with JSON parsing if needed
      console.error("Planner Generation Error:", err);
      let errorText = err.message || "Periksa koneksi atau API key Anda.";
      
      // Clean up API JSON errors for display
      if (errorText.includes('{')) {
        try {
           // Try to find the JSON part if mixed with text
           const jsonStart = errorText.indexOf('{');
           const jsonPart = errorText.substring(jsonStart);
           const errorObj = JSON.parse(jsonPart);
           
           if (errorObj?.error?.code === 429 || errorObj?.error?.status === 'RESOURCE_EXHAUSTED') {
             errorText = "Kuota API Gratis Harian Terlampaui. Mohon tunggu beberapa saat sebelum mencoba lagi.";
           } else if (errorObj?.error?.message) {
             errorText = errorObj.error.message;
           }
        } catch (e) {
          // ignore parsing fail
        }
      }
      
      // Fallback check for text
      if (errorText.toLowerCase().includes('quota') || errorText.includes('429')) {
         errorText = "Kuota API sedang sibuk atau habis. Sistem sedang mencoba ulang otomatis, silakan coba lagi nanti jika masih gagal.";
      }

      setError(`Gagal membuat rencana: ${errorText}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleModuleCompletion = (id: string) => {
    const updated = modules.map(m => m.id === id ? { ...m, completed: !m.completed } : m);
    // Pass 'false' because we are just updating status, not replacing the whole plan
    setModules(updated, false);
  };

  // Helper to get icon based on phase/week
  const getPhaseIcon = (week: number) => {
    switch(week) {
      case 1: return <History size={24} className="text-indigo-500" />;
      case 2: return <Library size={24} className="text-emerald-500" />;
      case 3: return <FlaskConical size={24} className="text-amber-500" />;
      case 4: return <Rocket size={24} className="text-rose-500" />;
      default: return <Sparkles size={24} className="text-primary" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-line pb-6">
        <div>
          <h2 className="text-4xl font-bold text-txt-main tracking-tight">Rencana Belajar</h2>
          <p className="text-txt-muted mt-2 text-lg">AI-generated curriculum untuk penguasaan sistematis.</p>
        </div>
        
        <div>
           <button 
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primaryHover text-white px-6 py-3 rounded-lg shadow-lg shadow-primary/25 transition-all font-semibold disabled:opacity-70 hover:scale-[1.03] transform duration-200"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {loading ? 'Merancang...' : 'Buat Rencana Baru'}
          </button>
        </div>
      </div>

      {/* Custom Plan Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl shadow-2xl w-full max-w-lg p-8 relative overflow-hidden">
             {/* Decor */}
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary"></div>

            <button 
              onClick={() => setShowWizard(false)}
              className="absolute top-4 right-4 text-txt-dim hover:text-txt-main transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-2xl font-bold text-txt-main mb-6 flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg text-primary">
                <GraduationCap size={24} />
              </div>
              Susun Kurikulum
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-txt-muted mb-1.5">Apa yang ingin Anda kuasai?</label>
                <input 
                  type="text" 
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="w-full p-3 bg-surfaceLight border border-line rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-txt-main placeholder-txt-dim transition-all"
                  placeholder="cth: Manajemen Proyek, Pemrograman Java, Sejarah Seni"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-txt-muted mb-1.5">Komitmen Waktu</label>
                <input 
                  type="text" 
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full p-3 bg-surfaceLight border border-line rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-txt-main placeholder-txt-dim transition-all"
                  placeholder="cth: 30 menit/hari, Akhir pekan saja"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-txt-muted mb-1.5">Gaya Belajar</label>
                <div className="relative">
                  <select 
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    className="w-full p-3 bg-surfaceLight border border-line rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-txt-main appearance-none cursor-pointer"
                  >
                    <option>Seimbang dengan pengulangan berkala</option>
                    <option>Intensif / Sistem Kebut Semalam</option>
                    <option>Berat di Teori / Mendalam</option>
                    <option>Praktis / Fokus Latihan</option>
                  </select>
                  <div className="absolute right-3 top-3.5 text-txt-dim pointer-events-none">
                    <Settings2 size={16} />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => handleGenerate(true)}
                  disabled={!customTopic.trim()}
                  className="w-full bg-primary hover:bg-primaryHover text-white py-3.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02]"
                >
                  <Sparkles size={18} />
                  Generate Roadmap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-center gap-3 border border-red-500/20 animate-fade-in">
          <AlertCircle size={20} className="shrink-0" />
          <span className="text-sm leading-relaxed">{error}</span>
        </div>
      )}

      {modules.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-line rounded-2xl bg-surface/30">
          <div className="w-20 h-20 bg-surfaceLight rounded-full flex items-center justify-center mb-6 shadow-inner border border-line">
            <Sparkles size={32} className="text-txt-dim" />
          </div>
          <h3 className="text-xl font-semibold text-txt-main">Belum Ada Kurikulum</h3>
          <p className="text-txt-muted mt-2 max-w-md mx-auto leading-relaxed">
            Mulai perjalanan Anda dengan membuat rencana belajar yang disesuaikan dengan kebutuhan dan waktu Anda.
          </p>
          <button 
            onClick={() => setShowWizard(true)}
            className="mt-6 text-primary hover:text-primaryHover font-medium flex items-center gap-1 transition-colors"
          >
            Buat sekarang <ArrowRight size={16} />
          </button>
        </div>
      )}

      <div className="grid gap-6">
        {modules.map((module, idx) => (
          <div 
            key={module.id} 
            className={`bg-surface rounded-xl shadow-sm border border-line transition-all duration-300 group ${
              module.completed ? 'opacity-70 grayscale-[0.5]' : 'hover:shadow-md hover:scale-[1.03]'
            }`}
          >
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-6">
                  {/* Phase Indicator */}
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-txt-dim">Fase</span>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border transition-colors ${
                      module.completed 
                        ? 'bg-green-100 border-green-200 text-green-600' 
                        : 'bg-surfaceLight border-line text-txt-muted group-hover:border-primary/50 group-hover:text-primary'
                    }`}>
                      {module.week}
                    </div>
                    <div className={`w-px h-full ${idx === modules.length - 1 ? 'bg-transparent' : 'bg-line'} my-2`}></div>
                  </div>
                  
                  {/* Content */}
                  <div>
                    {/* Updated Title with Icon and Dark Text */}
                    <h3 className={`text-2xl font-bold flex items-center gap-3 ${module.completed ? 'text-txt-dim line-through' : 'text-txt-main'} mb-2`}>
                      <span className="shrink-0 mt-1">{getPhaseIcon(module.week)}</span>
                      {module.title}
                    </h3>
                    
                    <p className="text-txt-muted text-sm leading-relaxed max-w-2xl">{module.description}</p>
                    
                    <div className="mt-6 pt-6 border-t border-line w-full">
                      <h4 className="text-xs font-bold text-txt-dim mb-3 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        Topik Fokus
                      </h4>
                      <div className="flex flex-wrap gap-2.5">
                        {module.topics.map((topic, i) => {
                          const isCompleted = completedTopics.has(topic.trim().toLowerCase());
                          return (
                            <button
                              key={i}
                              onClick={() => onStartStudy(topic)}
                              className={`
                                relative border px-4 py-2 rounded-lg text-sm transition-all cursor-pointer font-medium hover:scale-105 transform duration-150 flex items-center gap-2
                                ${isCompleted 
                                  ? 'bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20' 
                                  : 'bg-surfaceLight border-line text-txt-muted hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                                }
                              `}
                            >
                              {isCompleted && <Check size={14} className="text-green-500" />}
                              {topic}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => toggleModuleCompletion(module.id)}
                  className={`transition-all duration-300 p-2 rounded-full hover:bg-surfaceLight ${module.completed ? 'text-green-500' : 'text-txt-dim hover:text-primary'}`}
                  title={module.completed ? "Tandai belum selesai" : "Tandai selesai"}
                >
                  {module.completed ? (
                    <CheckCircle2 size={32} fill="currentColor" className="bg-surface rounded-full" />
                  ) : (
                    <Circle size={32} />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Planner;
