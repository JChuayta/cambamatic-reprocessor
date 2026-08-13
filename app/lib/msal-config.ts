import type { Configuration } from "@azure/msal-browser";

const TENANT_ID = process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? "";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? "",
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: typeof window !== "undefined" ? window.location.origin : undefined,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

export const LOGIN_SCOPES = ["User.Read"];
export const APPINSIGHTS_SCOPE = "https://api.applicationinsights.io/.default";
