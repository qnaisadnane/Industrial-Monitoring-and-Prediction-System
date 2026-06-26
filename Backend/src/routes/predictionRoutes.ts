import { Router } from 'express';
import { getPredictions, getPredictionByEquipment, createPrediction, deletePrediction } from '../controllers/predictionController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();
router.use(authMiddleware);

// Admin + Technicien : consultation
router.get('/', getPredictions);
router.get('/equipment/:equipment_id', getPredictionByEquipment);

// Technicien + Admin : créer une prédiction/observation manuelle
router.post('/', roleMiddleware(['Technicien', 'Administrateur']), createPrediction);

// Admin uniquement : supprimer
router.delete('/:id', roleMiddleware(['Administrateur']), deletePrediction);

export default router;
