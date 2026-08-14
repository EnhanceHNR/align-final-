
import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ShieldCheck, Mail, Lock, ArrowRight, ShieldAlert, Loader2, Zap } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setProvisioning(false);

    const normalizedEmail = email.toLowerCase().trim();

    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError("Access Denied: Invalid email or password.");
      } else {
        setError("Security Node Error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-12 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-600/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="w-full bg-white rounded-[2rem] p-6 shadow-xl relative z-10 flex items-center justify-center mb-4">
            <span className="text-2xl font-black text-slate-900">Enhance HNR</span>
          </div>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 text-sky-500 relative z-10 font-black">Central Manufacturing Node</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-2xl animate-fade-in flex items-start leading-relaxed shadow-sm">
              <ShieldAlert size={16} className="mr-3 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {provisioning && (
            <div className="p-4 bg-sky-50 border border-sky-100 text-sky-700 text-[10px] font-black uppercase tracking-wider rounded-2xl animate-pulse flex items-center shadow-sm">
              <Zap size={16} className="mr-3 shrink-0" />
              <span>Authorized: Provisioning Node Access...</span>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Node Registry Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
                placeholder="admin@enhancenr.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Secure Access Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-sky-100 transition-all flex items-center justify-center active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                Login to Node <ArrowRight size={20} className="ml-2" />
              </>
            )}
          </button>

          <div className="pt-4 text-center">
            <p className="text-[9px] uppercase font-black tracking-widest text-slate-300">Authorized Access Only</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
