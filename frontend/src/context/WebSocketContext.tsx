import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

type WebSocketMessage = {
  type: string;
  payload: any;
};

type Listener = (payload: any) => void;

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (type: string, listener: Listener) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const listenersMapRef = useRef<Map<string, Set<Listener>>>(new Map());

  // Setup WS connection when user is logged in
  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.close();
      }
      return;
    }

    const connect = () => {
      const wsUrl = `ws://localhost:5000`;
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket connection established.');
        setIsConnected(true);
        // Authenticate the connection via sending auth message
        socket.send(JSON.stringify({ type: 'auth', userId: user.id }));
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          const listeners = listenersMapRef.current.get(message.type);
          if (listeners) {
            listeners.forEach((listener) => {
              try {
                listener(message.payload);
              } catch (e) {
                console.error(`Error in WebSocket listener for event ${message.type}:`, e);
              }
            });
          }
        } catch (e) {
          // ignore malformed messages
        }
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed. Retrying in 3s...');
        setIsConnected(false);
        socketRef.current = null;
        // Auto-reconnect after 3 seconds
        setTimeout(() => {
          if (user && token) {
            connect();
          }
        }, 3000);
      };

      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      socketRef.current = socket;
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [user, token]);

  const subscribe = (type: string, listener: Listener) => {
    let listeners = listenersMapRef.current.get(type);
    if (!listeners) {
      listeners = new Set();
      listenersMapRef.current.set(type, listeners);
    }
    listeners.add(listener);

    // Return an unsubscribe function
    return () => {
      const currentListeners = listenersMapRef.current.get(type);
      if (currentListeners) {
        currentListeners.delete(listener);
        if (currentListeners.size === 0) {
          listenersMapRef.current.delete(type);
        }
      }
    };
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
