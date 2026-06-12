import { Router } from 'express';
import {
  getEquipments,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getEquipmentMeasurements
} from '../controllers/equipmentController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();

// Toutes les routes nécessitent d'être authentifié
router.use(authMiddleware);

// Accessible à tous les utilisateurs connectés (Administrateur + Technicien)
router.get('/', getEquipments);
router.get('/:id', getEquipmentById);
router.get('/:id/measurements', getEquipmentMeasurements);

// Routes réservées aux Administrateurs uniquement
router.post('/', roleMiddleware(['Administrateur']), createEquipment);
router.put('/:id', roleMiddleware(['Administrateur']), updateEquipment);
router.delete('/:id', roleMiddleware(['Administrateur']), deleteEquipment);

export default router;
