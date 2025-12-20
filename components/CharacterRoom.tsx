import React, { useState, useRef, useEffect } from 'react';
import { RoomItem } from '../types';
import { Trophy, Lock, Sparkles, User, Monitor, Coffee, Book, Lamp, Box, Armchair, Laptop, Cat, Dog, Sword, Gamepad2, Palette, Music, Umbrella, Gift, Ghost, Flower2, Search, Gem, Crown, Star, Zap, Anchor, Feather, Key, Compass } from 'lucide-react';

interface CharacterRoomProps {
  unlockedItems: string[]; 
  customItems?: RoomItem[]; // Items generated dynamically
}

// --- CONSTANTS & GENERATORS ---

// 1. Base Static Items
export const BASE_ROOM_ITEMS: RoomItem[] = [
  // Basics
  { id: 'rug', name: 'Karpet Persia', icon: Box, position: 'bottom-[15%] left-1/2 -translate-x-1/2 scale-150 opacity-80', color: 'text-red-800' },
  { id: 'desk', name: 'Meja Oak', icon: Box, position: 'bottom-[25%] left-1/2 -translate-x-1/2 scale-[2]', color: 'text-amber-900' },
  { id: 'chair', name: 'Kursi Gaming', icon: Armchair, position: 'bottom-[22%] left-1/2 -translate-x-1/2 z-20', color: 'text-blue-500' },
  
  // Electronics
  { id: 'laptop', name: 'MacBook Pro', icon: Laptop, position: 'bottom-[32%] left-1/2 -translate-x-1/2 z-30 scale-75', color: 'text-gray-300' },
  { id: 'pc', name: 'PC Master Race', icon: Monitor, position: 'bottom-[35%] ml-16 left-1/2 z-20', color: 'text-purple-400' },
  { id: 'console', name: 'Retro Console', icon: Gamepad2, position: 'bottom-[15%] right-[20%] z-10', color: 'text-indigo-400' },
  
  // Decor
  { id: 'lamp', name: 'Lampu Pixar', icon: Lamp, position: 'bottom-[35%] -ml-20 left-1/2 z-10', color: 'text-yellow-200' },
  { id: 'books', name: 'Tumpukan Buku', icon: Book, position: 'bottom-[12%] left-[10%] z-10', color: 'text-emerald-700' },
  { id: 'plant', name: 'Monstera', icon: Flower2, position: 'bottom-[15%] left-[5%] z-20 scale-125', color: 'text-green-500' },
  { id: 'painting', name: 'Lukisan Abstrak', icon: Palette, position: 'top-[20%] left-[20%] opacity-80', color: 'text-pink-400' },
  { id: 'poster', name: 'Poster Band', icon: Music, position: 'top-[25%] right-[30%] opacity-70 rotate-6', color: 'text-cyan-400' },
  
  // Unique / Fun
  { id: 'cat', name: 'Kucing Oren', icon: Cat, position: 'bottom-[28%] right-[15%] animate-bounce', color: 'text-orange-400' },
  { id: 'dog', name: 'Anjing Shiba', icon: Dog, position: 'bottom-[10%] left-[25%]', color: 'text-amber-200' },
  { id: 'sword', name: 'Pedang Legendaris', icon: Sword, position: 'top-[15%] left-1/2 -translate-x-1/2 rotate-45', color: 'text-slate-300' },
  { id: 'trophy', name: 'Piala LPDP', icon: Trophy, position: 'top-[38%] right-[10%] z-10', color: 'text-yellow-400' },
  { id: 'umbrella', name: 'Payung Hias', icon: Umbrella, position: 'bottom-[40%] right-[5%] -rotate-12', color: 'text-rose-400' },
  { id: 'ghost', name: 'Teman Hantu', icon: Ghost, position: 'top-[10%] left-[10%] opacity-50 animate-pulse', color: 'text-white' },
];

// 2. Random Item Generator Logic
export const generateRandomItem = (): RoomItem => {
  const adjectives = ["Kuno", "Cyber", "Emas", "Mistik", "Neon", "Gelap", "Suci", "Raksasa", "Mini", "Terlupakan"];
  const nouns = ["Relik", "Kristal", "Totem", "Mahkota", "Kompas", "Kunci", "Permata", "Bintang", "Jangkar", "Bulu"];
  
  const icons = [Gem, Crown, Star, Zap, Anchor, Feather, Key, Compass, Sparkles, Gift];
  const colors = ["text-purple-400", "text-yellow-400", "text-cyan-400", "text-rose-400", "text-emerald-400", "text-blue-400", "text-orange-400"];

  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomIcon = icons[Math.floor(Math.random() * icons.length)];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  // Random position on the "floor" area
  // Left: 5% to 90%
  // Bottom: 5% to 40% (Visual floor area)
  const left = 5 + Math.floor(Math.random() * 85);
  const bottom = 5 + Math.floor(Math.random() * 35);
  
  const scale = 0.8 + Math.random() * 0.5; // Random size 0.8x to 1.3x
  const rotate = Math.floor(Math.random() * 30) - 15; // -15 to 15 deg

  return {
    id: `generated-${Date.now()}-${Math.random()}`,
    name: `${randomNoun} ${randomAdj}`,
    icon: randomIcon,
    color: randomColor,
    position: `bottom-[${bottom}%] left-[${left}%] scale-[${scale.toFixed(1)}] rotate-[${rotate}deg] z-20`
  };
};


