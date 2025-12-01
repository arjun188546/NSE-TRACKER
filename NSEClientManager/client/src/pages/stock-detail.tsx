import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useLocation, useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  ArrowUpIcon,
  ArrowDownIcon,
  TrendingDown,
} from "lucide-react";
import { StockDetail } from "@shared/schema";
import { CandlesTV } from '@/components/charts/CandlesTV';
import { DeliveryDailyTable } from '@/components/charts/DeliveryDailyTable';
import { QuarterlyPerformance } from '@/components/quarterly-performance';

export default function StockDetailPage() {
  const { user, hasActiveSubscription, isDemoMode, isLoading } = useAuth();
  const [, params] = useRoute("/stock/:symbol");
  const [location, setLocation] = useLocation();
  
  // Get tab from URL query parameter
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const initialTab = urlParams.get('tab') || 'results';
  const [activeTab, setActiveTab] = useState(initialTab);

  const canAccessFeatures = hasActiveSubscription || isDemoMode;

  // All hooks must be called before any conditional returns
  const { data: stockDetail, isLoading: isLoadingStock } = useQuery<StockDetail>({
    queryKey: ["/api/stocks", params?.symbol],
    enabled: !isLoading && !!user && !!params?.symbol && canAccessFeatures,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  // Show loading while validating session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isPositive = parseFloat(stockDetail?.percentChange || "0") >= 0;
  const percentChange = parseFloat(stockDetail?.percentChange || "0");

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => setLocation("/calendar")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Calendar
          </Button>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-96" />
            </div>
          ) : stockDetail ? (
            <>
              {/* Stock Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center">
                          <span className="font-mono font-bold text-xl text-primary">
                            {stockDetail.symbol.substring(0, 2)}
                          </span>
                        </div>
                        <div>
                          <h1 className="text-3xl font-bold" data-testid="text-stock-symbol">
                            {stockDetail.symbol}
                          </h1>
                          <p className="text-muted-foreground">{stockDetail.companyName}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-mono font-bold" data-testid="text-current-price">
                        ₹
                        {parseFloat(stockDetail.currentPrice || "0").toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div
                        className={`flex items-center justify-end gap-1 font-mono text-lg mt-1 ${isPositive ? "text-green-500" : "text-red-500"
                          }`}
                        data-testid="text-percent-change"
                      >
                        {isPositive ? (
                          <ArrowUpIcon className="w-5 h-5" />
                        ) : (
                          <ArrowDownIcon className="w-5 h-5" />
                        )}
                        {Math.abs(percentChange).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  {/* Trading Statistics Grid */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {/* Last Traded Info */}
                      {stockDetail.lastTradedPrice && (
                        <div>
                          <span className="text-muted-foreground block">Last Trade:</span>
                          <span className="font-mono font-medium">
                            ₹{parseFloat(stockDetail.lastTradedPrice).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          {stockDetail.lastTradedTime && (
                            <span className="text-xs text-muted-foreground ml-1">
                              @ {stockDetail.lastTradedTime}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Volume */}
                      {stockDetail.totalTradedVolume && (
                        <div>
                          <span className="text-muted-foreground block">Volume:</span>
                          <span className="font-mono font-medium">
                            {parseInt(stockDetail.totalTradedVolume.toString()).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}

                      {/* Day Range */}
                      {stockDetail.dayLow && stockDetail.dayHigh && (
                        <div>
                          <span className="text-muted-foreground block">Day Range:</span>
                          <span className="font-mono font-medium">
                            ₹{parseFloat(stockDetail.dayLow).toFixed(2)} - ₹{parseFloat(stockDetail.dayHigh).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* 52 Week Range */}
                      {stockDetail.yearLow && stockDetail.yearHigh && (
                        <div>
                          <span className="text-muted-foreground block">52W Range:</span>
                          <span className="font-mono font-medium">
                            ₹{parseFloat(stockDetail.yearLow).toFixed(2)} - ₹{parseFloat(stockDetail.yearHigh).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* Open Price */}
                      {stockDetail.openPrice && (
                        <div>
                          <span className="text-muted-foreground block">Open:</span>
                          <span className="font-mono font-medium">
                            ₹{parseFloat(stockDetail.openPrice).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      )}

                      {/* Previous Close */}
                      {stockDetail.previousClose && (
                        <div>
                          <span className="text-muted-foreground block">Prev Close:</span>
                          <span className="font-mono font-medium">
                            ₹{parseFloat(stockDetail.previousClose).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      )}

                      {/* Average Price */}
                      {stockDetail.averagePrice && (
                        <div>
                          <span className="text-muted-foreground block">Avg Price:</span>
                          <span className="font-mono font-medium">
                            ₹{parseFloat(stockDetail.averagePrice).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      )}

                      {/* Total Traded Value */}
                      {stockDetail.totalTradedValue && (
                        <div>
                          <span className="text-muted-foreground block">Traded Value:</span>
                          <span className="font-mono font-medium">
                            ₹{(parseFloat(stockDetail.totalTradedValue) / 10000000).toFixed(2)}Cr
                          </span>
                        </div>
                      )}

                      {/* Sector */}
                      {stockDetail.sector && (
                        <div>
                          <span className="text-muted-foreground block">Sector:</span>
                          <span className="font-medium">{stockDetail.sector}</span>
                        </div>
                      )}

                      {/* Market Cap */}
                      {stockDetail.marketCap && (
                        <div>
                          <span className="text-muted-foreground block">Market Cap:</span>
                          <span className="font-medium">{stockDetail.marketCap}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Three Panel View */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="results" data-testid="tab-results">
                    Quarterly Results
                  </TabsTrigger>
                  <TabsTrigger value="chart" data-testid="tab-chart">
                    Candlestick Chart
                  </TabsTrigger>
                  <TabsTrigger value="delivery" data-testid="tab-delivery">
                    Delivery Volume
                  </TabsTrigger>
                </TabsList>

                {/* Panel 1: Quarterly Results Comparison */}
                <TabsContent value="results">
                  <QuarterlyPerformance data={stockDetail.results} />
                </TabsContent>

                {/* Panel 2: Candlestick Chart */}
                <TabsContent value="chart">
                  <Card>
                    <CardHeader>
                      <CandlestickHeader symbol={stockDetail.symbol} />
                    </CardHeader>
                    <CardContent>
                      <CandlesTV symbol={stockDetail.symbol} />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Panel 3: Delivery Volume */}
                <TabsContent value="delivery">
                  <Card>
                    <CardHeader>
                      <DeliveryHeader symbol={stockDetail.symbol} />
                    </CardHeader>
                    <CardContent>
                      <DeliveryDailyTable symbol={stockDetail.symbol} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <h3 className="text-xl font-semibold mb-2">Stock not found</h3>
                <p className="text-muted-foreground mb-6">
                  The requested stock symbol could not be found.
                </p>
                <Button onClick={() => setLocation("/calendar")} data-testid="button-go-back">
                  Go Back to Calendar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

// Candlestick components
function CandlestickHeader({ symbol }: { symbol: string }) {
  const [period, setPeriod] = useState('1m');
  return (
    <CardTitle className="flex items-center justify-between">
      <span>Candlestick Chart ({period.toUpperCase()})</span>
      <div className="flex gap-1">
        {['1w', '1m', '3m', '6m', '1y'].map(p => (
          <Button key={p} size="sm" variant={p === period ? 'secondary' : 'outline'} onClick={() => setPeriod(p)}>
            {p.toUpperCase()}
          </Button>
        ))}
      </div>
    </CardTitle>
  );
}

function PeriodButtons({ period, setPeriod }: { period: string; setPeriod: (p: string) => void }) {
  return (
    <div className="flex gap-1 mb-2">
      {['1w', '1m', '3m', '6m', '1y'].map(p => (
        <Button key={p} size="sm" variant={p === period ? 'secondary' : 'outline'} onClick={() => setPeriod(p)}>{p.toUpperCase()}</Button>
      ))}
    </div>
  );
}

// Delivery components
function DeliveryHeader({ symbol }: { symbol: string }) {
  return <CardTitle>Delivery to Trading Volume</CardTitle>;
}
