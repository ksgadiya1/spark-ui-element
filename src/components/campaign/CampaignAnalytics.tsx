import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { CampaignInsights } from "@/services/api";

interface Props {
  insights: CampaignInsights;
}

const toNum = (v: number | string | null | undefined) => (v != null ? Number(v) : null);
const fmt = {
  dollar: (v: number | string | null | undefined) => { const n = toNum(v); return n != null && !isNaN(n) ? `$${(n / 100).toFixed(2)}` : "—"; },
  pct:    (v: number | string | null | undefined) => { const n = toNum(v); return n != null && !isNaN(n) ? `${n.toFixed(2)}%` : "—"; },
  num:    (v: number | string | null | undefined) => { const n = toNum(v); return n != null && !isNaN(n) ? n.toLocaleString() : "—"; },
  x:      (v: number | string | null | undefined) => { const n = toNum(v); return n != null && !isNaN(n) ? n.toFixed(2) : "—"; },
};

export function CampaignAnalytics({ insights }: Props) {
  if (!insights) return <p className="text-sm text-muted-foreground py-4">No analytics data available.</p>;

  const stats = [
    { label: "Impressions", value: fmt.num(insights.impressions) },
    { label: "Reach",       value: fmt.num(insights.reach) },
    { label: "Clicks",      value: fmt.num(insights.clicks) },
    { label: "Spend",       value: fmt.dollar(insights.spend) },
    { label: "CTR",         value: fmt.pct(insights.ctr) },
    { label: "CPM",         value: fmt.dollar(insights.cpm) },
    { label: "CPC",         value: fmt.dollar(insights.cpc) },
    { label: "Frequency",   value: fmt.x(insights.frequency) },
    ...(insights.leads        != null ? [{ label: "Leads",       value: fmt.num(insights.leads) }]                          : []),
    ...(insights.conversions  != null ? [{ label: "Conversions", value: fmt.num(insights.conversions) }]                    : []),
    ...(insights.cost_per_lead!= null ? [{ label: "Cost/Lead",   value: fmt.dollar(insights.cost_per_lead) }]               : []),
    ...(insights.roas         != null ? [{ label: "ROAS",        value: fmt.x(insights.roas) !== "—" ? `${fmt.x(insights.roas)}x` : "—" }] : []),
  ];

  const chartData = [
    { name: "Impressions", value: insights.impressions ?? 0 },
    { name: "Reach",       value: insights.reach ?? 0 },
    { name: "Clicks",      value: insights.clicks ?? 0 },
    ...(insights.leads != null ? [{ name: "Leads", value: insights.leads }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Volume Overview</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Bar dataKey="value" fill="hsl(var(--primary))\" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {(insights.date_start || insights.date_stop) && (
        <p className="text-xs text-muted-foreground text-right">
          {insights.date_start} — {insights.date_stop}
        </p>
      )}
    </div>
  );
}
