"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuthStore, useNotificationStore } from "@/stores";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const connect = useCallback(() => {
    if (!user?.id || ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(`${WS_URL}/ws/${user.id}`);

    ws.current.onopen = () => {
      setIsConnected(true);
      console.log("WebSocket connected");
    };

    ws.current.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        handleMessage(data);
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, [user?.id]);

  const handleMessage = useCallback((data: WebSocketMessage) => {
    switch (data.type) {
      case "notification":
        addNotification(data as unknown as Parameters<typeof addNotification>[0]);
        break;
      case "update_posted":
      case "node_completed":
      case "reaction_added":
        // Trigger UI updates
        window.dispatchEvent(new CustomEvent("gonado:update", { detail: data }));
        break;
      case "pong":
        // Heartbeat response
        break;
      default:
        console.log("Unknown message type:", data.type);
    }
  }, [addNotification]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribeToGoal = useCallback((goalId: string) => {
    sendMessage({ type: "subscribe_goal", goal_id: goalId });
  }, [sendMessage]);

  const unsubscribeFromGoal = useCallback((goalId: string) => {
    sendMessage({ type: "unsubscribe_goal", goal_id: goalId });
  }, [sendMessage]);

  useEffect(() => {
    connect();

    // Heartbeat
    const heartbeat = setInterval(() => {
      sendMessage({ type: "ping" });
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      ws.current?.close();
    };
  }, [connect, sendMessage]);

  return {
    isConnected,
    sendMessage,
    subscribeToGoal,
    unsubscribeFromGoal,
  };
}
