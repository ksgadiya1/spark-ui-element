import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Pause, Play, Trash2, RefreshCw,
  Users, BarChart3, Palette, Info, Pencil, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetaAssetSelectors, type MetaAssetSelection } from "@/components/meta/MetaAssetSelectors";
import { MetaReconnectAlert } from "@/components/meta/MetaReconnectAlert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMeta } from "@/contexts/MetaContext";
import { useToast } from "@/hooks/use-toast";
import { CampaignStatusBadge } from "./CampaignStatusBadge";
import { CampaignAnalytics } from "./CampaignAnalytics";
import { CampaignLeads } from "./CampaignLeads";
import { CampaignCreativePreview } from "./CampaignCreativePreview";
import {
  getCampaign, getCampaignInsights, updateCampaign,
  pauseCampaign, resumeCampaign, deleteCampaign,
  getAdSets, getAds, getAdCreative,
  isMetaReconnectError, type Campaign, type CampaignInsights, type AdSet, type Ad, type AdCreative,
} from "@/services/api";

interface Props {
  campaignId: string;
  onClose?: () => void;
  onDeleted?: () => void;
}

interface EditForm {
  name: string;
  headline: string;
  primary_text: string;
  description: string;
  target_url: string;
  cta: string;
  daily_budget: string;
  image_url: string;
}

