import { Request, Response } from 'express';
import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { createNotificationForUsers } from '../services/websocketService';

// Récupérer toutes les évaluations manuelles
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

// Récupérer les évaluations d'un équipement spécifique
export const getPredictionByEquipment = async (req: Request, res: Response): Promise<void> => {
  const { equipment_id } = req.params;
  try {
    const [predictions] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, u.fullname AS technicien_name
       FROM predictions p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.equipment_id = ?
       ORDER BY p.created_at DESC`,
      [equipment_id]
    );
    res.json(predictions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Créer une évaluation manuelle (Technicien uniquement)
export const createPrediction = async (req: Request, res: Response): Promise<void> => {
  const { equipment_id, risk_level, estimated_failure_date, justification } = req.body;
  const userId = (req as any).user.id;

  if (!equipment_id || !risk_level || !estimated_failure_date || !justification) {
    res.status(400).json({
      message: 'Tous les champs sont requis : equipment_id, risk_level, estimated_failure_date, justification.'
    });
    return;
  }

  const validLevels = ['Faible', 'Moyen', 'Élevé'];
  if (!validLevels.includes(risk_level)) {
    res.status(400).json({ message: 'risk_level doit être : Faible, Moyen ou Élevé.' });
    return;
  }

  try {
    const result = await pool.query<ResultSetHeader>(
      'INSERT INTO predictions (equipment_id, user_id, risk_level, estimated_failure_date, justification) VALUES (?, ?, ?, ?, ?)',
      [equipment_id, userId, risk_level, estimated_failure_date, justification]
    );
    const insertId = (result[0] as ResultSetHeader).insertId;

    // Récupérer le nom de l'équipement et du technicien pour la réponse
    const equipRows = await pool.query<RowDataPacket[]>(
      'SELECT name FROM equipments WHERE id = ?', [equipment_id]
    );
    const userRows = await pool.query<RowDataPacket[]>(
      'SELECT fullname FROM users WHERE id = ?', [userId]
    );

    const equipment_name = (equipRows[0] as RowDataPacket[])[0]?.name || `#${equipment_id}`;
    const technicien_name = (userRows[0] as RowDataPacket[])[0]?.fullname || 'Inconnu';

    const usersRows = await pool.query<RowDataPacket[]>('SELECT id FROM users');
    const users = usersRows[0] as RowDataPacket[];
    await createNotificationForUsers(
      users.map((user) => user.id as number),
      `🧠 Nouvelle évaluation ajoutée pour ${equipment_name} : risque ${risk_level}`
    );

    res.status(201).json({
      id: insertId,
      equipment_id,
      equipment_name,
      user_id: userId,
      technicien_name,
      risk_level,
      estimated_failure_date,
      justification,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'évaluation.' });
  }
};

// Supprimer une évaluation (Admin uniquement)
export const deletePrediction = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await pool.query<ResultSetHeader>(
      'DELETE FROM predictions WHERE id = ?', [id]
    );
    if ((result[0] as ResultSetHeader).affectedRows === 0) {
      res.status(404).json({ message: 'Évaluation non trouvée.' });
      return;
    }
    res.json({ message: 'Évaluation supprimée avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
