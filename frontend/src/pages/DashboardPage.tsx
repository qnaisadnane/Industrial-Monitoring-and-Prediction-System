import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Cpu,
  AlertTriangle,
  Activity,
  CheckCircle,
  Clock,
  Compass,
  Download,
  Thermometer,
  Wrench,
  ShieldCheck
} from 'lucide-react';

interface Stats {
  total_equipments: number;
  active_alerts: number;
  resolved_alerts: number;
  running_equipments: number;
  maintenance_equipments: number;
  availability_rate: number;
  avg_temperature: number;
}

const DashboardPage: React.FC = () => {
  const { subscribe } = useWebSocket();
  const [stats, setStats] = useState<Stats>({
    total_equipments: 0,
    active_alerts: 0,
    resolved_alerts: 0,
    running_equipments: 0,
    maintenance_equipments: 0,
    availability_rate: 0,
    avg_temperature: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await api.get('/dashboard/stats');
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Mise à jour de la température moyenne en temps réel
  useEffect(() => {
    const unsubscribe = subscribe('NEW_MEASUREMENTS', (payload: any[]) => {
      if (payload.length === 0) return;
      const avg = payload.reduce((sum, item) => sum + parseFloat(item.temperature), 0) / payload.length;
      setStats(prev => ({ ...prev, avg_temperature: parseFloat(avg.toFixed(1)) }));
    });
    return () => unsubscribe();
  }, [subscribe]);

  // Incrémenter le compteur d'alertes actives en temps réel
  useEffect(() => {
    const unsubscribe = subscribe('NEW_ALERT', () => {
      setStats(prev => ({ ...prev, active_alerts: prev.active_alerts + 1 }));
    });
    return () => unsubscribe();
  }, [subscribe]);

  const handleExportReport = async () => {
    try {
      const response = await api.get('/reports/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Rapport_Supervision_SmartMonitor.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error("Erreur lors de l'exportation du rapport :", error);
      alert('Impossible de télécharger le rapport.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-cyan-400 animate-spin" />
          <p className="text-slate-400 font-semibold">Chargement des données de supervision...</p>
        </div>
      </div>
    );
  }

  // Couleur dynamique pour la température
  const tempColor =
    stats.avg_temperature >= 80 ? 'text-rose-400' :
    stats.avg_temperature >= 65 ? 'text-amber-400' :
    'text-emerald-400';

  const tempBg =
    stats.avg_temperature >= 80 ? 'bg-rose-500/10 text-rose-400' :
    stats.avg_temperature >= 65 ? 'bg-amber-500/10 text-amber-400' :
    'bg-emerald-500/10 text-emerald-400';

  const tempLabel =
    stats.avg_temperature >= 80 ? '🔥 Température critique' :
    stats.avg_temperature >= 65 ? '⚠️ Température élevée' :
    '✅ Température normale';

  return (
    <div className="min-h-screen bg-[#0b0f19] pl-64 pr-6 py-8 flex flex-col gap-8">

      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Tableau de Bord</h2>
          <p className="text-slate-400 text-sm mt-1">Supervision en temps réel du parc machines</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-300 hover:text-white text-sm font-semibold rounded-2xl transition-all duration-200"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Exporter Rapport CSV</span>
          </button>
          <div className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2.5 rounded-2xl">
            <Clock className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="text-sm font-semibold text-white">Live Monitoring actif</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid — 3 colonnes sur grand écran */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* 1. Taux de Disponibilité */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Taux de Disponibilité</span>
            <span className="text-3xl font-extrabold text-white">{stats.availability_rate}%</span>
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> {stats.running_equipments} machines actives
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Compass className="w-6 h-6" />
          </div>
        </div>

        {/* 2. Alertes Actives */}
        <div className={`glass-card p-6 rounded-2xl flex items-center justify-between ${stats.active_alerts > 0 ? 'border-rose-500/20' : ''}`}>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alertes Actives</span>
            <span className={`text-3xl font-extrabold ${stats.active_alerts > 0 ? 'text-rose-400' : 'text-white'}`}>
              {stats.active_alerts}
            </span>
            <span className={`text-[10px] font-bold ${stats.active_alerts > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`}>
              {stats.active_alerts > 0 ? '⚠️ Action requise' : 'Aucune anomalie'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.active_alerts > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* 3. Température Moyenne */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Temp. Moyenne Capteurs</span>
            <span className={`text-3xl font-extrabold ${tempColor}`}>
              {stats.avg_temperature} °C
            </span>
            <span className="text-[10px] font-bold text-slate-400">{tempLabel}</span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tempBg}`}>
            <Thermometer className="w-6 h-6" />
          </div>
        </div>

        {/* 4. Parc Machines */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parc Machines</span>
            <span className="text-3xl font-extrabold text-white">{stats.total_equipments}</span>
            <span className="text-[10px] text-slate-400 font-bold">Équipements supervisés</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        {/* 5. Alertes Résolues */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alertes Résolues</span>
            <span className="text-3xl font-extrabold text-emerald-400">{stats.resolved_alerts}</span>
            <span className="text-[10px] text-emerald-400 font-bold">Incidents clôturés</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* 6. Équipements en Maintenance */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Maintenance</span>
            <span className={`text-3xl font-extrabold ${stats.maintenance_equipments > 0 ? 'text-amber-400' : 'text-white'}`}>
              {stats.maintenance_equipments}
            </span>
            <span className={`text-[10px] font-bold ${stats.maintenance_equipments > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
              {stats.maintenance_equipments > 0 ? '🔧 Interventions en cours' : 'Aucune maintenance'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.maintenance_equipments > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
            <Wrench className="w-6 h-6" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
