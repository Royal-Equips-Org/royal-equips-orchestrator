/**
 * ElevenLabs Text-to-Speech
 * 
 * Strategic Use: Voice order updates; generate audio ads; 
 * cache audio in Storage/CDN
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

    try {
      const { 
        text, 
        voice_id = 'EXAVITQu4vr4xnSDxMaL', // Default voice
        model_id = 'eleven_multilingual_v2',
        voice_settings = {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        },
        output_format = 'mp3_44100_128',
        cache = true,
        metadata = {}
      } = await request.json();

      if (!text) {
        return new Response(JSON.stringify({
          error: 'Text is required'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Generate cache key
      const cacheKey = await generateCacheKey(text, voice_id, model_id, voice_settings);

      // Check cache first
      if (cache && env.AUDIO_CACHE) {
        const cachedAudio = await env.AUDIO_CACHE.get(cacheKey, 'arrayBuffer');
        if (cachedAudio) {
          return new Response(cachedAudio, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'public, max-age=86400',
              'X-Cache': 'HIT',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      }

      // Call ElevenLabs API
      const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id,
          voice_settings,
          output_format
        }),
      });

      if (!elevenLabsResponse.ok) {
        const error = await elevenLabsResponse.text();
        throw new Error(`ElevenLabs API error: ${error}`);
      }

      const audioBuffer = await elevenLabsResponse.arrayBuffer();

      // Cache the audio
      if (cache && env.AUDIO_CACHE) {
        await env.AUDIO_CACHE.put(cacheKey, audioBuffer, {
          expirationTtl: 86400 // 24 hours
        });
      }

      // Store in Supabase Storage for long-term caching
      if (env.SUPABASE_URL) {
        await storeInSupabaseStorage(env, audioBuffer, cacheKey, metadata);
      }

      // Log usage analytics
      await logTTSUsage(env, {
        text_length: text.length,
        voice_id,
        model_id,
        output_format,
        cached: false,
        timestamp: new Date().toISOString(),
        metadata
      });

      return new Response(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400',
          'X-Cache': 'MISS',
          'X-Audio-Duration': elevenLabsResponse.headers.get('X-Audio-Duration') || 'unknown',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      console.error('TTS error:', error);
      
      return new Response(JSON.stringify({
        error: 'Text-to-speech processing failed',
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

async function generateCacheKey(text, voice_id, model_id, voice_settings) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${text}:${voice_id}:${model_id}:${JSON.stringify(voice_settings)}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function storeInSupabaseStorage(env, audioBuffer, cacheKey, metadata) {
  try {
    const fileName = `tts/${cacheKey}.mp3`;
    
    await fetch(`${env.SUPABASE_URL}/storage/v1/object/audio/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'audio/mpeg',
        'x-upsert': 'true'
      },
      body: audioBuffer
    });

    // Store metadata
    if (metadata) {
      await fetch(`${env.SUPABASE_URL}/rest/v1/tts_cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          cache_key: cacheKey,
          file_path: fileName,
          metadata,
          created_at: new Date().toISOString()
        })
      });
    }
  } catch (error) {
    console.error('Supabase storage error:', error);
  }
}

async function logTTSUsage(env, usageData) {
  try {
    if (env.BIGQUERY_PROJECT_ID) {
      await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${env.BIGQUERY_PROJECT_ID}/datasets/ai_usage/tables/tts_events/insertAll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.BIGQUERY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows: [{ json: usageData }]
        }),
      });
    }
  } catch (error) {
    console.error('TTS usage logging error:', error);
  }
}