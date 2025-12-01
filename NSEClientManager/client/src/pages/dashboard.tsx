import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { StockCard } from "@/components/stock-card";
import { TrendingUp, Calendar, BarChart3, Search, Building2, Plus, Eye, EyeOff } from "lucide-react";
import { Stock } from "@shared/schema";
import { Link } from "wouter";
import { useAutoRefreshPrices } from "@/hooks/use-live-prices";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user, hasActiveSubscription, isDemoMode, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { isMarketOpen, refetchInterval } = useAutoRefreshPrices();

  const canAccessFeatures = hasActiveSubscription || isDemoMode;

  // Always call hooks before any conditional returns
  const { data: portfolioStocks, isLoading: isLoadingPortfolio, refetch: refetchPortfolio } = useQuery<Stock[]>({
    queryKey: ["/api/stocks/portfolio"],
    enabled: !isLoading && !!user && canAccessFeatures,
    refetchInterval: isMarketOpen ? 5000 : 30000, // Every 5s during market hours, 30s otherwise
    refetchOnWindowFocus: true, // Refetch when user switches back to tab
    refetchOnMount: true, // Always refetch on component mount
    staleTime: isMarketOpen ? 4000 : 0, // Fresh for 4s during market hours
    gcTime: 0, // Don't cache data when component unmounts
  });

  const { data: topPerformers, isLoading: isLoadingTop, refetch: refetchTopPerformers } = useQuery<Stock[]>({
    queryKey: ["/api/stocks/top-performers"],
    enabled: !isLoading && !!user && canAccessFeatures,
    refetchInterval: isMarketOpen ? 5000 : 30000, // Every 5s during market hours, 30s otherwise
    refetchOnWindowFocus: true, // Refetch when user switches back to tab
    refetchOnMount: true, // Always refetch on component mount
    staleTime: isMarketOpen ? 4000 : 0, // Fresh for 4s during market hours
    gcTime: 0, // Don't cache data when component unmounts
  });

  // Add NSE stocks functionality
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("watchlist");
  const [selectedSector, setSelectedSector] = useState("All");

  // Fetch all NSE stocks
  const { data: nseStocksData, isLoading: isLoadingNSE } = useQuery({
    queryKey: ["/api/stocks/nse-all"],
    enabled: !isLoading && !!user && canAccessFeatures,
    refetchInterval: isMarketOpen ? 5000 : 60000, // Every 5s during market hours, 1min otherwise
    staleTime: isMarketOpen ? 4000 : 30000,
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

  // Helper functions
  const handleToggleWatchlist = (stock: any) => {
    if (stock.isInWatchlist) {
      removeFromWatchlistMutation.mutate(stock.id);
    } else {
      addToWatchlistMutation.mutate(stock.id);
    }
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

  const formatMarketCap = (marketCap?: number) => {
    if (!marketCap) return "N/A";
    if (marketCap >= 1000000) {
      return `₹${(marketCap / 1000000).toFixed(1)}L Cr`;
    } else if (marketCap >= 1000) {
      return `₹${(marketCap / 1000).toFixed(1)}K Cr`;
    }
    return `₹${marketCap} Cr`;
  };

  // Add visibility change listener to force refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && canAccessFeatures) {
        console.log('[Dashboard] Tab became visible, refreshing prices...');
        refetchPortfolio();
        refetchTopPerformers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [canAccessFeatures, refetchPortfolio, refetchTopPerformers]);

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

  // Filter stocks based on search query
  const filteredTopPerformers = topPerformers?.filter((stock) =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPortfolio = portfolioStocks?.filter((stock) =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNSEStocks = nseStocksData?.filter((stock) =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="space-y-6 md:space-y-8">
          <SubscriptionBanner />

          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold" data-testid="text-welcome">
              Welcome back, {user.email.split("@")[0]}
            </h1>
            <p className="text-muted-foreground">
              Track quarterly results and analyze market trends in real-time
            </p>
          </div>

          {!canAccessFeatures && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <TrendingUp className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Subscription Required</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Activate your subscription to access real-time stock data, quarterly results
                  analysis, and advanced charting tools.
                </p>
                <Button size="lg" data-testid="button-activate-subscription">
                  Activate Subscription
                </Button>
              </CardContent>
            </Card>
          )}

          {canAccessFeatures && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <Card className="hover-elevate transition-all">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl md:text-3xl font-mono font-bold" data-testid="text-portfolio-value">
                      ₹8,45,230
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-1 flex-1 bg-green-500/20 rounded-full overflow-hidden">
                        <div className="h-full w-[52%] bg-green-500 rounded-full"></div>
                      </div>
                      <p className="text-xs text-green-500 font-mono whitespace-nowrap">+5.2%</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover-elevate transition-all">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Gain</CardTitle>
                    <div className="w-10 h-10 rounded-md bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-5 h-5 text-green-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl md:text-3xl font-mono font-bold text-green-500" data-testid="text-total-gain">
                      ₹45,230
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">+8.3% overall return</p>
                  </CardContent>
                </Card>
                <Card className="hover-elevate transition-all sm:col-span-2 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Results</CardTitle>
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl md:text-3xl font-bold" data-testid="text-upcoming-results">24</div>
                    <p className="text-xs text-muted-foreground mt-2">Companies reporting this week</p>
                  </CardContent>
                </Card>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search stocks by symbol or company name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                  data-testid="input-search-stocks"
                />
              </div>

              {/* Top Performers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Top Performers</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery ? `${filteredTopPerformers?.length || 0} results` : "Highest gaining stocks"}
                    </p>
                  </div>
                  <Link href="/calendar">
                    <Button variant="ghost" size="sm" data-testid="button-view-all">
                      View All →
                    </Button>
                  </Link>
                </div>
                {isLoadingTop ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="p-6">
                        <Skeleton className="h-48" />
                      </Card>
                    ))}
                  </div>
                ) : filteredTopPerformers && filteredTopPerformers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredTopPerformers.slice(0, 6).map((stock) => (
                      <StockCard key={stock.id} stock={stock} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-12">
                    <div className="text-center text-muted-foreground">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No stocks found matching "{searchQuery}"</p>
                    </div>
                  </Card>
                )}
              </div>

              {/* Stocks Section with Tabs */}
              <div className="space-y-4">
                <Tabs defaultValue="watchlist" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="watchlist" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Watchlist ({filteredPortfolio?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="all-stocks" className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      All NSE Stocks ({filteredNSEStocks?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  {/* Watchlist Tab */}
                  <TabsContent value="watchlist" className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold">Your Watchlist</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? `${filteredPortfolio?.length || 0} results` : "Stocks you're tracking"}
                      </p>
                    </div>
                    {isLoadingPortfolio ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-20" />
                        ))}
                      </div>
                    ) : filteredPortfolio && filteredPortfolio.length > 0 ? (
                      <div className="space-y-3">
                        {filteredPortfolio.map((stock) => (
                          <StockCard key={stock.id} stock={stock} mini />
                        ))}
                      </div>
                    ) : searchQuery ? (
                      <Card className="p-12">
                        <div className="text-center text-muted-foreground">
                          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No watchlist stocks found matching "{searchQuery}"</p>
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-12">
                        <div className="text-center text-muted-foreground">
                          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Your watchlist is empty</p>
                        </div>
                      </Card>
                    )}
                  </TabsContent>

                  {/* All NSE Stocks Tab */}
                  <TabsContent value="all-stocks" className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold">NSE Stocks Database</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? `${filteredNSEStocks?.length || 0} results` : `Browse all ${nseStocksData?.length || 0} NSE listed stocks`}
                      </p>
                    </div>
                    {isLoadingNSE ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <Skeleton key={i} className="h-20" />
                        ))}
                      </div>
                    ) : filteredNSEStocks && filteredNSEStocks.length > 0 ? (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {filteredNSEStocks.map((stock) => (
                          <Card key={stock.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
                            <Link href={`/stock/${stock.symbol}?tab=results`}>
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{stock.symbol}</h3>
                                    {stock.sector && (
                                      <Badge variant="secondary" className={cn("text-xs", getSectorColor(stock.sector))}>
                                        {stock.sector}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-1">{stock.companyName}</p>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    {stock.marketCap && (
                                      <span>Market Cap: {formatMarketCap(stock.marketCap)}</span>
                                    )}
                                    {stock.currentPrice && (
                                      <span className="font-mono font-semibold text-foreground">
                                        ₹{parseFloat(stock.currentPrice.toString()).toFixed(2)}
                                      </span>
                                    )}
                                    {stock.percentChange && (
                                      <span className={cn("font-mono font-semibold", parseFloat(stock.percentChange.toString()) >= 0 ? "text-green-500" : "text-red-500")}>
                                        {parseFloat(stock.percentChange.toString()) >= 0 ? "+" : ""}
                                        {parseFloat(stock.percentChange.toString()).toFixed(2)}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Button
                                    size="sm"
                                    variant={stock.inWatchlist ? "destructive" : "default"}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleToggleWatchlist(stock.id, stock.inWatchlist || false);
                                    }}
                                    disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
                                    className="flex items-center gap-2 min-w-[120px]"
                                  >
                                    {stock.inWatchlist ? (
                                      <>
                                        <EyeOff className="w-4 h-4" />
                                        Remove
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-4 h-4" />
                                        Add to Watchlist
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </Link>
                          </Card>
                        ))}
                      </div>
                    ) : searchQuery ? (
                      <Card className="p-12">
                        <div className="text-center text-muted-foreground">
                          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No NSE stocks found matching "{searchQuery}"</p>
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-12">
                        <div className="text-center text-muted-foreground">
                          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No NSE stocks available</p>
                        </div>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
