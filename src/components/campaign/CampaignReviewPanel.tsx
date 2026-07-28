import { useState, useEffect } from "react";
import { Loader2, Send, CalendarClock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CampaignStatusBadge } from "./CampaignStatusBadge";
import {
  createCampaign, publishCampaign, getCampaigns, getAdSets,
  type Campaign, type AdSet, type CreateCampaignPayload,
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
  const [publishLoading, setPublishLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [result, setResult] = useState<Campaign | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(NEW);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string>(NEW);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingAdSets, setLoadingAdSets] = useState(false);

  useEffect(() => {
    getCampaigns()
      .then(setCampaigns)
      .catch(() => {/* silently ignore – user can still create new */})
      .finally(() => setLoadingCampaigns(false));
  }, []);

  useEffect(() => {
    if (selectedCampaignId === NEW) { setAdSets([]); setSelectedAdSetId(NEW); return; }
    setLoadingAdSets(true);
    setSelectedAdSetId(NEW);
    getAdSets(selectedCampaignId)
      .then(setAdSets)
      .catch(() => setAdSets([]))
      .finally(() => setLoadingAdSets(false));
  }, [selectedCampaignId]);

  const resolveOrCreateCampaign = async (): Promise<Campaign> => {
    if (selectedCampaignId !== NEW) {
      return campaigns.find((c) => c.id === selectedCampaignId)!;
    }
    return createCampaign(campaignData);
  };

  const handlePublish = async () => {
    setPublishLoading(true);
    try {
      const campaign = await resolveOrCreateCampaign();
      const published = await publishCampaign(campaign.id);
      const merged: Campaign = { ...campaign, ...published };
      setResult(merged);
      onPublished?.(merged);
      toast({ title: "Published!", description: `Meta Campaign ID: ${published.meta_campaign_id}`, variant: "success" });
    } catch (err) {
      toast({ title: "Publish failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setPublishLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledAt) {
      toast({ title: "Pick a date/time first", variant: "destructive" });
      return;
    }
    setScheduleLoading(true);
    try {
      const base = selectedCampaignId !== NEW
        ? campaigns.find((c) => c.id === selectedCampaignId)!
        : await createCampaign({ ...campaignData, scheduled_at: new Date(scheduledAt).toISOString() });
      setResult(base);
      onScheduled?.(base);
      toast({
        title: "Campaign scheduled",
        description: `Scheduled for ${new Date(scheduledAt).toLocaleString()}`,
        variant: "success",
      });
    } catch (err) {
      toast({ title: "Schedule failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setScheduleLoading(false);
    }
  };

  const busy = publishLoading || scheduleLoading;

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Publish to Meta</span>
        {result && <CampaignStatusBadge status={result.sync_status} />}
      </div>

      {/* Campaign selector */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Campaign</Label>
        <Select
          value={selectedCampaignId}
          onValueChange={setSelectedCampaignId}
          disabled={loadingCampaigns || !!result}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder={loadingCampaigns ? "Loading…" : "Select campaign"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NEW}>＋ Create new campaign</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ad Set selector — only shown when an existing campaign is picked */}
      {selectedCampaignId !== NEW && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Ad Set</Label>
          <Select
            value={selectedAdSetId}
            onValueChange={setSelectedAdSetId}
            disabled={loadingAdSets || !!result}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={loadingAdSets ? "Loading…" : "Select ad set"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NEW}>＋ Create new ad set</SelectItem>
              {adSets.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Schedule input */}
      <div className="space-y-1">
        <Label htmlFor="schedule-dt" className="text-xs text-muted-foreground">
          Schedule for (optional)
        </Label>
        <Input
          id="schedule-dt"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="text-sm"
          disabled={!!result}
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handlePublish}
          disabled={busy || !!scheduledAt || !!result}
          className="flex-1"
        >
          {publishLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Publish to Meta
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleSchedule}
          disabled={busy || !scheduledAt || !!result}
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
