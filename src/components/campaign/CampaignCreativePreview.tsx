import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdCreative, type AdCreative, type Campaign } from "@/services/api";

interface Props {
  campaignId: string;
  campaign?: Campaign;
}

export function CampaignCreativePreview({ campaign }: Props) {
  const [creative, setCreative] = useState<AdCreative | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCreative() {
      if (!campaign?.meta_creative_id) {
        setCreative(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await getAdCreative(campaign.meta_creative_id);
        if (active) {
          setCreative(response);
        }
      } catch (nextError) {
        if (active) {
          setCreative(null);
          setError(nextError instanceof Error ? nextError.message : "Unable to load creative details.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCreative();
    return () => {
      active = false;
    };
  }, [campaign?.meta_creative_id]);

  if (!campaign) return <p className="text-sm text-muted-foreground py-4">No creative data available.</p>;

  const hostname = (() => { try { return new URL(campaign.target_url).hostname; } catch { return campaign.target_url; } })();
  const resolvedHeadline = creative?.title || campaign.headline;
  const resolvedBody = creative?.body || campaign.primary_text;
  const resolvedImage = creative?.image_url || campaign.image_url;
  const resolvedLink = creative?.link_url || campaign.target_url;
  const resolvedHostname = (() => { try { return new URL(resolvedLink).hostname; } catch { return resolvedLink; } })();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Creative Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading creative details...
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {(resolvedImage || campaign.video_url) && (
          <div className="rounded-md overflow-hidden border border-border">
            {campaign.video_url ? (
              <video src={campaign.video_url} controls className="w-full max-h-48 object-cover" />
            ) : (
              <img src={resolvedImage} alt="Ad creative" className="w-full max-h-48 object-cover" />
            )}
          </div>
        )}
        <div className="space-y-1 text-sm">
          {resolvedHeadline && <p className="font-semibold">{resolvedHeadline}</p>}
          {resolvedBody && <p className="text-muted-foreground text-xs line-clamp-3">{resolvedBody}</p>}
          {campaign.description && <p className="text-xs text-muted-foreground">{campaign.description}</p>}
          <div className="flex items-center justify-between pt-1">
            {(creative?.call_to_action_type || campaign.cta) && (
              <span className="text-xs font-medium bg-primary text-primary-foreground px-2 py-1 rounded">{creative?.call_to_action_type || campaign.cta}</span>
            )}
            {resolvedLink && (
              <a href={resolvedLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
                <ExternalLink className="w-3 h-3" /> {resolvedHostname || hostname}
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
