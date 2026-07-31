const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000").replace(/\/$/, "");

export type SyncStatus = "pending" | "scheduled" | "published" | "failed" | "archived";
export type MetaStatus = "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
export type CampaignObjective = "OUTCOME_TRAFFIC" | "OUTCOME_LEADS" | "OUTCOME_AWARENESS";
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

export interface User {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: "bearer" | string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

export interface RefreshTokenPayload {
  refresh_token: string;
}

export interface MetaSdkLoginPayload {
  access_token: string;
  expires_in?: number;
}

export interface AuthRedirectResponse {
  redirect_url: string;
}

export interface MetaInstagramAccount {
  id: string;
  page_id: string;
  instagram_account_id: string;
  username: string;
}

export interface MetaPage {
  id: string;
  business_id: string;
  meta_page_id: string;
  name: string;
  instagram_account?: MetaInstagramAccount | null;
}

export interface MetaAdAccount {
  id: string;
  business_id: string;
  meta_ad_account_id: string;
  name: string;
  currency?: string;
  timezone?: string;
  status?: string;
}

export interface MetaBusiness {
  id: string;
  meta_business_id: string;
  name: string;
  ad_accounts: MetaAdAccount[];
  pages: MetaPage[];
}

export interface MetaPermissionStatus {
  granted: string[];
  missing: string[];
  declined: string[];
  expired: string[];
}

export interface MetaConnection {
  id: string;
  user_id: string;
  facebook_user_id: string;
  token_expires_at?: string | null;
  connected_at: string;
  updated_at: string;
  businesses_count?: number;
  ad_accounts_count?: number;
  pages_count?: number;
  instagram_accounts_count?: number;
  status_message?: string | null;
  is_connected?: boolean;
  last_synced_at?: string;
  expires_at?: string;
  [key: string]: unknown;
}

export interface MetaConnectUrlResponse {
  redirect_url: string;
}

export interface MetaAssetsResponse {
  connection: MetaConnection | null;
  businesses: MetaBusiness[];
  unassigned_ad_accounts?: MetaAdAccount[];
  unassigned_pages?: MetaPage[];
  unassigned_instagram_accounts?: MetaInstagramAccount[];
  permissions?: MetaPermissionStatus | null;
  warnings?: string[];
}

export interface MetaSyncResponse {
  connection: MetaConnection | null;
  businesses_imported: number;
  ad_accounts_imported: number;
  pages_imported: number;
  instagram_accounts_imported: number;
  permissions?: MetaPermissionStatus | null;
  warnings?: string[];
  status_message?: string | null;
}

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
  daily_budget: number;
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
  ad_account_id?: string;
  page_id?: string;
  instagram_account_id?: string;
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
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
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
  meta_ad_id?: string;
  meta_creative_id?: string;
  created_at: string;
}

export interface AdCreative {
  id: string;
  name?: string;
  title?: string;
  body?: string;
  image_url?: string;
  video_url?: string;
  link_url?: string;
  call_to_action_type?: string;
  object_story_spec?: Record<string, unknown>;
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
  daily_budget: number;
  scheduled_at?: string;
  ad_account_id?: string;
  page_id?: string;
  instagram_account_id?: string;
}

export interface AdTreeItem {
  id: string;
  name: string;
  status?: string;
}

export interface AdSetTreeItem {
  id: string;
  name: string;
  status?: string;
  ads: AdTreeItem[];
}

export interface CampaignTreeItem {
  id: string;
  name: string;
  sync_status: string;
  adsets: AdSetTreeItem[];
}

export interface ApiClientConfig {
  getAccessToken?: () => string | null;
  getRefreshToken?: () => string | null;
  refreshTokens?: (refreshToken: string) => Promise<AuthTokens>;
  onTokensUpdated?: (tokens: AuthTokens) => void;
  onUnauthorized?: () => void;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  auth?: boolean;
  body?: BodyInit | Record<string, unknown> | null;
  retryOnAuthFailure?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  requiresMetaReconnect: boolean;
  isAuthFailure: boolean;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.requiresMetaReconnect = status === 401 && message.toLowerCase().includes("reconnect your meta account");
    this.isAuthFailure = status === 401 && !this.requiresMetaReconnect;
  }
}

