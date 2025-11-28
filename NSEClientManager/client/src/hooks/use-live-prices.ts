import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

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
export function useLivePrice(symbol: string, enabled: boolean = true) {
  const { isMarketOpen } = useMarketStatus();

  return useQuery({
    queryKey: ["/api/prices/live", symbol],
    enabled: enabled && !!symbol,
    refetchInterval: isMarketOpen ? 5000 : false, // Update every 5 seconds during market hours
    staleTime: isMarketOpen ? 4000 : 300000, // Data is fresh for 4s during market hours, 5min otherwise
  });
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
