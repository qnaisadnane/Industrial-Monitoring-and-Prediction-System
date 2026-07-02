import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  Tags, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  AlertTriangle,
  FolderOpen,
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  created_at: string;
}

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setName('');
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setSuccess(null);
    setActionLoading(true);

    try {
      if (editId) {
        // Mode Edition
        await api.put(`/categories/${editId}`, { name: name.trim() });
        setSuccess('Catégorie mise à jour avec succès.');
        setEditId(null);
      } else {
        // Mode Ajout
        await api.post('/categories', { name: name.trim() });
        setSuccess('Catégorie créée avec succès.');
      }
      setName('');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer la catégorie "${cat.name}" ?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await api.delete(`/categories/${cat.id}`);
      setSuccess(`Catégorie "${cat.name}" supprimée avec succès.`);
      fetchCategories();
      if (editId === cat.id) {
        handleCancelEdit();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression de la catégorie.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-4">
          <Tags className="w-12 h-12 text-cyan-400 animate-pulse" />
          <p className="text-slate-400 font-semibold">Chargement des catégories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] pl-64 pr-6 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Gestion des Catégories</h2>
          <p className="text-slate-400 text-sm mt-1">Configurer la liste des catégories d'équipements du parc machine</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm rounded-xl">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-xl">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Category List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-cyan-400" />
              Catégories Enregistrées
            </h3>
            
            {categories.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                Aucune catégorie enregistrée.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Nom de la catégorie</th>
                      <th className="py-3 px-4">Date de création</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-white/5 transition-colors group">
                        <td className="py-3.5 px-4 text-white font-semibold">
                          {cat.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          {new Date(cat.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(cat)}
                              className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(cat)}
                              className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/10 text-rose-400 hover:text-rose-200 hover:bg-rose-950/20 transition-all"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-5 border border-white/5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Tags className="w-5 h-5 text-cyan-400" />
              {editId ? 'Modifier la Catégorie' : 'Ajouter une Catégorie'}
            </h3>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Nom de la catégorie
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Turbine, Compresseur..."
                  className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm"
                />
              </div>

              <div className="flex gap-3 mt-2">
                {editId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all text-sm"
                  >
                    Annuler
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={actionLoading || !name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl glow-cyan transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!editId && <Plus className="w-4 h-4" />}
                  <span>{editId ? 'Sauvegarder' : 'Enregistrer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CategoriesPage;
