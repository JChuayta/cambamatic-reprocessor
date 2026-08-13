import { type NextRequest } from "next/server";

const APPINSIGHTS_APP_ID = process.env.NEXT_PUBLIC_APPINSIGHTS_APP_ID ?? "";
const UPSTREAM = `https://api.applicationinsights.io/v1/apps/${APPINSIGHTS_APP_ID}/query`;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return Response.json({ error: "Falta el header Authorization." }, { status: 401 });
  }

  const body = await req.text();

  try {
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    return Response.json(
      {
        error: "No se pudo comunicar con Application Insights.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
