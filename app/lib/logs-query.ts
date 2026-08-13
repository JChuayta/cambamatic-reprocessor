const GUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;

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

export function buildSignatureSentQuery(guids: string[]): string {
  const guidList = guids.map((g) => `"${g}"`).join(", ");
  const cases = guids.map((g, i) => `TextoLog has "${g}", ${i + 1}`).join(",\n    ");

  return `union isfuzzy=true
    availabilityResults, requests, exceptions, pageViews, traces, customEvents, dependencies
| where timestamp >= ago(24h)
| extend TextoLog = strcat(
    columnifexists("messageTemplate", ""), " ",
    tostring(customDimensions["MessageTemplate"]), " ",
    columnifexists("message", ""))
| where TextoLog has "signature sended"
| where TextoLog has_any (dynamic([${guidList}]))
| extend Orden = case(
    ${cases},
    99)
| order by Orden asc, timestamp desc
| take 100`;
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

interface AppInsightsQueryResult {
  tables?: {
    name: string;
    columns: { name: string; type: string }[];
    rows: unknown[][];
  }[];
}

export function rowsToRecords(result: AppInsightsQueryResult): Record<string, unknown>[] {
  const table = result.tables?.[0];
  if (!table) return [];
  return table.rows.map((row) => {
    const record: Record<string, unknown> = {};
    table.columns.forEach((col, i) => {
      record[col.name] = row[i];
    });
    return record;
  });
}
