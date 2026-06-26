import { Router } from 'express';
import {
  getEquipments, getEquipmentById, createEquipment, updateEquipment,
  deleteEquipment, getEquipmentMeasurements, updateEquipmentStatus, addComment
} from '../controllers/equipmentController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();
router.use(authMiddleware);

// Admin + Technicien : consultation
router.get('/', getEquipments);
router.get('/:id', getEquipmentById);
router.get('/:id/measurements', getEquipmentMeasurements);

// Technicien : modifier le statut et ajouter un commentaire
router.patch('/:id/status', roleMiddleware(['Technicien', 'Administrateur']), updateEquipmentStatus);
router.patch('/:id/comment', roleMiddleware(['Technicien', 'Administrateur']), addComment);

// Admin uniquement : CRUD complet
router.post('/', roleMiddleware(['Administrateur']), createEquipment);
router.put('/:id', roleMiddleware(['Administrateur']), updateEquipment);
router.delete('/:id', roleMiddleware(['Administrateur']), deleteEquipment);

export default router;