export function CampaignDetailPanel({ campaignId, onClose, onDeleted }: Props) {
  const { toast } = useToast();
  const { businesses, connectMeta } = useMeta();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [insights, setInsights] = useState<CampaignInsights | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [metaReconnectError, setMetaReconnectError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editAssetSelection, setEditAssetSelection] = useState<MetaAssetSelection>({
    businessId: "",
    adAccountId: "",
    pageId: "",
    instagramAccountId: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [adsets, setAdsets] = useState<AdSet[]>([]);
  const [adsMap, setAdsMap] = useState<Record<string, Ad[]>>({});
  const [creativesMap, setCreativesMap] = useState<Record<string, AdCreative>>({});
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [structureLoaded, setStructureLoaded] = useState(false);

  const fetchStructure = useCallback(async () => {
    setLoadingStructure(true);
    try {
      setMetaReconnectError(null);
      const sets = await getAdSets(campaignId);
      setAdsets(sets);
      const adsEntries = await Promise.all(
        sets.map(async (s) => [s.id, await getAds(s.id)] as [string, Ad[]])
      );
      const newAdsMap: Record<string, Ad[]> = Object.fromEntries(adsEntries);
      setAdsMap(newAdsMap);
      const allAds = adsEntries.flatMap(([, ads]) => ads);
      const creativeEntries = await Promise.all(
        allAds
          .filter((a) => a.meta_creative_id)
          .map(async (a) => {
            try {
              const c = await getAdCreative(a.meta_creative_id!);
              return [a.meta_creative_id!, c] as [string, AdCreative];
            } catch { return null; }
          })
      );
      setCreativesMap(Object.fromEntries(creativeEntries.filter(Boolean) as [string, AdCreative][]));
      await fetchCampaign();
      setStructureLoaded(true);
    } catch (err) {
      if (isMetaReconnectError(err)) {
        setMetaReconnectError((err as Error).message);
      }
      toast({ title: "Failed to load structure", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoadingStructure(false);
    }
  }, [campaignId, fetchCampaign, toast]);

  const fetchInsights = useCallback(async (id: string) => {
    setLoadingInsights(true);
    try {
      setMetaReconnectError(null);
      const data = await getCampaignInsights(id);
      setInsights(data);
      setInsightsError(null);
    } catch (err) {
      if (isMetaReconnectError(err)) {
        setMetaReconnectError((err as Error).message);
      }
      setInsightsError((err as Error).message);
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  const fetchCampaign = useCallback(async () => {
    try {
      setMetaReconnectError(null);
      const data = await getCampaign(campaignId);
      setCampaign(data);
    } catch (err) {
      if (isMetaReconnectError(err)) {
        setMetaReconnectError((err as Error).message);
      }
      toast({ title: "Failed to load campaign", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoadingCampaign(false);
    }
  }, [campaignId, toast]);

  useEffect(() => {
    fetchCampaign();
    fetchInsights(campaignId);
  }, [campaignId, fetchCampaign, fetchInsights]);

  useEffect(() => {
    if (campaign?.sync_status !== "published") return;
    const id = setInterval(() => fetchInsights(campaignId), 60_000);
    return () => clearInterval(id);
  }, [campaign?.sync_status, campaignId, fetchInsights]);

  const startEdit = () => {
    if (!campaign) return;
    const business = businesses.find((candidate) =>
      candidate.ad_accounts.some((account) => account.id === campaign.ad_account_id) ||
      candidate.pages.some((page) => page.id === campaign.page_id),
    );

    setEditForm({
      name: campaign.name,
      headline: campaign.headline,
      primary_text: campaign.primary_text,
      description: campaign.description ?? "",
      target_url: campaign.target_url,
      cta: campaign.cta ?? "",
      daily_budget: (campaign.daily_budget / 100).toFixed(2),
      image_url: campaign.image_url,
    });
    setEditAssetSelection({
      businessId: business?.id ?? "",
      adAccountId: campaign.ad_account_id ?? "",
      pageId: campaign.page_id ?? "",
      instagramAccountId: campaign.instagram_account_id ?? "",
    });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setEditForm(null); };

  const saveEdit = async () => {
    if (!editForm) return;
    setSavingEdit(true);
    try {
      setMetaReconnectError(null);
      const updated = await updateCampaign(campaignId, {
        name: editForm.name,
        headline: editForm.headline,
        primary_text: editForm.primary_text,
        description: editForm.description || undefined,
        target_url: editForm.target_url,
        cta: editForm.cta || undefined,
        daily_budget: Math.round(parseFloat(editForm.daily_budget) * 100),
        image_url: editForm.image_url,
        ad_account_id: editAssetSelection.adAccountId,
        page_id: editAssetSelection.pageId,
        instagram_account_id: editAssetSelection.instagramAccountId || undefined,
      });
      setCampaign(updated);
      setEditing(false);
      setEditForm(null);
      toast({ title: "Campaign updated", variant: "success" });
    } catch (err) {
      if (isMetaReconnectError(err)) {
        setMetaReconnectError((err as Error).message);
      }
      toast({ title: "Update failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const runAction = async (
    label: string,
    fn: () => Promise<Campaign | { success: boolean }>,
    onSuccess?: (result: Campaign | { success: boolean }) => void,
  ) => {
    setActionLoading(label);
    try {
      setMetaReconnectError(null);
      const result = await fn();
      onSuccess?.(result);
      toast({ title: `${label} successful`, variant: "success" });
    } catch (err) {
      if (isMetaReconnectError(err)) {
        setMetaReconnectError((err as Error).message);
      }
      toast({ title: `${label} failed`, description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause  = () => runAction("Pause",  () => pauseCampaign(campaignId),  (r) => setCampaign(r as Campaign));
  const handleResume = () => runAction("Resume", () => resumeCampaign(campaignId), (r) => setCampaign(r as Campaign));
  const handleDelete = () => runAction("Delete", () => deleteCampaign(campaignId), () => { onDeleted?.(); onClose?.(); });

  const busy = (label: string) => actionLoading === label;

  if (loadingCampaign) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) return null;

  const isActive = campaign.meta_status === "ACTIVE";
  const isPaused = campaign.meta_status === "PAUSED";

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold leading-tight">{campaign.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <CampaignStatusBadge status={campaign.sync_status} />
            {campaign.meta_status && (
              <span className="text-xs text-muted-foreground font-mono">{campaign.meta_status}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={startEdit} title="Edit Campaign">
            <Pencil className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          )}
        </div>
      </div>

      {metaReconnectError && (
        <MetaReconnectAlert message={metaReconnectError} onReconnect={() => void connectMeta()} compact />
      )}

      {/* Edit Form */}
      {editing && editForm && (
        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Edit Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {([
              ["name", "Campaign Name", "input"],
              ["headline", "Headline", "input"],
              ["primary_text", "Primary Text", "textarea"],
              ["description", "Description", "textarea"],
              ["target_url", "Target URL", "input"],
              ["cta", "CTA", "input"],
              ["daily_budget", "Daily Budget ($)", "input"],
              ["image_url", "Image URL", "input"],
            ] as [keyof EditForm, string, "input" | "textarea"][]).map(([field, label, type]) => (
              <div key={field} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                {type === "textarea" ? (
                  <Textarea
                    value={editForm[field]}
                    onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                    className="text-sm min-h-[60px]"
                  />
                ) : (
                  <Input
                    value={editForm[field]}
                    onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                    className="text-sm"
                  />
                )}
              </div>
            ))}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Imported Meta Assets</Label>
              <MetaAssetSelectors
                value={editAssetSelection}
                onChange={setEditAssetSelection}
                disabled={savingEdit}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit} disabled={savingEdit}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2">
        {isActive && (
          <Button size="sm" variant="outline" onClick={handlePause} disabled={!!actionLoading}>
            {busy("Pause") ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Pause className="w-4 h-4 mr-1" />}
            Pause
          </Button>
        )}
        {isPaused && (
          <Button size="sm" onClick={handleResume} disabled={!!actionLoading}>
            {busy("Resume") ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
            Resume
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => fetchInsights(campaignId)} disabled={loadingInsights}>
          {loadingInsights ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Refresh Insights
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={!!actionLoading}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the campaign from Meta and your database. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="overview"  className="text-xs"><Info className="w-3 h-3 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs"><BarChart3 className="w-3 h-3 mr-1" />Analytics</TabsTrigger>
          <TabsTrigger value="creative"  className="text-xs" onClick={() => !structureLoaded && void fetchStructure()}><Palette className="w-3 h-3 mr-1" />Creative</TabsTrigger>
          <TabsTrigger value="leads"     className="text-xs"><Users className="w-3 h-3 mr-1" />Leads</TabsTrigger>
          <TabsTrigger value="structure" className="text-xs" onClick={() => !structureLoaded && fetchStructure()}>Structure</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-3 mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Objective",    campaign.objective],
                ["Headline",     campaign.headline],
                ["Primary Text", campaign.primary_text],
                ...(campaign.description ? [["Description", campaign.description]] : []),
                ["Daily Budget", `$${(campaign.daily_budget / 100).toFixed(2)}`],
                ["Target URL",   campaign.target_url],
                ["Ad Account", campaign.ad_account_id ?? "Not selected"],
                ["Page", campaign.page_id ?? "Not selected"],
                ["Instagram Account", campaign.instagram_account_id ?? "Optional / not selected"],
                ...(campaign.cta ? [["CTA", campaign.cta]] : []),
                ["Created",      new Date(campaign.created_at).toLocaleString()],
                ...(campaign.published_at   ? [["Published",   new Date(campaign.published_at).toLocaleString()]]   : []),
                ...(campaign.last_synced_at ? [["Last Synced", new Date(campaign.last_synced_at).toLocaleString()]] : []),
                ...(campaign.scheduled_at   ? [["Scheduled",   new Date(campaign.scheduled_at).toLocaleString()]]   : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="text-xs font-medium text-right break-all">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {campaign.image_url && (
            <Card>
              <CardContent className="pt-4">
                <img src={campaign.image_url} alt="Ad" className="rounded-md w-full max-h-48 object-cover" />
              </CardContent>
            </Card>
          )}

          {(campaign.meta_campaign_id || campaign.meta_ad_id) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Meta IDs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ["Campaign ID", campaign.meta_campaign_id],
                  ["AdSet ID",    campaign.meta_adset_id],
                  ["Creative ID", campaign.meta_creative_id],
                  ["Ad ID",       campaign.meta_ad_id],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono text-xs">{value ?? "—"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-3">
          {loadingInsights ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading insights…
            </div>
          ) : insightsError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{insightsError}</p>
              <Button size="sm" variant="outline" onClick={() => fetchInsights(campaignId)}>
                <RefreshCw className="w-4 h-4 mr-1" /> Retry
              </Button>
            </div>
          ) : insights ? (
            <CampaignAnalytics insights={insights} />
          ) : (
            <p className="text-sm text-muted-foreground py-4">No analytics data yet.</p>
          )}
        </TabsContent>

        {/* Creative Tab */}
        <TabsContent value="creative" className="mt-3">
          <CampaignCreativePreview campaignId={campaignId} campaign={campaign} />
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="mt-3">
          <CampaignLeads campaignId={campaignId} />
        </TabsContent>

        {/* Structure Tab */}
        <TabsContent value="structure" className="mt-3 space-y-2">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={fetchStructure} disabled={loadingStructure}>
              {loadingStructure ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Refresh
            </Button>
          </div>
          {loadingStructure ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading structure…
            </div>
          ) : adsets.length === 0 && structureLoaded ? (
            <p className="text-sm text-muted-foreground py-4">No ad sets found.</p>
          ) : (
            adsets.map((adset) => (
              <Card key={adset.id} className="border">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>📦 {adset.name}</span>
                    {adset.status && <span className="text-xs font-normal text-muted-foreground">{adset.status}</span>}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-mono">{adset.id}</p>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  {(adsMap[adset.id] ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No ads</p>
                  ) : (
                    (adsMap[adset.id] ?? []).map((ad) => {
                      const creative = ad.meta_creative_id ? creativesMap[ad.meta_creative_id] : null;
                      return (
                        <div key={ad.id} className="pl-3 border-l-2 border-muted space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">🎯 {ad.name}</span>
                            {ad.status && <span className="text-xs text-muted-foreground">{ad.status}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{ad.id}</p>
                          {creative && (
                            <div className="pl-3 border-l-2 border-muted/50 mt-1 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">🎨 Creative</p>
                              {creative.image_url && (
                                <img src={creative.image_url} alt="" className="rounded w-full max-h-24 object-cover" />
                              )}
                              {creative.title && <p className="text-xs font-semibold">{creative.title}</p>}
                              {creative.body && <p className="text-xs text-muted-foreground line-clamp-2">{creative.body}</p>}
                              {creative.call_to_action_type && (
                                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{creative.call_to_action_type}</span>
                              )}
                              <p className="text-xs font-mono text-muted-foreground">{creative.id}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
