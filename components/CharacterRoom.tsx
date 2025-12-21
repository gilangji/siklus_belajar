import React, { useState, useRef, useEffect } from 'react';
import { RoomItem } from '../types';
import { Trophy, Lock, Sparkles, User, Monitor, Coffee, Book, Lamp, Box, Armchair, Laptop, Cat, Dog, Sword, Gamepad2, Palette, Music, Umbrella, Gift, Ghost, Flower2, Search, Gem, Crown, Star, Zap, Anchor, Feather, Key, Compass, Library, Sofa } from 'lucide-react';

interface CharacterRoomProps {
  unlockedItems: string[]; 
  customItems?: RoomItem[];
  isDarkMode?: boolean; 
}

// --- CONSTANTS & GENERATORS ---

// Mapped to look like the reference image:
// Desk/Study Area (Left), Bookshelf (Back), Living/Sofa (Right), Rug (Center)
export const BASE_ROOM_ITEMS: RoomItem[] = [
  // --- STUDY AREA (LEFT WALL) ---
  { id: 'desk', name: 'Meja Kerja', icon: Box, position: 'top-[35%] left-[15%] z-20', color: 'text-amber-800 dark:text-orange-400' },
  { id: 'pc', name: 'PC Setup', icon: Monitor, position: 'top-[26%] left-[18%] z-30', color: 'text-sky-500 dark:text-cyan-400' },
  { id: 'laptop', name: 'Laptop', icon: Laptop, position: 'top-[32%] left-[12%] z-30 scale-75', color: 'text-slate-500 dark:text-slate-300' },
  { id: 'chair', name: 'Kursi Ergonomis', icon: Armchair, position: 'top-[42%] left-[22%] z-30', color: 'text-indigo-600 dark:text-indigo-400' },
  { id: 'lamp', name: 'Lampu Meja', icon: Lamp, position: 'top-[28%] left-[10%] z-30', color: 'text-yellow-500 dark:text-yellow-300' },

  // --- STORAGE / BACK WALL ---
  { id: 'books', name: 'Rak Buku Utama', icon: Library, position: 'top-[15%] left-[45%] z-10 scale-125', color: 'text-amber-900 dark:text-amber-600' },
  { id: 'painting', name: 'Hiasan Dinding', icon: Palette, position: 'top-[10%] right-[30%] z-0 opacity-80', color: 'text-pink-500 dark:text-pink-400' },
  { id: 'clock', name: 'Jam Dinding', icon: Compass, position: 'top-[8%] right-[45%] z-0 opacity-70', color: 'text-slate-400 dark:text-slate-200' },

  // --- LIVING AREA (CENTER & RIGHT) ---
  { id: 'rug', name: 'Karpet Tengah', icon: Box, position: 'top-[55%] left-[50%] -translate-x-1/2 z-10 scale-[2.5] opacity-90', color: 'text-indigo-100 dark:text-indigo-900' },
  { id: 'coffee_table', name: 'Meja Kopi', icon: Coffee, position: 'top-[58%] left-[50%] -translate-x-1/2 z-20', color: 'text-amber-700 dark:text-amber-500' },
  { id: 'sofa', name: 'Sofa Nyaman', icon: Sofa, position: 'top-[45%] right-[15%] z-20 scale-110', color: 'text-teal-600 dark:text-teal-400' },
  { id: 'plant', name: 'Tanaman Hias', icon: Flower2, position: 'top-[40%] right-[8%] z-20', color: 'text-green-600 dark:text-green-400' },
  
  // --- DECOR / EXTRAS ---
  { id: 'cat', name: 'Kucing', icon: Cat, position: 'top-[60%] left-[40%] z-30 animate-pulse', color: 'text-orange-500 dark:text-orange-300' },
  { id: 'console', name: 'Game Console', icon: Gamepad2, position: 'top-[62%] left-[55%] z-30', color: 'text-purple-600 dark:text-purple-400' },
  { id: 'trophy', name: 'Piala', icon: Trophy, position: 'top-[12%] left-[45%] z-20 scale-75', color: 'text-yellow-500 dark:text-yellow-400' },
];

