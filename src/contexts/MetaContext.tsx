import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getMetaAssets,
  getMetaConnectUrl,
  getMetaConnection,
  isMetaReconnectError,
  syncMetaAssets,
  type MetaAssetsResponse,
  type MetaAdAccount,
  type MetaBusiness,
  type MetaConnection,
  type MetaInstagramAccount,
  type MetaPage,
  type MetaPermissionStatus,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

export type MetaConnectionState =
  | "idle"
  | "loading"
  | "not_connected"
  | "connecting"
  | "connected"
  | "reconnect_required"
  | "syncing"
  | "sync_failed";

interface MetaContextValue {
  connection: MetaConnection | null;
  businesses: MetaBusiness[];
  permissions: MetaPermissionStatus | null;
  warnings: string[];
  status: MetaConnectionState;
  isLoading: boolean;
  isSyncing: boolean;
  isConnecting: boolean;
  error: string | null;
  requiresReconnect: boolean;
  refreshMeta: () => Promise<void>;
  syncAssets: () => Promise<void>;
  connectMeta: () => Promise<void>;
  isConnected: boolean;
}

const MetaContext = createContext<MetaContextValue | undefined>(undefined);

const UNASSIGNED_META_BUSINESS_ID = "__meta_unassigned__";

function isConnectedState(connection: MetaConnection | null, businesses: MetaBusiness[]) {
  if (connection?.is_connected != null) {
    return Boolean(connection.is_connected);
  }

  return Boolean(connection?.id) || businesses.length > 0;
}

function buildUnassignedBusiness(
  adAccounts: MetaAdAccount[],
  pages: MetaPage[],
  instagramAccounts: MetaInstagramAccount[],
): MetaBusiness | null {
  if (!adAccounts.length && !pages.length && !instagramAccounts.length) {
    return null;
  }

  const pagesWithInstagram = pages.map((page) => {
    if (page.instagram_account) {
      return page;
    }

    const linkedInstagram = instagramAccounts.find((account) => account.page_id === page.id);
    return linkedInstagram ? { ...page, instagram_account: linkedInstagram } : page;
  });

  return {
    id: UNASSIGNED_META_BUSINESS_ID,
    meta_business_id: "direct-access",
    name: "Directly Shared Assets",
    ad_accounts: adAccounts,
    pages: pagesWithInstagram,
  };
}

function normalizeBusinesses(response: MetaAssetsResponse): MetaBusiness[] {
  const baseBusinesses = response.businesses ?? [];
  const unassignedBusiness = buildUnassignedBusiness(
    response.unassigned_ad_accounts ?? [],
    response.unassigned_pages ?? [],
    response.unassigned_instagram_accounts ?? [],
  );

  return unassignedBusiness ? [...baseBusinesses, unassignedBusiness] : baseBusinesses;
}

export function MetaProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [connection, setConnection] = useState<MetaConnection | null>(null);
  const [businesses, setBusinesses] = useState<MetaBusiness[]>([]);
  const [permissions, setPermissions] = useState<MetaPermissionStatus | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [status, setStatus] = useState<MetaConnectionState>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearMetaState = useCallback(() => {
    setConnection(null);
    setBusinesses([]);
    setPermissions(null);
    setWarnings([]);
    setError(null);
    setIsLoading(false);
    setIsSyncing(false);
    setIsConnecting(false);
    setStatus(isAuthenticated ? "not_connected" : "idle");
  }, [isAuthenticated]);

  const applyMetaState = useCallback((
    nextConnection: MetaConnection | null,
    nextBusinesses: MetaBusiness[],
    nextPermissions: MetaPermissionStatus | null = null,
    nextWarnings: string[] = [],
  ) => {
    setConnection(nextConnection);
    setBusinesses(nextBusinesses);
    setPermissions(nextPermissions);
    setWarnings(nextWarnings);
    setError(null);
    setStatus(isConnectedState(nextConnection, nextBusinesses) ? "connected" : "not_connected");
  }, []);

  const refreshMeta = useCallback(async () => {
    if (!isAuthenticated) {
      clearMetaState();
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus("loading");

    try {
      const connectionResponse = await getMetaConnection();
      const connected = isConnectedState(connectionResponse ?? null, []);

      if (!connected) {
        applyMetaState(connectionResponse ?? null, []);
        return;
      }

      const assetsResponse = await getMetaAssets();
      applyMetaState(
        connectionResponse ?? assetsResponse.connection ?? null,
        normalizeBusinesses(assetsResponse),
        assetsResponse.permissions ?? null,
        assetsResponse.warnings ?? [],
      );
    } catch (nextError) {
      const message = (nextError as Error).message;
      setError(message);
      setConnection(null);
      setBusinesses([]);
      setPermissions(null);
      setWarnings([]);
      setStatus(isMetaReconnectError(nextError) ? "reconnect_required" : "not_connected");
    } finally {
      setIsLoading(false);
    }
  }, [applyMetaState, clearMetaState, isAuthenticated]);

  const syncAssets = useCallback(async () => {
    if (!isAuthenticated) {
      clearMetaState();
      return;
    }

    setIsSyncing(true);
    setError(null);
    setStatus("syncing");

    try {
      const syncResponse = await syncMetaAssets();
      const assetsResponse = await getMetaAssets();
      applyMetaState(
        syncResponse.connection ?? assetsResponse.connection ?? null,
        normalizeBusinesses(assetsResponse),
        syncResponse.permissions ?? assetsResponse.permissions ?? null,
        syncResponse.warnings ?? assetsResponse.warnings ?? [],
      );
    } catch (nextError) {
      const message = (nextError as Error).message;
      setError(message);
      setStatus(isMetaReconnectError(nextError) ? "reconnect_required" : "sync_failed");
      throw nextError;
    } finally {
      setIsSyncing(false);
    }
  }, [applyMetaState, clearMetaState, isAuthenticated]);

  const connectMeta = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setIsConnecting(true);
    setError(null);
    setStatus("connecting");

    try {
      const response = await getMetaConnectUrl();
      window.location.href = response.redirect_url;
    } catch (nextError) {
      const message = (nextError as Error).message;
      setError(message);
      setStatus(isMetaReconnectError(nextError) ? "reconnect_required" : (isConnectedState(connection, businesses) ? "connected" : "not_connected"));
      setIsConnecting(false);
      throw nextError;
    }
  }, [businesses, connection, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      clearMetaState();
      return;
    }

    refreshMeta();
  }, [clearMetaState, isAuthenticated, refreshMeta, user?.id]);

  const value = useMemo<MetaContextValue>(() => ({
    connection,
    businesses,
    permissions,
    warnings,
    status,
    isLoading,
    isSyncing,
    isConnecting,
    error,
    requiresReconnect: status === "reconnect_required",
    refreshMeta,
    syncAssets,
    connectMeta,
    isConnected: status === "connected",
  }), [businesses, connectMeta, connection, error, isConnecting, isLoading, isSyncing, permissions, refreshMeta, status, syncAssets, warnings]);

  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}

export function useMeta() {
  const context = useContext(MetaContext);
  if (!context) {
    throw new Error("useMeta must be used within MetaProvider");
  }
  return context;
}
