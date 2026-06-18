import { Router } from 'express';
import { getDashboardStats, getEquipmentAnalytics } from '../controllers/dashboardController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
router.use(authMiddleware);


router.get('/stats', getDashboardStats);


router.get('/analytics', getEquipmentAnalytics);

export default router;
