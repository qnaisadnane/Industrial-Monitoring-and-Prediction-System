import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Récupérer tous les utilisateurs (SANS les mots de passe)
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryResult = await pool.query<RowDataPacket[]>(
      'SELECT id, fullname, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    const users = queryResult[0];
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs.' });
  }
};

// Récupérer un utilisateur par son ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const queryResult = await pool.query<RowDataPacket[]>(
      'SELECT id, fullname, email, role, created_at FROM users WHERE id = ?',
      [id]
    );
    const users = queryResult[0];

    const user = users[0];
    if (!user) {
      res.status(404).json({ message: 'Utilisateur non trouvé.' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'utilisateur.' });
  }
};

// Créer un utilisateur (Administrateur uniquement via middleware)
export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { fullname, email, password, role } = req.body;

  if (!fullname || !email || !password || !role) {
    res.status(400).json({ message: 'Tous les champs sont requis.' });
    return;
  }

  // Seul le rôle Technicien peut être créé
  if (role !== 'Technicien') {
    res.status(403).json({ message: 'Seul le rôle Technicien peut être créé.' });
    return;
  }

  try {
    // Vérifier si l'email existe déjà
    const queryResultExisting = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    const existingUsers = queryResultExisting[0];

    if (existingUsers.length > 0) {
      res.status(400).json({ message: 'Cet email est déjà utilisé.' });
      return;
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insérer l'utilisateur
    const queryResultInsert = await pool.query<ResultSetHeader>(
      'INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)',
      [fullname, email, hashedPassword, role]
    );
    const result = queryResultInsert[0];

    res.status(201).json({
      message: 'Utilisateur créé avec succès.',
      userId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'utilisateur.' });
  }
};

// Modifier un utilisateur
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { fullname, email, password, role } = req.body;

  try {
    // Vérifier si l'utilisateur existe
    const queryResultUser = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    const users = queryResultUser[0];

    const user = users[0];
    if (!user) {
      res.status(404).json({ message: 'Utilisateur non trouvé.' });
      return;
    }

    // Si l'email est modifié, vérifier qu'il n'est pas pris par un autre
    if (email && email !== user.email) {
      const queryResultExisting = await pool.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      const existingUsers = queryResultExisting[0];
      if (existingUsers.length > 0) {
        res.status(400).json({ message: 'Cet email est déjà utilisé par un autre utilisateur.' });
        return;
      }
    }

    let query = 'UPDATE users SET fullname = ?, email = ?, role = ?';
    const params: any[] = [
      fullname || user.fullname,
      email || user.email,
      role || user.role
    ];

    // Si un nouveau mot de passe est fourni, le hasher et l'inclure dans l'update
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query<ResultSetHeader>(query, params);

    res.json({ message: 'Utilisateur mis à jour avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la modification de l\'utilisateur.' });
  }
};

// Supprimer un utilisateur
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Empêcher la suppression de l'administrateur unique
    const queryCheck = await pool.query<RowDataPacket[]>(
      'SELECT role FROM users WHERE id = ?',
      [id]
    );
    const userToDelete = (queryCheck[0] as RowDataPacket[])[0];
    if (userToDelete?.role === 'Administrateur') {
      res.status(403).json({ message: 'Impossible de supprimer l\'administrateur.' });
      return;
    }

    const queryResultDelete = await pool.query<ResultSetHeader>(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    const result = queryResultDelete[0];

    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Utilisateur non trouvé.' });
      return;
    }

    res.json({ message: 'Utilisateur supprimé avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'utilisateur.' });
  }
};
