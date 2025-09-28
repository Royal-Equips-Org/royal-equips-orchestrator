import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import api from "./v1/index.js";

const app = Fastify({ logger: true });

// API routes
app.register(api, { prefix: "/v1" });

// Serve built UI from ../command-center-ui/dist (dev) or ./dist-web (production)
const webRoot = process.env.NODE_ENV === 'production' 
  ? path.join(process.cwd(), "dist-web")
  : path.join(process.cwd(), process.env.WEB_DIST_PATH || "../command-center-ui/dist");

app.register(fastifyStatic, {
  root: webRoot,
  prefix: "/",
  index: ["index.html"],
  setHeaders(res, path) {
    if (path.endsWith("index.html")) {
      res.setHeader("Cache-Control", "no-store");
    } else {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  }
});

// SPA fallback for HTML requests
app.setNotFoundHandler((req, reply) => {
  const accept = req.headers.accept || "";
  if (req.method === "GET" && accept.includes("text/html")) {
    return reply.sendFile("index.html");
  }
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