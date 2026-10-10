"use client";

import { useState } from "react";
import { useSigningRequests } from "../context/signing-requests";
import type { SigningRequest } from "../types/signing-request";
import { parseJson } from "../lib/parse-json";
import { hasPhantomCosigner, isMissingInterview } from "../lib/signatories";
import { CopyButton } from "./copy-button";
import { DocumentsTable } from "./documents-table";
import { CheckIcon, ChevronDownIcon, PenIcon, RefreshIcon, SpinnerIcon, XIcon } from "./icons";

type SignStatus = "idle" | "loading" | "success" | "error";

const SIGN_BUTTON_CLASS: Record<SignStatus, string> = {
  idle: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50",
  loading: "bg-indigo-600 text-white disabled:opacity-50",
  success: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700 hover:bg-red-200",
};

const SIGN_LABEL: Record<SignStatus, string> = {
  idle: "Firmar",
  loading: "Firmando…",
  success: "Firmado",
  error: "Reintentar",
};

type OwnerRep = 2 | 3;

const OWNER_LABELS: Record<OwnerRep, string> = {
  2: "Owner Titular",
  3: "Owner Codeudor",
};

const OWNER_BUTTON_CLASS: Record<SignStatus, string> = {
  idle: "bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50",
  loading: "bg-teal-600 text-white disabled:opacity-50",
  success: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700 hover:bg-red-200",
};

