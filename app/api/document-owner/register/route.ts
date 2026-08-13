import { type NextRequest } from "next/server";
import { httpsPost } from "../../../lib/https-proxy";
import { BUSINESS_API_BASE_URL } from "../../../lib/constants";

const UPSTREAM = `${BUSINESS_API_BASE_URL}/Bsol/BusinessApiSignature/v1/documentOwner/register`;

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await httpsPost(UPSTREAM, body);
  return new Response(upstream.text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.contentType },
  });
}
