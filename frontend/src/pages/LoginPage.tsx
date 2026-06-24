import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, ArrowRight, Activity } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Connexion échouée. Vérifiez vos identifiants ou l\'état du serveur.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full filter blur-3xl" />

      {/* Login Card */}
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl glow-cyan flex flex-col gap-8 relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center glow-cyan">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">SmartMonitorAI</h1>
            <p className="text-slate-400 text-sm mt-1">Supervision Industrielle & Analyse Prédictive</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm animate-pulse-slow">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Email field */}
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
              Adresse Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: admin@smartmonitor.com"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-white/5 focus:border-cyan-500 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-medium"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
              Mot de Passe
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-white/5 focus:border-cyan-500 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-medium"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl glow-cyan flex items-center justify-center gap-2 group transition-all duration-300 transform active:scale-95"
          >
            <span>{loading ? 'Connexion en cours...' : 'Se connecter'}</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
        </form>

        {/* Demo Credentials Alert */}
        <div className="text-center bg-white/5 border border-white/5 p-4 rounded-2xl text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Identifiants de démo :</p>
          <p className="mt-1">
            Admin : <span className="text-cyan-400 font-mono">admin@smartmonitor.com</span> / <span className="text-cyan-400 font-mono">admin123</span>
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
