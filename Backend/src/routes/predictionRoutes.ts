import { Router } from 'express';
import { getPredictions, getPredictionByEquipment, savePrediction } from '../controllers/predictionController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
router.use(authMiddleware);

router.get('/', getPredictions);
router.get('/equipment/:equipment_id', getPredictionByEquipment);
router.post('/', savePrediction); // Appelé par le module Python

export default router;
