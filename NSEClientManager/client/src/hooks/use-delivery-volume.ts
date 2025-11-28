import { useQuery } from '@tanstack/react-query';

export interface DeliveryPoint {
  date: string;
  deliveryQuantity: number; tradedQuantity: number; deliveryPercentage: number; deliveryPercMA7: number | null;
}

export function useDeliveryVolume(symbol: string | undefined, period: string) {
  return useQuery<{ symbol:string; period:string; delivery:DeliveryPoint[] }>({
    queryKey: ['delivery-volume', symbol, period],
    enabled: !!symbol,
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${symbol}/delivery-volume?period=${period}`);
      if (!res.ok) throw new Error('Failed to load delivery volume');
      return res.json();
    },
    staleTime: 30_000,
  });
}
