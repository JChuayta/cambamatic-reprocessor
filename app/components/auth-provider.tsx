"use client";

import { useEffect, useState } from "react";
import {
  BrowserAuthError,
  EventType,
  InteractionStatus,
  PublicClientApplication,
  type AuthenticationResult,
  type IPublicClientApplication,
} from "@azure/msal-browser";
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from "@azure/msal-react";
import { msalConfig, LOGIN_SCOPES } from "../lib/msal-config";

function clearStuckInteractionFlag() {
  Object.keys(sessionStorage)
    .filter((key) => key.includes("interaction.status"))
    .forEach((key) => sessionStorage.removeItem(key));
}

function LoginScreen() {
  const { instance, inProgress } = useMsal();
  const [error, setError] = useState<string | null>(null);
  const busy = inProgress !== InteractionStatus.None;

  async function handleLogin() {
    setError(null);
    try {
      await instance.loginRedirect({ scopes: LOGIN_SCOPES });
    } catch (err) {
      if (err instanceof BrowserAuthError && err.errorCode === "interaction_in_progress") {
        clearStuckInteractionFlag();
        setError("Quedó un inicio de sesión anterior sin completar, ya se limpió. Haz clic de nuevo.");
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900">BSOL Firmador</h1>
        <p className="text-sm text-gray-500">Inicia sesión con tu cuenta de Microsoft para continuar.</p>
        <button
          type="button"
          onClick={handleLogin}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? "Redirigiendo…" : "Iniciar sesión con Microsoft"}
        </button>
        {error && (
          <p className="max-w-sm text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<IPublicClientApplication | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const missingClientId = !msalConfig.auth.clientId;

  useEffect(() => {
    if (missingClientId) return;

    const pca = new PublicClientApplication(msalConfig);
    pca
      .initialize()
      .then(async () => {
        await pca.handleRedirectPromise();

        const accounts = pca.getAllAccounts();
        if (accounts.length > 0) pca.setActiveAccount(accounts[0]);

        pca.addEventCallback((event) => {
          if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
            const account = (event.payload as AuthenticationResult).account;
            if (account) pca.setActiveAccount(account);
          }
        });

        setInstance(pca);
      })
      .catch((err) => setInitError(err instanceof Error ? err.message : String(err)));
  }, [missingClientId]);

  if (missingClientId || initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <p className="max-w-md text-center text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {missingClientId
            ? "Falta configurar NEXT_PUBLIC_AZURE_CLIENT_ID en .env.local (App Registration de Azure Entra ID)."
            : initError}
        </p>
      </div>
    );
  }

  if (!instance) return null;

  if (AUTH_DISABLED) {
    return <MsalProvider instance={instance}>{children}</MsalProvider>;
  }

  return (
    <MsalProvider instance={instance}>
      <AuthenticatedTemplate>{children}</AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <LoginScreen />
      </UnauthenticatedTemplate>
    </MsalProvider>
  );
}
