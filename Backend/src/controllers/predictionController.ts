import { Request, Response } from 'express';
import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Récupérer toutes les prédictions/observations
export const getPredictions = async (req: Request, res: Response): Promise<void> => {
  try {
    const [predictions] = await pool.query<RowDataPacket[]>(`
      SELECT p.*, e.name AS equipment_name, u.fullname AS technicien_name
      FROM predictions p
      JOIN equipments e ON p.equipment_id = e.id
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json(predictions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Récupérer les prédictions d'un équipement
export const getPredictionByEquipment = async (req: Request, res: Response): Promise<void> => {
  const { equipment_id } = req.params;
  try {
    const [predictions] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, u.fullname AS technicien_name
       FROM predictions p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.equipment_id = ? ORDER BY p.created_at DESC LIMIT 30`,
      [equipment_id]
    );
    res.json(predictions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Créer une prédiction ou observation manuelle (Technicien)
export const createPrediction = async (req: Request, res: Response): Promise<void> => {
  const { equipment_id, observation, risk_score, prediction } = req.body;
  const userId = (req as any).user.id;

  if (!equipment_id || !observation) {
    res.status(400).json({ message: 'equipment_id et observation sont requis.' });
    return;
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO predictions (equipment_id, user_id, observation, risk_score, prediction) VALUES (?, ?, ?, ?, ?)',
      [equipment_id, userId, observation, risk_score || null, prediction || null]
    );
    res.status(201).json({ message: 'Prédiction/observation créée avec succès.', id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Supprimer une prédiction (Admin uniquement)
export const deletePrediction = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM predictions WHERE id = ?', [id]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Prédiction non trouvée.' });
      return;
    }
    res.json({ message: 'Prédiction supprimée avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
