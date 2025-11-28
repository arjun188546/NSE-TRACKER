import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar as CalendarIcon,
  Search,
  Filter,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";
import { StockWithCalendar } from "@shared/schema";

export default function CalendarPage() {
  const { user, hasActiveSubscription, isDemoMode, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const canAccessFeatures = hasActiveSubscription || isDemoMode;

  // All hooks must be called before any conditional returns
  const { data: calendarData, isLoading: isLoadingCalendar } = useQuery<{
    dates: { date: string; count: number }[];
    stocks: StockWithCalendar[];
  }>({
    queryKey: ["/api/calendar"],
    enabled: !isLoading && !!user && canAccessFeatures,
  });

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
    setLocation("/");
    return null;
  }

  const filteredStocks = calendarData?.stocks.filter((stock) => {
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.companyName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = selectedDate
      ? stock.calendar?.announcementDate === selectedDate
      : true;

    return matchesSearch && matchesDate;
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Quarterly Results Calendar
            </h1>
            <p className="text-muted-foreground">
              Track upcoming quarterly result announcements and analyze them in real-time
            </p>
          </div>

          {!canAccessFeatures ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Subscription Required</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Activate your subscription to view the results calendar.
                </p>
                <Button size="lg" data-testid="button-activate-subscription">
                  Activate Subscription
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Date Cards */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Upcoming Announcements</h2>
                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
                    {calendarData?.dates.slice(0, 14).map((dateInfo) => (
                      <Card
                        key={dateInfo.date}
                        className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${selectedDate === dateInfo.date ? "ring-2 ring-primary" : ""
                          }`}
                        onClick={() =>
                          setSelectedDate(selectedDate === dateInfo.date ? null : dateInfo.date)
                        }
                        data-testid={`card-date-${dateInfo.date}`}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold mb-1">
                            {new Date(dateInfo.date).getDate()}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {new Date(dateInfo.date).toLocaleDateString("en-US", {
                              month: "short",
                            })}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {dateInfo.count} {dateInfo.count === 1 ? "result" : "results"}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Company Results</span>
                    {selectedDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDate(null)}
                        data-testid="button-clear-filter"
                      >
                        Clear Filter
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by symbol or company name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-search"
                      />
                    </div>
                    <Button variant="outline" size="icon" data-testid="button-filter">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Results Table */}
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead className="text-right">Current Price</TableHead>
                            <TableHead className="text-right">% Change</TableHead>
                            <TableHead className="text-right">Volume</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStocks && filteredStocks.length > 0 ? (
                            filteredStocks.map((stock) => {
                              const isPositive = parseFloat(stock.percentChange || "0") >= 0;
                              const percentChange = parseFloat(stock.percentChange || "0");

                              return (
                                <TableRow
                                  key={stock.id}
                                  className="hover-elevate cursor-pointer"
                                  onClick={() => setLocation(`/stock/${stock.symbol}`)}
                                  data-testid={`row-stock-${stock.symbol}`}
                                >
                                  <TableCell className="font-mono font-semibold">
                                    {stock.symbol}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">
                                    {stock.companyName}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    ₹{parseFloat(stock.currentPrice || "0").toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span
                                      className={`flex items-center justify-end gap-1 font-mono text-sm ${isPositive ? "text-green-500" : "text-red-500"
                                        }`}
                                    >
                                      {isPositive ? (
                                        <ArrowUpIcon className="w-3 h-3" />
                                      ) : (
                                        <ArrowDownIcon className="w-3 h-3" />
                                      )}
                                      {Math.abs(percentChange).toFixed(2)}%
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm">
                                    {stock.volume
                                      ? parseInt(stock.volume.toString()).toLocaleString("en-IN")
                                      : "-"}
                                  </TableCell>
                                  <TableCell>
                                    <StatusBadge
                                      status={
                                        (stock.calendar?.resultStatus as
                                          | "waiting"
                                          | "received"
                                          | "ready") || "waiting"
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground">
                                    {stock.calendar?.announcementDate
                                      ? new Date(
                                        stock.calendar.announcementDate
                                      ).toLocaleDateString("en-IN")
                                      : "-"}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                No results found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
