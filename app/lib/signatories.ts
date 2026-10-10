import type { Signatory, SigningRequest } from "../types/signing-request";

const COSIGNER = 3;

export function isMissingInterview(sig: Signatory): boolean {
  return !sig.InterviewId?.trim();
}

// El servicio que genera el log a veces agrega un codeudor sin InterviewId aunque no exista.
export function isPhantomCosigner(sig: Signatory): boolean {
  return sig.SigningRepresentative === COSIGNER && isMissingInterview(sig);
}

export function hasPhantomCosigner(req: SigningRequest): boolean {
  return req.Documents.some((d) => d.SingSetting.Signatories.some(isPhantomCosigner));
}

export function removePhantomCosigners(req: SigningRequest): SigningRequest {
  return {
    ...req,
    Documents: req.Documents.map((d) => ({
      ...d,
      SingSetting: {
        ...d.SingSetting,
        Signatories: d.SingSetting.Signatories.filter((s) => !isPhantomCosigner(s)),
      },
    })),
  };
}