export function RequestCard({
  request,
  index,
  onRemove,
}: {
  request: SigningRequest;
  index: number;
  onRemove: () => void;
}) {
  const { expandedMap, setExpanded: setGlobalExpanded, removeCosigner, updateRequest } = useSigningRequests();
  const phantomCosigner = hasPhantomCosigner(request);
  const expanded = expandedMap[request.DocumentDirectoryId] ?? false;
  const setExpanded = (val: boolean) => setGlobalExpanded(request.DocumentDirectoryId, val);
  const displayIndex = request.searchIndex ?? (index + 1);

  const [editing, setEditing] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  function openEditor() {
    setJsonDraft(JSON.stringify(request, null, 2));
    setJsonError(null);
    setEditing(true);
  }

  function saveJson() {
    try {
      updateRequest(index, parseJson(jsonDraft));
      setSignStatus("idle");
      setSignError(null);
      setOwnerStatus({ 2: "idle", 3: "idle" });
      setOwnerError({ 2: null, 3: null });
      setEditing(false);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "JSON inválido.");
    }
  }

  const [signStatus, setSignStatus] = useState<SignStatus>("idle");
  const [signError, setSignError] = useState<string | null>(null);

  const [ownerStatus, setOwnerStatus] = useState<Record<OwnerRep, SignStatus>>({ 2: "idle", 3: "idle" });
  const [ownerError, setOwnerError] = useState<Record<OwnerRep, string | null>>({ 2: null, 3: null });

  async function handleSign() {
    setSignStatus("loading");
    setSignError(null);
    try {
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (res.ok) {
        setSignStatus("success");
      } else {
        setSignStatus("error");
        setSignError((await res.text()) || `Error ${res.status}`);
      }
    } catch (err) {
      setSignStatus("error");
      setSignError(err instanceof Error ? err.message : "Error de red");
    }
  }

  const allSignatories = request.Documents.flatMap((d) => d.SingSetting.Signatories);
  const ownerSignatories: Record<OwnerRep, (typeof allSignatories)[number] | undefined> = {
    2: allSignatories.find((s) => s.SigningRepresentative === 2),
    3: allSignatories.find((s) => s.SigningRepresentative === 3),
  };

  async function handleOwnerRegister(rep: OwnerRep) {
    const sig = ownerSignatories[rep];
    if (!sig) return;

    setOwnerStatus((prev) => ({ ...prev, [rep]: "loading" }));
    setOwnerError((prev) => ({ ...prev, [rep]: null }));
    try {
      const res = await fetch("/api/document-owner/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          InterviewId: sig.InterviewId,
          DirectoryId: request.DocumentDirectoryId,
          ClientGuid: sig.ClientGuid,
          FlowType: 0,
        }),
      });
      if (res.ok) {
        setOwnerStatus((prev) => ({ ...prev, [rep]: "success" }));
      } else {
        const text = (await res.text()) || `Error ${res.status}`;
        setOwnerStatus((prev) => ({ ...prev, [rep]: "error" }));
        setOwnerError((prev) => ({ ...prev, [rep]: text }));
      }
    } catch (err) {
      setOwnerStatus((prev) => ({ ...prev, [rep]: "error" }));
      setOwnerError((prev) => ({ ...prev, [rep]: err instanceof Error ? err.message : "Error de red" }));
    }
  }

  const titularId = ownerSignatories[2]?.ClientGuid ?? "—";

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-4 flex-1 text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
            {displayIndex}
          </span>
          <div>
            <p className="font-mono text-xs text-gray-500 mb-0.5">Dir: {request.DocumentDirectoryId}</p>
            <p className="text-sm font-semibold text-gray-800">
              Canal {request.Channel} — Flujo {request.FlowType}
              <span className="ml-3 text-xs font-normal text-gray-500">
                {request.Documents.length} {request.Documents.length === 1 ? "documento" : "documentos"}
              </span>
            </p>
            {phantomCosigner && (
              <p className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Codeudor sin InterviewId (posible falso codeudor)
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2 ml-4">
          {([2, 3] as const).map((rep) => {
            const sig = ownerSignatories[rep];
            const status = ownerStatus[rep];
            const noInterview = !!sig && isMissingInterview(sig);
            const unavailable = !sig || noInterview;
            return (
              <button
                key={rep}
                type="button"
                onClick={() => handleOwnerRegister(rep)}
                disabled={unavailable || status === "loading"}
                title={
                  !sig
                    ? `Sin firmante (${OWNER_LABELS[rep]})`
                    : noInterview
                    ? "Sin InterviewId: no se puede reprocesar"
                    : `Reprocesar ${OWNER_LABELS[rep]}`
                }
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                  unavailable ? "bg-gray-200 text-gray-400" : OWNER_BUTTON_CLASS[status]
                }`}
              >
                {status === "loading" ? (
                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                ) : status === "success" ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : status === "error" ? (
                  <XIcon className="h-3.5 w-3.5" />
                ) : (
                  <RefreshIcon className="h-3.5 w-3.5" />
                )}
                {OWNER_LABELS[rep]}
              </button>
            );
          })}
          {phantomCosigner && (
            <button
              type="button"
              onClick={() => removeCosigner(index)}
              title="Quita del JSON los codeudores sin InterviewId antes de firmar"
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
            >
              <XIcon className="h-3.5 w-3.5" />
              Quitar codeudor
            </button>
          )}
          <button
            type="button"
            onClick={() => (editing ? setEditing(false) : openEditor())}
            title="Ver y editar el JSON de la solicitud"
            className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-300"
          >
            {"{ } JSON"}
          </button>
          <button
            type="button"
            onClick={handleSign}
            disabled={signStatus === "loading"}
            title="Firmar préstamo"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${SIGN_BUTTON_CLASS[signStatus]}`}
          >
            {signStatus === "loading" ? <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> :
             signStatus === "success" ? <CheckIcon className="h-3.5 w-3.5" /> :
             signStatus === "error" ? <XIcon className="h-3.5 w-3.5" /> :
             <PenIcon className="h-3.5 w-3.5" />}
            {SIGN_LABEL[signStatus]}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors"
            title={expanded ? "Colapsar" : "Expandir"}
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
            title="Eliminar solicitud"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="space-y-2 border-b border-gray-200 bg-gray-50 px-5 py-4">
          <textarea
            value={jsonDraft}
            onChange={(e) => setJsonDraft(e.target.value)}
            spellCheck={false}
            rows={18}
            className="w-full rounded-lg border border-gray-300 bg-white p-3 font-mono text-xs text-gray-800 focus:border-blue-500 focus:outline-none"
          />
          {jsonError && <p className="text-xs text-red-700">{jsonError}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveJson}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
            >
              Cancelar
            </button>
            <CopyButton text={jsonDraft} />
          </div>
        </div>
      )}

      {signStatus === "error" && signError && (
        <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700 font-mono">
          {signError}
        </div>
      )}

      {([2, 3] as const).map(
        (rep) =>
          ownerStatus[rep] === "error" &&
          ownerError[rep] && (
            <div key={rep} className="px-5 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700 font-mono">
              {OWNER_LABELS[rep]}: {ownerError[rep]}
            </div>
          )
      )}

      {expanded && (
        <div className="px-5 py-4 space-y-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-400">Id titular</dt>
              <dd className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-gray-600 truncate">{titularId}</span>
                <CopyButton text={titularId} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Dir. documentos</dt>
              <dd className="font-mono text-xs text-gray-600 truncate">{request.DocumentDirectoryId}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Owner completo</dt>
              <dd>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${request.DocumentOwnerComplete ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {request.DocumentOwnerComplete ? "Sí" : "No"}
                </span>
              </dd>
            </div>
          </dl>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Documentos ({request.Documents.length})
            </p>
            <DocumentsTable docs={request.Documents} directoryId={request.DocumentDirectoryId} />
          </div>
        </div>
      )}
    </div>
  );
}
