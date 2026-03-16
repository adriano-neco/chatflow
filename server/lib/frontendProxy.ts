import { createProxyMiddleware, type RequestHandler } from "http-proxy-middleware";

const VITE_PORT = 5000;

export const viteProxyMiddleware: RequestHandler = createProxyMiddleware({
  target: `http://localhost:${VITE_PORT}`,
  changeOrigin: true,
  ws: false,
  on: {
    error: (_err, _req, res) => {
      if (res && "writeHead" in res) {
        (res as any).writeHead(502);
        (res as any).end("Frontend not ready yet");
      }
    },
  },
});

export const viteProxyUpgrade = createProxyMiddleware({
  target: `http://localhost:${VITE_PORT}`,
  changeOrigin: true,
  ws: true,
});
