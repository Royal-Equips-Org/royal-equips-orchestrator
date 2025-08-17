/**
 * Minimal Supabase Client Connection
 * 
 * Strategic Use: Baseline client for all edge modules; 
 * env-driven multi-project routing
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const url = new URL(request.url);

    try {
      // Initialize Supabase client based on environment
      const supabase = createSupabaseClient(env);

      switch (url.pathname) {
        case '/health':
          return await handleHealth(supabase, env);
        case '/query':
          return await handleQuery(request, supabase, env);
        case '/rpc':
          return await handleRPC(request, supabase, env);
        case '/auth':
          return await handleAuth(request, supabase, env);
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      console.error('Supabase client error:', error);
      return new Response(JSON.stringify({
        error: 'Supabase operation failed',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

function createSupabaseClient(env) {
  // Multi-project routing based on environment
  let supabaseUrl = env.SUPABASE_URL;
  let supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  // Environment-specific routing
  if (env.ENVIRONMENT === 'staging') {
    supabaseUrl = env.SUPABASE_STAGING_URL || supabaseUrl;
    supabaseKey = env.SUPABASE_STAGING_KEY || supabaseKey;
  } else if (env.ENVIRONMENT === 'development') {
    supabaseUrl = env.SUPABASE_DEV_URL || supabaseUrl;
    supabaseKey = env.SUPABASE_DEV_KEY || supabaseKey;
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-royal-equips-client': 'edge-function',
        'x-environment': env.ENVIRONMENT || 'production'
      }
    }
  });
}

async function handleHealth(supabase, env) {
  try {
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('health_check')
      .select('*')
      .limit(1);

    const health = {
      status: error ? 'unhealthy' : 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT || 'production',
      supabaseUrl: env.SUPABASE_URL ? 'configured' : 'missing',
      error: error?.message || null
    };

    return new Response(JSON.stringify(health), {
      status: error ? 503 : 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

async function handleQuery(request, supabase, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { table, operation, data, filters = {}, options = {} } = await request.json();

  if (!table || !operation) {
    return new Response(JSON.stringify({
      error: 'Table and operation required'
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let query = supabase.from(table);

    switch (operation) {
      case 'select':
        query = query.select(options.select || '*');
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (typeof value === 'object' && value.operator) {
            query = query.filter(key, value.operator, value.value);
          } else {
            query = query.eq(key, value);
          }
        });

        // Apply options
        if (options.limit) query = query.limit(options.limit);
        if (options.order) query = query.order(options.order.column, { ascending: options.order.ascending });
        if (options.range) query = query.range(options.range.from, options.range.to);

        break;

      case 'insert':
        query = query.insert(data);
        if (options.select) query = query.select(options.select);
        break;

      case 'update':
        query = query.update(data);
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        if (options.select) query = query.select(options.select);
        break;

      case 'delete':
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        break;

      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    const result = await query;

    if (result.error) {
      throw new Error(result.error.message);
    }

    return new Response(JSON.stringify({
      success: true,
      data: result.data,
      count: result.count,
      status: result.status,
      statusText: result.statusText
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Query execution failed',
      details: error.message,
      operation,
      table
    }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

async function handleRPC(request, supabase, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { function_name, params = {} } = await request.json();

  if (!function_name) {
    return new Response(JSON.stringify({
      error: 'Function name required'
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { data, error } = await supabase.rpc(function_name, params);

    if (error) {
      throw new Error(error.message);
    }

    return new Response(JSON.stringify({
      success: true,
      data,
      function_name,
      params
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'RPC execution failed',
      details: error.message,
      function_name,
      params
    }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

async function handleAuth(request, supabase, env) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'session':
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
          throw new Error('No authorization header');
        }

        const { data: user, error } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          user,
          authenticated: true
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });

      case 'validate':
        const token = url.searchParams.get('token');
        if (!token) {
          throw new Error('Token required for validation');
        }

        const { data, error: validateError } = await supabase.auth.getUser(token);
        
        return new Response(JSON.stringify({
          valid: !validateError,
          user: data?.user || null,
          error: validateError?.message || null
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });

      default:
        return new Response(JSON.stringify({
          error: 'Invalid auth action'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Auth operation failed',
      details: error.message,
      action
    }), {
      status: 401,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}