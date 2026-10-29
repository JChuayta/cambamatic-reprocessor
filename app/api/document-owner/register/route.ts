import { type NextRequest } from "next/server";
import { httpsPost } from "../../../lib/https-proxy";
import { serverEnv } from "../../../lib/env.server";

const UPSTREAM = `${serverEnv.businessApiBaseUrl}/Bsol/BusinessApiSignature/v1/documentOwner/register`;

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await httpsPost(UPSTREAM, body);
  return new Response(upstream.text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.contentType },
  });
}
