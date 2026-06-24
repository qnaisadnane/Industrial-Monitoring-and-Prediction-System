import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import { 
  TrendingUp, 
  Cpu, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  History
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface Prediction {
  id: number;
  equipment_id: number;
  equipment_name: string;
  risk_score: number;
  prediction: string;
  created_at: string;
}

interface Equipment {
  id: number;
  name: string;
}

const PredictionsPage: React.FC = () => {
  const { subscribe } = useWebSocket();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [selectedEquipId, setSelectedEquipId] = useState<number | null>(null);
  const [historyData, setHistoryData] = useState<{ time: string; risk: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const predRes = await api.get('/predictions');
      setPredictions(predRes.data);

      const equipRes = await api.get('/equipments');
      setEquipments(equipRes.data);
      if (equipRes.data.length > 0) {
        setSelectedEquipId(equipRes.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load predictions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch equipment prediction history for the Recharts chart
  useEffect(() => {
    if (!selectedEquipId) return;

    const fetchHistory = async () => {
      try {
        const response = await api.get(`/predictions/equipment/${selectedEquipId}`);
        const formatted = response.data.reverse().map((p: any) => ({
          time: new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          risk: parseFloat(p.risk_score)
        }));
        setHistoryData(formatted);
      } catch (err) {
        console.error("Failed to load equipment prediction history:", err);
      }
    };

    fetchHistory();
  }, [selectedEquipId, predictions]); // Refresh chart when predictions change (to catch live updates)

  // Subscribe to real-time predictions via WebSocket
  useEffect(() => {
    const unsubscribe = subscribe('NEW_PREDICTION', (newPred: any) => {
      // Find equipment name from list
      const equip = equipments.find(e => e.id === newPred.equipment_id);
      const formattedPred = {
        ...newPred,
        equipment_name: equip ? equip.name : `Machine #${newPred.equipment_id}`
      };

      setPredictions(prev => [formattedPred, ...prev].slice(0, 100));
    });

    return () => unsubscribe();
  }, [subscribe, equipments]);

  // Filter high risk equipments (latest prediction for each equipment where risk >= 70%)
  const getHighRiskEquipments = () => {
    const latestMap = new Map<number, Prediction>();
    
    // Predictions are ordered by created_at DESC, so the first we encounter for an equipment is the latest
    predictions.forEach(p => {
      if (!latestMap.has(p.equipment_id)) {
        latestMap.set(p.equipment_id, p);
      }
    });

    const highRisk: Prediction[] = [];
    latestMap.forEach(p => {
      if (p.risk_score >= 70) {
        highRisk.push(p);
      }
    });

    return highRisk;
  };

  const highRiskEquips = getHighRiskEquipments();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-4">
          <TrendingUp className="w-12 h-12 text-cyan-400 animate-pulse" />
          <p className="text-slate-400 font-semibold">Analyse prédictive IA en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] pl-64 pr-6 py-8 flex flex-col gap-8">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Prédictions de Pannes IA</h2>
        <p className="text-slate-400 text-sm mt-1">Calcul en direct de la probabilité de défaillance des machines supervisées</p>
      </div>

      {/* Critical Risks Alert Panel */}
      {highRiskEquips.length > 0 && (
        <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/25 flex flex-col gap-4 glow-red animate-pulse-slow">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
            <h3 className="text-lg font-bold text-rose-300">Action de Maintenance Préventive Requise</h3>
          </div>
          <p className="text-sm text-rose-300/80">
            L'algorithme de Machine Learning (Random Forest) a identifié un risque de panne imminent (&ge; 70%) sur les équipements suivants :
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {highRiskEquips.map(p => (
              <div key={p.id} className="bg-slate-950/40 border border-rose-500/20 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-rose-400" />
                  <div>
                    <h4 className="font-extrabold text-white text-sm">{p.equipment_name}</h4>
                    <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Risque : {p.risk_score}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-rose-400 font-bold">Panne Imminente</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid of chart and list */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Historical Evolution Chart (Recharts) */}
        <div className="xl:col-span-2 glass-panel p-6 rounded-3xl flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Évolution Historique des Risques</h3>
              <p className="text-xs text-slate-400">Suivi temporel de la probabilité de panne du modèle IA</p>
            </div>
            
            <select
              value={selectedEquipId || ''}
              onChange={(e) => setSelectedEquipId(parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-medium"
            >
              {equipments.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name}</option>
              ))}
            </select>
          </div>

          {historyData.length === 0 ? (
            <div className="h-72 flex items-center justify-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-slate-400 text-sm">Aucun historique de prédiction disponible pour cette machine.</p>
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc' }} />
                  <Area type="monotone" dataKey="risk" name="Score de Risque" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status Breakdown Sidebar */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col gap-6">
          <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4">Diagnostic Global IA</h3>
          <div className="flex flex-col gap-4">
            
            {/* Safe equipments summary */}
            <div className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-semibold text-white">Équipements Sains</span>
              </div>
              <span className="text-base font-extrabold text-emerald-400">
                {equipments.length - highRiskEquips.length}
              </span>
            </div>

            {/* High Risk summary */}
            <div className="flex items-center justify-between bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span className="text-sm font-semibold text-rose-300">Machines à Risque &ge; 70%</span>
              </div>
              <span className="text-base font-extrabold text-rose-400">
                {highRiskEquips.length}
              </span>
            </div>

            {/* Model details info */}
            <div className="bg-white/2 p-4 rounded-2xl text-xs text-slate-400 flex flex-col gap-2">
              <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400 animate-pulse-slow" /> Spécifications Modèle ML :
              </p>
              <div className="w-full h-px bg-white/5 my-1" />
              <div className="flex justify-between">
                <span>Algorithme :</span>
                <span className="text-white font-mono">Random Forest</span>
              </div>
              <div className="flex justify-between">
                <span>Nombres d'arbres :</span>
                <span className="text-white font-mono">100</span>
              </div>
              <div className="flex justify-between">
                <span>Variables :</span>
                <span className="text-white font-mono">Temp, Vib, Pres, Volt, Ener</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Historical logs table */}
      <div className="glass-panel p-6 rounded-3xl flex flex-col gap-6">
        <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" /> Historique des Évaluations Prédictives
        </h3>
        
        {predictions.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-slate-500 font-medium">Aucune prédiction enregistrée pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Machine</th>
                  <th className="pb-3">Date d'Évaluation</th>
                  <th className="pb-3">Score de Risque</th>
                  <th className="pb-3 pr-2">Analyse Prédictive</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p) => (
                  <tr key={p.id} className="border-b border-white/2 hover:bg-white/2 transition-colors">
                    <td className="py-3.5 pl-2 font-bold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-slate-500" />
                      {p.equipment_name}
                    </td>
                    <td className="py-3.5 text-slate-400">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        p.risk_score >= 70 ? 'bg-rose-500/10 text-rose-400' :
                        p.risk_score >= 40 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {p.risk_score}%
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-300 font-medium pr-2">
                      {p.prediction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default PredictionsPage;
