import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, ArrowDownIcon, Star, TrendingUp, Eye } from "lucide-react";
import { Stock } from "@shared/schema";
import { Link } from "wouter";
import { useState } from "react";

interface StockCardProps {
  stock: Stock & { mini?: boolean };
  mini?: boolean;
}

export function StockCard({ stock, mini = false }: StockCardProps) {
  const isPositive = parseFloat(stock.percentChange || "0") >= 0;
  const percentChange = parseFloat(stock.percentChange || "0");
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWatchlisted(!isWatchlisted);
  };

  // Generate simple trend line data (simulated)
  const generateTrendData = () => {
    const basePrice = parseFloat(stock.currentPrice || "0");
    return Array.from({ length: 7 }, (_, i) => {
      const variance = (Math.random() - 0.5) * basePrice * 0.05;
      return basePrice + variance;
    });
  };

  const trendData = generateTrendData();
  const minPrice = Math.min(...trendData);
  const maxPrice = Math.max(...trendData);
  const priceRange = maxPrice - minPrice || 1;

  if (mini) {
    return (
      <Link href={`/stock/${stock.symbol}`}>
        <Card
          className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-all"
          data-testid={`card-stock-${stock.symbol}`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0"
                data-testid={`icon-stock-${stock.symbol}`}
              >
                <span className="font-mono font-semibold text-sm text-primary">
                  {stock.symbol.substring(0, 2)}
                </span>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate" data-testid={`text-symbol-${stock.symbol}`}>
                  {stock.symbol}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {stock.companyName}
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-mono font-medium" data-testid={`text-price-${stock.symbol}`}>
                ₹{parseFloat(stock.currentPrice || "0").toFixed(2)}
              </div>
              <div
                className={`text-xs font-mono flex items-center justify-end gap-0.5 ${
                  isPositive ? "text-green-500" : "text-red-500"
                }`}
                data-testid={`text-change-${stock.symbol}`}
              >
                {isPositive ? (
                  <ArrowUpIcon className="w-3 h-3" />
                ) : (
                  <ArrowDownIcon className="w-3 h-3" />
                )}
                {Math.abs(percentChange).toFixed(2)}%
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Card
      className="group p-6 hover-elevate active-elevate-2 cursor-pointer transition-all overflow-hidden relative"
      data-testid={`card-stock-${stock.symbol}`}
    >
      <Link href={`/stock/${stock.symbol}`}>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0"
                  data-testid={`icon-stock-${stock.symbol}`}
                >
                  <span className="font-mono font-bold text-primary">
                    {stock.symbol.substring(0, 2)}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg truncate" data-testid={`text-symbol-${stock.symbol}`}>
                    {stock.symbol}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">{stock.companyName}</p>
                </div>
              </div>
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm font-mono font-medium flex-shrink-0 ${
                isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              }`}
              data-testid={`badge-change-${stock.symbol}`}
            >
              {isPositive ? (
                <ArrowUpIcon className="w-4 h-4" />
              ) : (
                <ArrowDownIcon className="w-4 h-4" />
              )}
              {Math.abs(percentChange).toFixed(2)}%
            </div>
          </div>

          {/* Mini Sparkline */}
          <div className="h-12 flex items-end gap-0.5">
            {trendData.map((price, i) => {
              const height = ((price - minPrice) / priceRange) * 100;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all ${
                    isPositive ? "bg-green-500/20" : "bg-red-500/20"
                  }`}
                  style={{ height: `${Math.max(height, 10)}%` }}
                />
              );
            })}
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-mono font-semibold" data-testid={`text-price-${stock.symbol}`}>
                ₹{parseFloat(stock.currentPrice || "0").toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                {stock.lastTradedTime && (
                  <div className="flex items-center gap-1">
                    <span>LTP @ {stock.lastTradedTime}</span>
                  </div>
                )}
                {stock.totalTradedVolume && (
                  <div>
                    Vol: {parseInt(stock.totalTradedVolume.toString()).toLocaleString("en-IN", { notation: "compact" })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Quick Actions - Appear on hover */}
      <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="secondary"
          className="w-8 h-8"
          onClick={handleWatchlistToggle}
          data-testid={`button-watchlist-${stock.symbol}`}
        >
          <Star className={`w-4 h-4 ${isWatchlisted ? "fill-primary text-primary" : ""}`} />
        </Button>
        <Link href={`/stock/${stock.symbol}`}>
          <Button
            size="icon"
            variant="secondary"
            className="w-8 h-8"
            data-testid={`button-view-${stock.symbol}`}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