export const generateRandomItem = (): RoomItem => {
  const adjectives = ["Kuno", "Cyber", "Emas", "Mistik", "Neon", "Gelap", "Suci", "Raksasa", "Mini", "Terlupakan"];
  const nouns = ["Relik", "Kristal", "Totem", "Mahkota", "Kompas", "Kunci", "Permata", "Bintang", "Jangkar", "Bulu"];
  
  const icons = [Gem, Crown, Star, Zap, Anchor, Feather, Key, Compass, Sparkles, Gift];
  
  const colors = [
    "text-purple-600 dark:text-purple-300", 
    "text-yellow-600 dark:text-yellow-300", 
    "text-cyan-600 dark:text-cyan-300", 
    "text-rose-600 dark:text-rose-300", 
    "text-emerald-600 dark:text-emerald-300", 
    "text-blue-600 dark:text-blue-300", 
    "text-orange-600 dark:text-orange-300"
  ];

  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomIcon = icons[Math.floor(Math.random() * icons.length)];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  // Random positions generally in the "open" floor space
  const left = 20 + Math.floor(Math.random() * 60);
  const top = 60 + Math.floor(Math.random() * 25);
  const scale = 0.8; 

  return {
    id: `generated-${Date.now()}-${Math.random()}`,
    name: `${randomNoun} ${randomAdj}`,
    icon: randomIcon,
    color: randomColor,
    position: `top-[${top}%] left-[${left}%] scale-[${scale}] z-20`
  };
};


