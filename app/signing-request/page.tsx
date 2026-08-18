"use client";

import { useMsal } from "@azure/msal-react";
import { useState } from "react";
import { CheckIcon, ChevronDownIcon, SpinnerIcon, XIcon } from "../components/icons";
import { RequestCard } from "../components/request-card";
import { useSigningRequests } from "../context/signing-requests";
import { buildSignatureSentQuery, extractGuidsWithIndex, extractJsonPayload, rowsToRecords } from "../lib/logs-query";
import { APPINSIGHTS_SCOPE } from "../lib/msal-config";
import { parseJson } from "../lib/parse-json";

const TOKEN_STORAGE_KEY = "diagnostico_token";

const AZURE_LOGS_URL = process.env.NEXT_PUBLIC_AZURE_LOGS_URL ?? "";

interface LogResult {
  guid: string;
  index?: number;
  searchIndex?: number;
  found: boolean;
  record?: Record<string, unknown>;
  payload: string | null;
  loaded?: boolean;
  loadError?: string;
}

export default function SigningRequestPage() {
  const { requests, addRequest, removeRequest, clearAll } = useSigningRequests();
  const { instance, accounts } = useMsal();

  const [logsRaw, setLogsRaw] = useState("");
  const [token, setToken] = useState(() =>
    typeof window === "undefined" ? "" : (sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? "")
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<LogResult[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [resultsExpanded, setResultsExpanded] = useState(false);

  function handleTokenChange(value: string) {
    setToken(value);
    sessionStorage.setItem(TOKEN_STORAGE_KEY, value);
  }

  async function resolveAccessToken(): Promise<string> {
    const pasted = token.trim();
    if (pasted) return pasted.replace(/^Bearer\s+/i, "");

    if (!accounts[0]) {
      throw new Error(
        "No hay sesión MSAL activa y no pegaste un token manual. Pega un Bearer token para continuar."
      );
    }

    const tokenResponse = await instance.acquireTokenSilent({
      scopes: [APPINSIGHTS_SCOPE],
      account: accounts[0],
    });
    return tokenResponse.accessToken;
  }

  async function handleSearch() {
    const guidsWithIndex = extractGuidsWithIndex(logsRaw);
    if (guidsWithIndex.length === 0) {
      setSearchError("No se encontraron GUIDs válidos en el texto pegado.");
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setResults(null);
    setResultsExpanded(false);

    try {
      const accessToken = await resolveAccessToken();

      const guids = guidsWithIndex.map(g => g.guid);
      const query = buildSignatureSentQuery(guids);
      const res = await fetch("/api/logs/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query }),
      });

      const text = await res.text();
      if (!res.ok) {
        setSearchError(text || `Error ${res.status}`);
        return;
      }

      const parsed = JSON.parse(text);
      const records = rowsToRecords(parsed);

      setResults(
        guidsWithIndex.map((item) => {
          const record = records.find((r) => String(r.TextoLog ?? "").toLowerCase().includes(item.guid));
          const payload = record ? extractJsonPayload(String(record.message ?? record.TextoLog ?? "")) : null;
          return { guid: item.guid, index: item.index, found: Boolean(record), record, payload };
        })
      );
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setSearchLoading(false);
    }
  }

  function handleLoadAllToList() {
    if (!results) return;

    let addedCount = 0;
    const updated = results.map((r) => {
      if (r.loaded || !r.found || !r.payload) return r;
      try {
        const parsedRequest = parseJson(r.payload);
        addRequest({ ...parsedRequest, searchIndex: r.index }, r.payload);
        addedCount++;
        return { ...r, loaded: true, loadError: undefined };
      } catch (e) {
        return { ...r, loadError: e instanceof Error ? e.message : "JSON inválido." };
      }
    });

    setResults(updated);
    setSearchError(addedCount === 0 ? "No se pudo agregar ningún resultado a la lista." : null);
  }

  const loadableCount = results?.filter((r) => r.found && r.payload && !r.loaded).length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de firma</h1>
          {AZURE_LOGS_URL && (
            <a
              href={AZURE_LOGS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Abrir logs en Azure Portal y obtener Token ↗
            </a>
          )}
        </div>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Buscar en logs (Application Insights)
          </h2>
          <textarea
            value={logsRaw}
            onChange={(e) => setLogsRaw(e.target.value)}
            placeholder={"1\t11111111-1111-1111-1111-111111111111\n2\t22222222-2222-2222-2222-222222222222\n…"}
            rows={4}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 font-mono text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <input
            type="password"
            value={token}
            onChange={(e) => handleTokenChange(e.target.value)}
            placeholder="Bearer token (modo manual, mientras no hay login) — se guarda solo en esta pestaña"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 font-mono text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchError && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {searchError}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSearch}
              disabled={searchLoading || !logsRaw.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {searchLoading && <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />}
              {searchLoading ? "Buscando…" : "Buscar en logs (últimas 24h)"}
            </button>
            {results && (
              <button
                type="button"
                onClick={handleLoadAllToList}
                disabled={loadableCount === 0}
                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Cargar a la lista (#{results?.filter((r) => r.found && r.payload && !r.loaded).map((r) => r.index).filter(Boolean).join(", ") || "-"}) {loadableCount > 0 ? `[${loadableCount}]` : ""}
              </button>
            )}
          </div>

          {results && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setResultsExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-left hover:bg-gray-100 transition-colors"
              >
                <span className="text-xs font-medium text-gray-600">
                  Resultados: {results.filter((r) => r.found).length}/{results.length} encontrados
                  {results.some((r) => !r.found) && (
                    <span className="text-red-600 font-semibold">
                      {" · Falta el #"}{
                        results
                          .filter((r) => !r.found && r.index)
                          .map((r) => r.index)
                          .join(", ")
                      }
                    </span>
                  )}
                  {results.some((r) => r.loaded) && ` · ${results.filter((r) => r.loaded).length} agregados`}
                </span>
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 text-gray-500 transition-transform ${resultsExpanded ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          )}

          {results && resultsExpanded && (
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.guid} className={`rounded-xl border overflow-hidden ${
                  !r.found ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"
                }`}>
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-3">
                      {r.index && (
                        <span className={`font-bold text-sm ${
                          !r.found ? "text-red-700 bg-red-100" : "text-blue-700 bg-blue-100"
                        } px-2 py-1 rounded`}>
                          #{r.index}
                        </span>
                      )}
                      <span className="font-mono text-xs text-gray-700 truncate">{r.guid}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.found ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.found ? <CheckIcon className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
                        {r.found ? "Enviado" : "No encontrado"}
                      </span>
                      {r.loaded && (
                        <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          <CheckIcon className="h-3.5 w-3.5" />
                          Agregado
                        </span>
                      )}
                      {r.found && (
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => ({ ...prev, [r.guid]: !prev[r.guid] }))}
                          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {r.payload ? "Ver JSON" : "Ver registro"}
                          <ChevronDownIcon
                            className={`h-3 w-3 transition-transform ${expanded[r.guid] ? "rotate-180" : ""}`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                  {r.loadError && (
                    <p className="px-4 pb-3 text-xs text-red-600">Error al agregar: {r.loadError}</p>
                  )}
                  {r.found && expanded[r.guid] && (
                    <pre className="px-4 pb-4 text-xs text-gray-800 whitespace-pre-wrap break-all font-mono bg-gray-50 border-t border-gray-100 max-h-96 overflow-y-auto">
                      {r.payload
                        ? (() => {
                            try {
                              return JSON.stringify(JSON.parse(r.payload), null, 2);
                            } catch {
                              return r.payload;
                            }
                          })()
                        : JSON.stringify(r.record, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {requests.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Lista de solicitudes ({requests.length})
              </h2>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
              >
                Limpiar todo
              </button>
            </div>
            {requests.map((req, i) => (
              <RequestCard key={i} request={req} index={i} onRemove={() => removeRequest(i)} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
