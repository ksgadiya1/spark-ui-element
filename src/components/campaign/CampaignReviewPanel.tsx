import { useEffect, useState } from "react";
import { CalendarClock, ExternalLink, Loader2, Send } from "lucide-react";
import { MetaAssetSelectors, type MetaAssetSelection } from "@/components/meta/MetaAssetSelectors";
import { MetaReconnectAlert } from "@/components/meta/MetaReconnectAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMeta } from "@/contexts/MetaContext";
import { useToast } from "@/hooks/use-toast";
import { CampaignStatusBadge } from "./CampaignStatusBadge";
import {
  createCampaign,
  getAdSets,
  getCampaigns,
  isMetaReconnectError,
  publishCampaign,
  updateCampaign,
  type AdSet,
  type Campaign,
  type CreateCampaignPayload,
} from "@/services/api";

interface Props {
  campaignData: CreateCampaignPayload;
  onPublished?: (campaign: Campaign) => void;
  onScheduled?: (campaign: Campaign) => void;
  onViewDetails?: (campaign: Campaign) => void;
}

const NEW = "__new__";

export function CampaignReviewPanel({ campaignData, onPublished, onScheduled, onViewDetails }: Props) {
  const { toast } = useToast();
  const { connectMeta, businesses, isLoading: metaLoading, isSyncing, isConnecting, requiresReconnect, status } = useMeta();
  const [publishLoading, setPublishLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [result, setResult] = useState<Campaign | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(NEW);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string>(NEW);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingAdSets, setLoadingAdSets] = useState(false);
  const [assetSelection, setAssetSelection] = useState<MetaAssetSelection>({
    businessId: "",
    adAccountId: "",
    pageId: "",
    instagramAccountId: "",
  });

  useEffect(() => {
    getCampaigns()
      .then(setCampaigns)
      .catch(() => {})
      .finally(() => setLoadingCampaigns(false));
  }, []);

  useEffect(() => {
    if (selectedCampaignId === NEW) {
      setAdSets([]);
      setSelectedAdSetId(NEW);
      return;
    }

    setLoadingAdSets(true);
    setSelectedAdSetId(NEW);
    getAdSets(selectedCampaignId)
      .then(setAdSets)
      .catch(() => setAdSets([]))
      .finally(() => setLoadingAdSets(false));
  }, [selectedCampaignId]);

  useEffect(() => {
    if (selectedCampaignId === NEW) {
      return;
    }

    const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId);
    if (!selectedCampaign) {
      return;
    }

    const business = businesses.find((candidate) =>
      candidate.ad_accounts.some((account) => account.id === selectedCampaign.ad_account_id) ||
      candidate.pages.some((page) => page.id === selectedCampaign.page_id),
    );

    setAssetSelection({
      businessId: business?.id ?? "",
      adAccountId: selectedCampaign.ad_account_id ?? "",
      pageId: selectedCampaign.page_id ?? "",
      instagramAccountId: selectedCampaign.instagram_account_id ?? "",
    });
  }, [businesses, campaigns, selectedCampaignId]);

  const buildPayload = (overrides?: Partial<CreateCampaignPayload>): CreateCampaignPayload => ({
    ...campaignData,
    ...overrides,
    ad_account_id: assetSelection.adAccountId,
    page_id: assetSelection.pageId,
    instagram_account_id: assetSelection.instagramAccountId || undefined,
  });

  const resolveOrCreateCampaign = async (): Promise<Campaign> => {
    if (!assetSelection.adAccountId || !assetSelection.pageId) {
      throw new Error("Select an imported ad account and page before publishing.");
    }

    if (selectedCampaignId !== NEW) {
      return updateCampaign(selectedCampaignId, buildPayload());
    }

    return createCampaign(buildPayload());
  };

  const handlePublish = async () => {
    setPublishLoading(true);
    setPublishError(null);

    try {
      const campaign = await resolveOrCreateCampaign();
      const published = await publishCampaign(campaign.id);
      const merged: Campaign = { ...campaign, ...published };
      setResult(merged);
      onPublished?.(merged);
      toast({ title: "Published!", description: `Meta Campaign ID: ${published.meta_campaign_id}`, variant: "success" });
    } catch (error) {
      if (isMetaReconnectError(error)) {
        setPublishError((error as Error).message);
      }
      toast({ title: "Publish failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setPublishLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledAt) {
      toast({ title: "Pick a date/time first", variant: "destructive" });
      return;
    }

    if (!assetSelection.adAccountId || !assetSelection.pageId) {
      toast({ title: "Select Meta assets first", description: "Choose an imported ad account and page before scheduling.", variant: "destructive" });
      return;
    }

    setScheduleLoading(true);

    try {
      const payload = buildPayload({ scheduled_at: new Date(scheduledAt).toISOString() });
      const base = selectedCampaignId !== NEW
        ? await updateCampaign(selectedCampaignId, payload)
        : await createCampaign(payload);

      setResult(base);
      onScheduled?.(base);
      toast({
        title: "Campaign scheduled",
        description: `Scheduled for ${new Date(scheduledAt).toLocaleString()}`,
        variant: "success",
      });
    } catch (error) {
      toast({ title: "Schedule failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setScheduleLoading(false);
    }
  };

  const busy = publishLoading || scheduleLoading;
  const metaBusy = metaLoading || isSyncing || isConnecting;
  const canSubmit = !busy && !metaBusy && !requiresReconnect;

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Publish to Meta</span>
        {result && <CampaignStatusBadge status={result.sync_status} />}
      </div>

      {publishError && (
        <MetaReconnectAlert message={publishError} onReconnect={() => void connectMeta()} compact />
      )}

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Campaign</Label>
        <Select
          value={selectedCampaignId}
          onValueChange={setSelectedCampaignId}
          disabled={loadingCampaigns || !!result || metaBusy}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder={loadingCampaigns ? "Loading..." : "Select campaign"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NEW}>+ Create new campaign</SelectItem>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Imported Meta Assets</Label>
        <MetaAssetSelectors
          value={assetSelection}
          onChange={setAssetSelection}
          disabled={busy || !!result || metaBusy}
        />
      </div>

      {selectedCampaignId !== NEW && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Ad Set</Label>
          <Select
            value={selectedAdSetId}
            onValueChange={setSelectedAdSetId}
            disabled={loadingAdSets || !!result || metaBusy}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={loadingAdSets ? "Loading..." : "Select ad set"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NEW}>+ Create new ad set</SelectItem>
              {adSets.map((adSet) => (
                <SelectItem key={adSet.id} value={adSet.id}>
                  {adSet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="schedule-dt" className="text-xs text-muted-foreground">
          Schedule for (optional)
        </Label>
        <Input
          id="schedule-dt"
          type="datetime-local"
          value={scheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
          className="text-sm"
          disabled={!!result || metaBusy}
        />
      </div>

      {status === "not_connected" && (
        <p className="text-xs text-muted-foreground">
          Connect Meta and import assets before publishing or scheduling this campaign.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handlePublish}
          disabled={!canSubmit || !!scheduledAt || !!result}
          className="flex-1"
        >
          {publishLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Publish to Meta
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleSchedule}
          disabled={!canSubmit || !scheduledAt || !!result}
          className="flex-1"
        >
          {scheduleLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarClock className="w-4 h-4 mr-2" />}
          Schedule
        </Button>
      </div>

      {result && onViewDetails && (
        <Button size="sm" variant="outline" className="w-full" onClick={() => onViewDetails(result)}>
          <ExternalLink className="w-4 h-4 mr-2" /> View Campaign Details
        </Button>
      )}
    </div>
  );
}
