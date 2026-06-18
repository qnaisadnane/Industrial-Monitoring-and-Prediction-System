import pool from '../config/db';
import { RowDataPacket } from 'mysql2';

const PYTHON_API_URL = 'http://localhost:8000';

export const startPredictionScheduler = (): void => {
  console.log('Prediction scheduler démarré.');

  // Exécuter toutes les 20 secondes pour la démo en temps réel
  setInterval(async () => {
    try {
      // Vérifier s'il y a des équipements actifs
      const [equipments] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM equipments WHERE status != 'Arrêté'"
      );

      if (equipments.length === 0) return;

      console.log(`[Scheduler] Lancement des prédictions pour ${equipments.length} équipements...`);

      // Appeler le microservice Python pour prédire
      const response = await fetch(`${PYTHON_API_URL}/predict_all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.warn(`[Scheduler] Erreur API Python: statut ${response.status}`);
        return;
      }

      const result = await response.json();
      console.log(`[Scheduler] Prédictions terminées:`, result.predictions?.length || 0, 'traitées.');

    } catch (error: any) {
      console.warn(`[Scheduler] Impossible de contacter l'API Python de prédiction (est-elle démarrée sur le port 8000 ?)`);
    }
  }, 20000); // Toutes les 20 secondes
};
