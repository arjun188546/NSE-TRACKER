import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockCard } from "@/components/stock-card";
import { useMarketStatus } from "@/hooks/use-live-prices";
import { 
  TrendingUp, 
  Search, 
  Plus, 
  Building2, 
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  EyeOff
} from "lucide-react";
import { Stock } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NSEStock {
  id: string;
  symbol: string;
  companyName: string;
  sector: string;
  marketCap?: number;
  price?: number;
  change?: number;
  changePercent?: number;
  isInWatchlist: boolean;
}

const SECTORS = [
  "All",
  "Banking",
  "IT",
  "Pharmaceuticals", 
  "Automobile",
  "Steel",
  "Oil & Gas",
  "FMCG",
  "Telecom",
  "Power",
  "Cement",
  "Textiles",
  "Media",
  "Chemicals",
  "Solar Energy",
  "Fintech"
];

const SORT_OPTIONS = [
  { label: "Symbol A-Z", value: "symbol-asc" },
  { label: "Symbol Z-A", value: "symbol-desc" },
  { label: "Market Cap High-Low", value: "marketcap-desc" },
  { label: "Market Cap Low-High", value: "marketcap-asc" },
  { label: "Price High-Low", value: "price-desc" },
  { label: "Price Low-High", value: "price-asc" },
  { label: "Change High-Low", value: "change-desc" },
  { label: "Change Low-High", value: "change-asc" }
];

export default function NSEStocksPage() {
  const { user, hasActiveSubscription, isDemoMode, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");
  const [sortBy, setSortBy] = useState("symbol-asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMarketOpen } = useMarketStatus();

  const canAccessFeatures = hasActiveSubscription || isDemoMode;

  // Fetch all NSE stocks
  const { data: allNSEStocks, isLoading: isLoadingStocks } = useQuery<NSEStock[]>({
    queryKey: ["/api/stocks/nse-all"],
    enabled: !isLoading && !!user && canAccessFeatures,
    refetchInterval: isMarketOpen ? 5000 : 60000, // Every 5s during market hours, 1min otherwise
    staleTime: isMarketOpen ? 4000 : 30000,
  });

  // Fetch watchlist to determine which stocks are already added
  const { data: watchlistStocks } = useQuery<Stock[]>({
    queryKey: ["/api/stocks/portfolio"], 
    enabled: !isLoading && !!user && canAccessFeatures,
  });

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: async (stockId: string) => {
      const response = await fetch(`/api/stocks/${stockId}/add-to-portfolio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to add stock to watchlist");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/nse-all"] });
      toast({
        title: "Success",
        description: "Stock added to watchlist",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add stock to watchlist",
        variant: "destructive",
      });
    },
  });

  // Remove from watchlist mutation
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (stockId: string) => {
      const response = await fetch(`/api/stocks/${stockId}/remove-from-portfolio`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to remove stock from watchlist");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/nse-all"] });
      toast({
        title: "Success",
        description: "Stock removed from watchlist",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to remove stock from watchlist",
        variant: "destructive",
      });
    },
  });

  // Filter and sort stocks
  const filteredAndSortedStocks = allNSEStocks
    ?.filter((stock) => {
      const matchesSearch = 
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.companyName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = selectedSector === "All" || stock.sector === selectedSector;
      return matchesSearch && matchesSector;
    })
    ?.sort((a, b) => {
      switch (sortBy) {
        case "symbol-asc":
          return a.symbol.localeCompare(b.symbol);
        case "symbol-desc":
          return b.symbol.localeCompare(a.symbol);
        case "marketcap-desc":
          return (b.marketCap || 0) - (a.marketCap || 0);
        case "marketcap-asc":
          return (a.marketCap || 0) - (b.marketCap || 0);
        case "price-desc":
          return (b.price || 0) - (a.price || 0);
        case "price-asc":
          return (a.price || 0) - (b.price || 0);
        case "change-desc":
          return (b.changePercent || 0) - (a.changePercent || 0);
        case "change-asc":
          return (a.changePercent || 0) - (b.changePercent || 0);
        default:
          return 0;
      }
    });

  const handleToggleWatchlist = (stock: NSEStock) => {
    if (stock.isInWatchlist) {
      removeFromWatchlistMutation.mutate(stock.id);
    } else {
      addToWatchlistMutation.mutate(stock.id);
    }
  };

  const formatMarketCap = (marketCap?: number) => {
    if (!marketCap) return "N/A";
    if (marketCap >= 1000000) {
      return `₹${(marketCap / 1000000).toFixed(1)}L Cr`;
    } else if (marketCap >= 1000) {
      return `₹${(marketCap / 1000).toFixed(1)}K Cr`;
    }
    return `₹${marketCap} Cr`;
  };

  const getSectorColor = (sector: string) => {
    const colors = {
      Banking: "bg-blue-100 text-blue-800",
      IT: "bg-purple-100 text-purple-800",
      Pharmaceuticals: "bg-green-100 text-green-800",
      Automobile: "bg-orange-100 text-orange-800",
      Steel: "bg-gray-100 text-gray-800",
      "Oil & Gas": "bg-yellow-100 text-yellow-800",
      FMCG: "bg-pink-100 text-pink-800",
      Telecom: "bg-indigo-100 text-indigo-800",
      Power: "bg-red-100 text-red-800",
      "Solar Energy": "bg-emerald-100 text-emerald-800",
      Fintech: "bg-cyan-100 text-cyan-800",
    };
    return colors[sector as keyof typeof colors] || "bg-slate-100 text-slate-800";
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || !canAccessFeatures) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-12">
          <div className="text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">NSE Stocks Database</h2>
            <p className="text-muted-foreground mb-4">
              Access comprehensive NSE stock listings with real-time data
            </p>
            <Button>Upgrade to Access</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">NSE Stocks Database</h1>
        <p className="text-muted-foreground">
          Browse and add stocks from the complete NSE listing to your watchlist
        </p>
      </div>

      {/* Filters and Search */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by symbol or company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {/* Sector Filter */}
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              {SECTORS.map((sector) => (
                <option key={sector} value={sector}>
                  {sector === "All" ? "All Sectors" : sector}
                </option>
              ))}
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {filteredAndSortedStocks?.length || 0} stocks
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? "List View" : "Grid View"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stocks Listing */}
      <div>
        {isLoadingStocks ? (
          <div className="grid gap-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : filteredAndSortedStocks && filteredAndSortedStocks.length > 0 ? (
          <div className={cn(
            viewMode === "grid" 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-3"
          )}>
            {filteredAndSortedStocks.map((stock) => (
              <Card key={stock.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{stock.symbol}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {stock.companyName}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={getSectorColor(stock.sector)}>
                        {stock.sector}
                      </Badge>
                      
                      {stock.marketCap && (
                        <span className="text-sm text-muted-foreground">
                          MCap: {formatMarketCap(stock.marketCap)}
                        </span>
                      )}
                      
                      {stock.price && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">₹{stock.price.toFixed(2)}</span>
                          {stock.changePercent !== undefined && (
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded",
                              stock.changePercent >= 0 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            )}>
                              {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant={stock.isInWatchlist ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleWatchlist(stock)}
                    disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
                    className="ml-4"
                  >
                    {stock.isInWatchlist ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" />
                        Remove
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <h3 className="font-semibold mb-1">No stocks found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}