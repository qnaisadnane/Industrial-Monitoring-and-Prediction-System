import { Router } from 'express';
import { getDashboardStats, getEquipmentAnalytics } from '../controllers/dashboardController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
router.use(authMiddleware);

// US14: Indicateurs du tableau de bord
router.get('/stats', getDashboardStats);

// US19: Statistiques analytiques par équipement
router.get('/analytics', getEquipmentAnalytics);

export default router;
