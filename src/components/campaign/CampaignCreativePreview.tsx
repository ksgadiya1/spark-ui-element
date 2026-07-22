import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCampaignCreative, type CampaignCreative, type Campaign } from "@/services/api";

interface Props {
  campaignId: string;
  campaign?: Campaign;
}

export function CampaignCreativePreview({ campaignId, campaign }: Props) {
  const [creative, setCreative] = useState<CampaignCreative | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCampaignCreative(campaignId)
      .then(setCreative)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading creative…</div>;

  // If API creative loaded, show it
  const display: Partial<CampaignCreative> = creative ?? (campaign ? {
    headline: campaign.headline,
    primary_text: campaign.primary_text,
    description: campaign.description,
    cta: campaign.cta,
    destination_url: campaign.target_url,
    image_url: campaign.image_url,
    video_url: campaign.video_url,
  } : null) ?? {};

  if (!creative && error && !campaign) return <p className="text-sm text-destructive">{error}</p>;

  const hostname = (() => { try { return new URL(display.destination_url ?? "").hostname; } catch { return display.destination_url; } })();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Creative Preview {!creative && <span className="text-xs normal-case">(local draft)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(display.image_url || display.video_url) && (
          <div className="rounded-md overflow-hidden border border-border">
            {display.video_url ? (
              <video src={display.video_url} controls className="w-full max-h-48 object-cover" />
            ) : (
              <img src={display.image_url} alt="Ad creative" className="w-full max-h-48 object-cover" />
            )}
          </div>
        )}
        <div className="space-y-1 text-sm">
          {display.headline && <p className="font-semibold">{display.headline}</p>}
          {display.primary_text && <p className="text-muted-foreground text-xs line-clamp-3">{display.primary_text}</p>}
          {display.description && <p className="text-xs text-muted-foreground">{display.description}</p>}
          <div className="flex items-center justify-between pt-1">
            {display.cta && (
              <span className="text-xs font-medium bg-primary text-primary-foreground px-2 py-1 rounded">{display.cta}</span>
            )}
            {display.destination_url && (
              <a href={display.destination_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
                <ExternalLink className="w-3 h-3" /> {hostname}
              </a>
            )}
          </div>
        </div>
        {creative?.preview_url && (
          <Button size="sm" variant="outline" className="w-full" asChild>
            <a href={creative.preview_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" /> Open Meta Preview
            </a>
          </Button>
        )}
        {creative?.meta_creative_id && (
          <p className="text-xs text-muted-foreground font-mono">Creative ID: {creative.meta_creative_id}</p>
        )}
      </CardContent>
    </Card>
  );
}
