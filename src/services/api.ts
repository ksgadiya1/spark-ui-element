const API_BASE = "http://localhost:5000";

// ── Types ──────────────────────────────────────────────────────────────────

export type SyncStatus = "pending" | "scheduled" | "published" | "failed" | "archived";
export type MetaStatus = "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
export type CampaignObjective = "OUTCOME_TRAFFIC" | "OUTCOME_LEADS" | "OUTCOME_AWARENESS";
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

export interface Campaign {
  id: string;
  name: string;
  objective: CampaignObjective;
  headline: string;
  primary_text: string;
  description?: string;
  image_url: string;
  video_url?: string;
  target_url: string;
  cta?: string;
  daily_budget: number; // cents
  scheduled_at?: string;
  sync_status: SyncStatus;
  publish_status?: string;
  published_at?: string;
  last_synced_at?: string;
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
  published_at?: string;
}

export interface CampaignInsights {
  impressions: number;
  clicks: number;
  spend: number;       // cents
  ctr: number;         // percent
  cpc: number;         // cents
  cpm: number;         // cents
  reach: number;
  frequency: number;
  leads?: number;
  conversions?: number;
  cost_per_lead?: number;
  roas?: number;
  date_start?: string;
  date_stop?: string;
}

export interface AdSet {
  id: string;
  campaign_id: string;
  name: string;
  status?: MetaStatus;
  daily_budget?: number;
  created_at: string;
}

export interface Ad {
  id: string;
  adset_id: string;
  name: string;
  status?: MetaStatus;
  creative_id?: string;
  created_at: string;
}

export interface AdSetInsights extends CampaignInsights {}
export interface AdInsights extends CampaignInsights {}

export interface Lead {
  id: string;
  campaign_id: string;
  meta_lead_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  status: LeadStatus;
  notes?: string;
  created_at: string;
  updated_at?: string;
  field_data?: Record<string, string>;
}

export interface LeadListResponse {
  leads: Lead[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateCampaignPayload {
  name: string;
  objective: CampaignObjective;
  headline: string;
  primary_text: string;
  description?: string;
  image_url: string;
  video_url?: string;
  target_url: string;
  cta?: string;
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

// ── Campaign CRUD ──────────────────────────────────────────────────────────

export const createCampaign = (payload: CreateCampaignPayload) =>
  request<Campaign>("/campaigns", { method: "POST", body: JSON.stringify(payload) });

export const getCampaign = (id: string) =>
  request<Campaign>(`/campaigns/${id}`);

export const getCampaigns = () =>
  request<Campaign[]>("/campaigns");

export const updateCampaign = (id: string, payload: Partial<CreateCampaignPayload>) =>
  request<Campaign>(`/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

// ── Lifecycle Actions ──────────────────────────────────────────────────────

export const publishCampaign = (id: string) =>
  request<PublishResult>(`/campaigns/${id}/publish`, { method: "POST" });

export const pauseCampaign = (id: string) =>
  request<Campaign>(`/campaigns/${id}/pause`, { method: "POST" });

export const resumeCampaign = (id: string) =>
  request<Campaign>(`/campaigns/${id}/resume`, { method: "POST" });

export const deleteCampaign = (id: string) =>
  request<{ success: boolean }>(`/campaigns/${id}`, { method: "DELETE" });

// ── Analytics & Insights ───────────────────────────────────────────────────

export const getCampaignInsights = (id: string) =>
  request<CampaignInsights>(`/campaigns/${id}/insights`);

// ── Ad Sets ────────────────────────────────────────────────────────────────

export const getAdSets = (campaignId: string) =>
  request<AdSet[]>(`/campaigns/${campaignId}/adsets`);

export const createAdSet = (campaignId: string, payload: Partial<AdSet>) =>
  request<AdSet>(`/campaigns/${campaignId}/adsets`, { method: "POST", body: JSON.stringify(payload) });

export const updateAdSet = (id: string, payload: Partial<AdSet>) =>
  request<AdSet>(`/adsets/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

export const deleteAdSet = (id: string) =>
  request<{ success: boolean }>(`/adsets/${id}`, { method: "DELETE" });

export const getAdSetInsights = (id: string) =>
  request<AdSetInsights>(`/adsets/${id}/insights`);

// ── Ads ────────────────────────────────────────────────────────────────────

export const getAds = (adsetId: string) =>
  request<Ad[]>(`/adsets/${adsetId}/ads`);

export const createAd = (adsetId: string, payload: Partial<Ad>) =>
  request<Ad>(`/adsets/${adsetId}/ads`, { method: "POST", body: JSON.stringify(payload) });

export const publishAd = (id: string) =>
  request<Ad>(`/ads/${id}/publish`, { method: "POST" });

export const updateAd = (id: string, payload: Partial<Ad>) =>
  request<Ad>(`/ads/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

export const deleteAd = (id: string) =>
  request<{ success: boolean }>(`/ads/${id}`, { method: "DELETE" });

export const getAdInsights = (id: string) =>
  request<AdInsights>(`/ads/${id}/insights`);

// ── Campaign Tree ─────────────────────────────────────────────────────────

export interface AdTreeItem { id: string; name: string; status?: string; }
export interface AdSetTreeItem { id: string; name: string; status?: string; ads: AdTreeItem[]; }
export interface CampaignTreeItem { id: string; name: string; sync_status: string; adsets: AdSetTreeItem[]; }

export const getCampaignsTree = () =>
  request<CampaignTreeItem[]>("/campaigns/tree");

// ── Leads ──────────────────────────────────────────────────────────────────

export const getCampaignLeads = (id: string, page = 1, search = "") =>
  request<LeadListResponse>(`/campaigns/${id}/leads?page=${page}&search=${encodeURIComponent(search)}`);

export const updateLeadStatus = (campaignId: string, leadId: string, status: LeadStatus, notes?: string) =>
  request<Lead>(`/campaigns/${campaignId}/leads/${leadId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });
