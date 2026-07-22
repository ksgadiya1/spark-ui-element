import { Badge } from "@/components/ui/badge";
import type { SyncStatus } from "@/services/api";

const config: Record<SyncStatus, { label: string; className: string }> = {
  pending:   { label: "Draft",     className: "bg-gray-200 text-gray-700 hover:bg-gray-200" },
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  published: { label: "Live",      className: "bg-green-100 text-green-700 hover:bg-green-100" },
  failed:    { label: "Failed",    className: "bg-red-100 text-red-700 hover:bg-red-100" },
};

export function CampaignStatusBadge({ status }: { status: SyncStatus }) {
  const { label, className } = config[status] ?? config.pending;
  return <Badge className={className}>{label}</Badge>;
}
