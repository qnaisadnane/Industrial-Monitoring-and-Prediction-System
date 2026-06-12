import { Request, Response } from 'express';
import pool from '../config/db';
import { RowDataPacket } from 'mysql2';

// US16: Récupérer toutes les alertes
export const getAlerts = async (req: Request, res: Response): Promise<void> => {
  const { status, equipment_id } = req.query;

  try {
    let query = `
      SELECT a.*, e.name AS equipment_name 
      FROM alerts a 
      JOIN equipments e ON a.equipment_id = e.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }

    if (equipment_id) {
      conditions.push('a.equipment_id = ?');
      params.push(equipment_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.created_at DESC';

    const [alerts] = await pool.query<RowDataPacket[]>(query, params);
    res.json(alerts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des alertes.' });
  }
};

// US18: Clôturer une alerte
export const closeAlert = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [result] = await pool.query<RowDataPacket[]>(
      'UPDATE alerts SET status = ? WHERE id = ?',
      ['Résolue', id]
    );

    if ((result as any).affectedRows === 0) {
      res.status(404).json({ message: 'Alerte non trouvée.' });
      return;
    }

    res.json({ message: 'Alerte clôturée avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la clôture de l\'alerte.' });
  }
};

// US18: Supprimer une alerte
export const deleteAlert = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [result] = await pool.query<RowDataPacket[]>(
      'DELETE FROM alerts WHERE id = ?',
      [id]
    );

    if ((result as any).affectedRows === 0) {
      res.status(404).json({ message: 'Alerte non trouvée.' });
      return;
    }

    res.json({ message: 'Alerte supprimée avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'alerte.' });
  }
};
