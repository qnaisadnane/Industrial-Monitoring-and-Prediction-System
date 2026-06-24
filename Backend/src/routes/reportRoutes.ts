import { Router } from 'express';
import { exportReport } from '../controllers/reportController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Apply auth middleware to protect the report export
router.use(authMiddleware);

router.get('/export', exportReport);

export default router;
