import { useQuery } from '@tanstack/react-query';

export interface CandlePoint {
  date: string;
  open: number; high: number; low: number; close: number; volume: number;
  ema20?: number; rsi14?: number | null;
}

export function useCandlesticks(symbol: string | undefined, period: string) {
  return useQuery<{ symbol:string; period:string; candles:CandlePoint[] }>({
    queryKey: ['candlesticks', symbol, period],
    enabled: !!symbol,
    queryFn: async () => {
      const res = await fetch(`/api/stocks/${symbol}/candlesticks?period=${period}`);
      if (!res.ok) throw new Error('Failed to load candlesticks');
      return res.json();
    },
    staleTime: 30_000,
  });
}
