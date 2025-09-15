/**
 * Stripe Webhook Handler
 * 
 * Strategic Use: Payment events → Supabase/BQ; refunds/fraud workflows; 
 * sync to Shopify
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = request.headers.get('stripe-signature');
    const body = await request.text();

    try {
      // Verify Stripe webhook signature
      const event = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);

      // Log event for audit trail
      await logStripeEvent(env, {
        id: event.id,
        type: event.type,
        timestamp: new Date(event.created * 1000).toISOString(),
        livemode: event.livemode,
        api_version: event.api_version
      });

      // Process event based on type
      const result = await processStripeEvent(event, env);

      return new Response(JSON.stringify({
        received: true,
        eventId: event.id,
        eventType: event.type,
        processed: result.processed,
        actions: result.actions || []
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      console.error('Stripe webhook error:', error);

      // Log error for monitoring
      await logStripeEvent(env, {
        error: error.message,
        signature: signature ? 'present' : 'missing',
        timestamp: new Date().toISOString(),
        body_length: body.length
      });

      return new Response(JSON.stringify({
        error: 'Webhook processing failed',
        details: error.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

async function verifyStripeSignature(body, signature, secret) {
  if (!signature || !secret) {
    throw new Error('Missing signature or secret');
  }

  // Extract timestamp and signature from header
  const elements = signature.split(',');
  const timestamp = elements.find(el => el.startsWith('t='))?.substring(2);
  const sig = elements.find(el => el.startsWith('v1='))?.substring(3);

  if (!timestamp || !sig) {
    throw new Error('Invalid signature format');
  }

  // Create expected signature
  const payload = `${timestamp}.${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature_bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expected_sig = Array.from(new Uint8Array(signature_bytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Compare signatures
  if (expected_sig !== sig) {
    throw new Error('Signature verification failed');
  }

  // Check timestamp to prevent replay attacks
  const eventTime = parseInt(timestamp);
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - eventTime > 300) { // 5 minutes tolerance
    throw new Error('Event timestamp too old');
  }

  return JSON.parse(body);
}

async function processStripeEvent(event, env) {
  const actions = [];

  switch (event.type) {
    case 'payment_intent.succeeded':
      return await handlePaymentSucceeded(event, env, actions);
    
    case 'payment_intent.payment_failed':
      return await handlePaymentFailed(event, env, actions);
    
    case 'payment_intent.requires_action':
      return await handlePaymentRequiresAction(event, env, actions);
    
    case 'charge.dispute.created':
      return await handleChargeDispute(event, env, actions);
    
    case 'invoice.payment_succeeded':
      return await handleInvoicePayment(event, env, actions);
    
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return await handleSubscriptionChange(event, env, actions);
    
    case 'radar.early_fraud_warning.created':
      return await handleFraudWarning(event, env, actions);
    
    case 'payout.paid':
    case 'payout.failed':
      return await handlePayout(event, env, actions);
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
      return { processed: false, actions: [] };
  }
}

async function handlePaymentSucceeded(event, env, actions) {
  const paymentIntent = event.data.object;
  
  // Store payment data in Supabase
  await storePaymentData(env, {
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: 'succeeded',
    customer_id: paymentIntent.customer,
    metadata: paymentIntent.metadata,
    created: new Date(paymentIntent.created * 1000).toISOString()
  });
  
  actions.push('payment_stored');

  // Sync to Shopify if order ID in metadata
  if (paymentIntent.metadata?.shopify_order_id) {
    await syncPaymentToShopify(env, paymentIntent);
    actions.push('shopify_synced');
  }

  // Log to BigQuery for analytics
  await logToBigQuery(env, 'payments', {
    event_type: 'payment_succeeded',
    payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100, // Convert to dollars
    currency: paymentIntent.currency,
    customer_id: paymentIntent.customer,
    timestamp: new Date().toISOString(),
    metadata: paymentIntent.metadata
  });
  
  actions.push('analytics_logged');

  // Trigger post-payment workflows
  await triggerPostPaymentWorkflows(env, paymentIntent);
  actions.push('workflows_triggered');

  return { processed: true, actions };
}

async function handlePaymentFailed(event, env, actions) {
  const paymentIntent = event.data.object;
  
  // Store failed payment data
  await storePaymentData(env, {
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: 'failed',
    customer_id: paymentIntent.customer,
    last_payment_error: paymentIntent.last_payment_error,
    metadata: paymentIntent.metadata,
    created: new Date(paymentIntent.created * 1000).toISOString()
  });

  actions.push('failed_payment_stored');

  // Log to BigQuery
  await logToBigQuery(env, 'payments', {
    event_type: 'payment_failed',
    payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    failure_reason: paymentIntent.last_payment_error?.message,
    timestamp: new Date().toISOString()
  });

  actions.push('failure_logged');

  // Send alert for high-value failed payments
  if (paymentIntent.amount > 50000) { // > $500
    await sendFailureAlert(env, paymentIntent);
    actions.push('alert_sent');
  }

  return { processed: true, actions };
}

async function handleChargeDispute(event, env, actions) {
  const dispute = event.data.object;
  
  // Store dispute data
  await storeDisputeData(env, {
    stripe_dispute_id: dispute.id,
    charge_id: dispute.charge,
    amount: dispute.amount,
    currency: dispute.currency,
    reason: dispute.reason,
    status: dispute.status,
    created: new Date(dispute.created * 1000).toISOString()
  });

  actions.push('dispute_stored');

  // Alert fraud team immediately
  await sendFraudAlert(env, dispute);
  actions.push('fraud_alert_sent');

  // Log to BigQuery
  await logToBigQuery(env, 'disputes', {
    event_type: 'dispute_created',
    dispute_id: dispute.id,
    charge_id: dispute.charge,
    amount: dispute.amount / 100,
    reason: dispute.reason,
    timestamp: new Date().toISOString()
  });

  actions.push('dispute_logged');

  return { processed: true, actions };
}

async function handleFraudWarning(event, env, actions) {
  const warning = event.data.object;
  
  // Log fraud warning
  await logToBigQuery(env, 'fraud_warnings', {
    event_type: 'fraud_warning',
    warning_id: warning.id,
    charge_id: warning.charge,
    actionable: warning.actionable,
    created: new Date(warning.created * 1000).toISOString()
  });

  actions.push('fraud_warning_logged');

  // Immediate alert for actionable warnings
  if (warning.actionable) {
    await sendFraudAlert(env, warning);
    actions.push('fraud_alert_sent');
  }

  return { processed: true, actions };
}

async function storePaymentData(env, paymentData) {
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      throw new Error(`Supabase insert failed: ${await response.text()}`);
    }
  } catch (error) {
    console.error('Payment data storage error:', error);
    throw error;
  }
}

async function storeDisputeData(env, disputeData) {
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/disputes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(disputeData)
    });

    if (!response.ok) {
      throw new Error(`Supabase dispute insert failed: ${await response.text()}`);
    }
  } catch (error) {
    console.error('Dispute data storage error:', error);
    throw error;
  }
}

async function syncPaymentToShopify(env, paymentIntent) {
  try {
    const response = await fetch(`${env.ORCHESTRATOR_URL}/api/shopify/orders/${paymentIntent.metadata.shopify_order_id}/payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: 'paid'
      })
    });

    if (!response.ok) {
      throw new Error(`Shopify sync failed: ${await response.text()}`);
    }
  } catch (error) {
    console.error('Shopify sync error:', error);
  }
}

async function logToBigQuery(env, table, data) {
  try {
    if (!env.BIGQUERY_PROJECT_ID) return;

    await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${env.BIGQUERY_PROJECT_ID}/datasets/stripe_events/tables/${table}/insertAll`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.BIGQUERY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rows: [{ json: data }]
      }),
    });
  } catch (error) {
    console.error('BigQuery logging error:', error);
  }
}

async function logStripeEvent(env, eventData) {
  try {
    if (!env.BIGQUERY_PROJECT_ID) return;

    await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${env.BIGQUERY_PROJECT_ID}/datasets/stripe_events/tables/webhook_events/insertAll`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.BIGQUERY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rows: [{ json: eventData }]
      }),
    });
  } catch (error) {
    console.error('Stripe event logging error:', error);
  }
}

async function sendFraudAlert(env, data) {
  try {
    // Send to Discord
    if (env.DISCORD_WEBHOOK_URL) {
      await fetch(env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🚨 Fraud Alert',
            description: `Dispute or fraud warning detected`,
            color: 0xFF3B3B,
            fields: [
              { name: 'ID', value: data.id, inline: true },
              { name: 'Amount', value: `$${(data.amount / 100).toFixed(2)}`, inline: true },
              { name: 'Reason', value: data.reason || 'Unknown', inline: true }
            ],
            timestamp: new Date().toISOString()
          }]
        })
      });
    }

    // Send to orchestrator for further processing
    await fetch(`${env.ORCHESTRATOR_URL}/api/alerts/fraud`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Fraud alert error:', error);
  }
}

async function triggerPostPaymentWorkflows(env, paymentIntent) {
  try {
    await fetch(`${env.ORCHESTRATOR_URL}/api/workflows/post-payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment_intent_id: paymentIntent.id,
        customer_id: paymentIntent.customer,
        amount: paymentIntent.amount,
        metadata: paymentIntent.metadata
      })
    });
  } catch (error) {
    console.error('Post-payment workflow error:', error);
  }
}

export async function handlePaymentRequiresAction(..._args){ /* TODO: implement handlePaymentRequiresAction */ return new Response("handlePaymentRequiresAction: stub"); }


export async function handleInvoicePayment(..._args){ /* TODO: implement handleInvoicePayment */ return { ok:true }; }


export async function handleSubscriptionChange(..._args){ /* TODO: implement handleSubscriptionChange */ return { ok:true }; }


export async function handlePayout(..._args){ /* TODO: implement handlePayout */ return { ok:true }; }


export async function sendFailureAlert(..._args){ /* TODO: implement sendFailureAlert */ return { ok:true }; }
