import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();

// Tous les endpoints de gestion des catégories nécessitent d'être connecté
router.use(authMiddleware);

// Consultation : accessible à tous (Administrateurs et Techniciens)
router.get('/', getCategories);

// CRUD complet : réservé aux Administrateurs
router.post('/', roleMiddleware(['Administrateur']), createCategory);
router.put('/:id', roleMiddleware(['Administrateur']), updateCategory);
router.delete('/:id', roleMiddleware(['Administrateur']), deleteCategory);

export default router;
