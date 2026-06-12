import { Router } from 'express';
import { getAlerts, closeAlert, deleteAlert } from '../controllers/alertController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();
router.use(authMiddleware);

// Accessible à tous les utilisateurs connectés
router.get('/', getAlerts);

// Clôturer une alerte (Administrateur + Technicien)
router.put('/:id/close', closeAlert);

// Supprimer une alerte (Administrateur uniquement)
router.delete('/:id', roleMiddleware(['Administrateur']), deleteAlert);

export default router;
