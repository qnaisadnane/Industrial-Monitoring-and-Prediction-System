import { Request, Response } from 'express';
import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { broadcast } from '../services/websocketService';

// Récupérer les dernières prédictions de tous les équipements
export const getPredictions = async (req: Request, res: Response): Promise<void> => {
  try {
    const [predictions] = await pool.query<RowDataPacket[]>(`
      SELECT p.*, e.name AS equipment_name
      FROM predictions p
      JOIN equipments e ON p.equipment_id = e.id
      ORDER BY p.created_at DESC
    `);
    res.json(predictions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Récupérer les prédictions d'un équipement spécifique
export const getPredictionByEquipment = async (req: Request, res: Response): Promise<void> => {
  const { equipment_id } = req.params;
  try {
    const [predictions] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM predictions WHERE equipment_id = ? ORDER BY created_at DESC LIMIT 30',
      [equipment_id]
    );
    res.json(predictions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Enregistrer une prédiction (appelé par le script Python)
export const savePrediction = async (req: Request, res: Response): Promise<void> => {
  const { equipment_id, risk_score, prediction } = req.body;

  if (!equipment_id || risk_score === undefined || !prediction) {
    res.status(400).json({ message: 'Champs requis : equipment_id, risk_score, prediction.' });
    return;
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO predictions (equipment_id, risk_score, prediction) VALUES (?, ?, ?)',
      [equipment_id, risk_score, prediction]
    );

    // Diffuser la prédiction via WebSocket en temps réel
    broadcast({
      type: 'NEW_PREDICTION',
      payload: {
        id: result.insertId,
        equipment_id,
        risk_score,
        prediction,
        created_at: new Date().toISOString()
      }
    });

    res.status(201).json({ message: 'Prédiction enregistrée.', id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
