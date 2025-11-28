import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useState } from 'react';
import { useDeliveryVolume } from '@/hooks/use-delivery-volume';
import { Button } from '@/components/ui/button';

export function DeliveryTV({ symbol }: { symbol: string }) {
  const [period, setPeriod] = useState('3w');
  const { data, isLoading, error } = useDeliveryVolume(symbol, period);

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {['1w','3w','1m','3m'].map(p => (
          <Button key={p} size="xs" variant={p===period?'secondary':'outline'} onClick={()=>setPeriod(p)}>{p.toUpperCase()}</Button>
        ))}
      </div>
      {isLoading && <div className="h-80 flex items-center justify-center text-muted-foreground">Loading delivery…</div>}
      {error && <div className="text-red-500 text-sm">{(error as any).message}</div>}
      {data && (
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={data.delivery} margin={{ left: 16, right: 16, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis yAxisId="left" orientation="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="tradedQuantity" fill="#93c5fd" name="Traded Qty" />
            <Bar yAxisId="left" dataKey="deliveryQuantity" fill="#60a5fa" name="Delivery Qty" />
            <Line yAxisId="right" type="monotone" dataKey="deliveryPercentage" dot={false} stroke="#f59e0b" name="Delivery %" />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
