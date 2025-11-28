/**
 * Quarterly Performance Comparison Component
 * Displays financial metrics in a table format matching the reference design
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface QuarterlyData {
  quarter: string;
  fiscalYear: string;
  revenue?: string;
  profit?: string;
  eps?: string;
  operatingProfit?: string;
  operatingProfitMargin?: string;
  prevRevenue?: string;
  prevProfit?: string;
  prevEps?: string;
  prevOperatingProfit?: string;
  yearAgoRevenue?: string;
  yearAgoProfit?: string;
  yearAgoEps?: string;
  yearAgoOperatingProfit?: string;
  revenueQoQ?: string;
  profitQoQ?: string;
  epsQoQ?: string;
  operatingProfitQoQ?: string;
  operatingProfitMarginQoQ?: string;
  revenueYoY?: string;
  profitYoY?: string;
  epsYoY?: string;
  operatingProfitYoY?: string;
  operatingProfitMarginYoY?: string;
}

interface QuarterlyPerformanceProps {
  data?: QuarterlyData;
}

export function QuarterlyPerformance({ data }: QuarterlyPerformanceProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quarterly Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <TrendingDown className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Waiting for Results</h3>
            <p className="text-muted-foreground max-w-md">
              Quarterly results have not been published yet. Data will be available after the company announces results.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate previous quarter and year-ago values from percentage changes if not provided
  const calculatePrevValue = (current?: string | number, qoqChange?: string | number) => {
    if (!current || !qoqChange) return undefined;
    const curr = parseFloat(current.toString());
    const change = parseFloat(qoqChange.toString());
    if (isNaN(curr) || isNaN(change)) return undefined;
    const prev = curr / (1 + change / 100);
    return prev.toFixed(2);
  };

  const calculateYearAgoValue = (current?: string | number, yoyChange?: string | number) => {
    if (!current || !yoyChange) return undefined;
    const curr = parseFloat(current.toString());
    const change = parseFloat(yoyChange.toString());
    if (isNaN(curr) || isNaN(change)) return undefined;
    const yearAgo = curr / (1 + change / 100);
    return yearAgo.toFixed(2);
  };

  // Use provided values or calculate from changes
  const prevRevenue = data.prevRevenue || calculatePrevValue(data.revenue, data.revenueQoQ);
  const prevProfit = data.prevProfit || calculatePrevValue(data.profit, data.profitQoQ);
  const prevEps = data.prevEps || calculatePrevValue(data.eps, data.epsQoQ);
  const prevOpProfit = data.prevOperatingProfit || calculatePrevValue(data.operatingProfit, data.operatingProfitQoQ);

  const yearAgoRevenue = data.yearAgoRevenue || calculateYearAgoValue(data.revenue, data.revenueYoY);
  const yearAgoProfit = data.yearAgoProfit || calculateYearAgoValue(data.profit, data.profitYoY);
  const yearAgoEps = data.yearAgoEps || calculateYearAgoValue(data.eps, data.epsYoY);
  const yearAgoOpProfit = data.yearAgoOperatingProfit || calculateYearAgoValue(data.operatingProfit, data.operatingProfitYoY);

  // Helper to format currency in crores
  const formatCrores = (value?: string | number) => {
    if (!value) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    return `₹${num.toLocaleString('en-IN')} Cr`;
  };

  // Helper to format EPS
  const formatEPS = (value?: string | number) => {
    if (!value) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    return num.toFixed(2);
  };

  // Helper to format percentage
  const formatPercent = (value?: string | number) => {
    if (!value) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  // Helper to get percentage color and icon
  const getPercentageStyle = (value?: string | number) => {
    if (!value) return { color: 'text-muted-foreground', icon: null };
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return { color: 'text-muted-foreground', icon: null };
    
    return {
      color: num >= 0 ? 'text-green-600' : 'text-red-600',
      icon: num >= 0 ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />
    };
  };

  // Calculate prev quarter and year ago labels
  const currentQ = parseInt(data.quarter?.replace('Q', '') || '2');
  const currentFY = data.fiscalYear || 'FY 25-26';
  const prevQ = currentQ === 1 ? 4 : currentQ - 1;
  
  // Parse fiscal year safely - handle different formats (e.g., "FY2526", "FY 25-26")
  const parseFiscalYear = (fy: string) => {
    if (!fy) return { year1: 25, year2: 26 };
    const match = fy.match(/(\d{2,4})/g);
    if (!match) return { year1: 25, year2: 26 };
    if (match.length === 1 && match[0].length === 4) {
      // Format: FY2526 -> 25-26
      const year1 = parseInt(match[0].substring(0, 2));
      const year2 = parseInt(match[0].substring(2, 4));
      return { year1, year2 };
    }
    // Format: FY 25-26
    return { year1: parseInt(match[0]), year2: parseInt(match[1] || match[0]) };
  };
  
  const { year1, year2 } = parseFiscalYear(currentFY);
  const prevFY = currentQ === 1 ? `FY ${year1 - 1}-${year2 - 1}` : currentFY;
  const yearAgoFY = `FY ${year1 - 1}-${year2 - 1}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quarterly Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Metric</TableHead>
                <TableHead className="text-center">
                  <div>{data.quarter} {currentFY}</div>
                  <div className="text-xs text-muted-foreground font-normal">(Current)</div>
                </TableHead>
                <TableHead className="text-center">
                  <div>Q{prevQ} {prevFY}</div>
                  <div className="text-xs text-muted-foreground font-normal">(Last Qtr)</div>
                </TableHead>
                <TableHead className="text-center">
                  <div>QoQ Growth</div>
                  <div className="text-xs text-muted-foreground font-normal">(%)</div>
                </TableHead>
                <TableHead className="text-center">
                  <div>{data.quarter} {yearAgoFY}</div>
                  <div className="text-xs text-muted-foreground font-normal">(Last Year)</div>
                </TableHead>
                <TableHead className="text-center">
                  <div>YoY Growth</div>
                  <div className="text-xs text-muted-foreground font-normal">(%)</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Revenue Row */}
              <TableRow>
                <TableCell className="font-semibold">Revenue</TableCell>
                <TableCell className="text-center font-mono">{formatCrores(data.revenue)}</TableCell>
                <TableCell className="text-center font-mono text-muted-foreground">{formatCrores(prevRevenue)}</TableCell>
                <TableCell className="text-center">
                  <span className={`font-mono font-semibold ${getPercentageStyle(data.revenueQoQ).color}`}>
                    {getPercentageStyle(data.revenueQoQ).icon}
                    {formatPercent(data.revenueQoQ)}
                  </span>
                </TableCell>
                <TableCell className="text-center font-mono text-muted-foreground">{formatCrores(yearAgoRevenue)}</TableCell>
                <TableCell className="text-center">
                  <span className={`font-mono font-semibold ${getPercentageStyle(data.revenueYoY).color}`}>
                    {getPercentageStyle(data.revenueYoY).icon}
                    {formatPercent(data.revenueYoY)}
                  </span>
                </TableCell>
              </TableRow>

              {/* Net Profit Row */}
              <TableRow>
                <TableCell className="font-semibold">Net Profit</TableCell>
                <TableCell className="text-center font-mono">{formatCrores(data.profit)}</TableCell>
                <TableCell className="text-center font-mono text-muted-foreground">{formatCrores(prevProfit)}</TableCell>
                <TableCell className="text-center">
                  <span className={`font-mono font-semibold ${getPercentageStyle(data.profitQoQ).color}`}>
                    {getPercentageStyle(data.profitQoQ).icon}
                    {formatPercent(data.profitQoQ)}
                  </span>
                </TableCell>
                <TableCell className="text-center font-mono text-muted-foreground">{formatCrores(yearAgoProfit)}</TableCell>
                <TableCell className="text-center">
                  <span className={`font-mono font-semibold ${getPercentageStyle(data.profitYoY).color}`}>
                    {getPercentageStyle(data.profitYoY).icon}
                    {formatPercent(data.profitYoY)}
                  </span>
                </TableCell>
              </TableRow>

              {/* EPS Row */}
              <TableRow>
                <TableCell className="font-semibold">EPS (₹)</TableCell>
                <TableCell className="text-center font-mono">{formatEPS(data.eps)}</TableCell>
                <TableCell className="text-center font-mono text-muted-foreground">{formatEPS(prevEps)}</TableCell>
                <TableCell className="text-center">
                  <span className={`font-mono font-semibold ${getPercentageStyle(data.epsQoQ).color}`}>
                    {getPercentageStyle(data.epsQoQ).icon}
                    {formatPercent(data.epsQoQ)}
                  </span>
                </TableCell>
                <TableCell className="text-center font-mono text-muted-foreground">{formatEPS(yearAgoEps)}</TableCell>
                <TableCell className="text-center">
                  <span className={`font-mono font-semibold ${getPercentageStyle(data.epsYoY).color}`}>
                    {getPercentageStyle(data.epsYoY).icon}
                    {formatPercent(data.epsYoY)}
                  </span>
                </TableCell>
              </TableRow>

              {/* Operating Profit Row */}
              <TableRow>
                <TableCell className="font-semibold">Operating Profit</TableCell>
                <TableCell className="text-center font-mono">{formatCrores(data.operatingProfit)}</TableCell>
                <TableCell className="text-center font-mono text-muted-foreground">{formatCrores(prevOpProfit)}</TableCell>
                <TableCell className="text-center">
                  <span className={`font-mono font-semibold ${getPercentageStyle(data.operatingProfitQoQ).color}`}>
                    {getPercentageStyle(data.operatingProfitQoQ).icon}
                    {formatPercent(data.operatingProfitQoQ)}
                  </span>
                </TableCell>
                <TableCell className="text-center font-mono text-muted-foreground">{formatCrores(yearAgoOpProfit)}</TableCell>
                <TableCell className="text-center">
                  <span className={`font-mono font-semibold ${getPercentageStyle(data.operatingProfitYoY).color}`}>
                    {getPercentageStyle(data.operatingProfitYoY).icon}
                    {formatPercent(data.operatingProfitYoY)}
                  </span>
                </TableCell>
              </TableRow>

              {/* Operating Profit Margin Row */}
              <TableRow>
                <TableCell className="font-semibold">Operating Profit Margin</TableCell>
                <TableCell className="text-center font-mono">{formatPercent(data.operatingProfitMargin)}</TableCell>
                <TableCell className="text-center font-mono text-muted-foreground">—</TableCell>
                <TableCell className="text-center">
                  <span className={`font-mono font-semibold ${getPercentageStyle(data.operatingProfitMarginQoQ).color}`}>
                    {getPercentageStyle(data.operatingProfitMarginQoQ).icon}
                    {formatPercent(data.operatingProfitMarginQoQ)}
                  </span>
                </TableCell>
                <TableCell className="text-center font-mono text-muted-foreground">—</TableCell>
                <TableCell className="text-center">
                  <span className={`font-mono font-semibold ${getPercentageStyle(data.operatingProfitMarginYoY).color}`}>
                    {getPercentageStyle(data.operatingProfitMarginYoY).icon}
                    {formatPercent(data.operatingProfitMarginYoY)}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
