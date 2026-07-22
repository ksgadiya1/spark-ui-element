import { useEffect, useState, useCallback } from "react";
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getCampaignLeads, updateLeadStatus, type Lead, type LeadStatus } from "@/services/api";

interface Props {
  campaignId: string;
}

const statusColors: Record<LeadStatus, string> = {
  new:       "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-purple-100 text-purple-700",
  converted: "bg-green-100 text-green-700",
  lost:      "bg-red-100 text-red-700",
};

export function CampaignLeads({ campaignId }: Props) {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCampaignLeads(campaignId, page, search);
      setLeads(res.leads);
      setTotal(res.total);
    } catch (e) {
      toast({ title: "Failed to load leads", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, search, toast]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleStatusChange = async (lead: Lead, status: LeadStatus) => {
    setUpdatingId(lead.id);
    try {
      const updated = await updateLeadStatus(campaignId, lead.id, status);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
      toast({ title: "Lead updated", variant: "success" });
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const pageSize = 10;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by name, email, phone…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="text-sm"
        />
        <Button size="sm" variant="outline" onClick={handleSearch}>
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading leads…
        </div>
      ) : leads.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No leads found.</p>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <Card key={lead.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}>
              <CardContent className="py-3 px-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{lead.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{lead.email ?? lead.phone ?? lead.meta_lead_id}</p>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {updatingId === lead.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Select value={lead.status} onValueChange={(v) => handleStatusChange(lead, v as LeadStatus)}>
                        <SelectTrigger className="h-7 text-xs w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["new","contacted","qualified","converted","lost"] as LeadStatus[]).map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Badge className={`text-xs ${statusColors[lead.status]}`}>{lead.status}</Badge>
                  </div>
                </div>

                {expandedId === lead.id && (
                  <div className="pt-2 border-t border-border space-y-1 text-xs text-muted-foreground">
                    {lead.phone && <p>Phone: {lead.phone}</p>}
                    {lead.email && <p>Email: {lead.email}</p>}
                    <p>Meta Lead ID: <span className="font-mono">{lead.meta_lead_id}</span></p>
                    <p>Received: {new Date(lead.created_at).toLocaleString()}</p>
                    {lead.notes && <p className="text-foreground">Notes: {lead.notes}</p>}
                    {lead.field_data && Object.entries(lead.field_data).map(([k, v]) => (
                      <p key={k}>{k}: {v}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{total} leads total</span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span>{page} / {totalPages}</span>
            <Button size="sm" variant="ghost" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
