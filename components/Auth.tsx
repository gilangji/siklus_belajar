import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, User, Lock, ArrowRight, ShieldCheck, UserCircle2 } from 'lucide-react';

interface AuthProps {
  onGuestLogin: () => void;
}

const Auth: React.FC<AuthProps> = ({ onGuestLogin }) => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // 1. Sanitize username: Allow alphanumeric, dots, underscores, and hyphens. 
    // Remove spaces and other symbols to ensure valid email local-part.
    const sanitizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    
    if (sanitizedUsername.length < 3) {
      setMessage({ type: 'error', text: 'Username minimal 3 karakter (huruf, angka, . _ -)' });
      setLoading(false);
      return;
    }

    // 2. Use a standard TLD (.app) to satisfy Supabase's strict email validator
    const dummyEmail = `${sanitizedUsername}@studyflow.app`;

    try {
      if (isSignUp) {
        // Sign Up Logic
        const { error } = await supabase.auth.signUp({
          email: dummyEmail,
          password,
          options: {
            // Store the display name in metadata
            data: { username: username }
          }
        });
        
        if (error) throw error;
        
        setMessage({ type: 'success', text: 'Akun berhasil dibuat! Silakan login.' });
        setIsSignUp(false);
      } else {
        // Sign In Logic
        const { error } = await supabase.auth.signInWithPassword({
          email: dummyEmail,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      
      // Handle specific Supabase error messages regarding email format
      if (error.message.includes('valid email')) {
        setMessage({ type: 'error', text: 'Format username tidak valid. Gunakan huruf dan angka.' });
      } else if (error.message.includes('Invalid login credentials')) {
        setMessage({ type: 'error', text: 'Username atau password salah.' });
      } else if (error.message.includes('User already registered')) {
        setMessage({ type: 'error', text: 'Username ini sudah digunakan.' });
      } else if (error.message.includes('Signups not allowed')) {
        setMessage({ type: 'error', text: 'Pendaftaran ditutup oleh server. Silakan gunakan Mode Tamu.' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Terjadi kesalahan otentikasi.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-3xl shadow-[0_0_30px_rgba(92,101,230,0.6)] mb-6">
            S
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Selamat Datang</h1>
          <p className="text-txt-muted mt-2">Sinkronisasi progres belajar Anda di semua perangkat.</p>
        </div>

        <div className="glass-card p-8 rounded-2xl border border-line shadow-2xl">
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase text-txt-dim mb-1.5 ml-1">Username</label>
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-txt-dim">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-surfaceLight border border-line rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-txt-dim"
                  placeholder="username_anda"
                  required
                  autoCapitalize="none"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-txt-dim mb-1.5 ml-1">Password</label>
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-txt-dim">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surfaceLight border border-line rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-txt-dim"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primaryHover text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group hover:scale-[1.02] transform duration-200"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Buat Akun' : 'Masuk'} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-2 text-txt-dim">Atau</span>
            </div>
          </div>

          <button
            onClick={onGuestLogin}
            className="w-full bg-surfaceLight hover:bg-white/5 border border-line text-txt-muted hover:text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group hover:scale-[1.02] transform duration-200"
          >
            <UserCircle2 size={20} />
            Masuk sebagai Tamu (Demo)
          </button>

          <div className="mt-6 text-center">
            <p className="text-txt-muted text-sm">
              {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
                className="ml-2 text-primary hover:text-white font-semibold transition-colors"
              >
                {isSignUp ? 'Login' : 'Daftar sekarang'}
              </button>
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-center flex justify-center gap-6 text-txt-dim text-xs">
           <span className="flex items-center gap-1"><ShieldCheck size={14}/> Enkripsi End-to-End</span>
           <span>•</span>
           <span>Aman & Privat</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;