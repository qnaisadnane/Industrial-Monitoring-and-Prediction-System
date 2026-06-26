import { Request, Response } from 'express';
import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Lister tous les équipements (Admin + Technicien)
export const getEquipments = async (req: Request, res: Response): Promise<void> => {
  try {
    const [equipments] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM equipments ORDER BY created_at DESC'
    );
    res.json(equipments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des équipements.' });
  }
};

// Obtenir un équipement par son ID (Admin + Technicien)
export const getEquipmentById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [equipments] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM equipments WHERE id = ?', [id]
    );
    const equipment = equipments[0];
    if (!equipment) {
      res.status(404).json({ message: 'Équipement non trouvé.' });
      return;
    }
    res.json(equipment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'équipement.' });
  }
};

// Enregistrer un nouvel équipement (Admin uniquement)
export const createEquipment = async (req: Request, res: Response): Promise<void> => {
  const { name, type, location, installation_date, status } = req.body;

  if (!name || !type || !location || !installation_date) {
    res.status(400).json({ message: 'Tous les champs sont requis.' });
    return;
  }

  try {
    const validStatuses = ['En fonctionnement', 'Arrêté', 'Maintenance'];
    const initialStatus = status && validStatuses.includes(status) ? status : 'En fonctionnement';

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO equipments (name, type, location, installation_date, status) VALUES (?, ?, ?, ?, ?)',
      [name, type, location, installation_date, initialStatus]
    );

    res.status(201).json({ message: 'Équipement enregistré avec succès.', equipmentId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'équipement.' });
  }
};

// Modifier un équipement (Admin uniquement)
export const updateEquipment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, type, location, installation_date, status } = req.body;

  const validStatuses = ['En fonctionnement', 'Arrêté', 'Maintenance', 'Anomalie'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ message: `Statut invalide. Valeurs acceptées: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    const [equipments] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM equipments WHERE id = ?', [id]
    );
    const equipment = equipments[0];
    if (!equipment) {
      res.status(404).json({ message: 'Équipement non trouvé.' });
      return;
    }

    await pool.query<ResultSetHeader>(
      'UPDATE equipments SET name = ?, type = ?, location = ?, installation_date = ?, status = ? WHERE id = ?',
      [name || equipment.name, type || equipment.type, location || equipment.location,
       installation_date || equipment.installation_date, status || equipment.status, id]
    );

    res.json({ message: 'Équipement mis à jour avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'équipement.' });
  }
};

// Supprimer un équipement (Admin uniquement)
export const deleteEquipment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM equipments WHERE id = ?', [id]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Équipement non trouvé.' });
      return;
    }
    res.json({ message: 'Équipement supprimé avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'équipement.' });
  }
};

// Modifier manuellement le statut d'un équipement (Technicien)
export const updateEquipmentStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['En fonctionnement', 'Arrêté', 'Maintenance', 'Anomalie'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ message: `Statut invalide. Valeurs acceptées: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE equipments SET status = ? WHERE id = ?', [status, id]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Équipement non trouvé.' });
      return;
    }
    res.json({ message: 'Statut mis à jour avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du statut.' });
  }
};

// Ajouter un commentaire sur un équipement (Technicien)
export const addComment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { comment } = req.body;

  if (!comment || comment.trim() === '') {
    res.status(400).json({ message: 'Le commentaire est requis.' });
    return;
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE equipments SET comment = ? WHERE id = ?', [comment, id]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Équipement non trouvé.' });
      return;
    }
    res.json({ message: 'Commentaire ajouté avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'ajout du commentaire.' });
  }
};

// Historique des mesures d'un équipement (Admin + Technicien)
export const getEquipmentMeasurements = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { limit = '50' } = req.query;

  try {
    const [equipment] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM equipments WHERE id = ?', [id]
    );
    if (equipment.length === 0) {
      res.status(404).json({ message: 'Équipement non trouvé.' });
      return;
    }

    const [measurements] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM measurements WHERE equipment_id = ? ORDER BY created_at DESC LIMIT ?',
      [id, parseInt(limit as string, 10)]
    );
    res.json(measurements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des mesures.' });
  }
};
