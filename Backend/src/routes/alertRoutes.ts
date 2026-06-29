import { Router } from 'express';
import { getAlerts, createAlert, closeAlert, deleteAlert } from '../controllers/alertController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();
router.use(authMiddleware);

// Accessible à tous les utilisateurs connectés
router.get('/', getAlerts);

// Créer une alerte manuellement (Technicien uniquement)
router.post('/', roleMiddleware(['Technicien']), createAlert);

// Clôturer une alerte (Administrateur + Technicien)
router.put('/:id/close', closeAlert);

// Supprimer une alerte (Administrateur uniquement)
router.delete('/:id', roleMiddleware(['Administrateur']), deleteAlert);

export default router;
