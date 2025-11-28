import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Row = {
  date: string;
  prevClose: string | number | null;
  open: string | number | null;
  high: string | number | null;
  low: string | number | null;
  last: string | number | null;
  close: string | number | null;
  vwap: string | number | null;
  tradedQty: number;
  turnoverCr: string | number | null;
  trades: number | null;
  deliveryQty: number;
  deliveryPerc: number;
};

export function DeliveryDailyTable({ symbol }: { symbol: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(()=>{
    let active = true;
    setLoading(true); setError(null);
    fetch(`/api/stocks/${symbol}/delivery-daily?days=21`)
      .then(async r=>{
        const text = await r.text();
        try {
          return JSON.parse(text);
        } catch(e) {
          console.error('[DeliveryTable] Response not JSON:', text.substring(0, 200));
          throw new Error('Invalid response from server');
        }
      })
      .then(json=>{ if (active) setRows(json.rows || []); })
      .catch(e=>{ if (active) setError(e.message || 'Failed'); })
      .finally(()=>{ if (active) setLoading(false); });
    return ()=>{ active=false; };
  }, [symbol]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading delivery table…</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Prev Close</TableHead>
            <TableHead className="text-right">Open</TableHead>
            <TableHead className="text-right">High</TableHead>
            <TableHead className="text-right">Low</TableHead>
            <TableHead className="text-right">Last</TableHead>
            <TableHead className="text-right">Close</TableHead>
            <TableHead className="text-right">VWAP</TableHead>
            <TableHead className="text-right">Traded Qty</TableHead>
            <TableHead className="text-right">Turnover (Cr)</TableHead>
            <TableHead className="text-right">No. Trades</TableHead>
            <TableHead className="text-right">Deliv. Qty</TableHead>
            <TableHead className="text-right">% Deliv</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.date}</TableCell>
              <TableCell className="text-right">{fmt(r.prevClose)}</TableCell>
              <TableCell className="text-right">{fmt(r.open)}</TableCell>
              <TableCell className="text-right">{fmt(r.high)}</TableCell>
              <TableCell className="text-right">{fmt(r.low)}</TableCell>
              <TableCell className="text-right">{fmt(r.last)}</TableCell>
              <TableCell className="text-right">{fmt(r.close)}</TableCell>
              <TableCell className="text-right">{fmt(r.vwap)}</TableCell>
              <TableCell className="text-right">{num(r.tradedQty)}</TableCell>
              <TableCell className="text-right">{fmt(r.turnoverCr)}</TableCell>
              <TableCell className="text-right">{num(r.trades)}</TableCell>
              <TableCell className="text-right">{num(r.deliveryQty)}</TableCell>
              <TableCell className="text-right">{r.deliveryPerc ? Number(r.deliveryPerc).toFixed(2) + '%' : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function fmt(v: any) { if (v===null || v===undefined || v==='') return '-'; const n = Number(v); return isNaN(n) ? String(v) : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function num(v: any) { if (v===null || v===undefined || v==='') return '-'; const n = Number(v); return isNaN(n) ? String(v) : Math.round(n).toLocaleString('en-IN'); }
