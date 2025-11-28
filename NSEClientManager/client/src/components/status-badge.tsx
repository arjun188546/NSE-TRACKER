import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Sparkles } from "lucide-react";

interface StatusBadgeProps {
  status: "waiting" | "received" | "ready";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    waiting: {
      label: "Waiting",
      icon: Clock,
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    received: {
      label: "Received",
      icon: CheckCircle,
      className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    ready: {
      label: "Ready for analysis",
      icon: Sparkles,
      className: "bg-green-500/10 text-green-500 border-green-500/20",
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={className} data-testid={`badge-status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}
