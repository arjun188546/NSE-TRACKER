import { ReactNode, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { AppSidebar } from "./app-sidebar";
import { Button } from "@/components/ui/button";
import { TrendingUp, LogOut, Bell, Activity } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAutoRefreshPrices } from "@/hooks/use-live-prices";

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const { user, logout } = useAuth();
    const [, setLocation] = useLocation();
    const { isMarketOpen } = useAutoRefreshPrices();
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    const handleLogout = async () => {
        await logout();
        setLocation("/");
    };

    if (!user) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Expandable Sidebar - pass state handlers */}
            <AppSidebar onExpandChange={setSidebarExpanded} />

            {/* Main Content Area - margin changes based on sidebar state */}
            <div
                className="transition-all duration-300 ease-in-out"
                style={{ marginLeft: sidebarExpanded ? '256px' : '80px' }}
            >
                {/* Header */}
                <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 md:gap-6 min-w-0">
                                <Link href="/dashboard">
                                    <div className="flex items-center gap-2 cursor-pointer">
                                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                                            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                                        </div>
                                        <span className="font-bold text-lg md:text-xl hidden sm:inline truncate" data-testid="text-brand">
                                            NSE TRACKER
                                        </span>
                                    </div>
                                </Link>
                            </div>

                            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                                {/* Market Status Indicator */}
                                {isMarketOpen && (
                                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                                        <Activity className="w-4 h-4 text-green-600 animate-pulse" />
                                        <span className="text-xs font-medium text-green-700">Market Open</span>
                                    </div>
                                )}
                                {!isMarketOpen && (
                                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-500/10 border border-gray-500/20">
                                        <Activity className="w-4 h-4 text-gray-600" />
                                        <span className="text-xs font-medium text-gray-700">Market Closed</span>
                                    </div>
                                )}
                                <Button variant="ghost" size="icon" className="hidden sm:flex" data-testid="button-notifications">
                                    <Bell className="w-5 h-5" />
                                </Button>
                                <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-md bg-card">
                                    <Avatar className="w-7 h-7 md:w-8 md:h-8">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                            {user.email.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="hidden lg:block text-sm min-w-0">
                                        <div className="font-medium truncate" data-testid="text-user-email">{user.email}</div>
                                        <div className="text-xs text-muted-foreground capitalize">
                                            {user.subscriptionStatus}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleLogout}
                                    data-testid="button-logout"
                                    className="flex-shrink-0"
                                >
                                    <LogOut className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main>{children}</main>
            </div>
        </div>
    );
}
