import { Request, Response } from 'express';
import pool from '../config/db';
import { RowDataPacket } from 'mysql2';

// US25: Récupérer les notifications d'un utilisateur
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.id;

  try {
    const [notifications] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des notifications.' });
  }
};

// Marquer une notification comme lue
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  try {
    const [result] = await pool.query<RowDataPacket[]>(
      'UPDATE notifications SET read_status = true WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if ((result as any).affectedRows === 0) {
      res.status(404).json({ message: 'Notification non trouvée.' });
      return;
    }

    res.json({ message: 'Notification marquée comme lue.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Marquer toutes les notifications comme lues
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.id;

  try {
    await pool.query(
      'UPDATE notifications SET read_status = true WHERE user_id = ? AND read_status = false',
      [userId]
    );

    res.json({ message: 'Toutes les notifications marquées comme lues.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
