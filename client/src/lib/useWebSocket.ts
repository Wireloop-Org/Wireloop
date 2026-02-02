import { useEffect, useRef, useCallback, useState } from "react";
import { getToken } from "./api";

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(
  /^http/,
  "ws"
);

// Reconnection config - SOTA exponential backoff with jitter
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const RECONNECT_DECAY = 1.5;
const JITTER_FACTOR = 0.3;

export type WebSocketMessage = {
  type: string;
  payload?: unknown;
  channel_id?: string;
  message_id?: string;
  [key: string]: unknown;
};

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

interface UseWebSocketOptions {
  projectId: string;
  channelId?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  status: WebSocketStatus;
  send: (message: Record<string, unknown>) => void;
  reconnect: () => void;
}

function getReconnectDelay(attempt: number): number {
  const baseDelay = Math.min(
    INITIAL_RECONNECT_DELAY * Math.pow(RECONNECT_DECAY, attempt),
    MAX_RECONNECT_DELAY
  );
  // Add jitter to prevent thundering herd
  const jitter = baseDelay * JITTER_FACTOR * (Math.random() * 2 - 1);
  return Math.round(baseDelay + jitter);
}

export function useWebSocket({
  projectId,
  channelId,
  onMessage,
  onStatusChange,
  enabled = true,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const messageQueueRef = useRef<Record<string, unknown>[]>([]);

  // Track callbacks in refs to avoid reconnection on callback change
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  // Update status and notify
  const updateStatus = useCallback((newStatus: WebSocketStatus) => {
    if (!mountedRef.current) return;
    setStatus(newStatus);
    onStatusChangeRef.current?.(newStatus);
  }, []);

  // Connect function
  const connect = useCallback(() => {
    const token = getToken();
    if (!token || !projectId || !enabled) {
      updateStatus("disconnected");
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    updateStatus(reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting");

    let url = `${WS_URL}/api/ws?project_id=${projectId}&token=${token}`;
    if (channelId) {
      url += `&channel_id=${channelId}`;
    }

    const ws = new WebSocket(url);

    ws.onopen = () => {
      if (!mountedRef.current) {
        ws.close();
        return;
      }

      reconnectAttemptRef.current = 0;
      updateStatus("connected");

      // Flush queued messages
      while (messageQueueRef.current.length > 0) {
        const msg = messageQueueRef.current.shift();
        if (msg && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        }
      }
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;

      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        onMessageRef.current?.(data);
      } catch (err) {
        console.error("[WS] Parse error:", err);
      }
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;

      wsRef.current = null;

      // Don't reconnect on clean close (1000) or auth failure (4001, 4003)
      if (event.code === 1000 || event.code === 4001 || event.code === 4003) {
        updateStatus("disconnected");
        return;
      }

      // Schedule reconnect with exponential backoff
      const delay = getReconnectDelay(reconnectAttemptRef.current);
      reconnectAttemptRef.current++;

      console.log(
        `[WS] Disconnected. Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`
      );

      updateStatus("reconnecting");
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && enabled) {
          connect();
        }
      }, delay);
    };

    ws.onerror = () => {
      // Error handling is done in onclose
    };

    wsRef.current = ws;
  }, [projectId, channelId, enabled, updateStatus]);

  // Send message with queueing for reconnection
  const send = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message for when we reconnect
      messageQueueRef.current.push(message);
      console.log("[WS] Message queued for reconnection");
    }
  }, []);

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    connect();
  }, [connect]);

  // Initial connection and cleanup
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && projectId) {
      connect();
    }

    return () => {
      mountedRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [projectId, enabled, connect]);

  // Handle channel changes - switch channel without reconnecting
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && channelId) {
      wsRef.current.send(
        JSON.stringify({
          type: "switch_channel",
          channel_id: channelId,
        })
      );
    }
  }, [channelId]);

  return { status, send, reconnect };
}
