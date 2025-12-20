import React, { useState, useRef, useEffect } from 'react';
import { RoomItem } from '../types';
import { Trophy, Lock, Sparkles, User, Monitor, Coffee, Book, Lamp, Box, Armchair, Laptop, Cat, Dog, Sword, Gamepad2, Palette, Music, Umbrella, Gift, Ghost, Flower2, Search, Gem, Crown, Star, Zap, Anchor, Feather, Key, Compass } from 'lucide-react';

interface CharacterRoomProps {
  unlockedItems: string[]; 
  customItems?: RoomItem[];
  isDarkMode?: boolean; // New prop for visual adaptation
}

// --- CONSTANTS & GENERATORS ---

// Updated colors to support both Light (default) and Dark (via dark: prefix) modes
// Logic: In Light Mode, items should be darker/colorful to stand out against bright walls.
// In Dark Mode, items should be brighter/neon to glow against dark walls.
export const BASE_ROOM_ITEMS: RoomItem[] = [
  // Basics
  { id: 'rug', name: 'Karpet Persia', icon: Box, position: 'bottom-[15%] left-1/2 -translate-x-1/2 scale-150 opacity-90', color: 'text-rose-600/80 dark:text-rose-500/80' },
  { id: 'desk', name: 'Meja Oak', icon: Box, position: 'bottom-[25%] left-1/2 -translate-x-1/2 scale-[2]', color: 'text-amber-800 dark:text-orange-400' },
  { id: 'chair', name: 'Kursi Gaming', icon: Armchair, position: 'bottom-[22%] left-1/2 -translate-x-1/2 z-20', color: 'text-indigo-600 dark:text-indigo-400' },
  
  // Electronics
  { id: 'laptop', name: 'MacBook Pro', icon: Laptop, position: 'bottom-[32%] left-1/2 -translate-x-1/2 z-30 scale-75', color: 'text-slate-600 dark:text-slate-200' },
  { id: 'pc', name: 'PC Master Race', icon: Monitor, position: 'bottom-[35%] ml-16 left-1/2 z-20', color: 'text-violet-600 dark:text-violet-400' },
  { id: 'console', name: 'Retro Console', icon: Gamepad2, position: 'bottom-[15%] right-[20%] z-10', color: 'text-fuchsia-600 dark:text-fuchsia-400' },
  
  // Decor
  { id: 'lamp', name: 'Lampu Pixar', icon: Lamp, position: 'bottom-[35%] -ml-20 left-1/2 z-10', color: 'text-yellow-500 dark:text-yellow-300' },
  { id: 'books', name: 'Tumpukan Buku', icon: Book, position: 'bottom-[12%] left-[10%] z-10', color: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'plant', name: 'Monstera', icon: Flower2, position: 'bottom-[15%] left-[5%] z-20 scale-125', color: 'text-green-600 dark:text-green-400' },
  { id: 'painting', name: 'Lukisan Abstrak', icon: Palette, position: 'top-[20%] left-[20%] opacity-90', color: 'text-pink-500 dark:text-pink-400' },
  { id: 'poster', name: 'Poster Band', icon: Music, position: 'top-[25%] right-[30%] opacity-80 rotate-6', color: 'text-cyan-600 dark:text-cyan-300' },
  
  // Unique / Fun
  { id: 'cat', name: 'Kucing Oren', icon: Cat, position: 'bottom-[28%] right-[15%] animate-bounce', color: 'text-orange-500 dark:text-orange-300' },
  { id: 'dog', name: 'Anjing Shiba', icon: Dog, position: 'bottom-[10%] left-[25%]', color: 'text-amber-600 dark:text-amber-300' },
  { id: 'sword', name: 'Pedang Legendaris', icon: Sword, position: 'top-[15%] left-1/2 -translate-x-1/2 rotate-45', color: 'text-sky-600 dark:text-sky-200' },
  { id: 'trophy', name: 'Piala LPDP', icon: Trophy, position: 'top-[38%] right-[10%] z-10', color: 'text-yellow-500 dark:text-yellow-400' },
  { id: 'umbrella', name: 'Payung Hias', icon: Umbrella, position: 'bottom-[40%] right-[5%] -rotate-12', color: 'text-red-500 dark:text-red-400' },
  { id: 'ghost', name: 'Teman Hantu', icon: Ghost, position: 'top-[10%] left-[10%] opacity-60 animate-pulse', color: 'text-slate-400 dark:text-white' },
];

export const generateRandomItem = (): RoomItem => {
  const adjectives = ["Kuno", "Cyber", "Emas", "Mistik", "Neon", "Gelap", "Suci", "Raksasa", "Mini", "Terlupakan"];
  const nouns = ["Relik", "Kristal", "Totem", "Mahkota", "Kompas", "Kunci", "Permata", "Bintang", "Jangkar", "Bulu"];
  
  const icons = [Gem, Crown, Star, Zap, Anchor, Feather, Key, Compass, Sparkles, Gift];
  
  // Colors that work in both modes (using primary colors mostly)
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

  const left = 5 + Math.floor(Math.random() * 85);
  const bottom = 5 + Math.floor(Math.random() * 35);
  const scale = 0.8 + Math.random() * 0.5; 
  const rotate = Math.floor(Math.random() * 30) - 15;

  return {
    id: `generated-${Date.now()}-${Math.random()}`,
    name: `${randomNoun} ${randomAdj}`,
    icon: randomIcon,
    color: randomColor,
    position: `bottom-[${bottom}%] left-[${left}%] scale-[${scale.toFixed(1)}] rotate-[${rotate}deg] z-20`
  };
};


