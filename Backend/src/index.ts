import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer } from 'ws';

import authRoutes        from './routes/authRoutes';
import userRoutes        from './routes/userRoutes';
import equipmentRoutes   from './routes/equipmentRoutes';
import alertRoutes       from './routes/alertRoutes';
import dashboardRoutes   from './routes/dashboardRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { initWebSocket } from './services/websocketService';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── Routes API REST ────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/equipments',    equipmentRoutes);
app.use('/api/alerts',        alertRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Route de santé ─────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serveur HTTP + WebSocket ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

initWebSocket(wss);

server.listen(PORT, () => {
  console.log(`✅ Serveur HTTP  → http://localhost:${PORT}`);
  console.log(`✅ Serveur WS    → ws://localhost:${PORT}`);
});

import predictionRoutes from './routes/predictionRoutes';
// ...
app.use('/api/predictions', predictionRoutes);

