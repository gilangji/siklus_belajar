import React from 'react';
import { StudySession } from '../types';
import { Trophy, Clock, Lock, Sparkles, User, Monitor, Coffee, Book, Lamp, Box, Armchair, Laptop } from 'lucide-react';

interface CharacterRoomProps {
  sessions: StudySession[];
}

const CharacterRoom: React.FC<CharacterRoomProps> = ({ sessions }) => {
  // 1. Calculate Total XP (Study Time + Break Time)
  const totalMinutes = sessions.reduce((acc, s) => {
    return acc + (s.durationMinutes || 0) + (s.breakMinutes || 0);
  }, 0);

  // 2. Define Unlockable Items
  const items = [
    { id: 'rug', name: 'Karpet Nyaman', cost: 15, icon: Box, position: 'bottom-20 left-1/2 -translate-x-1/2' },
    { id: 'desk', name: 'Meja Belajar', cost: 45, icon: Box, position: 'bottom-32 left-1/2 -translate-x-1/2 scale-150' }, // Placeholder visual logic
    { id: 'chair', name: 'Kursi Ergonomis', cost: 90, icon: Armchair, position: 'bottom-28 left-1/2 -translate-x-1/2 z-20' },
    { id: 'lamp', name: 'Lampu Belajar', cost: 150, icon: Lamp, position: 'bottom-48 ml-20 left-1/2' },
    { id: 'laptop', name: 'Laptop Kerja', cost: 240, icon: Laptop, position: 'bottom-44 left-1/2 -translate-x-1/2 z-10' },
    { id: 'books', name: 'Koleksi Buku', cost: 360, icon: Book, position: 'bottom-48 -ml-24 left-1/2' },
    { id: 'plant', name: 'Tanaman Hias', cost: 500, icon: Coffee, position: 'bottom-20 left-10' },
    { id: 'pc', name: 'PC Gaming RGB', cost: 720, icon: Monitor, position: 'bottom-44 ml-12 left-1/2 z-10 text-purple-400' },
    { id: 'trophy', name: 'Piala Master', cost: 1000, icon: Trophy, position: 'top-20 right-20 text-yellow-400' },
  ];

  // 3. Determine Level and Room State
  const level = Math.floor(totalMinutes / 60) + 1;
  const isHouseUnlocked = totalMinutes >= 2000; // Expansion logic

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <header>
        <h2 className="text-4xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
          <HomeIcon className="text-primary" size={32} />
          Ruang Saya
        </h2>
        <p className="text-txt-muted text-lg">
          Belajar lebih banyak untuk mendekorasi ruangan ini. Total Waktu: <span className="text-white font-bold">{totalMinutes} Menit</span> (Level {level})
        </p>
      </header>

      {/* --- THE ROOM VISUALIZER --- */}
      <div className="relative w-full aspect-video max-h-[600px] bg-gradient-to-b from-[#1e1b4b] to-[#0f172a] rounded-3xl border border-line shadow-2xl overflow-hidden group">
        
        {/* Room Background / Walls */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[#1e293b] skew-x-12 origin-bottom-left opacity-50"></div> {/* Floor perspective fake */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(92,101,230,0.15),transparent_70%)]"></div>

        {/* Expansion: House Background (Overlay if unlocked) */}
        {isHouseUnlocked && (
           <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&w=1000&auto=format&fit=crop)' }}></div>
        )}

        {/* CHARACTER */}
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
           {/* Simple CSS Character Representation */}
           <div className="relative animate-bounce-slow">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(92,101,230,0.6)] border-2 border-white">
                 <User size={32} className="text-white" />
              </div>
              {/* Name Tag */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap border border-white/10">
                 Level {level}
              </div>
           </div>
           {/* Shadow */}
           <div className="w-12 h-2 bg-black/40 rounded-full blur-sm mt-2"></div>
        </div>

        {/* ITEMS (Rendered conditionally based on time) */}
        {items.map((item) => {
          const isUnlocked = totalMinutes >= item.cost;
          if (!isUnlocked) return null;

          return (
            <div 
              key={item.id} 
              className={`absolute ${item.position} transition-all duration-700 animate-fade-in`}
            >
               {/* Using Lucide Icons to represent furniture for simplicity in this code-only environment */}
               {item.id === 'desk' ? (
                 <div className="w-48 h-24 bg-[#334155] rounded-lg border-t-4 border-[#475569] shadow-xl flex items-end justify-center relative">
                    <div className="w-4 h-full bg-[#1e293b] absolute left-4 bottom-0"></div>
                    <div className="w-4 h-full bg-[#1e293b] absolute right-4 bottom-0"></div>
                 </div>
               ) : item.id === 'rug' ? (
                 <div className="w-64 h-32 bg-primary/20 rounded-[100%] blur-sm transform scale-y-50"></div>
               ) : (
                 <item.icon size={item.id === 'pc' ? 48 : 40} className={`drop-shadow-lg ${item.icon === Monitor ? 'text-purple-400' : 'text-slate-300'}`} />
               )}
            </div>
          );
        })}

        {/* Locked Message Overlay (Subtle) */}
        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur px-4 py-2 rounded-lg border border-white/10 text-xs text-txt-dim">
           Item berikutnya: <span className="text-primary font-bold">{items.find(i => totalMinutes < i.cost)?.name || "Ekspansi Rumah"}</span> ({items.find(i => totalMinutes < i.cost)?.cost || 2000} m)
        </div>

      </div>

      {/* --- UNLOCKS LIST --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const isUnlocked = totalMinutes >= item.cost;
          const progress = Math.min(100, (totalMinutes / item.cost) * 100);

          return (
            <div 
              key={item.id} 
              className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
                isUnlocked 
                  ? 'bg-primary/10 border-primary/30' 
                  : 'bg-surfaceLight/30 border-line grayscale opacity-70'
              }`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isUnlocked ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-surfaceLight text-txt-dim'
              }`}>
                {isUnlocked ? <item.icon size={24} /> : <Lock size={20} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`font-bold truncate ${isUnlocked ? 'text-white' : 'text-txt-muted'}`}>{item.name}</h4>
                  {isUnlocked && <Sparkles size={12} className="text-yellow-400" />}
                </div>
                
                {isUnlocked ? (
                  <p className="text-xs text-green-400 font-medium">Terbuka!</p>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-txt-dim">
                       <span>{Math.round(progress)}%</span>
                       <span>{item.cost} min</span>
                    </div>
                    <div className="h-1.5 w-full bg-surfaceLight rounded-full overflow-hidden">
                       <div className="h-full bg-txt-dim rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* House Expansion Card */}
        <div className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
            isHouseUnlocked ? 'bg-purple-500/10 border-purple-500/30' : 'bg-surfaceLight/30 border-line grayscale opacity-70'
          }`}>
             <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isHouseUnlocked ? 'bg-purple-500 text-white shadow-lg' : 'bg-surfaceLight text-txt-dim'
              }`}>
                <HomeIcon size={24} />
             </div>
             <div className="flex-1">
                <h4 className="font-bold text-white">Ekspansi Rumah</h4>
                <p className="text-xs text-txt-muted">{isHouseUnlocked ? "Rumah Mewah Terbuka!" : "Butuh 2000 menit"}</p>
             </div>
        </div>
      </div>
    </div>
  );
};

// Helper Icon for this component
const HomeIcon = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

export default CharacterRoom;
