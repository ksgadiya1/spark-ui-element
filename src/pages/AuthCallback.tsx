import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthResponse, AuthTokens, User } from "@/services/api";

function parseHashTokens(hash: string): (AuthResponse | AuthTokens) | null {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const tokenType = params.get("token_type") ?? "bearer";
  const userPayload = params.get("user");

  if (!accessToken || !refreshToken) {
    return null;
  }

  let user: User | null = null;
  if (userPayload) {
    try {
      user = JSON.parse(userPayload) as User;
    } catch {
      user = null;
    }
  }

  if (user) {
    return {
      user,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: tokenType,
    };
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: tokenType,
  };
}

export default function AuthCallback() {
  const { completeMetaLogin, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) {
      return;
    }
    hasProcessedRef.current = true;

    let active = true;

    async function finalizeLogin() {
      const tokens = parseHashTokens(window.location.hash);
      if (!tokens) {
        toast({
          title: "Meta login failed",
          description: "Missing session tokens from the authentication callback.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
        return;
      }

      try {
        await completeMetaLogin(tokens);
        if (!active) {
          return;
        }

        toast({
          title: "Signed in with Meta",
          description: "Your account and assets are ready.",
          variant: "success",
        });

        const nextUrl = new URL(window.location.href);
        nextUrl.hash = "";
        nextUrl.searchParams.set("meta_connected", "1");
        window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
        navigate("/?meta_connected=1", { replace: true });
      } catch (error) {
        logout();
        if (!active) {
          return;
        }

        toast({
          title: "Meta login failed",
          description: error instanceof Error ? error.message : "Unable to finish signing you in.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
      }
    }

    finalizeLogin();
    return () => {
      active = false;
    };
  }, [completeMetaLogin, logout, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Finishing your Meta sign-in...
      </div>
    </div>
  );
}
