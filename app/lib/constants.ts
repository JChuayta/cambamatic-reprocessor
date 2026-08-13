export const DOCUMENT_NAMES: Record<string, string> = {
  "3": "POLIZA DE SEGURO LBC",
  "4": "ACUERDO DE CONDICIONES DE CREDITO",
  "5": "TABLA DE AMORTIZACION",
  "6": "RESOLUCION DE CREDITO",
  "10": "CONTRATO Individual",
  "12": "CONTRATO sector productivo",
  "14": "AUTORIZACION DE CANCELACION",
  "16": "FORMULARIO DE SOLICITUD DIGICERT",
};

export const PARTICIPANT_LABELS: Record<number, string> = {
  0: "Firma Representante",
  2: "Firma Titular",
  3: "Firma Codeudor",
  4: "Firma Corporativo",
};

export const API_BASE = "/api/reprocess";

// Server-only: base URL of the upstream signature/business API. Never prefix with
// NEXT_PUBLIC_, this must stay out of the client bundle. Set in .env.local.
export const BUSINESS_API_BASE_URL = process.env.BUSINESS_API_BASE_URL ?? "";
