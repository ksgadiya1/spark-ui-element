import { useEffect, useState, useCallback } from "react";
import {
  Loader2, RefreshCw, Search, Pause, Play, Archive,
  Trash2, Copy, RotateCcw, Eye, TrendingUp, Users,
  CheckCircle2, XCircle, Clock, AlertCircle, Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CampaignDetailPanel } from "@/components/campaign/CampaignDetailPanel";
import {
  getCampaigns, pauseCampaign, resumeCampaign,
  archiveCampaign, deleteCampaign, duplicateCampaign, syncCampaign,
  type Campaign, type SyncStatus, type MetaStatus,
} from "@/services/api";

// ── Status helpers ──────────────────────────────────────────────────────────

const syncBadge: Record<SyncStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  pending:   { label: "Draft",     icon: <Clock className="w-3 h-3" />,        cls: "bg-gray-100 text-gray-600 border-gray-200" },
  scheduled: { label: "Scheduled", icon: <AlertCircle className="w-3 h-3" />,  cls: "bg-blue-50 text-blue-600 border-blue-200" },
  published: { label: "Live",      icon: <Radio className="w-3 h-3" />,        cls: "bg-green-50 text-green-600 border-green-200" },
  failed:    { label: "Failed",    icon: <XCircle className="w-3 h-3" />,      cls: "bg-red-50 text-red-600 border-red-200" },
  archived:  { label: "Archived",  icon: <Archive className="w-3 h-3" />,      cls: "bg-yellow-50 text-yellow-600 border-yellow-200" },
};

const metaBadge: Record<MetaStatus, { label: string; cls: string }> = {
  ACTIVE:   { label: "Active",   cls: "bg-emerald-100 text-emerald-700" },
  PAUSED:   { label: "Paused",   cls: "bg-orange-100 text-orange-700" },
  ARCHIVED: { label: "Archived", cls: "bg-gray-100 text-gray-600" },
  DELETED:  { label: "Deleted",  cls: "bg-red-100 text-red-700" },
};

const objectiveLabel: Record<string, string> = {
  OUTCOME_TRAFFIC:   "Traffic",
  OUTCOME_LEADS:     "Leads",
  OUTCOME_AWARENESS: "Awareness",
};

// ── Summary cards ───────────────────────────────────────────────────────────

