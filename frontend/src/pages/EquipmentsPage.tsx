import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  MapPin, 
  Calendar, 
  Cpu, 
  X,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw
} from 'lucide-react';

interface Equipment {
  id: number;
  name: string;
  type: string;
  location: string;
  status: 'En fonctionnement' | 'Arrêté' | 'Maintenance' | 'Anomalie';
  installation_date: string;
}

const EquipmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [status, setStatus] = useState<'En fonctionnement' | 'Arrêté' | 'Maintenance' | 'Anomalie'>('En fonctionnement');
  
  const [error, setError] = useState<string | null>(null);

  const fetchEquipments = async () => {
    try {
      const response = await api.get('/equipments');
      setEquipments(response.data);
    } catch (err) {
      console.error("Failed to load equipments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  const openAddModal = () => {
    setEditId(null);
    setName('');
    setType('');
    setLocation('');
    setInstallationDate('');
    setStatus('En fonctionnement');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (eq: Equipment) => {
    setEditId(eq.id);
    setName(eq.name);
    setType(eq.type);
    setLocation(eq.location);
    // Format date string to YYYY-MM-DD
    const dateFormatted = eq.installation_date ? eq.installation_date.substring(0, 10) : '';
    setInstallationDate(dateFormatted);
    setStatus(eq.status);
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      name,
      type,
      location,
      installation_date: installationDate,
      status
    };

    try {
      if (editId) {
        // Edit mode
        await api.put(`/equipments/${editId}`, payload);
      } else {
        // Add mode
        await api.post('/equipments', payload);
      }
      fetchEquipments();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde de l\'équipement.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet équipement ? Toutes les mesures et alertes associées seront supprimées.')) {
      return;
    }
    try {
      await api.delete(`/equipments/${id}`);
      fetchEquipments();
    } catch (err) {
      console.error("Failed to delete equipment:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-4">
          <Cpu className="w-12 h-12 text-cyan-400 animate-pulse" />
          <p className="text-slate-400 font-semibold">Chargement du parc machine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] pl-64 pr-6 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Supervision du Parc</h2>
          <p className="text-slate-400 text-sm mt-1">Gérer et superviser l'état opérationnel de vos machines</p>
        </div>

        {/* Register equipment button (Admin only) */}
        {user?.role === 'Administrateur' && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-2xl glow-cyan transition-all transform active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Enregistrer une Machine</span>
          </button>
        )}
      </div>

      {/* Equipments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {equipments.map((eq) => (
          <div key={eq.id} className="glass-card rounded-2xl p-6 flex flex-col gap-6 relative overflow-hidden group">
            {/* Top Info */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-cyan-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base truncate max-w-[150px]">{eq.name}</h3>
                  <span className="text-xs text-slate-500 font-medium">{eq.type}</span>
                </div>
              </div>

              {/* Status pill */}
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full flex items-center gap-1.5 ${
                eq.status === 'En fonctionnement' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                eq.status === 'Maintenance' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                eq.status === 'Anomalie' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10 animate-pulse' :
                'bg-slate-800 text-slate-400 border border-slate-700/50'
              }`}>
                {eq.status === 'En fonctionnement' && <CheckCircle className="w-3.5 h-3.5" />}
                {eq.status === 'Maintenance' && <RotateCcw className="w-3.5 h-3.5" />}
                {eq.status === 'Anomalie' && <AlertTriangle className="w-3.5 h-3.5" />}
                {eq.status === 'Arrêté' && <Play className="w-3.5 h-3.5" />}
                {eq.status}
              </span>
            </div>

            {/* Middle Details */}
            <div className="flex flex-col gap-2.5 text-xs text-slate-400 border-t border-white/5 pt-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span>Atelier : <strong className="text-white font-semibold">{eq.location}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>Mis en service le : <strong className="text-white font-semibold">{new Date(eq.installation_date).toLocaleDateString()}</strong></span>
              </div>
            </div>

            {/* Actions for Admin */}
            {user?.role === 'Administrateur' && (
              <div className="flex justify-end gap-2 border-t border-white/5 pt-4">
                <button
                  onClick={() => openEditModal(eq)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(eq.id)}
                  className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/10 text-rose-400 hover:text-rose-200 hover:bg-rose-950/20 transition-all"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-lg glass-panel p-8 rounded-3xl glow-cyan flex flex-col gap-6 relative animate-pulse-slow">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-xl font-bold text-white">
                {editId ? 'Modifier l\'Équipement' : 'Enregistrer une Machine'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm rounded-xl">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Nom de la machine</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Convoyeur A-12"
                  className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm"
                />
              </div>

              {/* Type & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Catégorie</label>
                  <input
                    type="text"
                    required
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="ex: Moteur, Turbine..."
                    className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Localisation / Zone</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="ex: Atelier 4, Zone Nord"
                    className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm"
                  />
                </div>
              </div>

              {/* Date & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Date d'installation</label>
                  <input
                    type="date"
                    required
                    value={installationDate}
                    onChange={(e) => setInstallationDate(e.target.value)}
                    className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm text-slate-400"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">État opérationnel</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm"
                  >
                    <option value="En fonctionnement">En fonctionnement</option>
                    <option value="Arrêté">Arrêté</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Anomalie">Anomalie</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 border-t border-white/5 pt-5 mt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl glow-cyan transition-all"
                >
                  Sauvegarder
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default EquipmentsPage;
