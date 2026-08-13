import type { SigningRequest, SigningDocument, Signatory } from "../types/signing-request";

function unwrapValues<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val && typeof val === "object" && "$values" in (val as object))
    return (val as { $values: T[] }).$values;
  return [];
}

export function parseJson(raw: string): SigningRequest {
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("El JSON no tiene el formato esperado.");
  }

  // Handles wrapped format: { Input: { ... } }
  const input =
    "Input" in parsed && typeof parsed.Input === "object" && parsed.Input !== null
      ? parsed.Input
      : parsed;

  const docs = unwrapValues<Record<string, unknown>>(input.Documents);
  if (docs.length === 0) throw new Error("El JSON no contiene documentos.");

  const documents: SigningDocument[] = docs.map((doc) => {
    const singSettingRaw =
      doc.SingSetting && typeof doc.SingSetting === "object" ? doc.SingSetting : {};
    return {
      DocumentId: doc.DocumentId as string,
      DocumentType: doc.DocumentType as number,
      TopicName: (doc.TopicName as string) ?? "",
      SingSetting: {
        Signatories: unwrapValues<Signatory>(
          (singSettingRaw as Record<string, unknown>).Signatories
        ),
      },
    };
  });

  return {
    FlowType: input.FlowType as number,
    DocumentDirectoryId: input.DocumentDirectoryId as string,
    Channel: input.Channel as number,
    DocumentOwnerComplete: input.DocumentOwnerComplete as boolean,
    NotificationSignedDocument: (input.NotificationSignedDocument as string | null) ?? null,
    Documents: documents,
  };
}