let apiClientConfig: ApiClientConfig = {};
let refreshInFlight: Promise<AuthTokens | null> | null = null;

export function configureApiClient(config: ApiClientConfig) {
  apiClientConfig = config;
}

export function getApiBaseUrl() {
  return API_BASE;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isMetaReconnectError(error: unknown) {
  return isApiError(error) && error.requiresMetaReconnect;
}

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown) {
  if (!data) {
    return "Request failed";
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    return (
      (typeof record.detail === "string" && record.detail) ||
      (typeof record.error === "string" && record.error) ||
      (typeof record.message === "string" && record.message) ||
      "Request failed"
    );
  }

  return "Request failed";
}

async function performRefresh() {
  const refreshToken = apiClientConfig.getRefreshToken?.();
  const refreshTokens = apiClientConfig.refreshTokens;

  if (!refreshToken || !refreshTokens) {
    return null;
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshTokens(refreshToken)
      .then((tokens) => {
        apiClientConfig.onTokensUpdated?.(tokens);
        return tokens;
      })
      .catch(() => {
        apiClientConfig.onUnauthorized?.();
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

function buildHeaders(body: RequestOptions["body"], headers?: HeadersInit, auth?: boolean) {
  const resolvedHeaders = new Headers(headers);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (!isFormData && body != null && !resolvedHeaders.has("Content-Type")) {
    resolvedHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const accessToken = apiClientConfig.getAccessToken?.();
    if (accessToken) {
      resolvedHeaders.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  return resolvedHeaders;
}

function serializeBody(body: RequestOptions["body"]) {
  if (body == null) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  ) {
    return body as BodyInit;
  }

  return JSON.stringify(body);
}

async function executeRequest<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { auth = false, body, headers, retryOnAuthFailure = true, ...rest } = options;
  const response = await fetch(path.startsWith("http") ? path : `${API_BASE}${path}`, {
    ...rest,
    headers: buildHeaders(body, headers, auth),
    body: serializeBody(body),
  });
  const data = await parseResponse(response);

  if (response.ok) {
    return data as T;
  }

  const error = new ApiError(getErrorMessage(data), response.status, data);

  if (auth && error.isAuthFailure && retryOnAuthFailure && !retried && !path.includes("/auth/refresh")) {
    const refreshed = await performRefresh();
    if (refreshed?.access_token) {
      return executeRequest<T>(path, options, true);
    }
  }

  if (auth && error.isAuthFailure && !retried) {
    apiClientConfig.onUnauthorized?.();
  }

  throw error;
}

export const request = <T>(path: string, options?: RequestOptions) => executeRequest<T>(path, options);

export const register = (payload: RegisterPayload) =>
  request<AuthResponse>("/auth/register", { method: "POST", body: payload });

export const login = (payload: LoginPayload) =>
  request<AuthResponse>("/auth/login", { method: "POST", body: payload });

export const refreshAuthToken = (payload: RefreshTokenPayload) =>
  request<AuthTokens>("/auth/refresh", { method: "POST", body: payload, retryOnAuthFailure: false });

export const getCurrentUser = () =>
  request<User>("/auth/me", { auth: true });

export const getMetaLoginUrl = () =>
  request<AuthRedirectResponse>("/auth/meta/login-url");

export const loginWithMetaSdk = (payload: MetaSdkLoginPayload) =>
  request<AuthResponse>("/auth/meta/sdk-login", { method: "POST", body: payload });

export const getMetaConnection = () =>
  request<MetaConnection | null>("/meta/connection", { auth: true });

export const getMetaAssets = () =>
  request<MetaAssetsResponse>("/meta/assets", { auth: true });

export const getMetaConnectUrl = () =>
  request<MetaConnectUrlResponse>("/meta/connect-url", { auth: true });

export const syncMetaAssets = () =>
  request<MetaSyncResponse>("/meta/sync", { method: "POST", auth: true });

export const createCampaign = (payload: CreateCampaignPayload) =>
  request<Campaign>("/campaigns", { method: "POST", body: payload, auth: true });

export const getCampaign = (id: string) =>
  request<Campaign>(`/campaigns/${id}`, { auth: true });

export const getCampaigns = () =>
  request<Campaign[]>("/campaigns", { auth: true });

export const updateCampaign = (id: string, payload: Partial<CreateCampaignPayload>) =>
  request<Campaign>(`/campaigns/${id}`, { method: "PATCH", body: payload, auth: true });

export const publishCampaign = (id: string) =>
  request<PublishResult>(`/campaigns/${id}/publish`, { method: "POST", auth: true });

export const pauseCampaign = (id: string) =>
  request<Campaign>(`/campaigns/${id}/pause`, { method: "POST", auth: true });

export const resumeCampaign = (id: string) =>
  request<Campaign>(`/campaigns/${id}/resume`, { method: "POST", auth: true });

export const deleteCampaign = (id: string) =>
  request<{ success: boolean }>(`/campaigns/${id}`, { method: "DELETE", auth: true });

export const getCampaignInsights = (id: string) =>
  request<CampaignInsights>(`/campaigns/${id}/insights`, { auth: true });

export const getAdSets = (campaignId: string) =>
  request<AdSet[]>(`/campaigns/${campaignId}/adsets`, { auth: true });

export const createAdSet = (campaignId: string, payload: Partial<AdSet>) =>
  request<AdSet>(`/campaigns/${campaignId}/adsets`, { method: "POST", body: payload, auth: true });

export const updateAdSet = (id: string, payload: Partial<AdSet>) =>
  request<AdSet>(`/adsets/${id}`, { method: "PATCH", body: payload, auth: true });

export const deleteAdSet = (id: string) =>
  request<{ success: boolean }>(`/adsets/${id}`, { method: "DELETE", auth: true });

export const getAdSetInsights = (id: string) =>
  request<AdSetInsights>(`/adsets/${id}/insights`, { auth: true });

export const getAds = (adsetId: string) =>
  request<Ad[]>(`/adsets/${adsetId}/ads`, { auth: true });

export const createAd = (adsetId: string, payload: Partial<Ad>) =>
  request<Ad>(`/adsets/${adsetId}/ads`, { method: "POST", body: payload, auth: true });

export const publishAd = (id: string) =>
  request<Ad>(`/ads/${id}/publish`, { method: "POST", auth: true });

export const updateAd = (id: string, payload: Partial<Ad>) =>
  request<Ad>(`/ads/${id}`, { method: "PATCH", body: payload, auth: true });

export const deleteAd = (id: string) =>
  request<{ success: boolean }>(`/ads/${id}`, { method: "DELETE", auth: true });

export const getAdInsights = (id: string) =>
  request<AdInsights>(`/ads/${id}/insights`, { auth: true });

export const getAdCreative = (creativeId: string) =>
  request<AdCreative>(`/creatives/${creativeId}`, { auth: true });

export const getCampaignsTree = () =>
  request<CampaignTreeItem[]>("/campaigns/tree", { auth: true });

export const getCampaignLeads = (id: string, page = 1, search = "") =>
  request<LeadListResponse>(`/campaigns/${id}/leads?page=${page}&search=${encodeURIComponent(search)}`, { auth: true });

export const updateLeadStatus = (campaignId: string, leadId: string, status: LeadStatus, notes?: string) =>
  request<Lead>(`/campaigns/${campaignId}/leads/${leadId}`, {
    method: "PATCH",
    body: { status, notes },
    auth: true,
  });
