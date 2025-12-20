import React, { useState } from 'react';
import { StudyModule } from '../types';
import { generateSyllabus } from '../services/geminiService';
import { CheckCircle2, Circle, Loader2, Sparkles, AlertCircle, Settings2, X, GraduationCap, ArrowRight, Check } from 'lucide-react';

interface PlannerProps {
  modules: StudyModule[];
  setModules: (modules: StudyModule[]) => void;
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
      setModules(newModules);
    } catch (err) {
      setError("Gagal membuat rencana. Periksa koneksi atau API key Anda.");
    } finally {
      setLoading(false);
    }
  };

  const toggleModuleCompletion = (id: string) => {
    const updated = modules.map(m => m.id === id ? { ...m, completed: !m.completed } : m);
    setModules(updated);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-line pb-6">
        <div>
          <h2 className="text-4xl font-bold text-white tracking-tight">Rencana Belajar</h2>
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
              className="absolute top-4 right-4 text-txt-dim hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
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
                  className="w-full p-3 bg-surfaceLight border border-line rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-white placeholder-txt-dim transition-all"
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
                  className="w-full p-3 bg-surfaceLight border border-line rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-white placeholder-txt-dim transition-all"
                  placeholder="cth: 30 menit/hari, Akhir pekan saja"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-txt-muted mb-1.5">Gaya Belajar</label>
                <div className="relative">
                  <select 
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    className="w-full p-3 bg-surfaceLight border border-line rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-white appearance-none cursor-pointer"
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
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-center gap-3 border border-red-500/20">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {modules.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-line rounded-2xl bg-surface/30">
          <div className="w-20 h-20 bg-surfaceLight rounded-full flex items-center justify-center mb-6 shadow-inner border border-line">
            <Sparkles size={32} className="text-txt-dim" />
          </div>
          <h3 className="text-xl font-semibold text-white">Belum Ada Kurikulum</h3>
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
            className={`glass-card rounded-xl transition-all duration-300 group ${
              module.completed ? 'opacity-70 grayscale-[0.5]' : 'hover:border-primary/50 hover:scale-[1.03]'
            }`}
          >
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-6">
                  {/* Phase Indicator */}
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-txt-dim">Fase</span>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border ${module.completed ? 'bg-green-900/20 border-green-500/30 text-green-500' : 'bg-surfaceLight border-line text-white group-hover:border-primary group-hover:text-primary'} transition-colors`}>
                      {module.week}
                    </div>
                    <div className={`w-px h-full ${idx === modules.length - 1 ? 'bg-transparent' : 'bg-line'} my-2`}></div>
                  </div>
                  
                  {/* Content */}
                  <div>
                    <h3 className={`text-2xl font-bold ${module.completed ? 'text-txt-muted line-through decoration-line' : 'text-white'} mb-2`}>{module.title}</h3>
                    <p className="text-txt-muted text-sm leading-relaxed max-w-2xl">{module.description}</p>
                    
                    <div className="mt-6 pt-6 border-t border-line w-full">
                      <h4 className="text-xs font-bold text-txt-dim mb-3 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
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
                                  ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20' 
                                  : 'bg-surfaceLight border-line text-txt-muted hover:bg-primary hover:text-white hover:border-primary/50'
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
                  className={`transition-all duration-300 p-2 rounded-full hover:bg-white/5 ${module.completed ? 'text-green-500' : 'text-txt-dim hover:text-white'}`}
                  title={module.completed ? "Tandai belum selesai" : "Tandai selesai"}
                >
                  {module.completed ? (
                    <CheckCircle2 size={32} fill="currentColor" className="bg-void rounded-full" />
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