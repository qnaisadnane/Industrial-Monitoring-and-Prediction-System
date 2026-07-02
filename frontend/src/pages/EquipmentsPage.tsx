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
  RotateCcw,
  Settings2,
  MessageSquare,
  ChevronDown,
  Search,
  Filter,
  Tag
} from 'lucide-react';

interface Equipment {
  id: number;
  name: string;
  type: string;
  location: string;
  status: 'En fonctionnement' | 'Arrêté' | 'Maintenance' | 'Anomalie';
  installation_date: string;
  comment?: string;
}

type StatusType = 'En fonctionnement' | 'Arrêté' | 'Maintenance' | 'Anomalie';

const STATUS_CONFIG: Record<StatusType, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  'En fonctionnement': {
    label: 'En fonctionnement',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  'Maintenance': {
    label: 'Maintenance',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: <RotateCcw className="w-3.5 h-3.5" />,
  },
  'Anomalie': {
    label: 'Anomalie',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  'Arrêté': {
    label: 'Arrêté',
    color: 'text-slate-400',
    bg: 'bg-slate-800',
    border: 'border-slate-700/50',
    icon: <Play className="w-3.5 h-3.5" />,
  },
};

const VALID_STATUSES: StatusType[] = ['En fonctionnement', 'Arrêté', 'Maintenance', 'Anomalie'];

const EquipmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<StatusType | null>(null);
  const [categoriesList, setCategoriesList] = useState<{ id: number; name: string }[]>([]);

  // --- Admin Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [status, setStatus] = useState<StatusType>('En fonctionnement');
  const [error, setError] = useState<string | null>(null);

  // --- Technician Status Modal State ---
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTargetEquipment, setStatusTargetEquipment] = useState<Equipment | null>(null);
  const [newStatus, setNewStatus] = useState<StatusType>('En fonctionnement');
  const [techComment, setTechComment] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState(false);

  const fetchEquipments = async () => {
    try {
      const response = await api.get('/equipments');
      setEquipments(response.data);
    } catch (err) {
      console.error('Failed to load equipments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategoriesList(response.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    fetchEquipments();
    fetchCategories();
  }, []);

  // ──────────────────────────────────────────────
  // Admin CRUD handlers
  // ──────────────────────────────────────────────
  const openAddModal = () => {
    setEditId(null);
    setName(''); setType(''); setLocation('');
    setInstallationDate(''); setStatus('En fonctionnement');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (eq: Equipment) => {
    setEditId(eq.id);
    setName(eq.name); setType(eq.type); setLocation(eq.location);
    setInstallationDate(eq.installation_date ? eq.installation_date.substring(0, 10) : '');
    setStatus(eq.status);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = { name, type, location, installation_date: installationDate, status };
    try {
      if (editId) {
        await api.put(`/equipments/${editId}`, payload);
      } else {
        await api.post('/equipments', payload);
      }
      fetchEquipments();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde de l'équipement.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet équipement ? Toutes les mesures et alertes associées seront supprimées.')) return;
    try {
      await api.delete(`/equipments/${id}`);
      fetchEquipments();
    } catch (err) {
      console.error('Failed to delete equipment:', err);
    }
  };

  // ──────────────────────────────────────────────
  // Technician Status Update handlers
  // ──────────────────────────────────────────────
  const openStatusModal = (eq: Equipment) => {
    setStatusTargetEquipment(eq);
    setNewStatus(eq.status);
    setTechComment(eq.comment || '');
    setStatusError(null);
    setStatusSuccess(false);
    setIsStatusModalOpen(true);
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusTargetEquipment) return;
    setStatusError(null);
    setStatusLoading(true);
    try {
      await api.patch(`/equipments/${statusTargetEquipment.id}/status`, { status: newStatus });
      if (techComment.trim()) {
        await api.patch(`/equipments/${statusTargetEquipment.id}/comment`, { comment: techComment.trim() });
      }
      setStatusSuccess(true);
      fetchEquipments();
      setTimeout(() => setIsStatusModalOpen(false), 1200);
    } catch (err: any) {
      setStatusError(err.response?.data?.message || 'Erreur lors de la mise à jour du statut.');
    } finally {
      setStatusLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  // Render helpers
  // ──────────────────────────────────────────────
  const StatusPill = ({ s }: { s: StatusType }) => {
    const cfg = STATUS_CONFIG[s];
    return (
      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full flex items-center gap-1.5 ${cfg.bg} ${cfg.color} border ${cfg.border} ${s === 'Anomalie' ? 'animate-pulse' : ''}`}>
        {cfg.icon}{cfg.label}
      </span>
    );
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

  // Catégories uniques configurées + celles utilisées par des équipements
  const categories = Array.from(
    new Set([
      ...categoriesList.map((cat) => cat.name),
      ...equipments.map((eq) => eq.type)
    ])
  ).filter(Boolean).sort();

  const isFiltered = searchQuery !== '' || filterCategory !== null || filterStatus !== null;

  const filteredEquipments = equipments.filter((eq) => {
    const matchName = eq.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory === null || eq.type === filterCategory;
    const matchStatus = filterStatus === null || eq.status === filterStatus;
    return matchName && matchCat && matchStatus;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCategory(null);
    setFilterStatus(null);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] pl-64 pr-6 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Supervision du Parc</h2>
          <p className="text-slate-400 text-sm mt-1">Gérer et superviser l'état opérationnel de vos machines</p>
        </div>
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 pointer-events-none" style={{ width: '1.1rem', height: '1.1rem' }} />
        <input
          id="equipment-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un équipement par nom..."
          className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            title="Effacer la recherche"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Filter by Category ── */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5" />
            Catégorie
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                filterCategory === null
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              Toutes
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  filterCategory === cat
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter by Status ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          État opérationnel
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              filterStatus === null
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            Tous
          </button>
          {VALID_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const isActive = filterStatus === s;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(isActive ? null : s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  isActive
                    ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-1 ring-current/30`
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                } ${s === 'Anomalie' && isActive ? 'animate-pulse' : ''}`}
              >
                {cfg.icon}
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active filter summary bar ── */}
      {isFiltered && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl -mt-2">
          <p className="text-xs text-slate-400">
            <span className="text-white font-bold">{filteredEquipments.length}</span>
            {` équipement${filteredEquipments.length !== 1 ? 's' : ''} affiché${filteredEquipments.length !== 1 ? 's' : ''}`}
            {filterCategory && <span> · catégorie <span className="text-indigo-300 font-semibold">{filterCategory}</span></span>}
            {filterStatus && <span> · état <span className={`font-semibold ${STATUS_CONFIG[filterStatus].color}`}>{filterStatus}</span></span>}
          </p>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white font-semibold transition-all"
          >
            <X className="w-3 h-3" /> Réinitialiser
          </button>
        </div>
      )}

      {/* Equipments Grid */}
      {filteredEquipments.length === 0 && isFiltered ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
            <Search className="w-7 h-7 text-slate-600" />
          </div>
          <div>
            <p className="text-white font-bold text-lg">Aucun équipement trouvé</p>
            <p className="text-slate-500 text-sm mt-1">Aucune machine ne correspond aux filtres appliqués.</p>
          </div>
          <button
            onClick={resetFilters}
            className="mt-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-sm font-semibold rounded-xl transition-all"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEquipments.map((eq) => (
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
              <StatusPill s={eq.status} />
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
              {eq.comment && (
                <div className="flex items-start gap-2 mt-1 p-2.5 bg-white/5 rounded-lg border border-white/5">
                  <MessageSquare className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300 italic leading-relaxed">{eq.comment}</span>
                </div>
              )}
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

            {/* Actions for Technician */}
            {user?.role === 'Technicien' && (
              <div className="border-t border-white/5 pt-4">
                <button
                  onClick={() => openStatusModal(eq)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 hover:from-indigo-500/30 hover:to-cyan-500/30 border border-indigo-500/20 hover:border-cyan-500/30 text-cyan-300 font-bold rounded-xl transition-all text-sm active:scale-95"
                  title="Modifier l'état"
                >
                  <Settings2 className="w-4 h-4" />
                  Modifier l'état
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {/* ══════════════════════════════════════════
          Admin : Add / Edit Modal
      ══════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-lg glass-panel p-8 rounded-3xl glow-cyan flex flex-col gap-6 relative animate-pulse-slow">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-xl font-bold text-white">
                {editId ? "Modifier l'Équipement" : 'Enregistrer une Machine'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm rounded-xl">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Nom de la machine</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Convoyeur A-12"
                  className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Catégorie</label>
                  <select 
                    required 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm"
                  >
                    <option value="" disabled>Choisir une catégorie...</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Localisation / Zone</label>
                  <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ex: Atelier 4, Zone Nord"
                    className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Date d'installation</label>
                  <input type="date" required value={installationDate} onChange={(e) => setInstallationDate(e.target.value)}
                    className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm text-slate-400" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">État opérationnel</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as StatusType)}
                    className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm">
                    {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-white/5 pt-5 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all">Annuler</button>
                <button type="submit" className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl glow-cyan transition-all">Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Technicien : Modifier l'état Modal
      ══════════════════════════════════════════ */}
      {isStatusModalOpen && statusTargetEquipment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md glass-panel p-8 rounded-3xl flex flex-col gap-6 relative" style={{ boxShadow: '0 0 40px rgba(99,102,241,0.25)' }}>
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Modifier l'état</h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{statusTargetEquipment.name}</p>
                </div>
              </div>
              <button onClick={() => setIsStatusModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current status display */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">État actuel</span>
              <StatusPill s={statusTargetEquipment.status} />
            </div>

            {/* Error */}
            {statusError && (
              <div className="flex items-center gap-2.5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm rounded-xl">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            {/* Success */}
            {statusSuccess && (
              <div className="flex items-center gap-2.5 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-xl">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>Statut mis à jour avec succès !</span>
              </div>
            )}

            <form onSubmit={handleStatusUpdate} className="flex flex-col gap-5">
              {/* New Status */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Nouvel état</label>
                <div className="grid grid-cols-2 gap-2">
                  {VALID_STATUSES.map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const isSelected = newStatus === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewStatus(s)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          isSelected
                            ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-1 ring-offset-0 ring-offset-transparent ring-current scale-[1.02]`
                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {cfg.icon}
                        <span>{s}</span>
                        {isSelected && <ChevronDown className="w-3.5 h-3.5 ml-auto rotate-[-90deg]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Commentaire <span className="text-slate-600 normal-case font-normal">(optionnel)</span>
                </label>
                <textarea
                  rows={3}
                  value={techComment}
                  onChange={(e) => setTechComment(e.target.value)}
                  placeholder="Décrire l'intervention, la cause du changement..."
                  className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-white text-sm resize-none leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={statusLoading || statusSuccess || newStatus === statusTargetEquipment.status}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-600 hover:from-indigo-400 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-sm"
                >
                  {statusLoading ? (
                    <><RotateCcw className="w-4 h-4 animate-spin" /> Mise à jour...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Confirmer</>
                  )}
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
