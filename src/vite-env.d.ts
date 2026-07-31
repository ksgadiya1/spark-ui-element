/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_META_APP_ID?: string;
  readonly VITE_META_API_VERSION?: string;
  readonly VITE_META_SDK_LOCALE?: string;
}

interface FacebookAuthResponse {
  accessToken: string;
  expiresIn: number;
  signedRequest: string;
  userID: string;
}

interface FacebookStatusResponse {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: FacebookAuthResponse;
}

interface FacebookLoginOptions {
  scope?: string;
  return_scopes?: boolean;
}

interface FacebookSdk {
  init: (config: {
    appId: string;
    cookie: boolean;
    xfbml: boolean;
    version: string;
  }) => void;
  getLoginStatus: (callback: (response: FacebookStatusResponse) => void) => void;
  login: (
    callback: (response: FacebookStatusResponse) => void,
    options?: FacebookLoginOptions,
  ) => void;
  AppEvents?: {
    logPageView?: () => void;
  };
}

interface Window {
  FB?: FacebookSdk;
  fbAsyncInit?: () => void;
  __facebookSdkReady?: Promise<FacebookSdk | null>;
}
