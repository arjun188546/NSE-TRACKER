import { Link, useLocation } from "wouter";
import { BarChart3, Calendar, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface NavItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface AppSidebarProps {
    onExpandChange?: (expanded: boolean) => void;
}

const navItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: BarChart3,
    },
    {
        title: "Results Calendar",
        href: "/calendar",
        icon: Calendar,
    },
    {
        title: "NSE Stocks",
        href: "/nse-stocks",
        icon: Building2,
    },
];

export function AppSidebar({ onExpandChange }: AppSidebarProps) {
    const [location] = useLocation();
    const [isExpanded, setIsExpanded] = useState(false);

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return location === "/dashboard";
        }
        return location.startsWith(href);
    };

    const handleMouseEnter = () => {
        setIsExpanded(true);
        onExpandChange?.(true);
    };

    const handleMouseLeave = () => {
        setIsExpanded(false);
        onExpandChange?.(false);
    };

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 h-screen border-r bg-sidebar border-sidebar-border flex flex-col py-6 z-40 transition-all duration-300 ease-in-out",
                isExpanded ? "w-64" : "w-20"
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                    <Link key={item.href} href={item.href}>
                        <div
                            className={cn(
                                "relative mx-3 mb-2 rounded-lg flex items-center cursor-pointer transition-all duration-200",
                                "h-12",
                                active
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                            )}
                            title={!isExpanded ? item.title : undefined}
                        >
                            <div className="flex items-center justify-center w-14 flex-shrink-0">
                                <Icon className="w-5 h-5" />
                            </div>
                            <span
                                className={cn(
                                    "whitespace-nowrap overflow-hidden transition-all duration-300 font-medium text-sm",
                                    isExpanded ? "opacity-100 w-auto pr-4" : "opacity-0 w-0"
                                )}
                            >
                                {item.title}
                            </span>
                        </div>
                    </Link>
                );
            })}
        </aside>
    );
}
