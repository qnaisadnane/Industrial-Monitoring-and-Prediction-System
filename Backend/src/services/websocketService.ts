import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Stocker les clients WebSocket connectés avec leurs infos (userId)
const clients = new Map<WebSocket, { userId?: number }>();

// NOTE : La génération automatique d'alertes par seuil a été désactivée.
// Les alertes sont désormais créées manuellement par les techniciens via l'interface.

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

// Créer une notification en base et la diffuser à un ensemble d'utilisateurs
export const createNotificationForUsers = async (userIds: number[], message: string): Promise<void> => {
  const createdAt = new Date().toISOString();

  for (const userId of userIds) {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [userId, message]
    );

    sendToUser(userId, {
      type: 'NEW_NOTIFICATION',
      payload: {
        id: (result as ResultSetHeader).insertId,
        user_id: userId,
        message,
        read_status: false,
        created_at: createdAt
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
        "SELECT id FROM equipments WHERE status = 'En fonctionnement'"
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
        // Simuler des valeurs avec une faible chance d'anomalie (3%)
        const anomalyChance = Math.random() < 0.03;

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
      }

      // Diffuser toutes les nouvelles mesures aux clients WebSocket
      broadcast({ type: 'NEW_MEASUREMENTS', payload: measurements });

    } catch (error) {
      console.error('Erreur simulation de données:', error);
    }
  }, 5000); // Toutes les 5 secondes
};
