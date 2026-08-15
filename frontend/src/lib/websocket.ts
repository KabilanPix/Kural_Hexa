import { useEffect, useRef, useState } from 'react';

export interface WebSocketEvent {
  event: 'NEW_COMPLAINT' | 'COMPLAINT_UPDATED';
  data: any;
}

export function useDashboardWebSocket(onMessage: (event: WebSocketEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null as any);

  useEffect(() => {
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000') + '/ws/dashboard';
    let socket: any;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsConnected(true);
          console.log('[WebSocket] Connected to Kural Live Dashboard Stream');
        };

        socket.onmessage = (event: any) => {
          try {
            const parsed: WebSocketEvent = JSON.parse(event.data);
            onMessage(parsed);
          } catch (err) {
            console.error('[WebSocket] Error parsing message:', err);
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          console.log('[WebSocket] Connection closed. Retrying in 3s...');
          setTimeout(connect, 3000);
        };

        socket.onerror = (err: any) => {
          console.error('[WebSocket] Connection error:', err);
          socket.close();
        };
      } catch (err) {
        console.error('[WebSocket] Failed to initialize WebSocket:', err);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { isConnected };
}
