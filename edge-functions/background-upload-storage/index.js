/**
 * Background Upload Storage
 * 
 * Strategic Use: Async product media ingest to Supabase Storage; 
 * webhooks to refresh Shopify media; audit logs to BQ
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case '/upload':
          return await handleUpload(request, env, ctx);
        case '/status':
          return await handleStatus(request, env, ctx);
        case '/webhook':
          return await handleWebhook(request, env, ctx);
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      console.error('Background upload error:', error);
      return new Response(JSON.stringify({
        error: 'Upload processing failed',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleUpload(request, env, ctx) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const metadata = JSON.parse(formData.get('metadata') || '{}');

  if (!file) {
    return new Response(JSON.stringify({
      error: 'No file provided'
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Generate unique upload ID
  const uploadId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const fileName = `${timestamp.split('T')[0]}/${uploadId}-${file.name}`;

  try {
    // Upload to Supabase Storage
    const uploadResult = await uploadToSupabaseStorage(env, file, fileName, metadata);

    // Queue background processing
    await queueBackgroundProcessing(env, {
      uploadId,
      fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      metadata,
      timestamp,
      storageUrl: uploadResult.publicUrl
    });

    // Log to BigQuery for audit trail
    await logUploadEvent(env, {
      uploadId,
      fileName,
      size: file.size,
      type: file.type,
      timestamp,
      metadata,
      status: 'queued'
    });

    return new Response(JSON.stringify({
      success: true,
      uploadId,
      fileName,
      status: 'queued',
      estimatedProcessingTime: '30-60 seconds'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    await logUploadEvent(env, {
      uploadId,
      fileName,
      size: file.size,
      type: file.type,
      timestamp,
      metadata,
      status: 'failed',
      error: error.message
    });

    throw error;
  }
}

async function handleStatus(request, env, ctx) {
  const url = new URL(request.url);
  const uploadId = url.searchParams.get('uploadId');

  if (!uploadId) {
    return new Response(JSON.stringify({
      error: 'Upload ID required'
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check processing status
  const status = await getProcessingStatus(env, uploadId);

  return new Response(JSON.stringify(status), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function handleWebhook(request, env, ctx) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhook = await request.json();
  
  // Process completed upload
  if (webhook.type === 'upload.completed') {
    await processCompletedUpload(env, webhook.data);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function uploadToSupabaseStorage(env, file, fileName, metadata) {
  const arrayBuffer = await file.arrayBuffer();
  
  const response = await fetch(`${env.SUPABASE_URL}/storage/v1/object/media/${fileName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'true'
    },
    body: arrayBuffer
  });

  if (!response.ok) {
    throw new Error(`Storage upload failed: ${await response.text()}`);
  }

  const result = await response.json();
  
  return {
    ...result,
    publicUrl: `${env.SUPABASE_URL}/storage/v1/object/public/media/${fileName}`
  };
}

async function queueBackgroundProcessing(env, uploadData) {
  // Queue job for background processing (resize, optimization, etc.)
  const queueUrl = `${env.ORCHESTRATOR_URL}/api/jobs/queue`;
  
  await fetch(queueUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`
    },
    body: JSON.stringify({
      type: 'media.process',
      data: uploadData,
      priority: 'normal'
    })
  });
}

async function logUploadEvent(env, eventData) {
  try {
    if (env.BIGQUERY_PROJECT_ID) {
      await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${env.BIGQUERY_PROJECT_ID}/datasets/media_events/tables/uploads/insertAll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.BIGQUERY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows: [{ json: eventData }]
        }),
      });
    }
  } catch (error) {
    console.error('BigQuery logging error:', error);
  }
}

async function getProcessingStatus(env, uploadId) {
  try {
    // Check status from orchestrator
    const response = await fetch(`${env.ORCHESTRATOR_URL}/api/jobs/status/${uploadId}`, {
      headers: {
        'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`
      }
    });

    if (response.ok) {
      return await response.json();
    }

    return { uploadId, status: 'unknown' };
  } catch (error) {
    return { uploadId, status: 'error', error: error.message };
  }
}

async function processCompletedUpload(env, uploadData) {
  // Trigger Shopify media refresh if needed
  if (uploadData.metadata?.shopifyProductId) {
    await refreshShopifyMedia(env, uploadData);
  }

  // Update processing status
  await updateProcessingStatus(env, uploadData.uploadId, 'completed');
}

async function refreshShopifyMedia(env, uploadData) {
  try {
    await fetch(`${env.ORCHESTRATOR_URL}/api/shopify/products/${uploadData.metadata.shopifyProductId}/media/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mediaUrl: uploadData.storageUrl,
        uploadId: uploadData.uploadId
      })
    });
  } catch (error) {
    console.error('Shopify media refresh error:', error);
  }
}

async function updateProcessingStatus(env, uploadId, status) {
  try {
    await fetch(`${env.ORCHESTRATOR_URL}/api/jobs/status/${uploadId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.ORCHESTRATOR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, updatedAt: new Date().toISOString() })
    });
  } catch (error) {
    console.error('Status update error:', error);
  }
}