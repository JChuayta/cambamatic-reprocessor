const GUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const LINE_RE = /(\d+)?[\s\t]?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/gi;

export interface GuidWithIndex {
  guid: string;
  index?: number;
}

export function extractGuids(raw: string): string[] {
  const matches = raw.match(GUID_RE) ?? [];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      ordered.push(lower);
    }
  }
  return ordered;
}

export function extractGuidsWithIndex(raw: string): GuidWithIndex[] {
  const seen = new Set<string>();
  const ordered: GuidWithIndex[] = [];
  let match;
  
  while ((match = LINE_RE.exec(raw)) !== null) {
    const index = match[1] ? parseInt(match[1], 10) : undefined;
    const guid = match[2].toLowerCase();
    
    if (!seen.has(guid)) {
      seen.add(guid);
      ordered.push({ guid, index });
    }
  }
  
  return ordered;
}

export function isGuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

// DQL para Dynatrace (Grail). Los GUIDs deben venir ya validados con isGuid.
export function buildSignatureSentQuery(guids: string[]): string {
  const guidFilter = guids.map((g) => `contains(content, "${g}", caseSensitive: false)`).join(" or ");

  return `fetch logs, from: now() - 24h
| filter contains(content, "signature sended", caseSensitive: false)
| filter ${guidFilter}
| sort timestamp desc
| limit 1000
| fields timestamp, content`;
}

export function extractJsonPayload(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

