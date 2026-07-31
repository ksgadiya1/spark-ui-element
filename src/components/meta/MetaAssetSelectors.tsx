import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMeta } from "@/contexts/MetaContext";
import { MetaReconnectAlert } from "@/components/meta/MetaReconnectAlert";
import { type MetaAdAccount, type MetaBusiness, type MetaPage } from "@/services/api";

const NONE_INSTAGRAM = "__none_instagram__";

export interface MetaAssetSelection {
  businessId: string;
  adAccountId: string;
  pageId: string;
  instagramAccountId: string;
}

interface Props {
  value: MetaAssetSelection;
  onChange: (value: MetaAssetSelection) => void;
  disabled?: boolean;
}

export function MetaAssetSelectors({ value, onChange, disabled = false }: Props) {
  const { businesses, isLoading, isSyncing, error, status, requiresReconnect, connectMeta } = useMeta();

  const selectedBusiness = useMemo<MetaBusiness | null>(() => {
    if (!businesses.length) {
      return null;
    }

    return businesses.find((business) => business.id === value.businessId) ?? businesses[0];
  }, [businesses, value.businessId]);

  const adAccounts = selectedBusiness?.ad_accounts ?? [];
  const pages = selectedBusiness?.pages ?? [];

  const instagramOptions = useMemo(() => {
    if (!pages.length) {
      return [];
    }

    if (value.pageId) {
      const selectedPage = pages.find((page) => page.id === value.pageId);
      return selectedPage?.instagram_account ? [selectedPage.instagram_account] : [];
    }

    return pages
      .map((page) => page.instagram_account)
      .filter(Boolean);
  }, [pages, value.pageId]);

  useEffect(() => {
    if (!businesses.length) {
      return;
    }

    const businessId = selectedBusiness?.id ?? "";
    const selectedAdAccount = adAccounts.find((account) => account.id === value.adAccountId);
    const selectedPage = pages.find((page) => page.id === value.pageId);
    const selectedInstagram = instagramOptions.find((account) => account?.id === value.instagramAccountId);

    const nextSelection: MetaAssetSelection = {
      businessId,
      adAccountId: selectedAdAccount?.id ?? adAccounts[0]?.id ?? "",
      pageId: selectedPage?.id ?? pages[0]?.id ?? "",
      instagramAccountId: selectedInstagram?.id ?? "",
    };
 
    if (
      nextSelection.businessId !== value.businessId ||
      nextSelection.adAccountId !== value.adAccountId ||
      nextSelection.pageId !== value.pageId ||
      nextSelection.instagramAccountId !== value.instagramAccountId
    ) {
      onChange(nextSelection);
    }
  }, [adAccounts, businesses, instagramOptions, onChange, pages, selectedBusiness?.id, value.adAccountId, value.businessId, value.instagramAccountId, value.pageId]);

  if (isLoading || isSyncing) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {isSyncing ? "Refreshing your imported Meta assets..." : "Loading your imported Meta assets..."}
      </div>
    );
  }

  if (requiresReconnect) {
    return <MetaReconnectAlert message={error} onReconnect={() => void connectMeta()} compact />;
  }

  if (!businesses.length) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
        {status === "connected"
          ? "Meta is connected, but there are no imported assets yet. Sync assets before publishing campaigns."
          : "Connect Meta and import assets before publishing campaigns."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Business</Label>
        <Select
          value={selectedBusiness?.id ?? ""}
          onValueChange={(businessId) => onChange({ businessId, adAccountId: "", pageId: "", instagramAccountId: "" })}
          disabled={disabled}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select business" />
          </SelectTrigger>
          <SelectContent>
            {businesses.map((business) => (
              <SelectItem key={business.id} value={business.id}>
                {business.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Ad Account</Label>
        <Select
          value={value.adAccountId}
          onValueChange={(adAccountId) => onChange({ ...value, businessId: selectedBusiness?.id ?? "", adAccountId })}
          disabled={disabled || !adAccounts.length}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder={adAccounts.length ? "Select ad account" : "No imported ad accounts"} />
          </SelectTrigger>
          <SelectContent>
            {adAccounts.map((account: MetaAdAccount) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Page</Label>
        <Select
          value={value.pageId}
          onValueChange={(pageId) => onChange({ ...value, businessId: selectedBusiness?.id ?? "", pageId, instagramAccountId: "" })}
          disabled={disabled || !pages.length}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder={pages.length ? "Select page" : "No imported pages"} />
          </SelectTrigger>
          <SelectContent>
            {pages.map((page: MetaPage) => (
              <SelectItem key={page.id} value={page.id}>
                {page.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Instagram Account</Label>
        <Select
          value={value.instagramAccountId || NONE_INSTAGRAM}
          onValueChange={(instagramAccountId) => onChange({
            ...value,
            businessId: selectedBusiness?.id ?? "",
            instagramAccountId: instagramAccountId === NONE_INSTAGRAM ? "" : instagramAccountId,
          })}
          disabled={disabled || (!instagramOptions.length && !value.instagramAccountId)}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder={instagramOptions.length ? "Select Instagram account" : "No imported Instagram account"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_INSTAGRAM}>No Instagram account</SelectItem>
            {instagramOptions.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                @{account.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
