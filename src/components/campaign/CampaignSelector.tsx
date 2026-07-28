import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getCampaignsTree, type CampaignTreeItem, type AdSetTreeItem } from "@/services/api";

interface Selection { campaignId: string; adsetId: string; adId: string; }

interface Props { onChange?: (selection: Selection) => void; }

export function CampaignSelector({ onChange }: Props) {
  const [campaigns, setCampaigns] = useState<CampaignTreeItem[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignTreeItem | null>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<AdSetTreeItem | null>(null);
  const [adId, setAdId] = useState("");

  useEffect(() => {
    getCampaignsTree().then(setCampaigns).catch(console.error);
  }, []);

  const handleCampaignChange = (id: string) => {
    const campaign = campaigns.find((c) => c.id === id) ?? null;
    setSelectedCampaign(campaign);
    setSelectedAdSet(null);
    setAdId("");
    onChange?.({ campaignId: id, adsetId: "", adId: "" });
  };

  const handleAdSetChange = (id: string) => {
    const adset = selectedCampaign?.adsets.find((a) => a.id === id) ?? null;
    setSelectedAdSet(adset);
    setAdId("");
    onChange?.({ campaignId: selectedCampaign?.id ?? "", adsetId: id, adId: "" });
  };

  const handleAdChange = (id: string) => {
    setAdId(id);
    onChange?.({ campaignId: selectedCampaign?.id ?? "", adsetId: selectedAdSet?.id ?? "", adId: id });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Campaign</Label>
        <Select onValueChange={handleCampaignChange} value={selectedCampaign?.id ?? ""}>
          <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
          <SelectContent>
            {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Ad Set</Label>
        <Select onValueChange={handleAdSetChange} value={selectedAdSet?.id ?? ""} disabled={!selectedCampaign}>
          <SelectTrigger><SelectValue placeholder="Select ad set" /></SelectTrigger>
          <SelectContent>
            {selectedCampaign?.adsets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Ad</Label>
        <Select onValueChange={handleAdChange} value={adId} disabled={!selectedAdSet}>
          <SelectTrigger><SelectValue placeholder="Select ad" /></SelectTrigger>
          <SelectContent>
            {selectedAdSet?.ads.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
