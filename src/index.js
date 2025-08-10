export default {
  async fetch(request, env) {
    const originHeader = request.headers.get("Origin") || "*";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(originHeader, request.headers.get("Access-Control-Request-Headers"))
      });
    }

    const incomingUrl = new URL(request.url);
    const base = env.PYTHON_API_URL;
    if (!base) {
      return json(
        { error: "PYTHON_API_URL is not configured" },
        500,
        originHeader
      );
    }

    const backendBase = new URL(base);
    // Preserve path and query; append to backend
    const backendUrl = new URL(
      `${backendBase.origin}${backendBase.pathname.replace(/\/$/, "")}${incomingUrl.pathname}${incomingUrl.search}`
    );

    // Prepare upstream request
    const init = {
      method: request.method,
      headers: new Headers(request.headers),
      redirect: "follow"
    };

    if (!["GET", "HEAD"].includes(request.method)) {
      const body = await request.arrayBuffer();
      init.body = body;
    }

    // Avoid forwarding encodings that can cause issues
    init.headers.delete("accept-encoding");

    try {
      const upstream = await fetch(backendUrl.toString(), init);
      const respHeaders = new Headers(upstream.headers);
      applyCors(respHeaders, originHeader, request.headers.get("Access-Control-Request-Headers"));

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: respHeaders
      });
    } catch (err) {
      return json(
        { error: "Upstream request failed", details: String(err) },
        502,
        originHeader
      );
    }
  }
};

function buildCorsHeaders(origin, requestHeaders) {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", origin);
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers", requestHeaders || "*");
  return h;
}

function applyCors(headers, origin, requestHeaders) {
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", requestHeaders || "*");
}

function json(data, status = 200, origin = "*") {
  const headers = buildCorsHeaders(origin, "*");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { status, headers });
}
