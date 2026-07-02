import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import api from '../services/api';
import {
  LayoutDashboard,
  Cpu,
  AlertTriangle,
  TrendingUp,
  Users,
  LogOut,
  Activity,
  Tags,
  Bell,
  BellRing,
  X
} from 'lucide-react';

interface NotificationItem {
  id: number;
  message: string;
  read_status: boolean;
  created_at: string;
}

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected, subscribe } = useWebSocket();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        setNotifications(response.data || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };

    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribe('NEW_NOTIFICATION', (payload: any) => {
      const notification: NotificationItem = {
        id: payload.id,
        message: payload.message,
        read_status: Boolean(payload.read_status),
        created_at: payload.created_at || new Date().toISOString()
      };

      setNotifications(prev => [notification, ...prev].slice(0, 20));
      setToastNotification(notification);
      setShowNotifications(true);
    });

    return () => unsubscribe();
  }, [subscribe, user]);

  useEffect(() => {
    if (!toastNotification) return;

    const timer = window.setTimeout(() => setToastNotification(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastNotification]);

  const unreadCount = notifications.filter((notification) => !notification.read_status).length;

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'both' },
    { to: '/equipments', label: 'Équipements', icon: Cpu, role: 'both' },
    { to: '/categories', label: 'Catégories', icon: Tags, role: 'Administrateur' },
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
        <div className="relative">
          <button
            onClick={() => setShowNotifications((value) => !value)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-slate-200 hover:bg-white/5 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              {unreadCount > 0 ? <BellRing className="w-5 h-5 text-cyan-400" /> : <Bell className="w-5 h-5 text-slate-400" />}
              <span className="font-semibold">Notifications</span>
            </div>
            {unreadCount > 0 && (
              <span className="min-w-6 h-6 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute bottom-16 left-0 right-0 rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl p-3 z-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">Dernières notifications</span>
                <button onClick={() => setShowNotifications(false)} className="p-1 rounded-lg text-slate-400 hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto flex flex-col gap-2">
                {notifications.length === 0 ? (
                  <div className="text-sm text-slate-400 py-2">Aucune notification pour le moment.</div>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-sm text-slate-300">
                      <p className="font-medium text-white">{notification.message}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(notification.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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

      {toastNotification && (
        <div className="fixed right-6 bottom-6 z-[60] max-w-sm rounded-2xl border border-cyan-500/20 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
          <p className="text-sm font-semibold text-cyan-400">Nouvelle notification</p>
          <p className="text-sm text-slate-200 mt-1">{toastNotification.message}</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
