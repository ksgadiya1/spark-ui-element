const META_APP_ID = import.meta.env.VITE_META_APP_ID?.trim() ?? "";
const META_API_VERSION = import.meta.env.VITE_META_API_VERSION?.trim() || "v21.0";
const META_LOGIN_SCOPE = [
  "public_profile",
  "email",
  "ads_management",
  "ads_read",
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "leads_retrieval",
].join(",");

function ensureFacebookSdkConfigured() {
  if (!META_APP_ID) {
    throw new Error("Facebook SDK is not configured. Set VITE_META_APP_ID in the frontend environment.");
  }
}

async function getFacebookSdk() {
  ensureFacebookSdkConfigured();
  await window.__facebookSdkReady;

  if (!window.FB) {
    throw new Error("Facebook SDK is unavailable right now. Please refresh and try again.");
  }

  return window.FB;
}

export function isFacebookSdkConfigured() {
  return !!META_APP_ID;
}

export async function getFacebookLoginStatus() {
  const sdk = await getFacebookSdk();
  return new Promise<FacebookStatusResponse>((resolve) => {
    sdk.getLoginStatus((response) => resolve(response));
  });
}

export async function loginWithFacebook() {
  const sdk = await getFacebookSdk();
  return new Promise<FacebookStatusResponse>((resolve) => {
    sdk.login(
      (response) => resolve(response),
      {
        scope: META_LOGIN_SCOPE,
        return_scopes: true,
      },
    );
  });
}
