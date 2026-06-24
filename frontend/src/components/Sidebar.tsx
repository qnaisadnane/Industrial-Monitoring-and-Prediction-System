import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { 
  LayoutDashboard, 
  Cpu, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  LogOut,
  Activity
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'both' },
    { to: '/equipments', label: 'Équipements', icon: Cpu, role: 'both' },
    { to: '/alerts', label: 'Alertes', icon: AlertTriangle, role: 'both' },
    { to: '/predictions', label: 'Prédictions IA', icon: TrendingUp, role: 'both' },
    { to: '/users', label: 'Utilisateurs', icon: Users, role: 'Administrateur' },
  ];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 glass-panel border-r border-white/5 flex flex-col justify-between py-6 px-4 z-40">
      <div className="flex flex-col gap-8">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center glow-cyan">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">SmartMonitor</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Industrial IoT</p>
          </div>
        </div>

        {/* Real-Time Connection Indicator */}
        <div className="mx-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Flux temps réel :</span>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse glow-green' : 'bg-rose-500'}`} />
            <span className="font-bold text-white">{isConnected ? 'Connecté' : 'Erreur'}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            // Role verification
            if (item.role !== 'both' && user?.role !== item.role) return null;
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium ${
                    isActive 
                      ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 text-cyan-400 border-l-4 border-cyan-400 pl-3' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-5 h-5 transition-transform group-hover:scale-105" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Session Info & Logout */}
      <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sm font-bold text-cyan-400">
            {user?.fullname.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user?.fullname}</p>
            <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {user?.role === 'Administrateur' ? 'Admin' : 'Tech'}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-semibold">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
