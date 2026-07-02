import pool from './db';
import { RowDataPacket } from 'mysql2';

export const initDb = async (): Promise<void> => {
  try {
    // 1. Créer la table des catégories
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Insérer les catégories par défaut s'il n'y en a aucune
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM categories'
    );
    
    if (rows[0] && rows[0].count === 0) {
      await pool.query(`
        INSERT INTO categories (name) VALUES 
        ('Pompe'),
        ('Moteur'),
        ('Compresseur'),
        ('Convoyeur')
      `);
      console.log('✅ Catégories par défaut insérées.');
    }

    // 3. Importer les types existants dans equipments s'ils ne sont pas déjà présents
    const [tables] = await pool.query<RowDataPacket[]>(
      "SHOW TABLES LIKE 'equipments'"
    );

    if (tables.length > 0) {
      await pool.query(`
        INSERT IGNORE INTO categories (name)
        SELECT DISTINCT type FROM equipments WHERE type IS NOT NULL AND type != ''
      `);
      console.log('✅ Types existants des équipements importés comme catégories.');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données :', error);
  }
};
