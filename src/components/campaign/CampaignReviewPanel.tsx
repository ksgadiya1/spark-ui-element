import { useState } from "react";
import { Loader2, Send, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CampaignStatusBadge } from "./CampaignStatusBadge";
import {
  createCampaign,
  publishCampaign,
  type Campaign,
  type CreateCampaignPayload,
} from "@/services/api";

interface Props {
  campaignData: CreateCampaignPayload;
  onPublished?: (campaign: Campaign) => void;
  onScheduled?: (campaign: Campaign) => void;
}

export function CampaignReviewPanel({ campaignData, onPublished, onScheduled }: Props) {
  const { toast } = useToast();
  const [publishLoading, setPublishLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [result, setResult] = useState<Campaign | null>(null);

  const handlePublish = async () => {
    setPublishLoading(true);
    try {
      const campaign = await createCampaign(campaignData);
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
      const campaign = await createCampaign({
        ...campaignData,
        scheduled_at: new Date(scheduledAt).toISOString(),
      });
      setResult(campaign);
      onScheduled?.(campaign);
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

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Publish to Meta</span>
        {result && <CampaignStatusBadge status={result.sync_status} />}
      </div>

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
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handlePublish}
          disabled={publishLoading || scheduleLoading || !!scheduledAt}
          className="flex-1"
        >
          {publishLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Publish to Meta
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleSchedule}
          disabled={scheduleLoading || publishLoading || !scheduledAt}
          className="flex-1"
        >
          {scheduleLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarClock className="w-4 h-4 mr-2" />}
          Schedule Campaign
        </Button>
      </div>
    </div>
  );
}
