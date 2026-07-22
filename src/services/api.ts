const API_BASE = "http://localhost:5000";

// ── Types ──────────────────────────────────────────────────────────────────

export type SyncStatus = "pending" | "scheduled" | "published" | "failed";
export type MetaStatus = "ACTIVE" | "PAUSED";
export type CampaignObjective = "OUTCOME_TRAFFIC" | "OUTCOME_LEADS" | "OUTCOME_AWARENESS";

export interface Campaign {
  id: string;
  name: string;
  objective: CampaignObjective;
  headline: string;
  primary_text: string;
  image_url: string;
  target_url: string;
  daily_budget: number; // cents
  scheduled_at?: string;
  sync_status: SyncStatus;
  created_at: string;
  meta_campaign_id?: string;
  meta_adset_id?: string;
  meta_creative_id?: string;
  meta_ad_id?: string;
  meta_status?: MetaStatus;
}

export interface PublishResult {
  campaign_id: string;
  meta_campaign_id: string;
  meta_adset_id: string;
  meta_creative_id: string;
  meta_ad_id: string;
  meta_status: MetaStatus;
  sync_status: SyncStatus;
}

export interface CampaignInsights {
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  reach: number;
}

export interface CreateCampaignPayload {
  name: string;
  objective: CampaignObjective;
  headline: string;
  primary_text: string;
  image_url: string;
  target_url: string;
  daily_budget: number; // cents
  scheduled_at?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail ?? data?.error ?? "Request failed");
  return data as T;
}

// ── API ────────────────────────────────────────────────────────────────────

export const createCampaign = (payload: CreateCampaignPayload) =>
  request<Campaign>("/campaigns", { method: "POST", body: JSON.stringify(payload) });

export const publishCampaign = (id: string) =>
  request<PublishResult>(`/campaigns/${id}/publish`, { method: "POST" });

export const getCampaign = (id: string) =>
  request<Campaign>(`/campaigns/${id}`);

export const pauseCampaign = (id: string) =>
  request<Campaign>(`/campaigns/${id}/pause`, { method: "POST" });

export const resumeCampaign = (id: string) =>
  request<Campaign>(`/campaigns/${id}/resume`, { method: "POST" });

export const getCampaignInsights = (id: string) =>
  request<CampaignInsights>(`/campaigns/${id}/insights`);
