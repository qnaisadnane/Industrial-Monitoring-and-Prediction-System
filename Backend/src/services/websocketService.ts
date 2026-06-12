import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Stocker les clients WebSocket connectés avec leurs infos (userId)
const clients = new Map<WebSocket, { userId?: number }>();

// Seuils critiques de détection d'anomalies
const THRESHOLDS = {
  temperature: 85,   // °C
  voltage: 250,      // V
  vibration: 8,      // mm/s
  pressure: 120,     // bar
  consumption: 500   // kW
};

// Initialiser le serveur WebSocket
export const initWebSocket = (wss: WebSocketServer): void => {
  console.log('WebSocket Server initialisé.');

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log('Nouveau client WebSocket connecté.');
    clients.set(ws, {});

    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        // Le client peut envoyer son userId lors de la connexion
        if (data.type === 'auth' && data.userId) {
          clients.set(ws, { userId: data.userId });
        }
      } catch {
        // ignorer les messages malformés
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client WebSocket déconnecté.');
    });

    ws.on('error', (err) => {
      console.error('Erreur WebSocket client:', err.message);
      clients.delete(ws);
    });
  });

  // Démarrer la simulation de données en temps réel
  startDataSimulation();
};

// Diffuser un message à tous les clients connectés
export const broadcast = (data: object): void => {
  const payload = JSON.stringify(data);
  clients.forEach((_, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
};

// Envoyer une notification à un utilisateur spécifique
export const sendToUser = (userId: number, data: object): void => {
  const payload = JSON.stringify(data);
  clients.forEach((info, ws) => {
    if (info.userId === userId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
};

// Vérifier les seuils et créer des alertes si nécessaire
const checkThresholds = async (equipmentId: number, measurement: {
  temperature: number;
  voltage: number;
  vibration: number;
  pressure: number;
  consumption: number;
}): Promise<void> => {
  const anomalies: { type: string; value: number; threshold: number; severity: string }[] = [];

  if (measurement.temperature > THRESHOLDS.temperature) {
    anomalies.push({ type: 'Température Critique', value: measurement.temperature, threshold: THRESHOLDS.temperature, severity: 'Critique' });
  }
  if (measurement.voltage > THRESHOLDS.voltage) {
    anomalies.push({ type: 'Surtension', value: measurement.voltage, threshold: THRESHOLDS.voltage, severity: 'Moyenne' });
  }
  if (measurement.vibration > THRESHOLDS.vibration) {
    anomalies.push({ type: 'Vibration Excessive', value: measurement.vibration, threshold: THRESHOLDS.vibration, severity: 'Critique' });
  }
  if (measurement.pressure > THRESHOLDS.pressure) {
    anomalies.push({ type: 'Surpression', value: measurement.pressure, threshold: THRESHOLDS.pressure, severity: 'Critique' });
  }
  if (measurement.consumption > THRESHOLDS.consumption) {
    anomalies.push({ type: 'Consommation Excessive', value: measurement.consumption, threshold: THRESHOLDS.consumption, severity: 'Moyenne' });
  }

  if (anomalies.length === 0) return;

  for (const anomaly of anomalies) {
    // Insérer l'alerte en base
    const description = `${anomaly.type} détectée : valeur mesurée ${anomaly.value.toFixed(2)} (seuil: ${anomaly.threshold})`;
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO alerts (equipment_id, type, severity, description, status) VALUES (?, ?, ?, ?, ?)',
      [equipmentId, anomaly.type, anomaly.severity, description, 'Active']
    );

    // Mettre à jour le statut de l'équipement à "Anomalie"
    await pool.query(
      "UPDATE equipments SET status = 'Anomalie' WHERE id = ?",
      [equipmentId]
    );

    // Créer une notification pour tous les utilisateurs
    const [users] = await pool.query<RowDataPacket[]>('SELECT id FROM users');
    for (const user of users) {
      await pool.query(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [user.id, `⚠️ Alerte sur équipement #${equipmentId}: ${description}`]
      );
    }

    // Diffuser l'alerte via WebSocket en temps réel
    broadcast({
      type: 'NEW_ALERT',
      payload: {
        id: result.insertId,
        equipment_id: equipmentId,
        alert_type: anomaly.type,
        severity: anomaly.severity,
        description,
        status: 'Active',
        created_at: new Date().toISOString()
      }
    });
  }
};

// Générer une valeur aléatoire autour d'une base avec une déviation
const randomAround = (base: number, deviation: number): number => {
  return parseFloat((base + (Math.random() * 2 - 1) * deviation).toFixed(2));
};

// Simulation de données capteurs pour chaque équipement
const startDataSimulation = (): void => {
  setInterval(async () => {
    try {
      const [equipments] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM equipments WHERE status != 'Arrêté'"
      );

      if (equipments.length === 0) return;

      const measurements: Array<{
        equipment_id: number;
        temperature: number;
        voltage: number;
        vibration: number;
        pressure: number;
        consumption: number;
        created_at: string;
      }> = [];

      for (const equipment of equipments) {
        // Simuler des valeurs avec une faible chance d'anomalie (10%)
        const anomalyChance = Math.random() < 0.10;

        const measurement = {
          equipment_id: equipment.id,
          temperature: anomalyChance ? randomAround(92, 5) : randomAround(65, 10),
          voltage:     randomAround(220, 15),
          vibration:   anomalyChance ? randomAround(9, 1) : randomAround(3, 1.5),
          pressure:    randomAround(75, 20),
          consumption: anomalyChance ? randomAround(520, 30) : randomAround(250, 80)
        };

        // Insérer la mesure en base de données
        await pool.query<ResultSetHeader>(
          'INSERT INTO measurements (equipment_id, temperature, voltage, vibration, pressure, consumption) VALUES (?, ?, ?, ?, ?, ?)',
          [measurement.equipment_id, measurement.temperature, measurement.voltage, measurement.vibration, measurement.pressure, measurement.consumption]
        );

        measurements.push({ ...measurement, created_at: new Date().toISOString() });

        // Vérifier les seuils critiques
        await checkThresholds(equipment.id, measurement);
      }

      // Diffuser toutes les nouvelles mesures aux clients WebSocket
      broadcast({ type: 'NEW_MEASUREMENTS', payload: measurements });

    } catch (error) {
      console.error('Erreur simulation de données:', error);
    }
  }, 5000); // Toutes les 5 secondes
};
