import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

// Singleton socket instance
let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("[WebSocket] Connected to server");
    });

    socket.on("disconnect", () => {
      console.log("[WebSocket] Disconnected from server");
    });
  }
  return socket;
}

interface PriceServiceStatus {
  isMarketHours: boolean;
  isUpdating: boolean;
  updateInterval: number;
  nextUpdate: string;
}

/**
 * Hook to check if market is currently open
 */
export function useMarketStatus() {
  const { data: status } = useQuery<PriceServiceStatus>({
    queryKey: ["/api/prices/status"],
    refetchInterval: 60000, // Check every minute
  });

  return {
    isMarketOpen: status?.isMarketHours ?? false,
    isUpdating: status?.isUpdating ?? false,
  };
}

/**
 * Hook to get live price for a specific stock
 */
/**
 * Hook to get real-time price for a specific stock using WebSockets
 */
export function useLivePrice(symbol: string, enabled: boolean = true) {
  const { isMarketOpen } = useMarketStatus();
  const queryClient = useQueryClient();
  const [realTimeData, setRealTimeData] = useState<any>(null);

  // Initial data fetch using React Query
  const query = useQuery({
    queryKey: ["/api/prices/live", symbol],
    enabled: enabled && !!symbol,
    refetchInterval: false, // Disable polling, rely on WebSocket
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!enabled || !symbol) return;

    const socket = getSocket();

    // Subscribe to stock updates
    socket.emit("subscribe", [symbol]);

    // Listen for updates
    const handlePriceUpdate = (data: any) => {
      if (data.symbol === symbol.toUpperCase()) {
        // Update local state for immediate feedback
        setRealTimeData(data.data);

        // Update React Query cache to keep everything in sync
        queryClient.setQueryData(["/api/prices/live", symbol], data.data);
      }
    };

    socket.on("price_update", handlePriceUpdate);

    return () => {
      socket.emit("unsubscribe", [symbol]);
      socket.off("price_update", handlePriceUpdate);
    };
  }, [symbol, enabled, queryClient]);

  // Return real-time data if available, otherwise fallback to query data
  return {
    ...query,
    data: realTimeData || query.data
  };
}

/**
 * Hook to enable automatic portfolio price updates
 */
export function useAutoRefreshPrices() {
  const { isMarketOpen } = useMarketStatus();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!isMarketOpen) return;

    // Trigger refetch of portfolio queries every 5 seconds during market hours
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, [isMarketOpen]);

  return {
    isMarketOpen,
    lastUpdate,
    refetchInterval: (isMarketOpen ? 5000 : false) as number | false,
  };
}
