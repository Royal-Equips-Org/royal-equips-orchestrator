/**
 * GitHub Organization Webhook Handler
 * Production-ready webhook processing for GitHub organization events
 */

import { verifyGitHubSignature, generateRequestId } from '../../utils/crypto';
import { WebhookLogger, createErrorResponse, createSuccessResponse } from '../../utils/logger';
import { createBackendForwarder, WebhookEvent } from '../../utils/backend';

interface Env {
  GITHUB_WEBHOOK_SECRET: string;
  BACKEND_API_URL?: string;
  INTERNAL_API_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const requestId = generateRequestId();
  const logger = new WebhookLogger(requestId, 'github');

  try {
    // Validate GitHub webhook secret is configured
    if (!env.GITHUB_WEBHOOK_SECRET) {
      logger.error('GitHub webhook secret not configured');
      return createErrorResponse(500, 'Webhook secret not configured', requestId);
    }

    // Get required headers
    const signature = request.headers.get('X-Hub-Signature-256');
    const event = request.headers.get('X-GitHub-Event');
    const delivery = request.headers.get('X-GitHub-Delivery');
    const userAgent = request.headers.get('User-Agent') || '';

    if (!signature) {
      logger.error('Missing GitHub signature header');
      return createErrorResponse(400, 'Missing X-Hub-Signature-256 header', requestId);
    }

    if (!event) {
      logger.error('Missing GitHub event header');
      return createErrorResponse(400, 'Missing X-GitHub-Event header', requestId);
    }

    // Validate User-Agent is from GitHub
    if (!userAgent.startsWith('GitHub-Hookshot/')) {
      logger.warn('Invalid User-Agent', { userAgent });
      return createErrorResponse(400, 'Invalid request source', requestId);
    }

    // Get raw body for signature verification
    const body = await request.text();
    
    if (!body) {
      logger.error('Empty request body');
      return createErrorResponse(400, 'Empty request body', requestId);
    }

    // Verify GitHub signature
    const isValidSignature = await verifyGitHubSignature(
      signature,
      body,
      env.GITHUB_WEBHOOK_SECRET
    );

    if (!isValidSignature) {
      logger.error('Invalid GitHub signature', {
        event,
        delivery,
        signaturePrefix: signature.substring(0, 10) + '...',
      } as any);
      return createErrorResponse(401, 'Invalid signature', requestId);
    }

    // Parse JSON payload
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      logger.error('Invalid JSON payload', error as Error);
      return createErrorResponse(400, 'Invalid JSON payload', requestId);
    }

    // Add context to logger
    logger.addContext('event', event);
    logger.addContext('delivery', delivery);
    logger.addContext('repository', payload.repository?.full_name);
    logger.addContext('action', payload.action);

    logger.info('GitHub webhook received and verified', {
      event,
      delivery,
      repository: payload.repository?.full_name,
      action: payload.action,
      sender: payload.sender?.login,
    });

    // Create webhook event for backend forwarding
    const webhookEvent: WebhookEvent = {
      id: delivery || requestId,
      type: 'github',
      source: 'cloudflare-pages',
      timestamp: new Date().toISOString(),
      headers: {
        'X-GitHub-Event': event,
        'X-GitHub-Delivery': delivery || '',
        'User-Agent': userAgent,
      },
      payload,
    };

    // Forward to backend services if configured
    const forwarder = createBackendForwarder(env, logger);
    if (forwarder) {
      try {
        await forwarder.forwardEvent(webhookEvent);
        logger.info('Event forwarded to backend services');
      } catch (error) {
        logger.error('Failed to forward event to backend', error as Error);
        // Don't fail the webhook - GitHub expects 2xx response
      }
    }

    // Process specific GitHub events
    await processGitHubEvent(event, payload, logger);

    return createSuccessResponse(
      {
        event,
        delivery,
        action: payload.action,
        repository: payload.repository?.full_name,
        processed: true,
      },
      requestId,
      200
    );

  } catch (error) {
    logger.error('Unexpected error processing GitHub webhook', error as Error);
    return createErrorResponse(500, 'Internal server error', requestId);
  }
};

/**
 * Process specific GitHub events
 */
async function processGitHubEvent(
  event: string,
  payload: any,
  logger: WebhookLogger
): Promise<void> {
  switch (event) {
    case 'push':
      logger.info('Processing push event', {
        ref: payload.ref,
        commits: payload.commits?.length || 0,
        pusher: payload.pusher?.name,
      });
      break;

    case 'pull_request':
      logger.info('Processing pull request event', {
        action: payload.action,
        pr_number: payload.pull_request?.number,
        pr_title: payload.pull_request?.title,
        author: payload.pull_request?.user?.login,
      });
      break;

    case 'issues':
      logger.info('Processing issues event', {
        action: payload.action,
        issue_number: payload.issue?.number,
        issue_title: payload.issue?.title,
        author: payload.issue?.user?.login,
      });
      break;

    case 'repository':
      logger.info('Processing repository event', {
        action: payload.action,
        repository: payload.repository?.full_name,
        visibility: payload.repository?.private ? 'private' : 'public',
      });
      break;

    case 'workflow_run':
      logger.info('Processing workflow run event', {
        action: payload.action,
        workflow: payload.workflow_run?.name,
        status: payload.workflow_run?.status,
        conclusion: payload.workflow_run?.conclusion,
      });
      break;

    case 'deployment':
    case 'deployment_status':
      logger.info('Processing deployment event', {
        event,
        environment: payload.deployment?.environment,
        state: payload.deployment_status?.state,
      });
      break;

    default:
      logger.info('Processing generic GitHub event', { event });
      break;
  }
}