import { Request, Response } from 'express';
import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { broadcast } from '../services/websocketService';

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

// Créer une alerte manuellement (Technicien / Administrateur)
export const createAlert = async (req: Request, res: Response): Promise<void> => {
  const { equipment_id, type, severity, description } = req.body;

  if (!equipment_id || !type || !severity || !description) {
    res.status(400).json({ message: 'Tous les champs sont obligatoires : equipment_id, type, severity, description.' });
    return;
  }

  try {
    const result = await pool.query<ResultSetHeader>(
      'INSERT INTO alerts (equipment_id, type, severity, description, status) VALUES (?, ?, ?, ?, ?)',
      [equipment_id, type, severity, description, 'Active']
    );
    const insertId = (result[0] as ResultSetHeader).insertId;

    // Récupérer le nom de l'équipement pour l'objet retourné
    const equipmentRows = await pool.query<RowDataPacket[]>(
      'SELECT name FROM equipments WHERE id = ?',
      [equipment_id]
    );
    const equipment_name = (equipmentRows[0] as RowDataPacket[])[0]?.name || `#${equipment_id}`;

    const newAlert = {
      id: insertId,
      equipment_id,
      equipment_name,
      type,
      severity,
      description,
      status: 'Active',
      created_at: new Date().toISOString()
    };

    // Diffuser la nouvelle alerte à tous les clients WebSocket
    broadcast({ type: 'NEW_ALERT', payload: newAlert });

    // Créer des notifications pour tous les utilisateurs
    const usersRows = await pool.query<RowDataPacket[]>('SELECT id FROM users');
    const users = usersRows[0] as RowDataPacket[];
    for (const user of users) {
      await pool.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [user.id, `⚠️ Nouvelle alerte sur ${equipment_name}: ${description}`]
      );
    }

    res.status(201).json(newAlert);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'alerte.' });
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
