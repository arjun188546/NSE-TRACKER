import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function SubscriptionBanner() {
  const { user, isDemoMode, hasActiveSubscription } = useAuth();

  if (!user || hasActiveSubscription) return null;

  if (isDemoMode) {
    const demoExpiry = user.demoExpiresAt
      ? new Date(user.demoExpiresAt).toLocaleDateString()
      : "Unknown";

    return (
      <Alert className="border-primary/50 bg-primary/5" data-testid="alert-demo-mode">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="text-sm">
            <strong className="font-semibold">Demo Mode Active</strong> - Full access until{" "}
            {demoExpiry}
          </span>
          <Button size="sm" variant="outline" data-testid="button-upgrade">
            Upgrade Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" data-testid="alert-subscription-expired">
      <XCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm">
          <strong className="font-semibold">Subscription Inactive</strong> - Activate your
          subscription to access all features
        </span>
        <Button size="sm" variant="outline" data-testid="button-activate">
          Activate Subscription
        </Button>
      </AlertDescription>
    </Alert>
  );
}