const CharacterRoom: React.FC<CharacterRoomProps> = ({ unlockedItems, customItems = [], isDarkMode = true }) => {
  const allDisplayItems = [...BASE_ROOM_ITEMS, ...customItems];

  // Character State
  const [charPos, setCharPos] = useState({ x: 50, y: 80 }); 
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
      }, 1000); 
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
            Koleksi Anda: <span className="text-txt-main font-bold">{unlockedItems.length}</span> Item
          </p>
        </div>
        
        <div className="bg-primary/10 border border-primary/30 px-4 py-2 rounded-lg text-sm text-primary flex items-center gap-2 animate-pulse shadow-sm">
           <Search size={16} />
           <span>Selesaikan sesi untuk item baru! (Item tak terbatas)</span>
        </div>
      </header>

      {/* --- THE ROOM VISUALIZER --- */}
      <div 
        ref={roomRef}
        onClick={handleRoomClick}
        className={`relative w-full aspect-video max-h-[600px] transition-all duration-700 rounded-3xl border border-line shadow-2xl overflow-hidden group cursor-crosshair select-none ${
          isDarkMode 
            ? 'bg-gradient-to-b from-slate-900 to-[#0B0F17]' 
            : 'bg-gradient-to-b from-blue-200 to-white'
        }`}
      >
        
        {/* Room Background / Walls */}
        <div className={`absolute inset-x-0 top-0 h-[55%] pointer-events-none ${
           isDarkMode 
             ? 'bg-gradient-to-b from-[#1e1b4b]/40 to-transparent' 
             : 'bg-gradient-to-b from-blue-100/50 to-transparent'
        }`}></div>
        
        {/* Floor */}
        <div className={`absolute inset-x-0 bottom-0 h-[45%] skew-x-12 origin-bottom-left border-t pointer-events-none transition-colors duration-500 ${
          isDarkMode 
             ? 'bg-[#151b28] border-white/5 shadow-[inset_0_10px_20px_rgba(0,0,0,0.5)]' 
             : 'bg-orange-50 border-orange-200/50 shadow-[inset_0_10px_20px_rgba(0,0,0,0.05)]'
        }`}></div> 
        
        {/* Atmosphere Glow */}
        <div className={`absolute inset-0 pointer-events-none ${
          isDarkMode 
             ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(92,101,230,0.1),transparent_70%)]' 
             : 'bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.8),transparent_70%)]'
        }`}></div>

        {/* ITEMS RENDER */}
        {allDisplayItems.map((item) => {
          const isUnlocked = unlockedItems.includes(item.id);
          if (!isUnlocked) return null;

          return (
            <div 
              key={item.id} 
              className={`absolute ${item.position} transition-all duration-700 animate-fade-in pointer-events-none`}
            >
               {item.id === 'desk' ? (
                 <div className={`w-48 h-24 rounded-lg border-t-4 shadow-2xl flex items-end justify-center relative ${
                    isDarkMode 
                    ? 'bg-[#3f3126] border-[#5c4636]' 
                    : 'bg-[#8B4513] border-[#A0522D]'
                 }`}>
                    <div className={`w-4 h-full absolute left-4 bottom-0 ${isDarkMode ? 'bg-[#2a211a]' : 'bg-[#654321]'}`}></div>
                    <div className={`w-4 h-full absolute right-4 bottom-0 ${isDarkMode ? 'bg-[#2a211a]' : 'bg-[#654321]'}`}></div>
                 </div>
               ) : item.id === 'rug' ? (
                 <div className="w-64 h-32 bg-rose-900/30 rounded-[100%] blur-md transform scale-y-50 border-4 border-rose-500/20"></div>
               ) : (
                 <item.icon size={48} className={`drop-shadow-lg filter ${item.color}`} strokeWidth={1.5} />
               )}
            </div>
          );
        })}

        {/* PLAYABLE CHARACTER */}
        <div 
           className="absolute z-50 flex flex-col items-center pointer-events-none transition-all duration-1000 ease-in-out"
           style={{ 
             left: `${charPos.x}%`, 
             top: `${charPos.y}%`,
             transform: 'translate(-50%, -100%)' // Pivot at feet
           }}
        >
           <div className={`relative transition-transform duration-300 ${isMoving ? 'animate-bounce' : ''}`}>
              {/* Body Glow */}
              <div className={`w-16 h-16 bg-gradient-to-br from-primary to-indigo-400 rounded-full flex items-center justify-center border-4 border-white transform ${
                  isDarkMode ? 'shadow-[0_0_25px_rgba(92,101,230,0.6)]' : 'shadow-lg'
              } ${facing === 'left' ? 'scale-x-[-1]' : 'scale-x-1'}`}>
                 <div className="flex gap-2 mt-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-blink"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-blink delay-100"></div>
                 </div>
              </div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-txt-main whitespace-nowrap border border-white/10 shadow-lg">
                 Saya
              </div>
           </div>
           {/* Shadow */}
           <div className="w-12 h-3 bg-black/40 rounded-full blur-sm mt-1"></div>
        </div>

        {/* Click Indicator */}
        {targetPos && (
           <div 
             className="absolute w-8 h-8 border-2 border-white/50 rounded-full animate-ping pointer-events-none"
             style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%`, transform: 'translate(-50%, -50%)' }}
           ></div>
        )}

      </div>

      {/* --- INVENTORY LIST --- */}
      <h3 className="text-xl font-bold text-txt-main mt-8 mb-4 border-b border-line pb-2 flex items-center gap-2">
         <Box size={20} className="text-primary" /> Inventaris
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
                 <h4 className="text-sm font-semibold truncate text-txt-main mb-0.5">{item.name}</h4>
                 {isUnlocked ? (
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">Milik Anda</span>
                 ) : (
                    <span className="text-[10px] text-txt-dim font-medium">Terkunci</span>
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