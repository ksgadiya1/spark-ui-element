import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Campaign } from "@/services/api";

interface Props {
  campaignId: string;
  campaign?: Campaign;
}

export function CampaignCreativePreview({ campaign }: Props) {
  if (!campaign) return <p className="text-sm text-muted-foreground py-4">No creative data available.</p>;

  const hostname = (() => { try { return new URL(campaign.target_url).hostname; } catch { return campaign.target_url; } })();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Creative Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(campaign.image_url || campaign.video_url) && (
          <div className="rounded-md overflow-hidden border border-border">
            {campaign.video_url ? (
              <video src={campaign.video_url} controls className="w-full max-h-48 object-cover" />
            ) : (
              <img src={campaign.image_url} alt="Ad creative" className="w-full max-h-48 object-cover" />
            )}
          </div>
        )}
        <div className="space-y-1 text-sm">
          {campaign.headline && <p className="font-semibold">{campaign.headline}</p>}
          {campaign.primary_text && <p className="text-muted-foreground text-xs line-clamp-3">{campaign.primary_text}</p>}
          {campaign.description && <p className="text-xs text-muted-foreground">{campaign.description}</p>}
          <div className="flex items-center justify-between pt-1">
            {campaign.cta && (
              <span className="text-xs font-medium bg-primary text-primary-foreground px-2 py-1 rounded">{campaign.cta}</span>
            )}
            {campaign.target_url && (
              <a href={campaign.target_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
                <ExternalLink className="w-3 h-3" /> {hostname}
              </a>
            )}
          </div>
        </div>
        {campaign.meta_creative_id && (
          <p className="text-xs text-muted-foreground font-mono">Creative ID: {campaign.meta_creative_id}</p>
        )}
      </CardContent>
    </Card>
  );
}
