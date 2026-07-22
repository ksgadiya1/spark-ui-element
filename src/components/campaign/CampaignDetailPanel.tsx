import { useEffect, useState, useCallback } from "react";
import { Loader2, Pause, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { CampaignStatusBadge } from "./CampaignStatusBadge";
import {
  getCampaign,
  getCampaignInsights,
  pauseCampaign,
  resumeCampaign,
  type Campaign,
  type CampaignInsights,
} from "@/services/api";

interface Props {
  campaignId: string;
  onClose?: () => void;
}

const fmt = {
  dollar: (v: number) => `$${(v / 100).toFixed(2)}`,
  pct: (v: number) => `${v.toFixed(2)}%`,
  num: (v: number) => v.toLocaleString(),
};

export function CampaignDetailPanel({ campaignId, onClose }: Props) {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [insights, setInsights] = useState<CampaignInsights | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const fetchInsights = useCallback(async (id: string) => {
    try {
      const data = await getCampaignInsights(id);
      setInsights(data);
      setInsightsError(null);
    } catch (err) {
      setInsightsError((err as Error).message);
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  const fetchCampaign = useCallback(async () => {
    try {
      const data = await getCampaign(campaignId);
      setCampaign(data);
    } catch (err) {
      toast({ title: "Failed to load campaign", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoadingCampaign(false);
    }
  }, [campaignId, toast]);

  // Initial load
  useEffect(() => {
    fetchCampaign();
    fetchInsights(campaignId);
  }, [campaignId, fetchCampaign, fetchInsights]);

  // Task 5 — poll insights every 60s for published campaigns
  useEffect(() => {
    if (campaign?.sync_status !== "published") return;
    const id = setInterval(() => fetchInsights(campaignId), 60_000);
    return () => clearInterval(id);
  }, [campaign?.sync_status, campaignId, fetchInsights]);

  const handlePause = async () => {
    if (!campaign) return;
    setActionLoading(true);
    try {
      const updated = await pauseCampaign(campaign.id);
      setCampaign(updated);
      toast({ title: "Campaign paused", variant: "success" });
    } catch (err) {
      toast({ title: "Pause failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!campaign) return;
    setActionLoading(true);
    try {
      const updated = await resumeCampaign(campaign.id);
      setCampaign(updated);
      toast({ title: "Campaign resumed", variant: "success" });
    } catch (err) {
      toast({ title: "Resume failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loadingCampaign) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) return null;

  const statCards = insights
    ? [
        { label: "Impressions", value: fmt.num(insights.impressions) },
        { label: "Clicks",      value: fmt.num(insights.clicks) },
        { label: "Spend",       value: fmt.dollar(insights.spend) },
        { label: "CTR",         value: fmt.pct(insights.ctr) },
        { label: "CPC",         value: fmt.dollar(insights.cpc) },
        { label: "Reach",       value: fmt.num(insights.reach) },
      ]
    : [];

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{campaign.name}</h2>
          <CampaignStatusBadge status={campaign.sync_status} />
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        )}
      </div>

      {/* Section 1 — Meta IDs */}
      {campaign.sync_status === "published" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Meta IDs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Meta Campaign ID", campaign.meta_campaign_id],
              ["Meta AdSet ID",    campaign.meta_adset_id],
              ["Meta Creative ID", campaign.meta_creative_id],
              ["Meta Ad ID",       campaign.meta_ad_id],
              ["Meta Status",      campaign.meta_status],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-xs">{value ?? "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section 2 — Insights */}
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Insights
        </p>
        {loadingInsights ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading insights…
          </div>
        ) : insightsError ? (
          <p className="text-sm text-destructive">{insightsError}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {statCards.map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Section 3 — Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {campaign.meta_status === "ACTIVE" && (
          <Button size="sm" variant="outline" onClick={handlePause} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pause className="w-4 h-4 mr-2" />}
            Pause
          </Button>
        )}
        {campaign.meta_status === "PAUSED" && (
          <Button size="sm" onClick={handleResume} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Resume
          </Button>
        )}

        {/* Task 5 — View Leads placeholder */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button size="sm" variant="ghost" disabled>
                <Users className="w-4 h-4 mr-2" />
                View Leads
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
