import { createServer } from "vite";
import { createServer as httpServer } from "node:http";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
if (existsSync(".env")) loadEnvFile(".env");
if (!process.env.DATABASE_URL) process.env.LOCAL_DEMO = "true";
const { handleRequest } = await import("../server/api.mjs");
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "spa",
});
const server = httpServer(async (req, res) => {
  if (!req.url.startsWith("/api/")) return vite.middlewares(req, res);
  try {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 10000) {
        res.writeHead(413);
        res.end('{"error":"Request is too large."}');
        return;
      }
      chunks.push(chunk);
    }
    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers: req.headers,
      ...(req.method !== "GET" &&
        req.method !== "HEAD" && { body: Buffer.concat(chunks) }),
    });
    const response = await handleRequest(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  } catch {
    res.writeHead(500);
    res.end('{"error":"Request failed."}');
  }
});
server.listen(5173, "127.0.0.1", () =>
  console.log(
    `Local: http://127.0.0.1:5173/ ${process.env.LOCAL_DEMO ? "(local demo)" : ""}`,
  ),
);
