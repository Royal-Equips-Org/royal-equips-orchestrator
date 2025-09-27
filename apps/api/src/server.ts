import Fastify from "fastify";
import staticPlugin from "@fastify/static";
import path from "node:path";
import api from "./v1/index.js";

const app = Fastify({ logger: true });

// API routes
app.register(api, { prefix: "/v1" });

// Serve built UI from ../web/dist (dev) or ./dist-web (production)
const webRoot = process.env.NODE_ENV === 'production' 
  ? path.join(process.cwd(), "./dist-web")
  : path.join(process.cwd(), "../web/dist");
app.register(staticPlugin, { root: webRoot, prefix: "/" });

// SPA fallback for HTML requests
app.setNotFoundHandler((req, reply) => {
  const wantsHtml = req.method === "GET" && (req.headers.accept || "").includes("text/html");
  if (wantsHtml) return reply.sendFile("index.html");
  reply.code(404).send({ error: "not_found" });
});

// Version endpoint
app.get("/version", (_req, r) => r.send({ release: process.env.RELEASE || "dev" }));

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT || 10000);
    const host = process.env.HOST || "0.0.0.0";
    
    await app.listen({ host, port });
    app.log.info(`🚀 Royal Equips API Server running on http://${host}:${port}`);
    app.log.info(`📖 Serving UI from ${webRoot}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();