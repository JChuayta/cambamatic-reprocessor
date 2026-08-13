import https from "node:https";

// The upstream API uses a self-signed certificate; rejectUnauthorized: false is scoped to this helper.
export function httpsPost(
  url: string,
  body: string
): Promise<{ status: number; text: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 500,
            text: Buffer.concat(chunks).toString("utf-8"),
            contentType: (res.headers["content-type"] as string) ?? "application/json",
          });
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
