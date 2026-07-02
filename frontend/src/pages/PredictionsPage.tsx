import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
  Cpu,
  Plus,
  X,
  Trash2,
  Calendar,
  User,
  ShieldAlert,
  TrendingUp,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

type RiskLevel = 'Faible' | 'Moyen' | 'Élevé';

interface Prediction {
  id: number;
  equipment_id: number;
  equipment_name: string;
  technicien_name: string;
  risk_level: RiskLevel;
  estimated_failure_date: string;
  justification: string;
  created_at: string;
}

interface Equipment {
  id: number;
  name: string;
}

const riskConfig: Record<RiskLevel, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  Faible: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: <CheckCircle className="w-4 h-4" />,
    label: 'Faible'
  },
  Moyen: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Moyen'
  },
  Élevé: {
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    icon: <ShieldAlert className="w-4 h-4" />,
    label: 'Élevé'
  }
};

const PredictionsPage: React.FC = () => {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    equipment_id: '',
    risk_level: 'Moyen' as RiskLevel,
    estimated_failure_date: '',
    justification: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Filter
  const [filterRisk, setFilterRisk] = useState<'Tous' | RiskLevel>('Tous');

  const fetchData = async () => {
    try {
      const [predRes, equipRes] = await Promise.all([
        api.get('/predictions'),
        api.get('/equipments')
      ]);
      setPredictions(predRes.data);
      setEquipments(equipRes.data);
    } catch (err) {
      console.error('Failed to load predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    setFormData({ equipment_id: '', risk_level: 'Moyen', estimated_failure_date: '', justification: '' });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipment_id || !formData.estimated_failure_date || !formData.justification.trim()) {
      setFormError('Tous les champs sont obligatoires.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await api.post('/predictions', {
        equipment_id: Number(formData.equipment_id),
        risk_level: formData.risk_level,
        estimated_failure_date: formData.estimated_failure_date,
        justification: formData.justification
      });
      setPredictions(prev => [res.data, ...prev]);
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette évaluation définitivement ?')) return;
    try {
      await api.delete(`/predictions/${id}`);
      setPredictions(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete prediction:', err);
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const title = 'Rapport des évaluations de risques';
    const now = new Date().toLocaleString('fr-FR');

    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le ${now}`, 14, 28);

    let y = 40;
    const pageHeight = doc.internal.pageSize.height;

    filtered.forEach((prediction, index) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`${index + 1}. ${prediction.equipment_name}`, 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Risque: ${prediction.risk_level}`, 16, y);
      y += 6;
      doc.text(`Date estimée: ${new Date(prediction.estimated_failure_date).toLocaleDateString('fr-FR')}`, 16, y);
      y += 6;
      doc.text(`Technicien: ${prediction.technicien_name}`, 16, y);
      y += 6;
      const justification = doc.splitTextToSize(prediction.justification, 180);
      doc.text(justification, 16, y);
      y += 10 + justification.length * 5;
      if (y > pageHeight - 18) {
        doc.addPage();
        y = 20;
      }
    });

    if (filtered.length === 0) {
      doc.setFontSize(11);
      doc.text('Aucune évaluation à exporter.', 14, y);
    }

    doc.save('evaluations-risques.pdf');
  };

  const filtered = filterRisk === 'Tous' ? predictions : predictions.filter(p => p.risk_level === filterRisk);

  // KPI counts
  const countByRisk = (level: RiskLevel) => predictions.filter(p => p.risk_level === level).length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-4">
          <TrendingUp className="w-12 h-12 text-cyan-400 animate-pulse" />
          <p className="text-slate-400 font-semibold">Chargement des évaluations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] pl-64 pr-6 py-8 flex flex-col gap-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Évaluations de Risques</h2>
          <p className="text-slate-400 text-sm mt-1">Signalement manuel des risques de panne par les techniciens</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/5 p-1.5 rounded-2xl">
            {(['Tous', 'Faible', 'Moyen', 'Élevé'] as const).map(level => (
              <button
                key={level}
                onClick={() => setFilterRisk(level)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  filterRisk === level
                    ? level === 'Élevé' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                      : level === 'Moyen' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                      : level === 'Faible' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                      : 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
          >
            <TrendingUp className="w-4 h-4" />
            Exporter PDF
          </button>

          {/* Add button — Technicien only */}
          {user?.role === 'Technicien' && (
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-90 text-white font-bold text-xs rounded-2xl transition-all shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Évaluation
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Risque Faible</p>
            <p className="text-2xl font-extrabold text-emerald-400">{countByRisk('Faible')}</p>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Risque Moyen</p>
            <p className="text-2xl font-extrabold text-amber-400">{countByRisk('Moyen')}</p>
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0 ${countByRisk('Élevé') > 0 ? 'animate-pulse' : ''}`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Risque Élevé</p>
            <p className="text-2xl font-extrabold text-rose-400">{countByRisk('Élevé')}</p>
          </div>
        </div>
      </div>

      {/* Evaluations List */}
      {filtered.length === 0 ? (
        <div className="h-72 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl gap-3">
          <ClipboardList className="w-12 h-12 text-slate-600" />
          <p className="text-slate-400 font-semibold">Aucune évaluation à afficher</p>
          {user?.role === 'Technicien' && (
            <button
              onClick={handleOpenModal}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300 font-bold text-xs rounded-2xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Soumettre une évaluation
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(pred => {
            const cfg = riskConfig[pred.risk_level] || riskConfig['Faible'];
            return (
              <div
                key={pred.id}
                className={`glass-card rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 ${
                  pred.risk_level === 'Élevé' ? 'border-l-rose-500' :
                  pred.risk_level === 'Moyen' ? 'border-l-amber-500' :
                  'border-l-emerald-500'
                }`}
              >
                {/* Left info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color} ${pred.risk_level === 'Élevé' ? 'animate-pulse' : ''}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    {/* Equipment + Risk Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-extrabold text-white text-base">{pred.equipment_name}</h4>
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        Risque {pred.risk_level}
                      </span>
                    </div>

                    {/* Justification */}
                    <p className="text-slate-300 text-sm leading-relaxed">{pred.justification}</p>

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        Panne estimée le : <strong className="text-slate-300">{new Date(pred.estimated_failure_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <User className="w-3.5 h-3.5" />
                        Technicien : <strong className="text-slate-300">{pred.technicien_name}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Cpu className="w-3.5 h-3.5" />
                        Soumis le : <strong className="text-slate-300">{new Date(pred.created_at).toLocaleString('fr-FR')}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delete — Admin only */}
                {user?.role === 'Administrateur' && (
                  <button
                    onClick={() => handleDelete(pred.id)}
                    className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 hover:border-rose-500/20 rounded-xl transition-all self-end md:self-auto flex-shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal : Nouvelle Évaluation ───────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#141824] border border-white/10 rounded-3xl w-full max-w-lg p-8 shadow-2xl shadow-black/50 flex flex-col gap-6">

            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-white">Nouvelle Évaluation de Risque</h3>
                <p className="text-slate-400 text-xs mt-1">Remplissez le formulaire d'évaluation technique</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Équipement */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Équipement *</label>
                <select
                  value={formData.equipment_id}
                  onChange={e => setFormData(prev => ({ ...prev, equipment_id: e.target.value }))}
                  className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40 focus:bg-cyan-500/5 transition-all"
                  required
                >
                  <option value="" className="bg-[#141824]">Sélectionner un équipement...</option>
                  {equipments.map(eq => (
                    <option key={eq.id} value={eq.id} className="bg-[#141824]">{eq.name}</option>
                  ))}
                </select>
              </div>

              {/* Niveau de risque */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Niveau de Risque *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Faible', 'Moyen', 'Élevé'] as RiskLevel[]).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, risk_level: level }))}
                      className={`py-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                        formData.risk_level === level
                          ? level === 'Élevé' ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : level === 'Moyen' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {level === 'Élevé' && <ShieldAlert className="w-3.5 h-3.5" />}
                      {level === 'Moyen' && <AlertTriangle className="w-3.5 h-3.5" />}
                      {level === 'Faible' && <CheckCircle className="w-3.5 h-3.5" />}
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date estimée */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Estimée de la Panne *</label>
                <input
                  type="date"
                  value={formData.estimated_failure_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData(prev => ({ ...prev, estimated_failure_date: e.target.value }))}
                  className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40 focus:bg-cyan-500/5 transition-all [color-scheme:dark]"
                  required
                />
              </div>

              {/* Justification */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Justification Technique *</label>
                <textarea
                  placeholder="Décrivez les observations techniques qui justifient cette évaluation de risque..."
                  value={formData.justification}
                  onChange={e => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                  rows={4}
                  className="bg-white/5 border border-white/10 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/40 focus:bg-cyan-500/5 transition-all resize-none"
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
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-90 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                >
                  {submitting ? 'Enregistrement...' : 'Soumettre l\'évaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PredictionsPage;
