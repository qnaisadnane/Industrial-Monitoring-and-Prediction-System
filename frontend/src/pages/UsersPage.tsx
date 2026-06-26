import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Shield, 
  Mail, 
  User, 
  Lock,
  X,
  AlertTriangle
} from 'lucide-react';

interface UserItem {
  id: number;
  fullname: string;
  email: string;
  role: 'Administrateur' | 'Technicien';
  created_at: string;
}

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Administrateur' | 'Technicien'>('Technicien');

  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setEditId(null);
    setFullname('');
    setEmail('');
    setPassword('');
    setRole('Technicien');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserItem) => {
    setEditId(u.id);
    setFullname(u.fullname);
    setEmail(u.email);
    setPassword(''); // Leave password blank on edit unless modifying it
    setRole(u.role);
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: any = {
      fullname,
      email,
      role
    };
    
    if (password) {
      payload.password = password;
    } else if (!editId) {
      // Password is required for new users
      setError('Le mot de passe est obligatoire pour un nouvel utilisateur.');
      return;
    }

    try {
      if (editId) {
        await api.put(`/users/${editId}`, payload);
      } else {
        await api.post('/users', payload);
      }
      fetchUsers();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde de l\'utilisateur.');
    }
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser?.id) {
      alert("Vous ne pouvez pas supprimer votre propre compte !");
      return;
    }
    if (!window.confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) {
      return;
    }
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-4">
          <Users className="w-12 h-12 text-cyan-400 animate-pulse" />
          <p className="text-slate-400 font-semibold">Chargement de la gestion d'accès...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] pl-64 pr-6 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Gestion des Utilisateurs</h2>
          <p className="text-slate-400 text-sm mt-1">Gérer les comptes autorisés à se connecter au système de supervision</p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-2xl glow-cyan transition-all transform active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          <span>Ajouter un Utilisateur</span>
        </button>
      </div>

      {/* Users table */}
      <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3 pl-2">Nom Complet</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Rôle / Privilèges</th>
                <th className="pb-3">Enregistré le</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/2 hover:bg-white/2 transition-colors">
                  <td className="py-4 pl-2 font-bold text-white flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-cyan-400 text-sm">
                      {u.fullname.charAt(0).toUpperCase()}
                    </div>
                    {u.fullname} {u.id === currentUser?.id && <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-bold px-2 py-0.5 rounded-full border border-cyan-500/10 ml-2">Vous</span>}
                  </td>
                  <td className="py-4 text-slate-400">
                    {u.email}
                  </td>
                  <td className="py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 w-max ${
                      u.role === 'Administrateur' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10' :
                      'bg-slate-800 text-slate-400 border border-slate-700/50'
                    }`}>
                      <Shield className="w-3.5 h-3.5" />
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 text-slate-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-right pr-2">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === currentUser?.id}
                        className={`p-2 rounded-xl bg-rose-500/10 border border-rose-500/10 text-rose-400 hover:text-rose-200 hover:bg-rose-950/20 transition-all ${
                          u.id === currentUser?.id ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-lg glass-panel p-8 rounded-3xl glow-cyan flex flex-col gap-6 relative animate-pulse-slow">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-xl font-bold text-white">
                {editId ? 'Modifier l\'Utilisateur' : 'Créer un Compte'}
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
              {/* Fullname */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    placeholder="ex: Safi Yassine"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Adresse email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: safi@smartmonitor.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Mot de passe {editId && <span className="text-slate-500 font-normal lowercase">(laisser vide si inchangé)</span>}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="password"
                    required={!editId}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm"
                  />
                </div>
              </div>

              {/* Role select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Rôle et Niveau d'accès</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="px-4 py-3.5 bg-slate-900 border border-white/5 rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 text-white text-sm"
                >
                  <option value="Technicien">Technicien (Accès Lecture, Clôture Alertes)</option>
                </select>
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

export default UsersPage;
