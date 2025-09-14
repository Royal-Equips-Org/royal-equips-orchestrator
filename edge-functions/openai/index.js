/**
 * Generic OpenAI LLM Handler
 * 
 * Strategic Use: Central reasoning/orchestration; chain tools; 
 * log telemetry to BQ
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const startTime = Date.now();
    let requestId = crypto.randomUUID();

    try {
      const requestData = await request.json();
      const {
        messages,
        model = 'gpt-4',
        temperature = 0.7,
        max_tokens = 2000,
        stream = false,
        tools = null,
        tool_choice = 'auto',
        user_id = null,
        session_id = null,
        context = {}
      } = requestData;

      // Validate required fields
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return new Response(JSON.stringify({
          error: 'Messages array is required and must not be empty'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Log request telemetry
      await logTelemetry(env, {
        requestId,
        type: 'request',
        timestamp: new Date().toISOString(),
        model,
        messageCount: messages.length,
        hasTools: !!tools,
        userId: user_id,
        sessionId: session_id,
        context
      });

      // Prepare OpenAI request
      const openaiRequest = {
        model,
        messages,
        temperature,
        max_tokens,
        stream,
        user: user_id || requestId
      };

      // Add tools if provided
      if (tools) {
        openaiRequest.tools = tools;
        openaiRequest.tool_choice = tool_choice;
      }

      // Call OpenAI API
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(openaiRequest),
      });

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      // Handle streaming response
      if (stream) {
        return handleStreamingResponse(openaiResponse, env, requestId, startTime);
      }

      // Handle regular response
      const result = await openaiResponse.json();
      const endTime = Date.now();

      // Process tool calls if present
      if (result.choices?.[0]?.message?.tool_calls) {
        const toolResults = await processToolCalls(
          result.choices[0].message.tool_calls,
          env,
          context
        );
        
        // Add tool results to context for potential follow-up
        result.tool_results = toolResults;
      }

      // Log response telemetry
      await logTelemetry(env, {
        requestId,
        type: 'response',
        timestamp: new Date().toISOString(),
        model,
        responseTime: endTime - startTime,
        tokensUsed: result.usage,
        hasToolCalls: !!result.choices?.[0]?.message?.tool_calls,
        userId: user_id,
        sessionId: session_id
      });

      // Enhance response with metadata
      const enhancedResult = {
        ...result,
        metadata: {
          requestId,
          responseTime: endTime - startTime,
          timestamp: new Date().toISOString(),
          model,
          edge_function: 'openai-handler'
        }
      };

      return new Response(JSON.stringify(enhancedResult), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Request-ID': requestId
        }
      });

    } catch (error) {
      console.error('OpenAI handler error:', error);

      // Log error telemetry
      await logTelemetry(env, {
        requestId,
        type: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        responseTime: Date.now() - startTime
      });

      return new Response(JSON.stringify({
        error: 'AI processing failed',
        details: error.message,
        requestId
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Request-ID': requestId
        }
      });
    }
  }
};

async function handleStreamingResponse(openaiResponse, env, requestId, startTime) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const reader = openaiResponse.body.getReader();

  // Process streaming chunks
  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Forward chunk to client
        await writer.write(value);
      }
    } catch (error) {
      console.error('Streaming error:', error);
      await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({
        error: 'Streaming failed',
        details: error.message
      })}\n\n`));
    } finally {
      // Log completion telemetry
      await logTelemetry(env, {
        requestId,
        type: 'stream_complete',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      });

      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Request-ID': requestId
    }
  });
}

async function processToolCalls(toolCalls, env, context) {
  const results = [];

  for (const toolCall of toolCalls) {
    try {
      const result = await executeToolCall(toolCall, env, context);
      results.push({
        tool_call_id: toolCall.id,
        result,
        success: true
      });
    } catch (error) {
      console.error(`Tool call ${toolCall.id} failed:`, error);
      results.push({
        tool_call_id: toolCall.id,
        error: error.message,
        success: false
      });
    }
  }

  return results;
}

async function executeToolCall(toolCall, env, context) {
  const { function: func } = toolCall;
  const { name, arguments: args } = func;

  // Parse arguments
  let parsedArgs;
  try {
    parsedArgs = JSON.parse(args);
  } catch (error) {
    throw new Error(`Invalid tool arguments: ${error.message}`);
  }

  // Route to appropriate tool handler
  switch (name) {
    case 'search_products':
      return await searchProducts(parsedArgs, env);
    
    case 'get_inventory':
      return await getInventory(parsedArgs, env);
    
    case 'update_pricing':
      return await updatePricing(parsedArgs, env);
    
    case 'send_notification':
      return await sendNotification(parsedArgs, env);
    
    case 'query_analytics':
      return await queryAnalytics(parsedArgs, env);
    
    case 'manage_orders':
      return await manageOrders(parsedArgs, env);
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function searchProducts(args, env) {
  const response = await fetch(`${env.ORCHESTRATOR_URL}/api/products/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });

  if (!response.ok) {
    throw new Error(`Product search failed: ${await response.text()}`);
  }

  return await response.json();
}

async function getInventory(args, env) {
  const response = await fetch(`${env.ORCHESTRATOR_URL}/api/inventory`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Inventory fetch failed: ${await response.text()}`);
  }

  return await response.json();
}

async function updatePricing(args, env) {
  const response = await fetch(`${env.ORCHESTRATOR_URL}/api/pricing/update`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });

  if (!response.ok) {
    throw new Error(`Pricing update failed: ${await response.text()}`);
  }

  return await response.json();
}

async function sendNotification(args, env) {
  const response = await fetch(`${env.ORCHESTRATOR_URL}/api/notifications/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });

  if (!response.ok) {
    throw new Error(`Notification failed: ${await response.text()}`);
  }

  return await response.json();
}

async function queryAnalytics(args, env) {
  const response = await fetch(`${env.ORCHESTRATOR_URL}/api/analytics/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });

  if (!response.ok) {
    throw new Error(`Analytics query failed: ${await response.text()}`);
  }

  return await response.json();
}

async function manageOrders(args, env) {
  const response = await fetch(`${env.ORCHESTRATOR_URL}/api/orders/manage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });

  if (!response.ok) {
    throw new Error(`Order management failed: ${await response.text()}`);
  }

  return await response.json();
}

async function logTelemetry(env, data) {
  try {
    if (env.BIGQUERY_PROJECT_ID) {
      await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${env.BIGQUERY_PROJECT_ID}/datasets/ai_telemetry/tables/events/insertAll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.BIGQUERY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows: [{ json: data }]
        }),
      });
    }
  } catch (error) {
    console.error('Telemetry logging error:', error);
  }
}