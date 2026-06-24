import { Request, Response } from 'express';
import pool from '../config/db';
import { RowDataPacket } from 'mysql2';

export const exportReport = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Fetch KPIs
    const [[{ total_equipments }]] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total_equipments FROM equipments'
    ) as any;

    const [[{ active_alerts }]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS active_alerts FROM alerts WHERE status = 'Active'"
    ) as any;

    const [[{ running_equipments }]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS running_equipments FROM equipments WHERE status = 'En fonctionnement'"
    ) as any;

    const [[{ total_consumption }]] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(m.consumption), 0) AS total_consumption
       FROM measurements m
       INNER JOIN (
         SELECT equipment_id, MAX(created_at) AS last_time
         FROM measurements
         GROUP BY equipment_id
       ) latest ON m.equipment_id = latest.equipment_id AND m.created_at = latest.last_time`
    ) as any;

    const availability_rate = total_equipments > 0
      ? Math.round((running_equipments / total_equipments) * 100)
      : 0;

    // 2. Fetch Active Alerts
    const [alerts] = await pool.query<RowDataPacket[]>(
      `SELECT a.*, e.name AS equipment_name 
       FROM alerts a 
       JOIN equipments e ON a.equipment_id = e.id 
       WHERE a.status = 'Active' 
       ORDER BY a.created_at DESC`
    );

    // 3. Fetch Latest Predictions
    const [predictions] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, e.name AS equipment_name
       FROM predictions p
       JOIN equipments e ON p.equipment_id = e.id
       INNER JOIN (
         SELECT equipment_id, MAX(created_at) AS max_time
         FROM predictions
         GROUP BY equipment_id
       ) latest ON p.equipment_id = latest.equipment_id AND p.created_at = latest.max_time
       ORDER BY p.risk_score DESC`
    );

    // 4. Construct CSV Content (Semicolon delimited for Excel compatibility)
    let csv = '\uFEFF'; // UTF-8 BOM for proper accents in Excel
    
    // Header
    csv += 'RAPPORT DE SUPERVISION SMARTMONITORAI\n';
    csv += `Généré le ; ${new Date().toLocaleString()}\n\n`;

    // Section 1: KPIs
    csv += '1. INDICATEURS CLES DE DISPONIBILITE ET DE CONSOMMATION\n';
    csv += 'Indicateur ; Valeur\n';
    csv += `Taux de Disponibilité ; ${availability_rate}%\n`;
    csv += `Machines en Fonctionnement ; ${running_equipments} / ${total_equipments}\n`;
    csv += `Alertes Actives ; ${active_alerts}\n`;
    csv += `Consommation Énergétique Totale ; ${parseFloat(total_consumption).toFixed(2)} kW\n\n`;

    // Section 2: Alerts
    csv += '2. JOURNAL DES ALERTES ACTIVES\n';
    csv += 'ID Alerte ; Équipement ; Type d\'Anomalie ; Gravité ; Description ; Date de Détection\n';
    if (alerts.length === 0) {
      csv += 'Aucune alerte active détectée dans le système ; ; ; ; ;\n';
    } else {
      alerts.forEach(a => {
        csv += `${a.id} ; ${a.equipment_name} ; ${a.type} ; ${a.severity} ; ${a.description.replace(/;/g, ',')} ; ${new Date(a.created_at).toLocaleString()}\n`;
      });
    }
    csv += '\n';

    // Section 3: AI Predictions
    csv += '3. DIAGNOSTICS ET PREDICTIONS DE PANNES IA\n';
    csv += 'Équipement ; Score de Risque ; Recommandation Préventive ; Date d\'Analyse\n';
    if (predictions.length === 0) {
      csv += 'Aucune prédiction disponible ; ; ;\n';
    } else {
      predictions.forEach(p => {
        csv += `${p.equipment_name} ; ${p.risk_score}% ; ${p.prediction.replace(/;/g, ',')} ; ${new Date(p.created_at).toLocaleString()}\n`;
      });
    }

    // 5. Send CSV File
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=Rapport_Supervision_SmartMonitor.csv');
    res.status(200).send(csv);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la génération du rapport.' });
  }
};
