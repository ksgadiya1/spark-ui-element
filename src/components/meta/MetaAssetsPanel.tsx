import { Building2, Loader2, Link2, RefreshCw, UserCircle2, AlertTriangle, CheckCircle2, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMeta } from "@/contexts/MetaContext";
import { MetaReconnectAlert } from "@/components/meta/MetaReconnectAlert";

export function MetaAssetsPanel() {
  const {
    connection,
    businesses,
    permissions,
    warnings,
    isConnected,
    isLoading,
    isSyncing,
    isConnecting,
    error,
    status,
    requiresReconnect,
    refreshMeta,
    syncAssets,
    connectMeta,
  } = useMeta();

  const derivedBusinessCount = businesses.length;
  const derivedAdAccountCount = businesses.reduce((sum, business) => sum + business.ad_accounts.length, 0);
  const derivedPageCount = businesses.reduce((sum, business) => sum + business.pages.length, 0);
  const derivedInstagramCount = businesses.reduce(
    (sum, business) => sum + business.pages.filter((page) => page.instagram_account).length,
    0,
  );
  const totalBusinesses = connection?.businesses_count ?? derivedBusinessCount;
  const totalAdAccounts = connection?.ad_accounts_count ?? derivedAdAccountCount;
  const totalPages = connection?.pages_count ?? derivedPageCount;
  const totalInstagramAccounts = connection?.instagram_accounts_count ?? derivedInstagramCount;

  const badgeLabel = {
    idle: "Idle",
    loading: "Loading",
    not_connected: "Not connected",
    connecting: "Connecting",
    connected: "Connected",
    reconnect_required: "Reconnect required",
    syncing: "Syncing",
    sync_failed: "Sync failed",
  }[status];

  const showEmptyState = !isLoading && !requiresReconnect && totalBusinesses === 0 && totalAdAccounts === 0 && totalPages === 0 && totalInstagramAccounts === 0;
  const isBusy = isLoading || isSyncing || isConnecting;
  const actionButtonClassName = "h-auto min-h-9 min-w-0 justify-start rounded-xl px-3 py-2 text-left whitespace-normal leading-5";

  return (
    <Card className="rounded-2xl border-border/80 bg-background/95 shadow-sm">
      <CardHeader className="space-y-4 p-5 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-4 w-4" />
              Meta Connection
            </CardTitle>
            <CardDescription className="text-sm leading-6">
              Only imported assets from the logged-in account can be used for campaigns.
            </CardDescription>
          </div>
          <Badge
            variant={isConnected ? "default" : "outline"}
            className="shrink-0 rounded-full px-3 py-1"
          >
            {badgeLabel}
          </Badge>
        </div>

        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]">
          <Button
            size="sm"
            onClick={() => void connectMeta()}
            disabled={isBusy}
            className={actionButtonClassName}
          >
            {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
            {requiresReconnect ? "Reconnect Meta" : isConnected ? "Manage Meta Connection" : "Connect Meta"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void syncAssets()}
            disabled={isBusy || !isConnected}
            className={actionButtonClassName}
          >
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Assets
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void refreshMeta()}
            disabled={isBusy}
            className={`${actionButtonClassName} col-span-full`}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh Status
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 pt-2">
        {requiresReconnect && (
          <MetaReconnectAlert message={error} onReconnect={() => void connectMeta()} />
        )}

        {!requiresReconnect && error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border bg-muted/30 px-3 py-3 text-center">
            <p className="text-[11px] text-muted-foreground">Businesses</p>
            <p className="mt-1 text-2xl font-semibold leading-none">{totalBusinesses}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-3 py-3 text-center">
            <p className="text-[11px] text-muted-foreground">Ad Accounts</p>
            <p className="mt-1 text-2xl font-semibold leading-none">{totalAdAccounts}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-3 py-3 text-center">
            <p className="text-[11px] text-muted-foreground">Pages / IG</p>
            <p className="mt-1 text-xl font-semibold leading-tight">{totalPages} / {totalInstagramAccounts}</p>
          </div>
        </div>

        {connection?.status_message && !isLoading && (
          <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {connection.status_message}
          </div>
        )}

        {!!warnings.length && !requiresReconnect && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}

        {permissions?.missing?.length ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Missing permissions: {permissions.missing.join(", ")}
          </div>
        ) : null}

        {connection?.last_synced_at && (
          <p className="text-xs text-muted-foreground">
            Last synced: {new Date(connection.last_synced_at).toLocaleString()}
          </p>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading imported assets...
          </div>
        ) : requiresReconnect ? (
          <div className="rounded-xl border border-dashed px-4 py-5 text-sm leading-6 text-muted-foreground">
            Your Meta connection needs to be reauthorized before assets can be used again.
          </div>
        ) : status === "syncing" ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing your imported Meta assets...
          </div>
        ) : status === "sync_failed" ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-5 text-sm leading-6 text-destructive">
            Asset sync failed. You can retry sync or reconnect Meta if the problem persists.
          </div>
        ) : showEmptyState ? (
          <div className="rounded-xl border border-dashed px-4 py-5 text-center text-sm leading-6 text-muted-foreground">
            {status === "connected"
              ? "Meta is connected, but no imported businesses or assets are available yet. Run a sync to pull the latest data."
              : "Connect Meta to import businesses, ad accounts, pages, and Instagram accounts."}
          </div>
        ) : (
          <div className="space-y-3">
            {businesses.map((business) => (
              <div key={business.id} className="space-y-3 overflow-hidden rounded-xl border p-4">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">{business.name}</p>
                    <p className="break-all font-mono text-xs text-muted-foreground">{business.meta_business_id}</p>
                  </div>
                </div>

                <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ad Accounts</p>
                    {business.ad_accounts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No imported ad accounts.</p>
                    ) : (
                      business.ad_accounts.map((account) => (
                        <div key={account.id} className="min-w-0 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 break-words">{account.name}</span>
                            {account.status && <Badge variant="outline">{account.status}</Badge>}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {account.currency ? `${account.currency} ` : ""}
                            {account.timezone ? ` - ${account.timezone}` : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pages</p>
                    {business.pages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No imported pages.</p>
                    ) : (
                      business.pages.map((page) => (
                        <div key={page.id} className="min-w-0 space-y-1 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span className="min-w-0 flex-1 break-words">{page.name}</span>
                            {page.instagram_account ? (
                              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Instagram linked
                              </span>
                            ) : (
                              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                <Unplug className="h-3.5 w-3.5" />
                                No Instagram
                              </span>
                            )}
                          </div>
                          {page.instagram_account ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <UserCircle2 className="h-3.5 w-3.5" />
                              @{page.instagram_account.username}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No Instagram account linked.</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !requiresReconnect && businesses.length > 0 && status === "connected" && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            Campaign selectors below are limited to these imported assets for the current logged-in user.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
