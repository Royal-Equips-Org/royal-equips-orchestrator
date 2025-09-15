/**
 * Minimal Supabase Client Connection
 * Strategic Use: Baseline client for all edge modules; env-driven multi-project routing
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default {
  async fetch(request, env, _ctx) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const url = new URL(request.url);

    try {
      const supabase = createSupabaseClient(env);

      switch (url.pathname) {
        case "/health":
          return await handleHealth(supabase, env);
        case "/query":
          return await handleQuery(request, supabase, env);
        case "/rpc":
          return await handleRPC(request, supabase, env);
        case "/auth":
          return await handleAuth(request, supabase, env);
        default:
          return json({ error: "Not found", path: url.pathname }, 404);
      }
    } catch (error) {
      console.error("Supabase client error:", error);
      return json({ error: "Supabase operation failed", details: error.message }, 500);
    }
  },
};

function createSupabaseClient(env) {
  let supabaseUrl = env.SUPABASE_URL;
  let supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (env.ENVIRONMENT === "staging") {
    supabaseUrl = env.SUPABASE_STAGING_URL || supabaseUrl;
    supabaseKey = env.SUPABASE_STAGING_KEY || supabaseKey;
  } else if (env.ENVIRONMENT === "development") {
    supabaseUrl = env.SUPABASE_DEV_URL || supabaseUrl;
    supabaseKey = env.SUPABASE_DEV_KEY || supabaseKey;
  }

  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase configuration missing");

  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        "x-royal-equips-client": "edge-function",
        "x-environment": env.ENVIRONMENT || "production",
      },
    },
  });
}

async function handleHealth(supabase, env) {
  try {
    const { data, error } = await supabase.from("health_check").select("*").limit(1);

    const health = {
      status: error ? "unhealthy" : "healthy",
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT || "production",
      supabaseUrl: env.SUPABASE_URL ? "configured" : "missing",
      error: error?.message || null,
      sample: data ?? null,
    };

    return json(health, error ? 503 : 200);
  } catch (error) {
    return json({ status: "error", timestamp: new Date().toISOString(), error: error.message }, 500);
  }
}

async function handleQuery(request, supabase, _env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const { table, operation, data, filters = {}, options = {} } = await request.json();
  if (!table || !operation) return json({ error: "Table and operation required" }, 400);

  try {
    let query = supabase.from(table);

    switch (operation) {
      case "select": {
        query = query.select(options.select || "*");
        Object.entries(filters).forEach(([key, value]) => {
          if (typeof value === "object" && value.operator) query = query.filter(key, value.operator, value.value);
          else query = query.eq(key, value);
        });
        if (options.limit) query = query.limit(options.limit);
        if (options.order) query = query.order(options.order.column, { ascending: options.order.ascending });
        if (options.range) query = query.range(options.range.from, options.range.to);
        break;
      }
      case "insert": {
        query = query.insert(data);
        if (options.select) query = query.select(options.select);
        break;
      }
      case "update": {
        query = query.update(data);
        Object.entries(filters).forEach(([key, value]) => { query = query.eq(key, value); });
        if (options.select) query = query.select(options.select);
        break;
      }
      case "delete": {
        Object.entries(filters).forEach(([key, value]) => { query = query.eq(key, value); });
        break;
      }
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    const result = await query;
    if (result.error) throw new Error(result.error.message);

    return json({
      success: true,
      data: result.data,
      count: result.count,
      status: result.status,
      statusText: result.statusText,
    });
  } catch (error) {
    return json({ error: "Query execution failed", details: error.message, operation, table }, 400);
  }
}

async function handleRPC(request, supabase, _env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const { function_name, params = {} } = await request.json();
  if (!function_name) return json({ error: "Function name required" }, 400);

  try {
    const { data, error } = await supabase.rpc(function_name, params);
    if (error) throw new Error(error.message);
    return json({ success: true, data, function_name, params });
  } catch (error) {
    return json({ error: "RPC execution failed", details: error.message, function_name, params }, 400);
  }
}

async function handleAuth(request, supabase, _env) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    switch (action) {
      case "session": {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) throw new Error("No authorization header");

        const token = authHeader.replace("Bearer ", "");
        const { data: user, error } = await supabase.auth.getUser(token);
        if (error) throw error;

        return json({ success: true, user, authenticated: true });
      }
      case "validate": {
        const token = url.searchParams.get("token");
        if (!token) throw new Error("Token required for validation");
        const { data, error } = await supabase.auth.getUser(token);
        return json({ valid: !error, user: data?.user || null, error: error?.message || null });
      }
      default:
        return json({ error: "Invalid auth action" }, 400);
    }
  } catch (error) {
    return json({ error: "Auth operation failed", details: error.message, action }, 401);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Vary": "Origin",
    },
  });
}
