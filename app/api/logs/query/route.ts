import { type NextRequest } from "next/server";
import { serverEnv } from "../../../lib/env.server";
import { buildSignatureSentQuery, isGuid } from "../../../lib/logs-query";

const { url: DYNATRACE_URL, token: DYNATRACE_TOKEN } = serverEnv.dynatrace;
const QUERY_BASE = `${DYNATRACE_URL}/platform/storage/query/v1`;

const POLL_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;
const MAX_GUIDS = 200;

interface DqlResponse {
  state?: string;
  requestToken?: string;
  result?: { records?: Record<string, unknown>[] };
  error?: { message?: string };
}

async function dynatraceFetch(url: string, init?: RequestInit): Promise<{ status: number; data: DqlResponse }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DYNATRACE_TOKEN}`,
    },
  });
  const text = await res.text();
  let data: DqlResponse = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: { message: text } };
  }
  return { status: res.status, data };
}

// query:execute es asíncrono: puede responder con el resultado o con un requestToken para consultar con query:poll.
async function runQuery(query: string): Promise<{ status: number; data: DqlResponse }> {
  let response = await dynatraceFetch(`${QUERY_BASE}/query:execute`, {
    method: "POST",
    body: JSON.stringify({ query, requestTimeoutMilliseconds: 10_000, maxResultRecords: 1000 }),
  });

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (response.data.state === "RUNNING" && response.data.requestToken && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const token = encodeURIComponent(response.data.requestToken);
    response = await dynatraceFetch(`${QUERY_BASE}/query:poll?request-token=${token}&request-timeout-milliseconds=10000`);
  }
  return response;
}

export async function POST(req: NextRequest) {
  if (!DYNATRACE_URL || !DYNATRACE_TOKEN) {
    return Response.json(
      { error: "Falta configurar DYNATRACE_URL y DYNATRACE_TOKEN en el servidor." },
      { status: 500 }
    );
  }

  let guids: unknown;
  try {
    ({ guids } = await req.json());
  } catch {
    return Response.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  if (!Array.isArray(guids) || guids.length === 0 || guids.length > MAX_GUIDS || !guids.every(isGuid)) {
    return Response.json({ error: "Se esperaba una lista de GUIDs válidos." }, { status: 400 });
  }

  try {
    const { status, data } = await runQuery(buildSignatureSentQuery(guids));

    if (status >= 400 || data.state === "FAILED") {
      return Response.json(
        { error: data.error?.message ?? `Dynatrace respondió ${status}.` },
        { status: status >= 400 ? status : 502 }
      );
    }
    if (data.state === "RUNNING") {
      return Response.json({ error: "La consulta a Dynatrace excedió el tiempo de espera." }, { status: 504 });
    }

    return Response.json({ records: data.result?.records ?? [] });
  } catch (error) {
    return Response.json(
      {
        error: "No se pudo comunicar con Dynatrace.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