function SummaryCards({ campaigns }: { campaigns: Campaign[] }) {
  const total     = campaigns.length;
  const live      = campaigns.filter((c) => c.sync_status === "published").length;
  const paused    = campaigns.filter((c) => c.meta_status === "PAUSED").length;
  const failed    = campaigns.filter((c) => c.sync_status === "failed").length;
  const scheduled = campaigns.filter((c) => c.sync_status === "scheduled").length;

  const cards = [
    { label: "Total Campaigns", value: total,     icon: <TrendingUp className="w-5 h-5 text-blue-500" />,   bg: "bg-blue-50 dark:bg-blue-950" },
    { label: "Live",            value: live,      icon: <Radio className="w-5 h-5 text-green-500" />,       bg: "bg-green-50 dark:bg-green-950" },
    { label: "Paused",          value: paused,    icon: <Pause className="w-5 h-5 text-orange-500" />,      bg: "bg-orange-50 dark:bg-orange-950" },
    { label: "Scheduled",       value: scheduled, icon: <Clock className="w-5 h-5 text-blue-400" />,        bg: "bg-sky-50 dark:bg-sky-950" },
    { label: "Failed",          value: failed,    icon: <XCircle className="w-5 h-5 text-red-500" />,       bg: "bg-red-50 dark:bg-red-950" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(({ label, value, icon, bg }) => (
        <Card key={label} className={`${bg} border-0`}>
          <CardContent className="flex items-center gap-3 py-4 px-4">
            {icon}
            <div>
              <p className="text-2xl font-bold leading-none">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Campaign row ────────────────────────────────────────────────────────────

interface RowProps {
  campaign: Campaign;
  onAction: (action: string, id: string) => void;
  actionLoading: string | null;
  onViewDetails: (id: string) => void;
}

function CampaignRow({ campaign: c, onAction, actionLoading, onViewDetails }: RowProps) {
  const busy = (action: string) => actionLoading === `${action}-${c.id}`;
  const sb = syncBadge[c.sync_status] ?? syncBadge.pending;
  const mb = c.meta_status ? metaBadge[c.meta_status] : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      {/* Left: image + info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {c.image_url ? (
          <img src={c.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{c.name}</p>
          <p className="text-xs text-muted-foreground truncate">{c.headline || "—"}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">{objectiveLabel[c.objective] ?? c.objective}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">${(c.daily_budget / 100).toFixed(0)}/day</span>
            {c.published_at && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.published_at).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: status badges */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className={`text-xs flex items-center gap-1 ${sb.cls}`}>
          {sb.icon} {sb.label}
        </Badge>
        {mb && (
          <Badge className={`text-xs ${mb.cls}`}>{mb.label}</Badge>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onViewDetails(c.id)} title="View Details">
          <Eye className="w-4 h-4" />
        </Button>

        {c.meta_status === "ACTIVE" && (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onAction("pause", c.id)} disabled={!!actionLoading} title="Pause">
            {busy("pause") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
          </Button>
        )}
        {c.meta_status === "PAUSED" && (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" onClick={() => onAction("resume", c.id)} disabled={!!actionLoading} title="Resume">
            {busy("resume") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </Button>
        )}

        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onAction("sync", c.id)} disabled={!!actionLoading} title="Sync with Meta">
          {busy("sync") ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
        </Button>

        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onAction("duplicate", c.id)} disabled={!!actionLoading} title="Duplicate">
          {busy("duplicate") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
        </Button>

        {c.sync_status !== "archived" && (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onAction("archive", c.id)} disabled={!!actionLoading} title="Archive">
            {busy("archive") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" disabled={!!actionLoading} title="Delete">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{c.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the campaign from Meta and your database. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onAction("delete", c.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function AdsManagerTab() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCampaigns();
      setCampaigns(data);
    } catch (e) {
      toast({ title: "Failed to load campaigns", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleAction = async (action: string, id: string) => {
    const key = `${action}-${id}`;
    setActionLoading(key);
    try {
      switch (action) {
        case "pause":     await pauseCampaign(id);     break;
        case "resume":    await resumeCampaign(id);    break;
        case "archive":   await archiveCampaign(id);   break;
        case "duplicate": await duplicateCampaign(id); break;
        case "sync":      await syncCampaign(id);      break;
        case "delete":    await deleteCampaign(id);    break;
      }
      toast({ title: `${action.charAt(0).toUpperCase() + action.slice(1)} successful`, variant: "success" });
      await fetchCampaigns();
    } catch (e) {
      toast({ title: `${action} failed`, description: (e as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = campaigns.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.headline?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      c.sync_status === statusFilter ||
      c.meta_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col gap-5 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Ads Manager</h2>
          <p className="text-sm text-muted-foreground">Manage all your Meta campaigns without opening Ads Manager</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchCampaigns} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      {!loading && <SummaryCards campaigns={campaigns} />}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Live</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="pending">Draft</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <TrendingUp className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium">
            {campaigns.length === 0 ? "No campaigns yet. Generate and publish one from AI Playground." : "No campaigns match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <CampaignRow
              key={c.id}
              campaign={c}
              onAction={handleAction}
              actionLoading={actionLoading}
              onViewDetails={setSelectedId}
            />
          ))}
          <p className="text-xs text-muted-foreground text-right pt-1">
            Showing {filtered.length} of {campaigns.length} campaigns
          </p>
        </div>
      )}

      {/* Detail slide-out */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          <SheetTitle className="sr-only">Campaign Details</SheetTitle>
          {selectedId && (
            <CampaignDetailPanel
              campaignId={selectedId}
              onClose={() => setSelectedId(null)}
              onDeleted={() => { setSelectedId(null); fetchCampaigns(); }}
              onDuplicated={(nc) => { setSelectedId(nc.id); fetchCampaigns(); }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
