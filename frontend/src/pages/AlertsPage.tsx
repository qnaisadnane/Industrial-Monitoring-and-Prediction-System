import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { 
  AlertTriangle, 
  Check, 
  Trash2, 
  Clock, 
  Cpu,
  Filter
} from 'lucide-react';

interface Alert {
  id: number;
  equipment_id: number;
  equipment_name: string;
  type: string;
  severity: 'Basse' | 'Moyenne' | 'Critique';
  description: string;
  status: 'Active' | 'Résolue';
  created_at: string;
}

const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const { subscribe } = useWebSocket();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Résolue'>('Active');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const statusParam = filter === 'All' ? undefined : filter;
      const response = await api.get('/alerts', {
        params: { status: statusParam }
      });
      setAlerts(response.data);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  // Subscribe to real-time alerts
  useEffect(() => {
    const unsubscribe = subscribe('NEW_ALERT', (newAlert: any) => {
      // Fetch alerts again or prepend if it matches the current filter
      if (filter === 'All' || (filter === 'Active' && newAlert.status === 'Active')) {
        setAlerts(prev => [newAlert, ...prev]);
      }
    });

    return () => unsubscribe();
  }, [subscribe, filter]);

  const handleCloseAlert = async (id: number) => {
    try {
      await api.put(`/alerts/${id}/close`);
      // Update state locally
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'Résolue' } : a));
      // Re-filter if current view is Active
      if (filter === 'Active') {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to close alert:", err);
    }
  };

  const handleDeleteAlert = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer définitivement cette alerte de l\'historique ?')) {
      return;
    }
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="w-12 h-12 text-rose-500 animate-bounce" />
          <p className="text-slate-400 font-semibold">Chargement des alertes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] pl-64 pr-6 py-8 flex flex-col gap-8">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Journal des Alertes</h2>
          <p className="text-slate-400 text-sm mt-1">Supervision et clôture des anomalies détectées sur site</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/5 p-1.5 rounded-2xl">
          <Filter className="w-4 h-4 text-slate-400 ml-3" />
          <button
            onClick={() => setFilter('Active')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              filter === 'Active' 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/10' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Actives
          </button>
          <button
            onClick={() => setFilter('Résolue')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              filter === 'Résolue' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/10' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Résolues
          </button>
          <button
            onClick={() => setFilter('All')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              filter === 'All' 
                ? 'bg-white/10 text-white' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Toutes
          </button>
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl gap-3">
          <Check className="w-12 h-12 text-emerald-500 bg-emerald-500/10 p-3 rounded-full glow-green" />
          <p className="text-slate-400 font-semibold">Aucune alerte à afficher</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`glass-card rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden border-l-4 ${
                alert.status === 'Résolue' ? 'border-l-slate-600' :
                alert.severity === 'Critique' ? 'border-l-rose-500' :
                alert.severity === 'Moyenne' ? 'border-l-amber-500' :
                'border-l-sky-500'
              }`}
            >
              {/* Left Side Info */}
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  alert.status === 'Résolue' ? 'bg-slate-800 text-slate-400' :
                  alert.severity === 'Critique' ? 'bg-rose-500/10 text-rose-400 glow-red animate-pulse' :
                  alert.severity === 'Moyenne' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-sky-500/10 text-sky-400'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-white text-base">{alert.type}</h4>
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                      alert.status === 'Résolue' ? 'bg-slate-800 text-slate-400' :
                      alert.severity === 'Critique' ? 'bg-rose-500/10 text-rose-400' :
                      alert.severity === 'Moyenne' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-sky-500/10 text-sky-400'
                    }`}>
                      {alert.severity}
                    </span>
                    {alert.status === 'Résolue' && (
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-extrabold rounded-full border border-emerald-500/10">
                        Clôturée
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm">{alert.description}</p>
                  
                  {/* Equipment & Date details */}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Cpu className="w-3.5 h-3.5" />
                      ID Machine : <strong className="text-slate-300">{alert.equipment_name || `#${alert.equipment_id}`}</strong>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Détecté le : <strong className="text-slate-300">{new Date(alert.created_at).toLocaleString()}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side Buttons */}
              {alert.status === 'Active' && (
                <div className="flex gap-2 self-end md:self-auto">
                  <button
                    onClick={() => handleCloseAlert(alert.id)}
                    className="flex items-center gap-1 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/10 hover:border-emerald-500/20 font-bold text-xs rounded-xl transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Clôturer</span>
                  </button>
                  
                  {user?.role === 'Administrateur' && (
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {alert.status === 'Résolue' && user?.role === 'Administrateur' && (
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition-all self-end md:self-auto"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default AlertsPage;
