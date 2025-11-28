import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@shared/schema";
import { queryClient } from "./queryClient";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAdmin: boolean;
  hasActiveSubscription: boolean;
  isDemoMode: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === "admin";
  const hasActiveSubscription = user?.subscriptionStatus === "active";
  const isDemoMode = user?.subscriptionStatus === "demo";

  const logout = async () => {
    try {
      // Call backend to destroy session
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear all React Query cache
      queryClient.clear();
      
      // Always clear local state regardless of API response
      setUser(null);
      localStorage.removeItem("user");
    }
  };

  // Validate session with server on mount
  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        });
        
        if (response.ok) {
          const data = await response.json();
          // Server confirmed valid session
          if (data.user) {
            setUser(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
          } else {
            // Anonymous session
            setUser(null);
            localStorage.removeItem("user");
          }
        } else {
          // Session invalid or expired, clear everything
          setUser(null);
          localStorage.removeItem("user");
        }
      } catch (error) {
        // Network error - treat as no session for security
        console.error("Session validation error:", error);
        setUser(null);
        localStorage.removeItem("user");
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  // Save user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, setUser, isAdmin, hasActiveSubscription, isDemoMode, isLoading, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
