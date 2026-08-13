import { type NextRequest } from "next/server";
import { httpsPost } from "../../../lib/https-proxy";
import { BUSINESS_API_BASE_URL } from "../../../lib/constants";

const UPSTREAM = `${BUSINESS_API_BASE_URL}/Bsol/BusinessApiSignature/v1/Reprocess/Documents`;

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/reprocess/[documentId]">
) {
  const { documentId } = await ctx.params;
  const body = await req.text();
  const upstream = await httpsPost(`${UPSTREAM}/${documentId}/execute`, body);
  return new Response(upstream.text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.contentType },
  });
}
