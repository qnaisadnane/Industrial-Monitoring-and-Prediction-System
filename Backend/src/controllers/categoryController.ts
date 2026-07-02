import { Request, Response } from 'express';
import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Obtenir toutes les catégories (Admin + Technicien)
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const [categories] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des catégories.' });
  }
};

// Enregistrer une nouvelle catégorie (Admin uniquement)
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    res.status(400).json({ message: 'Le nom de la catégorie est requis.' });
    return;
  }

  const categoryName = name.trim();

  try {
    // Vérifier si elle existe déjà
    const [exists] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories WHERE name = ?',
      [categoryName]
    );

    if (exists.length > 0) {
      res.status(400).json({ message: 'Cette catégorie existe déjà.' });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO categories (name) VALUES (?)',
      [categoryName]
    );

    res.status(201).json({
      message: 'Catégorie enregistrée avec succès.',
      categoryId: result.insertId,
      name: categoryName
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la catégorie.' });
  }
};

// Modifier une catégorie (Admin uniquement)
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    res.status(400).json({ message: 'Le nom de la catégorie est requis.' });
    return;
  }

  const newName = name.trim();

  try {
    const [categories] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    const category = categories[0];
    if (!category) {
      res.status(404).json({ message: 'Catégorie non trouvée.' });
      return;
    }

    const oldName = category.name;
    if (oldName === newName) {
      res.json({ message: 'Catégorie mise à jour avec succès.' });
      return;
    }

    // Vérifier si le nouveau nom est déjà pris
    const [exists] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories WHERE name = ? AND id != ?',
      [newName, id]
    );

    if (exists.length > 0) {
      res.status(400).json({ message: 'Une autre catégorie porte déjà ce nom.' });
      return;
    }

    // Mettre à jour les équipements associés à l'ancien nom de catégorie
    await pool.query(
      'UPDATE equipments SET type = ? WHERE type = ?',
      [newName, oldName]
    );

    // Mettre à jour la catégorie
    await pool.query<ResultSetHeader>(
      'UPDATE categories SET name = ? WHERE id = ?',
      [newName, id]
    );

    res.json({ message: 'Catégorie mise à jour avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la catégorie.' });
  }
};

// Supprimer une catégorie (Admin uniquement)
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [categories] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    const category = categories[0];
    if (!category) {
      res.status(404).json({ message: 'Catégorie non trouvée.' });
      return;
    }

    // Vérifier s'il y a des équipements liés à cette catégorie
    const [usages] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM equipments WHERE type = ?',
      [category.name]
    );

    if (usages[0] && usages[0].count > 0) {
      res.status(400).json({
        message: `Impossible de supprimer la catégorie "${category.name}" car elle est liée à ${usages[0].count} équipement(s).`
      });
      return;
    }

    await pool.query<ResultSetHeader>(
      'DELETE FROM categories WHERE id = ?',
      [id]
    );

    res.json({ message: 'Catégorie supprimée avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de la catégorie.' });
  }
};
