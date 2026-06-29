import { Request, Response } from 'express';
import pool from '../config/db';
import { RowDataPacket } from 'mysql2';

// US14: Indicateurs clés du Dashboard
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Nombre total d'équipements
    const [[{ total_equipments }]] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total_equipments FROM equipments'
    ) as any;

    // Nombre d'alertes actives
    const [[{ active_alerts }]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS active_alerts FROM alerts WHERE status = 'Active'"
    ) as any;

    // Nombre d'alertes résolues
    const [[{ resolved_alerts }]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS resolved_alerts FROM alerts WHERE status = 'Résolue'"
    ) as any;

    // Nombre d'équipements en fonctionnement (pour le taux de disponibilité)
    const [[{ running_equipments }]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS running_equipments FROM equipments WHERE status = 'En fonctionnement'"
    ) as any;

    // Nombre d'équipements en maintenance
    const [[{ maintenance_equipments }]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS maintenance_equipments FROM equipments WHERE status = 'Maintenance'"
    ) as any;

    // Température moyenne des dernières mesures de chaque équipement
    const [[{ avg_temperature }]] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(ROUND(AVG(m.temperature), 1), 0) AS avg_temperature
       FROM measurements m
       INNER JOIN (
         SELECT equipment_id, MAX(created_at) AS last_time
         FROM measurements
         GROUP BY equipment_id
       ) latest ON m.equipment_id = latest.equipment_id AND m.created_at = latest.last_time`
    ) as any;

    // Répartition des équipements par statut
    const [statusBreakdown] = await pool.query<RowDataPacket[]>(
      'SELECT status, COUNT(*) AS count FROM equipments GROUP BY status'
    );

    const availability_rate = total_equipments > 0
      ? Math.round((running_equipments / total_equipments) * 100)
      : 0;

    res.json({
      total_equipments: Number(total_equipments),
      active_alerts: Number(active_alerts),
      resolved_alerts: Number(resolved_alerts),
      running_equipments: Number(running_equipments),
      maintenance_equipments: Number(maintenance_equipments),
      availability_rate,
      avg_temperature: parseFloat(avg_temperature) || 0,
      status_breakdown: statusBreakdown
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques.' });
  }
};

// US19: Statistiques analytiques d'un équipement sur une période
export const getEquipmentAnalytics = async (req: Request, res: Response): Promise<void> => {
  const { equipment_id, from, to } = req.query;

  if (!equipment_id) {
    res.status(400).json({ message: 'equipment_id est requis.' });
    return;
  }

  try {
    let query = `
      SELECT
        AVG(temperature)  AS avg_temperature,  MAX(temperature)  AS max_temperature,  MIN(temperature)  AS min_temperature,
        AVG(voltage)      AS avg_voltage,       MAX(voltage)      AS max_voltage,       MIN(voltage)      AS min_voltage,
        AVG(vibration)    AS avg_vibration,     MAX(vibration)    AS max_vibration,     MIN(vibration)    AS min_vibration,
        AVG(pressure)     AS avg_pressure,      MAX(pressure)     AS max_pressure,      MIN(pressure)     AS min_pressure,
        AVG(consumption)  AS avg_consumption,   MAX(consumption)  AS max_consumption,   MIN(consumption)  AS min_consumption,
        COUNT(*)          AS total_measurements
      FROM measurements
      WHERE equipment_id = ?
    `;
    const params: any[] = [equipment_id];

    if (from) {
      query += ' AND created_at >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND created_at <= ?';
      params.push(to);
    }

    const [[stats]] = await pool.query<RowDataPacket[]>(query, params) as any;

    // Données de tendance (les 30 derniers points)
    const [trend] = await pool.query<RowDataPacket[]>(
      `SELECT temperature, voltage, vibration, pressure, consumption, created_at
       FROM measurements
       WHERE equipment_id = ?
       ORDER BY created_at DESC LIMIT 30`,
      [equipment_id]
    );

    res.json({
      stats,
      trend: trend.reverse() // Remettre dans l'ordre chronologique
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des analyses.' });
  }
};
