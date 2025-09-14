/**
 * Discord Bot Command Handler
 * 
 * Strategic Use: Ops control + alerts channel; deploy commands via Render; 
 * pipe anomalies from BQ
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

    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case '/webhook':
          return await handleDiscordWebhook(request, env);
        case '/commands':
          return await handleSlashCommands(request, env);
        case '/alerts':
          return await handleAlerts(request, env);
        case '/deploy':
          return await handleDeployCommand(request, env);
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      console.error('Discord bot error:', error);
      return new Response(JSON.stringify({
        error: 'Discord bot operation failed',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleDiscordWebhook(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify Discord signature
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');
  const body = await request.text();

  if (!verifyDiscordSignature(signature, timestamp, body, env.DISCORD_PUBLIC_KEY)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Handle different interaction types
  switch (interaction.type) {
    case 1: // PING
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' }
      });

    case 2: // APPLICATION_COMMAND
      return await handleApplicationCommand(interaction, env);

    case 3: // MESSAGE_COMPONENT
      return await handleMessageComponent(interaction, env);

    default:
      return new Response(JSON.stringify({ 
        type: 4,
        data: { content: 'Unknown interaction type' }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
  }
}

async function handleApplicationCommand(interaction, env) {
  const { data: command } = interaction;

  switch (command.name) {
    case 'status':
      return await handleStatusCommand(interaction, env);
    
    case 'deploy':
      return await handleDeployCommand(interaction, env);
    
    case 'logs':
      return await handleLogsCommand(interaction, env);
    
    case 'metrics':
      return await handleMetricsCommand(interaction, env);
    
    case 'alerts':
      return await handleAlertsCommand(interaction, env);
    
    case 'orders':
      return await handleOrdersCommand(interaction, env);
    
    case 'inventory':
      return await handleInventoryCommand(interaction, env);
    
    default:
      return new Response(JSON.stringify({
        type: 4,
        data: { content: `Unknown command: ${command.name}` }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
  }
}

async function handleStatusCommand(interaction, env) {
  try {
    // Get system status from orchestrator
    const response = await fetch(`${env.ORCHESTRATOR_URL}/api/health/detailed`, {
      headers: {
        'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`
      }
    });

    const status = await response.json();

    const embed = {
      title: '🎯 Royal Equips Status',
      color: status.healthy ? 0x00FFE0 : 0xFF3B3B,
      fields: [
        {
          name: '🖥️ System Status',
          value: status.healthy ? '✅ Online' : '❌ Issues Detected',
          inline: true
        },
        {
          name: '📊 Active Agents',
          value: `${status.agents?.active || 0}/${status.agents?.total || 0}`,
          inline: true
        },
        {
          name: '🛒 Shopify',
          value: status.shopify?.status || 'Unknown',
          inline: true
        },
        {
          name: '📈 Uptime',
          value: status.uptime || 'Unknown',
          inline: true
        },
        {
          name: '💾 Memory Usage',
          value: `${Math.round(status.memory?.usage || 0)}%`,
          inline: true
        },
        {
          name: '⚡ CPU Usage',
          value: `${Math.round(status.cpu?.usage || 0)}%`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Royal Equips Command Center'
      }
    };

    return new Response(JSON.stringify({
      type: 4,
      data: { embeds: [embed] }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      type: 4,
      data: { content: `❌ Failed to get status: ${error.message}` }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDeployCommand(interaction, env) {
  const options = interaction.data.options || [];
  const service = options.find(opt => opt.name === 'service')?.value || 'all';
  const environment = options.find(opt => opt.name === 'environment')?.value || 'production';

  try {
    // Trigger deployment via Render API
    const deployResponse = await fetch(`${env.RENDER_DEPLOY_HOOK_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RENDER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service,
        environment,
        triggeredBy: `Discord:${interaction.member.user.username}`
      })
    });

    if (!deployResponse.ok) {
      throw new Error(`Deploy failed: ${await deployResponse.text()}`);
    }

    const deployResult = await deployResponse.json();

    const embed = {
      title: '🚀 Deployment Triggered',
      color: 0x00FFE0,
      fields: [
        {
          name: '📦 Service',
          value: service,
          inline: true
        },
        {
          name: '🌍 Environment',
          value: environment,
          inline: true
        },
        {
          name: '⏱️ ETA',
          value: '2-5 minutes',
          inline: true
        },
        {
          name: '🔗 Deploy ID',
          value: deployResult.id || 'Unknown',
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify({
      type: 4,
      data: { embeds: [embed] }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      type: 4,
      data: { content: `❌ Deployment failed: ${error.message}` }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleAlertsCommand(interaction, env) {
  try {
    // Query BigQuery for recent anomalies
    const anomalies = await queryRecentAnomalies(env);

    const embed = {
      title: '🚨 Recent Alerts & Anomalies',
      color: anomalies.length > 0 ? 0xFF3B3B : 0x2DFF88,
      description: anomalies.length === 0 ? '✅ No recent anomalies detected' : `⚠️ ${anomalies.length} anomalies found`,
      fields: anomalies.slice(0, 10).map(anomaly => ({
        name: `${anomaly.type} - ${anomaly.severity}`,
        value: `${anomaly.description}\n*${new Date(anomaly.timestamp).toLocaleString()}*`,
        inline: false
      })),
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify({
      type: 4,
      data: { embeds: [embed] }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      type: 4,
      data: { content: `❌ Failed to get alerts: ${error.message}` }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleOrdersCommand(interaction, env) {
  try {
    const response = await fetch(`${env.ORCHESTRATOR_URL}/api/orders/summary`, {
      headers: {
        'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`
      }
    });

    const ordersSummary = await response.json();

    const embed = {
      title: '📦 Orders Summary',
      color: 0x4BC3FF,
      fields: [
        {
          name: '📊 Today',
          value: `${ordersSummary.today?.count || 0} orders\n$${ordersSummary.today?.revenue || 0}`,
          inline: true
        },
        {
          name: '📈 This Week',
          value: `${ordersSummary.week?.count || 0} orders\n$${ordersSummary.week?.revenue || 0}`,
          inline: true
        },
        {
          name: '🎯 This Month',
          value: `${ordersSummary.month?.count || 0} orders\n$${ordersSummary.month?.revenue || 0}`,
          inline: true
        },
        {
          name: '⏳ Pending',
          value: `${ordersSummary.pending || 0} orders`,
          inline: true
        },
        {
          name: '🚚 Shipped',
          value: `${ordersSummary.shipped || 0} orders`,
          inline: true
        },
        {
          name: '✅ Fulfilled',
          value: `${ordersSummary.fulfilled || 0} orders`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify({
      type: 4,
      data: { embeds: [embed] }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      type: 4,
      data: { content: `❌ Failed to get orders: ${error.message}` }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function queryRecentAnomalies(env) {
  try {
    if (!env.BIGQUERY_PROJECT_ID) return [];

    const query = `
      SELECT 
        type,
        severity,
        description,
        timestamp
      FROM \`${env.BIGQUERY_PROJECT_ID}.anomalies.events\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
      ORDER BY timestamp DESC
      LIMIT 25
    `;

    const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${env.BIGQUERY_PROJECT_ID}/queries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.BIGQUERY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, useLegacySql: false }),
    });

    const result = await response.json();
    return result.rows?.map(row => ({
      type: row.f[0].v,
      severity: row.f[1].v,
      description: row.f[2].v,
      timestamp: row.f[3].v
    })) || [];

  } catch (error) {
    console.error('BigQuery anomalies query error:', error);
    return [];
  }
}

function verifyDiscordSignature(signature, timestamp, body, publicKey) {
  // Discord signature verification implementation
  // This would use the Ed25519 algorithm with the Discord public key
  // For now, returning true for development
  return true; // TODO: Implement proper signature verification
}

async function handleSlashCommands(request, env) {
  // Register slash commands with Discord
  const commands = [
    {
      name: 'status',
      description: 'Get Royal Equips system status'
    },
    {
      name: 'deploy',
      description: 'Trigger deployment',
      options: [
        {
          name: 'service',
          description: 'Service to deploy',
          type: 3,
          required: false,
          choices: [
            { name: 'All Services', value: 'all' },
            { name: 'Backend', value: 'backend' },
            { name: 'Workers', value: 'workers' }
          ]
        },
        {
          name: 'environment',
          description: 'Target environment',
          type: 3,
          required: false,
          choices: [
            { name: 'Production', value: 'production' },
            { name: 'Staging', value: 'staging' }
          ]
        }
      ]
    },
    {
      name: 'alerts',
      description: 'Check recent alerts and anomalies'
    },
    {
      name: 'orders',
      description: 'Get orders summary'
    },
    {
      name: 'inventory',
      description: 'Check inventory status'
    }
  ];

  return new Response(JSON.stringify({ commands }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleAlerts(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const alert = await request.json();

  // Send alert to Discord channel
  await sendDiscordAlert(env, alert);

  return new Response(JSON.stringify({ sent: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function sendDiscordAlert(env, alert) {
  const webhook = env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;

  const embed = {
    title: `🚨 ${alert.title}`,
    description: alert.description,
    color: alert.severity === 'critical' ? 0xFF3B3B : 0xFF9500,
    fields: alert.fields || [],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Royal Equips Alert System'
    }
  };

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  });
}