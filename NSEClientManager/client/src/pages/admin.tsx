import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  LogOut,
  Search,
  Play,
  X,
  Eye,
  Server,
  Clock,
  AlertTriangle
} from "lucide-react";
import { User } from "@shared/schema";

export default function AdminPage() {
  const { user, logout, isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"activate" | "cancel" | null>(null);

  // All hooks must be called before any conditional returns
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !isLoading && !!user && isAdmin,
  });

  const { data: scraperSummary } = useQuery<{ summary: any[] }>({
    queryKey: ["/api/admin/scraper/summary"],
    enabled: !!user && isAdmin,
  });

  const { data: recentFailures } = useQuery<{ failures: any[] }>({
    queryKey: ["/api/admin/scraper/errors", { limit: 5 }],
    enabled: !!user && isAdmin,
  });

  const { data: monitoringAlerts } = useQuery<{ alerts: any[]; timestamp: string }>({
    queryKey: ["/api/admin/monitoring/alerts"],
    enabled: !!user && isAdmin,
    refetchInterval: 30000, // 30s refresh
  });

  const { data: staleSymbols } = useQuery<{ stale: any[]; thresholdMinutes: number }>({
    queryKey: ["/api/admin/monitoring/stale-symbols"],
    enabled: !!user && isAdmin,
    refetchInterval: 60000,
  });

  const pauseJob = async (job: string) => {
    await apiRequest('POST', `/api/admin/scraper/jobs/${job}/pause`, {});
    queryClient.invalidateQueries({ queryKey: ["/api/admin/monitoring/alerts"] });
  };
  const resumeJob = async (job: string) => {
    await apiRequest('POST', `/api/admin/scraper/jobs/${job}/resume`, {});
    queryClient.invalidateQueries({ queryKey: ["/api/admin/monitoring/alerts"] });
  };
  const runJob = async (job: string) => {
    await apiRequest('POST', `/api/admin/scraper/jobs/${job}/run`, {});
    queryClient.invalidateQueries({ queryKey: ["/api/admin/scraper/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/monitoring/alerts"] });
  };

  const activateDemoMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/activate-demo`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Demo activated",
        description: "Demo access has been granted to the user",
      });
      setSelectedUserId(null);
      setActionType(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to activate demo",
        description: "An error occurred while activating demo",
      });
    },
  });

  const cancelDemoMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/cancel-demo`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Demo cancelled",
        description: "Demo access has been revoked",
      });
      setSelectedUserId(null);
      setActionType(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to cancel demo",
        description: "An error occurred while cancelling demo",
      });
    },
  });

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      setLocation("/");
    }
  }, [isLoading, user, isAdmin, setLocation]);

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

  // Check admin access after all hooks have been called
  if (!user || !isAdmin) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.subscriptionStatus.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users?.length || 0;
  const activeSubscriptions =
    users?.filter((u) => u.subscriptionStatus === "active").length || 0;
  const activeDemos = users?.filter((u) => u.subscriptionStatus === "demo").length || 0;

  const handleConfirmAction = () => {
    if (!selectedUserId) return;

    if (actionType === "activate") {
      activateDemoMutation.mutate(selectedUserId);
    } else if (actionType === "cancel") {
      cancelDemoMutation.mutate(selectedUserId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-xl" data-testid="text-admin-title">
                  Admin Panel
                </h1>
                <p className="text-xs text-muted-foreground">NSE Stock Analysis Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                Administrator
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
                    {/* Scraper Summary */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Server className="w-4 h-4 text-muted-foreground" /> Scraper Job Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!scraperSummary ? (
                          <div className="text-xs text-muted-foreground">Loading job summary...</div>
                        ) : scraperSummary.summary.length === 0 ? (
                          <div className="text-xs text-muted-foreground">No job data yet.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Job</TableHead>
                                  <TableHead>Runs (Success %)</TableHead>
                                  <TableHead>Avg Duration (ms)</TableHead>
                                  <TableHead>Failures</TableHead>
                                  <TableHead>Last Run</TableHead>
                                  <TableHead>Last Error</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {scraperSummary.summary.map((j) => (
                                  <TableRow key={j.job}>
                                    <TableCell className="font-medium capitalize">{j.job}</TableCell>
                                    <TableCell className="text-sm">{j.runs} ({j.successRate}%)</TableCell>
                                    <TableCell className="text-sm">{j.avgDurationMs}</TableCell>
                                    <TableCell className="text-sm">{j.failures}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {j.lastRun ? new Date(j.lastRun).toLocaleString("en-IN") : "-"}
                                    </TableCell>
                                    <TableCell className="text-xs max-w-[200px] truncate" title={j.lastError || ''}>
                                      {j.lastError ? (
                                        <span className="inline-flex items-center gap-1 text-red-600">
                                          <AlertTriangle className="w-3 h-3" /> {j.lastError}
                                        </span>
                                      ) : (
                                        <span className="text-green-600">None</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex gap-1 justify-end">
                                        <Button size="xs" variant="outline" onClick={() => runJob(j.job)}>Run</Button>
                                        <Button size="xs" variant="outline" onClick={() => pauseJob(j.job)}>Pause</Button>
                                        <Button size="xs" variant="outline" onClick={() => resumeJob(j.job)}>Resume</Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Averages based on last 100 runs.
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Failures */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Recent Failures
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!recentFailures ? (
                          <div className="text-xs text-muted-foreground">Loading failures...</div>
                        ) : recentFailures.failures.length === 0 ? (
                          <div className="text-xs text-green-600">No recent failures.</div>
                        ) : (
                          <ul className="space-y-2">
                            {recentFailures.failures.slice(0,5).map(f => (
                              <li key={f.id} className="text-xs border rounded p-2 bg-red-50">
                                <div className="font-medium">{f.job_name}</div>
                                <div className="text-red-600 truncate" title={f.error_message}>{f.error_message}</div>
                                <div className="text-[10px] text-muted-foreground mt-1">
                                  {new Date(f.started_at).toLocaleString("en-IN")} · {f.duration_ms ? `${f.duration_ms}ms` : 'n/a'}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-users">
                  {totalUsers}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Registered clients</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500" data-testid="text-active-subscriptions">
                  {activeSubscriptions}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalUsers > 0
                    ? Math.round((activeSubscriptions / totalUsers) * 100)
                    : 0}
                  % of total users
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Demos</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500" data-testid="text-active-demos">
                  {activeDemos}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Demo accounts</p>
              </CardContent>
            </Card>
          </div>

          {/* User Management Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>User Management</span>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-users"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
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
                        <TableHead>Email</TableHead>
                        <TableHead>Subscription Status</TableHead>
                        <TableHead>Demo Expiry</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers && filteredUsers.length > 0 ? (
                        filteredUsers.map((u) => (
                          <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                            <TableCell className="font-medium">{u.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  u.subscriptionStatus === "active"
                                    ? "default"
                                    : u.subscriptionStatus === "demo"
                                    ? "secondary"
                                    : "outline"
                                }
                                className={
                                  u.subscriptionStatus === "active"
                                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                                    : u.subscriptionStatus === "demo"
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    : ""
                                }
                              >
                                {u.subscriptionStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {u.demoExpiresAt
                                ? new Date(u.demoExpiresAt).toLocaleDateString("en-IN")
                                : "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {u.lastLogin
                                ? new Date(u.lastLogin).toLocaleDateString("en-IN")
                                : "Never"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUserId(u.id);
                                    setActionType("activate");
                                  }}
                                  data-testid={`button-activate-demo-${u.id}`}
                                  disabled={u.subscriptionStatus === "demo"}
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  Activate Demo
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUserId(u.id);
                                    setActionType("cancel");
                                  }}
                                  data-testid={`button-cancel-demo-${u.id}`}
                                  disabled={u.subscriptionStatus !== "demo"}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancel Demo
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  data-testid={`button-view-${u.id}`}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monitoring Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Server className="w-4 h-4 text-muted-foreground" /> Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!monitoringAlerts ? (
                <div className="text-xs text-muted-foreground">Loading alerts...</div>
              ) : monitoringAlerts.alerts.length === 0 ? (
                <div className="text-xs text-green-600">No alerts.</div>
              ) : (
                <ul className="space-y-2">
                  {monitoringAlerts.alerts.map((a, idx) => (
                    <li key={idx} className="text-xs border rounded p-2 flex flex-col gap-1 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{a.type.replace(/-/g,' ')}</span>
                        {a.severity !== 'none' && (
                          <Badge variant={a.severity === 'high' ? 'destructive' : a.severity === 'medium' ? 'secondary' : 'outline'}>
                            {a.severity}
                          </Badge>
                        )}
                      </div>
                      {a.message && <div className="text-muted-foreground">{a.message}</div>}
                      {a.job && (
                        <div className="text-[10px] text-muted-foreground">Job: {a.job} • Failures: {a.failures}</div>
                      )}
                      {a.type === 'stale-stocks' && (
                        <div className="text-[10px] text-muted-foreground">Stale: {a.count}/{a.total} (&gt;{a.thresholdMinutes}m)</div>
                      )}
                      {a.lastError && (
                        <div className="text-[10px] text-red-600 truncate" title={a.lastError}>Last Error: {a.lastError}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 text-[10px] text-muted-foreground">Last check: {monitoringAlerts ? new Date(monitoringAlerts.timestamp).toLocaleTimeString('en-IN') : '...'}</div>
            </CardContent>
          </Card>

          {/* Stale Symbols */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Stale Symbols (&gt;{staleSymbols?.thresholdMinutes || 0}m)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!staleSymbols ? (
                <div className="text-xs text-muted-foreground">Loading stale symbols...</div>
              ) : staleSymbols.stale.length === 0 ? (
                <div className="text-xs text-green-600">No stale symbols.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {staleSymbols.stale.slice(0,24).map(s => (
                    <div key={s.symbol} className="text-[11px] border rounded px-2 py-1 bg-muted/40">
                      <span className="font-medium">{s.symbol}</span>
                      <div className="text-[10px] text-muted-foreground">{s.lastUpdated ? new Date(s.lastUpdated).toLocaleTimeString('en-IN') : '-'}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!selectedUserId && !!actionType}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUserId(null);
            setActionType(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "activate" ? "Activate Demo" : "Cancel Demo"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "activate"
                ? "Are you sure you want to activate demo access for this user? They will have full access for a limited time."
                : "Are you sure you want to cancel demo access for this user? They will lose access to premium features immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-action">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              data-testid="button-confirm-action"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
