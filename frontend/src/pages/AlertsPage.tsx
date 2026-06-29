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
  Filter,
  Plus,
  X
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

interface Equipment {
  id: number;
  name: string;
}

const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const { subscribe } = useWebSocket();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Résolue'>('Active');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    equipment_id: '',
    type: '',
    severity: 'Moyenne',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchAlerts = async () => {
    try {
      const statusParam = filter === 'All' ? undefined : filter;
      const response = await api.get('/alerts', {
        params: { status: statusParam }
      });
      setAlerts(response.data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipments = async () => {
    try {
      const response = await api.get('/equipments');
      setEquipments(response.data);
    } catch (err) {
      console.error('Failed to load equipments:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  useEffect(() => {
    fetchEquipments();
  }, []);

  // Subscribe to real-time alerts
  useEffect(() => {
    const unsubscribe = subscribe('NEW_ALERT', (newAlert: any) => {
      if (filter === 'All' || (filter === 'Active' && newAlert.status === 'Active')) {
        setAlerts(prev => [newAlert, ...prev]);
      }
    });
    return () => unsubscribe();
  }, [subscribe, filter]);

  const handleCloseAlert = async (id: number) => {
    try {
      await api.put(`/alerts/${id}/close`);
      if (filter === 'Active') {
        setAlerts(prev => prev.filter(a => a.id !== id));
      } else {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'Résolue' } : a));
      }
    } catch (err) {
      console.error('Failed to close alert:', err);
    }
  };

  const handleDeleteAlert = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer définitivement cette alerte ?')) return;
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  const handleOpenModal = () => {
    setFormData({ equipment_id: '', type: '', severity: 'Moyenne', description: '' });
    setFormError('');
    setShowModal(true);
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipment_id || !formData.type || !formData.description) {
      setFormError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/alerts', {
        equipment_id: Number(formData.equipment_id),
        type: formData.type,
        severity: formData.severity,
        description: formData.description
      });
      setShowModal(false);
      // The WebSocket will auto-prepend the new alert, but we also refresh just in case
      fetchAlerts();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erreur lors de la création de l\'alerte.');
    } finally {
      setSubmitting(false);
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
          <p className="text-slate-400 text-sm mt-1">Supervision et clôture des anomalies signalées sur site</p>
        </div>

        <div className="flex items-center gap-3">
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

          {/* Add Alert Button — Technicien uniquement */}
          {user?.role === 'Technicien' && (
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 hover:opacity-90 text-white font-bold text-xs rounded-2xl transition-all shadow-lg shadow-rose-500/20"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Alerte
            </button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl gap-3">
          <Check className="w-12 h-12 text-emerald-500 bg-emerald-500/10 p-3 rounded-full" />
          <p className="text-slate-400 font-semibold">Aucune alerte à afficher</p>
          {user?.role === 'Technicien' && (
            <button
              onClick={handleOpenModal}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:border-rose-500/30 hover:bg-rose-500/10 text-slate-300 hover:text-rose-300 font-bold text-xs rounded-2xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Signaler une anomalie
            </button>
          )}
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
                  alert.severity === 'Critique' ? 'bg-rose-500/10 text-rose-400 animate-pulse' :
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
                      Machine : <strong className="text-slate-300">{alert.equipment_name || `#${alert.equipment_id}`}</strong>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Signalé le : <strong className="text-slate-300">{new Date(alert.created_at).toLocaleString()}</strong>
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

      {/* ── Modal : Créer une alerte manuellement ────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#141824] border border-white/10 rounded-3xl w-full max-w-lg p-8 shadow-2xl shadow-black/50 flex flex-col gap-6">

            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-white">Signaler une Anomalie</h3>
                <p className="text-slate-400 text-xs mt-1">Remplissez les informations de l'alerte à enregistrer</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAlert} className="flex flex-col gap-4">

              {/* Equipment Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Équipement *</label>
                <select
                  value={formData.equipment_id}
                  onChange={e => setFormData(prev => ({ ...prev, equipment_id: e.target.value }))}
                  className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500/40 focus:bg-rose-500/5 transition-all"
                  required
                >
                  <option value="" className="bg-[#141824]">Sélectionner un équipement...</option>
                  {equipments.map(eq => (
                    <option key={eq.id} value={eq.id} className="bg-[#141824]">{eq.name}</option>
                  ))}
                </select>
              </div>

              {/* Alert Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type d'alerte *</label>
                <input
                  type="text"
                  placeholder="Ex : Surchauffe moteur, Vibration anormale..."
                  value={formData.type}
                  onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="bg-white/5 border border-white/10 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500/40 focus:bg-rose-500/5 transition-all"
                  required
                />
              </div>

              {/* Severity */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sévérité *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Basse', 'Moyenne', 'Critique'] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, severity: level }))}
                      className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                        formData.severity === level
                          ? level === 'Critique' ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : level === 'Moyenne' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description *</label>
                <textarea
                  placeholder="Décrivez l'anomalie observée en détail..."
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="bg-white/5 border border-white/10 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500/40 focus:bg-rose-500/5 transition-all resize-none"
                  required
                />
              </div>

              {/* Error */}
              {formError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">{formError}</p>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-sm rounded-xl transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:opacity-90 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-500/20"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer l\'alerte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AlertsPage;
