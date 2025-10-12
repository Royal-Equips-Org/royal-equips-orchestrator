/**
 * Auth Hook + React Email via Resend
 * 
 * Strategic Use: Branded OTP/login emails for shopper/agent portals; 
 * log auth events to BigQuery; trigger post-signup flows
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS
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

    try {
      const { type, email, locale = 'en', metadata = {} } = await request.json();

      // Validate required fields
      if (!type || !email) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: type, email'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Generate OTP or verification token
      const otp = generateOTP();
      const verificationToken = await generateVerificationToken(email, type);

      // Prepare email content based on type and locale
      const emailContent = await prepareEmailContent(type, locale, {
        otp,
        verificationToken,
        email,
        ...metadata
      });

      // Send email via Resend
      const emailResponse = await sendEmailViaResend(env.RESEND_API_KEY, {
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        from: env.FROM_EMAIL || 'noreply@royalequips.com'
      });

      // Log auth event to BigQuery for analytics
      if (env.BIGQUERY_PROJECT_ID) {
        await logAuthEvent(env, {
          timestamp: new Date().toISOString(),
          type,
          email,
          locale,
          success: emailResponse.success,
          metadata
        });
      }

      // Trigger post-signup flows if needed
      if (type === 'signup' && emailResponse.success) {
        await triggerPostSignupFlow(env, { email, metadata });
      }

      // Store verification data temporarily (e.g., in KV or Redis)
      if (env.AUTH_KV) {
        await env.AUTH_KV.put(
          `verification:${email}:${type}`,
          JSON.stringify({ otp, verificationToken, createdAt: Date.now() }),
          { expirationTtl: 300 } // 5 minutes
        );
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Authentication email sent successfully',
        type,
        email,
        expiresIn: 300
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      console.error('Auth hook error:', error);
      
      // Log error to monitoring
      if (env.SENTRY_DSN) {
        // Sentry error logging would go here
      }

      return new Response(JSON.stringify({
        error: 'Failed to process authentication request',
        details: error.message
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

// Helper functions
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function generateVerificationToken(email, type) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${email}:${type}:${Date.now()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function prepareEmailContent(type, locale, data) {
  const templates = {
    en: {
      login: {
        subject: 'Your Royal Equips Login Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #00FFE0;">Royal Equips Login</h2>
            <p>Your verification code is:</p>
            <div style="background: #0A0A0F; color: #00FFE0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 8px;">
              ${data.otp}
            </div>
            <p>This code expires in 5 minutes.</p>
            <p style="color: #666;">Royal Equips Command Center</p>
          </div>
        `
      },
      signup: {
        subject: 'Welcome to Royal Equips',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #00FFE0;">Welcome to Royal Equips</h2>
            <p>Complete your registration with this verification code:</p>
            <div style="background: #0A0A0F; color: #00FFE0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 8px;">
              ${data.otp}
            </div>
            <p>This code expires in 5 minutes.</p>
            <p style="color: #666;">Royal Equips Command Center</p>
          </div>
        `
      },
      reset: {
        subject: 'Royal Equips Password Reset',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #00FFE0;">Password Reset</h2>
            <p>Use this code to reset your password:</p>
            <div style="background: #0A0A0F; color: #00FFE0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 8px;">
              ${data.otp}
            </div>
            <p>This code expires in 5 minutes.</p>
            <p style="color: #666;">Royal Equips Command Center</p>
          </div>
        `
      }
    }
  };

  return templates[locale]?.[type] || templates.en[type] || templates.en.login;
}

async function sendEmailViaResend(apiKey, emailData) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();
    return { success: response.ok, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function logAuthEvent(env, eventData) {
  try {
    // Log to BigQuery for analytics
    const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${env.BIGQUERY_PROJECT_ID}/datasets/auth_events/tables/events/insertAll`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.BIGQUERY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rows: [{
          json: eventData
        }]
      }),
    });

    if (!response.ok) {
      console.error('Failed to log auth event to BigQuery:', await response.text());
    }
  } catch (error) {
    console.error('BigQuery logging error:', error);
  }
}

async function triggerPostSignupFlow(env, userData) {
  try {
    // Trigger webhook or queue job for post-signup processing
    if (env.WEBHOOK_URL) {
      await fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'user.signup.completed',
          data: userData,
          timestamp: new Date().toISOString()
        })
      });
    }
  } catch (error) {
    console.error('Post-signup flow error:', error);
  }
}