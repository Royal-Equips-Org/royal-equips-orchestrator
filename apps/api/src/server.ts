import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import v1Routes from "./v1/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Security and CORS middleware
await app.register(helmet, {
  contentSecurityPolicy: false // Allow for development
});

await app.register(cors, {
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173', 
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ],
  credentials: true
});

// Rate limiting middleware
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// API routes
app.register(v1Routes, { prefix: "/v1" });

// Serve built UI from ../web/dist (or ../command-center-ui/dist)
const publicDir = path.join(__dirname, "../../web/dist");
app.register(fastifyStatic, { root: publicDir, prefix: "/" });

// SPA fallback
app.setNotFoundHandler((req, reply) => {
  if (req.raw.method === "GET" && req.raw.headers.accept?.includes("text/html")) {
    return reply.sendFile("index.html");
  }
  reply.code(404).send({ error: "not_found" });
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT || 10000);
    const host = process.env.HOST || "0.0.0.0";
    
    await app.listen({ host, port });
    app.log.info(`🚀 Royal Equips API Server running on http://${host}:${port}`);
    app.log.info(`📖 Serving UI from ${publicDir}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();