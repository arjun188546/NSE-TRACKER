import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineStyle, Time } from 'lightweight-charts';
import { useCandlesticks } from '@/hooks/use-candlesticks';
import { Button } from '@/components/ui/button';

export function CandlesTV({ symbol }: { symbol: string }) {
  const [period, setPeriod] = useState('1m');
  const { data, isLoading, error } = useCandlesticks(symbol, period);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const volumeRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const volChartRef = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8' },
      width: containerRef.current.clientWidth,
      height: 280,
      grid: { vertLines: { color: '#e5e7eb' }, horzLines: { color: '#e5e7eb' } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;
    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
      if (volumeRef.current) volChartRef.current?.applyOptions({ width: volumeRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!volumeRef.current) return;
    const chart = createChart(volumeRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94a3b8' },
      width: volumeRef.current.clientWidth,
      height: 120,
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
    });
    volChartRef.current = chart;
    return () => { chart.remove(); };
  }, []);

  useEffect(() => {
    if (!data || !chartRef.current || !volChartRef.current) return;
    if (!data.candles || data.candles.length === 0) {
      console.warn('[CandlesTV] No candle data available');
      return;
    }
    const candleSeries = chartRef.current.addCandlestickSeries({ upColor: '#16a34a', downColor: '#ef4444', borderVisible: false, wickUpColor: '#16a34a', wickDownColor: '#ef4444' });
    const emaLine = chartRef.current.addLineSeries({ color: '#f59e0b', lineWidth: 2, lineStyle: LineStyle.Solid });
    const volumeSeries = volChartRef.current.addHistogramSeries({ color: '#94a3b8' });

    const cdata = data.candles.map(c => ({ time: c.date as Time, open: c.open, high: c.high, low: c.low, close: c.close }));
    candleSeries.setData(cdata);
    const ema = data.candles.filter(c=>c.ema20!==undefined).map(c => ({ time: c.date as Time, value: c.ema20! }));
    if (ema.length) emaLine.setData(ema);
    const vdata = data.candles.map(c => ({ time: c.date as Time, value: c.volume, color: c.close >= c.open ? '#10b981' : '#ef4444' }));
    volumeSeries.setData(vdata);

    chartRef.current.timeScale().fitContent();
    volChartRef.current.timeScale().fitContent();

    // Clean up only the series when data updates; keep charts alive
    return () => {
      try { candleSeries.remove(); } catch {}
      try { emaLine.remove(); } catch {}
      try { volumeSeries.remove(); } catch {}
    };
  }, [data]);

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {['1w','1m','3m','6m','1y'].map(p => (
          <Button key={p} size="xs" variant={p===period?'secondary':'outline'} onClick={()=>setPeriod(p)}>{p.toUpperCase()}</Button>
        ))}
      </div>
      {isLoading && <div className="h-80 flex items-center justify-center text-muted-foreground">Loading chart…</div>}
      {error && <div className="text-red-500 text-sm">{(error as any).message}</div>}
      {data && data.candles && data.candles.length === 0 && <div className="text-sm text-muted-foreground p-4">No candlestick data available for this period. Data will populate after daily scraper runs.</div>}
      <div ref={containerRef} />
      <div ref={volumeRef} className="mt-2" />
    </div>
  );
}
