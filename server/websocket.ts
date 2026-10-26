import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'health-locker-dev-secret-key-2026';

interface ClientConnection {
  ws: WebSocket;
  userId: string;
  role: string;
  name: string;
}

const clients = new Map<string, Set<ClientConnection>>(); // userId -> Set of connections

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: http.Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    let currentUser: { userId: string; role: string; name: string } | null = null;

    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'AUTH') {
          const { token } = msg;
          if (!token) return;

          try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            currentUser = {
              userId: decoded.id,
              role: decoded.role,
              name: decoded.name
            };

            const userClients = clients.get(decoded.id) || new Set();
            userClients.add({ ws, ...currentUser });
            clients.set(decoded.id, userClients);

            ws.send(JSON.stringify({
              type: 'AUTH_SUCCESS',
              userId: decoded.id,
              role: decoded.role
            }));
          } catch (err) {
            ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'Invalid token' }));
          }
        }

        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      if (currentUser) {
        const userClients = clients.get(currentUser.userId);
        if (userClients) {
          userClients.forEach(c => {
            if (c.ws === ws) userClients.delete(c);
          });
          if (userClients.size === 0) {
            clients.delete(currentUser.userId);
          }
        }
      }
    });
  });

  console.log('📡 WebSocket Server initialized on /ws');
}

/**
 * Broadcast event to a specific user's active sockets
 */
export function sendToUser(userId: string, event: string, payload: any) {
  const userConns = clients.get(userId);
  if (userConns) {
    const msg = JSON.stringify({ type: event, data: payload, timestamp: new Date().toISOString() });
    userConns.forEach(conn => {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(msg);
      }
    });
  }
}

/**
 * Broadcast event to all connected users
 */
export function broadcastAll(event: string, payload: any) {
  if (!wss) return;
  const msg = JSON.stringify({ type: event, data: payload, timestamp: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}
