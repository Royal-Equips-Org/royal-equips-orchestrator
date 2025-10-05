import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import path from "node:path";
import api from "./v1/index.js";

const app = Fastify({ logger: true });

const start = async () => {
  try {
    // Global rate limiting (cast to any for TypeScript compatibility)
    await app.register(rateLimit as any, {
      max: 100, // requests per window
      timeWindow: '1 minute',
      global: false, // Apply to all routes unless overridden
    });

    // Register health endpoints at root level (before other routes)
    // Import health routes directly to register them at root
    const healthRoutes = await import("./v1/health.js");
    await app.register(healthRoutes.default);

    // API routes under /v1 prefix
    app.register(api, { prefix: "/v1" });

    // Serve built UI from ../command-center-ui/dist (dev) or ./dist-web (production)
    const webRoot = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), "dist-web")
      : path.join(process.cwd(), process.env.WEB_DIST_PATH || "../command-center-ui/dist");

    await app.register(fastifyStatic as any, {
      root: webRoot,
      prefix: "/",
      index: ["index.html"],
      setHeaders(res: any, path: string) {
        if (path.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-store");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    });

    // SPA fallback for HTML requests (but not for API endpoints)
    app.setNotFoundHandler(async (req, reply) => {
      const accept = req.headers.accept || "";
      const path = req.url;
      
      // Don't apply SPA fallback to API routes or health endpoints
      const isApiRoute = path.startsWith('/v1/') || 
                         path.startsWith('/api/') || 
                         path === '/health' || 
                         path === '/healthz' || 
                         path === '/readyz' ||
                         path === '/liveness' ||
                         path === '/readiness' ||
                         path === '/version' ||
                         path === '/metrics';
      
      if (req.method === "GET" && accept.includes("text/html") && !isApiRoute) {
        // Send the index.html file directly (cast for TypeScript compatibility)
        return (reply as any).sendFile("index.html");
      }
      reply.code(404).send({ error: "not_found" });
    });

    // Version endpoint with basic rate limiting
    app.get("/version", {
      config: {
        rateLimit: {
          max: 50,
          timeWindow: '1 minute'
        }
      }
    }, (_req, r) => r.send({ release: process.env.RELEASE || "dev" }));

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