const CharacterRoom: React.FC<CharacterRoomProps> = ({ unlockedItems, customItems = [], isDarkMode = true }) => {
  const allDisplayItems = [...BASE_ROOM_ITEMS, ...customItems];

  // Character State (Starts in center of rug)
  const [charPos, setCharPos] = useState({ x: 50, y: 60 }); 
  const [targetPos, setTargetPos] = useState<{x: number, y: number} | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  
  const roomRef = useRef<HTMLDivElement>(null);

  const handleRoomClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!roomRef.current) return;
    const rect = roomRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    // Limit walking area to "floor" (approx bottom 60% of screen)
    if (yPercent < 40) return;

    if (xPercent > charPos.x) setFacing('right');
    else setFacing('left');

    setTargetPos({ x: xPercent, y: yPercent });
    setIsMoving(true);
  };

  useEffect(() => {
    if (targetPos) {
      setCharPos(targetPos);
      const timeout = setTimeout(() => {
        setIsMoving(false);
        setTargetPos(null);
      }, 800); 
      return () => clearTimeout(timeout);
    }
  }, [targetPos]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-txt-main tracking-tight mb-2 flex items-center gap-3">
            <User className="text-primary" size={32} />
            Ruang Saya
          </h2>
          <p className="text-txt-muted text-lg">
            Desain ruangan Anda mencerminkan perjalanan belajar Anda.
          </p>
        </div>
        
        <div className="bg-primary/10 border border-primary/30 px-4 py-2 rounded-lg text-sm text-primary flex items-center gap-2 animate-pulse shadow-sm">
           <Search size={16} />
           <span>Selesaikan sesi untuk membuka item baru!</span>
        </div>
      </header>

      {/* --- THE ROOM VISUALIZER (ISOMETRIC STYLE) --- */}
      <div 
        ref={roomRef}
        onClick={handleRoomClick}
        className={`relative w-full aspect-video max-h-[600px] rounded-3xl border border-line shadow-2xl overflow-hidden group cursor-crosshair select-none transition-colors duration-500`}
      >
        
        {/* === ROOM STRUCTURE === */}

        {/* 1. Background (Void) */}
        <div className={`absolute inset-0 ${isDarkMode ? 'bg-[#0B0F17]' : 'bg-slate-100'}`}></div>

        {/* 2. Left Wall */}
        <div className={`absolute top-0 left-0 h-[70%] w-[50%] origin-bottom-right skew-y-12 border-r border-black/5 z-0 ${
             isDarkMode 
               ? 'bg-[#1a202c] bg-opacity-80' 
               : 'bg-[#e2e8f0]'
        }`}></div>

        {/* 3. Right Wall */}
        <div className={`absolute top-0 right-0 h-[70%] w-[50%] origin-bottom-left -skew-y-12 border-l border-black/5 z-0 ${
             isDarkMode 
               ? 'bg-[#151a25] bg-opacity-90' 
               : 'bg-[#cbd5e1]'
        }`}></div>

        {/* 4. Floor (Grid) */}
        <div className={`absolute bottom-0 w-full h-[50%] z-0 ${
            isDarkMode 
              ? 'bg-[#1e293b]' 
              : 'bg-[#f1f5f9]'
        }`}>
           {/* Isometric Grid Pattern */}
           <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `linear-gradient(30deg, ${isDarkMode ? '#ffffff' : '#000000'} 1px, transparent 1px), linear-gradient(150deg, ${isDarkMode ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
           }}></div>
        </div>

        {/* === ITEMS RENDER === */}
        {allDisplayItems.map((item) => {
          const isUnlocked = unlockedItems.includes(item.id);
          if (!isUnlocked) return null;

          // Special Rendering for Large Furniture to look nicer
          if (item.id === 'desk') {
            return (
              <div key={item.id} className={`absolute ${item.position} transition-all duration-500`}>
                 {/* Desk Top */}
                 <div className="w-32 h-16 bg-amber-800 rounded-lg transform -skew-x-12 shadow-lg relative border-t border-amber-700">
                    <div className="absolute top-full left-2 w-4 h-12 bg-amber-900"></div> {/* Leg */}
                    <div className="absolute top-full right-4 w-4 h-12 bg-amber-900"></div> {/* Leg */}
                 </div>
              </div>
            );
          }

          if (item.id === 'rug') {
            return (
               <div key={item.id} className={`absolute ${item.position} transition-all duration-500`}>
                  <div className={`w-40 h-24 transform rotate-45 rounded-xl shadow-sm border-4 ${isDarkMode ? 'bg-indigo-900/50 border-indigo-800' : 'bg-indigo-100 border-indigo-200'}`}></div>
               </div>
            );
          }
          
          if (item.id === 'books') {
             return (
               <div key={item.id} className={`absolute ${item.position} transition-all duration-500`}>
                 <div className="flex flex-col gap-1 items-center">
                   <div className="w-24 h-32 bg-amber-900/80 rounded border-4 border-amber-950 flex flex-col justify-evenly px-1">
                      <div className="h-1 w-full bg-amber-950"></div>
                      <div className="h-1 w-full bg-amber-950"></div>
                      <div className="h-1 w-full bg-amber-950"></div>
                   </div>
                 </div>
               </div>
             )
          }

          return (
            <div 
              key={item.id} 
              className={`absolute ${item.position} transition-all duration-700 animate-fade-in pointer-events-none group`}
            >
               <item.icon 
                 size={item.id === 'sofa' ? 48 : 32} 
                 className={`drop-shadow-xl filter ${item.color} transform transition-transform group-hover:-translate-y-1`} 
                 fill={isDarkMode ? "currentColor" : "none"}
                 strokeWidth={1.5} 
               />
               {/* Shadow for realism */}
               <div className="w-full h-2 bg-black/30 blur-sm rounded-full mt-[-4px] transform scale-x-75 opacity-50"></div>
            </div>
          );
        })}

        {/* === CHARACTER === */}
        <div 
           className="absolute z-50 flex flex-col items-center pointer-events-none transition-all duration-700 ease-out"
           style={{ 
             left: `${charPos.x}%`, 
             top: `${charPos.y}%`,
             transform: 'translate(-50%, -100%)'
           }}
        >
           <div className={`relative transition-transform duration-300 ${isMoving ? 'animate-bounce' : ''}`}>
              {/* Body */}
              <div className={`w-14 h-14 bg-gradient-to-br from-primary to-indigo-500 rounded-full flex items-center justify-center border-2 border-white transform ${
                  isDarkMode ? 'shadow-[0_0_20px_rgba(92,101,230,0.5)]' : 'shadow-lg'
              } ${facing === 'left' ? 'scale-x-[-1]' : 'scale-x-1'}`}>
                 <div className="flex gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-blink"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-blink delay-100"></div>
                 </div>
              </div>
           </div>
           {/* Shadow */}
           <div className="w-10 h-2 bg-black/40 rounded-full blur-sm mt-[-2px]"></div>
        </div>

        {/* Click Target Indicator */}
        {targetPos && (
           <div 
             className="absolute w-8 h-8 border-2 border-white/50 rounded-full animate-ping pointer-events-none"
             style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%`, transform: 'translate(-50%, -50%)' }}
           ></div>
        )}

      </div>

      {/* --- INVENTORY LIST --- */}
      <h3 className="text-xl font-bold text-txt-main mt-8 mb-4 border-b border-line pb-2 flex items-center gap-2">
         <Box size={20} className="text-primary" /> Inventaris Item
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {allDisplayItems.map((item) => {
          const isUnlocked = unlockedItems.includes(item.id);

          return (
            <div 
              key={item.id} 
              className={`p-4 rounded-xl border flex flex-col items-center gap-3 text-center transition-all duration-300 ${
                isUnlocked 
                  ? 'bg-gradient-to-br from-surfaceLight to-surface border-primary/20 hover:border-primary/50 shadow-md hover:shadow-lg hover:-translate-y-1' 
                  : 'bg-surfaceLight/5 border-line opacity-40 grayscale'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isUnlocked ? 'bg-surfaceLight/50 text-white shadow-inner border border-white/5' : 'bg-transparent text-txt-dim'
              }`}>
                {isUnlocked ? <item.icon size={24} className={item.color} /> : <Lock size={20} />}
              </div>
              
              <div className="min-w-0 w-full">
                 <h4 className="text-xs font-bold truncate text-txt-main mb-0.5">{item.name}</h4>
                 {isUnlocked ? (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">DIMILIKI</span>
                 ) : (
                    <span className="text-[9px] text-txt-dim font-medium">TERKUNCI</span>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CharacterRoom;