const CharacterRoom: React.FC<CharacterRoomProps> = ({ unlockedItems, customItems = [] }) => {
  // Combine Base items with any custom generated items passed from parent
  const allDisplayItems = [...BASE_ROOM_ITEMS, ...customItems];

  // Character State
  const [charPos, setCharPos] = useState({ x: 50, y: 80 }); // Percentages
  const [targetPos, setTargetPos] = useState<{x: number, y: number} | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  
  const roomRef = useRef<HTMLDivElement>(null);

  // Movement Logic
  const handleRoomClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!roomRef.current) return;

    const rect = roomRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to percentage
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    // Constrain to "Floor" area
    if (yPercent < 40) return;

    if (xPercent > charPos.x) setFacing('right');
    else setFacing('left');

    setTargetPos({ x: xPercent, y: yPercent });
    setIsMoving(true);
  };

  // Animate Position
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
          <h2 className="text-4xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
            <User className="text-primary" size={32} />
            Ruang Saya
          </h2>
          <p className="text-txt-muted text-lg">
            Koleksi Anda: <span className="text-white font-bold">{unlockedItems.length}</span> Item
          </p>
        </div>
        
        <div className="bg-primary/10 border border-primary/30 px-4 py-2 rounded-lg text-sm text-primary flex items-center gap-2 animate-pulse">
           <Search size={16} />
           <span>Selesaikan sesi untuk item baru! (Item tak terbatas)</span>
        </div>
      </header>

      {/* --- THE ROOM VISUALIZER --- */}
      <div 
        ref={roomRef}
        onClick={handleRoomClick}
        className="relative w-full aspect-video max-h-[600px] bg-gradient-to-b from-[#1e1b4b] to-[#0f172a] rounded-3xl border border-line shadow-2xl overflow-hidden group cursor-crosshair select-none"
      >
        
        {/* Room Background / Walls */}
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-[#1e293b] skew-x-12 origin-bottom-left opacity-50 border-t border-white/5 pointer-events-none"></div> 
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(92,101,230,0.15),transparent_70%)] pointer-events-none"></div>

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
                 <div className="w-48 h-24 bg-[#334155] rounded-lg border-t-4 border-[#475569] shadow-xl flex items-end justify-center relative">
                    <div className="w-4 h-full bg-[#1e293b] absolute left-4 bottom-0"></div>
                    <div className="w-4 h-full bg-[#1e293b] absolute right-4 bottom-0"></div>
                 </div>
               ) : item.id === 'rug' ? (
                 <div className="w-64 h-32 bg-red-900/40 rounded-[100%] blur-sm transform scale-y-50 border-4 border-red-900/50"></div>
               ) : (
                 <item.icon size={48} className={`drop-shadow-2xl filter ${item.color}`} strokeWidth={1.5} />
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
              <div className={`w-16 h-16 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(92,101,230,0.8)] border-4 border-white transform ${facing === 'left' ? 'scale-x-[-1]' : 'scale-x-1'}`}>
                 <div className="flex gap-2 mt-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-blink"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-blink delay-100"></div>
                 </div>
              </div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap border border-white/10">
                 Saya
              </div>
           </div>
           <div className="w-12 h-3 bg-black/60 rounded-full blur-sm mt-1"></div>
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
      <h3 className="text-xl font-bold text-white mt-8 mb-4 border-b border-line pb-2">Inventaris</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {allDisplayItems.map((item) => {
          const isUnlocked = unlockedItems.includes(item.id);

          return (
            <div 
              key={item.id} 
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                isUnlocked 
                  ? 'bg-surfaceLight/50 border-primary/30' 
                  : 'bg-surfaceLight/10 border-line opacity-40 grayscale'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isUnlocked ? 'bg-surfaceLight text-white shadow-sm' : 'bg-transparent text-txt-dim'
              }`}>
                {isUnlocked ? <item.icon size={20} className={item.color} /> : <Lock size={16} />}
              </div>
              
              <div className="min-w-0 w-full">
                 <h4 className="text-xs font-bold truncate text-txt-main">{item.name}</h4>
                 {isUnlocked ? (
                    <span className="text-[10px] text-green-400">Milik Anda</span>
                 ) : (
                    <span className="text-[10px] text-txt-dim">Terkunci</span>
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
