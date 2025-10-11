/**
 * Serverless Image Operations
 * 
 * Strategic Use: On-the-fly thumbnails, watermarks, A/B hero images; 
 * CDN cached
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case '/resize':
          return await handleResize(request, env);
        case '/crop':
          return await handleCrop(request, env);
        case '/watermark':
          return await handleWatermark(request, env);
        case '/filter':
          return await handleFilter(request, env);
        case '/format':
          return await handleFormat(request, env);
        case '/optimize':
          return await handleOptimize(request, env);
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      console.error('Image manipulation error:', error);
      return new Response(JSON.stringify({
        error: 'Image processing failed',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleResize(request, env) {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');
  const width = parseInt(url.searchParams.get('width')) || null;
  const height = parseInt(url.searchParams.get('height')) || null;
  const quality = parseInt(url.searchParams.get('quality')) || 85;
  const format = url.searchParams.get('format') || 'auto';
  const fit = url.searchParams.get('fit') || 'cover'; // cover, contain, fill, inside, outside

  if (!imageUrl) {
    return new Response(JSON.stringify({
      error: 'Image URL is required'
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Generate cache key
  const cacheKey = `resize:${imageUrl}:${width}x${height}:${quality}:${format}:${fit}`;
  const hashedKey = await hashString(cacheKey);

  // Check cache
  if (env.IMAGE_CACHE) {
    const cached = await env.IMAGE_CACHE.get(hashedKey, 'arrayBuffer');
    if (cached) {
      return new Response(cached, {
        headers: {
          'Content-Type': getContentType(format),
          'Cache-Control': 'public, max-age=86400',
          'X-Cache': 'HIT',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  try {
    // Fetch original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Process image using Cloudflare Image Resizing (if available) or WebAssembly
    let processedImage;
    
    if (env.CF_IMAGE_RESIZING_ENABLED) {
      // Use Cloudflare's built-in image resizing
      processedImage = await resizeWithCloudflare(imageBuffer, {
        width,
        height,
        quality,
        format,
        fit
      });
    } else {
      // Use WebAssembly image processing
      processedImage = await resizeWithWasm(imageBuffer, {
        width,
        height,
        quality,
        format,
        fit
      });
    }

    // Cache the result
    if (env.IMAGE_CACHE) {
      await env.IMAGE_CACHE.put(hashedKey, processedImage, {
        expirationTtl: 86400 // 24 hours
      });
    }

    // Log processing analytics
    await logImageProcessing(env, {
      operation: 'resize',
      original_url: imageUrl,
      width,
      height,
      format,
      quality,
      fit,
      original_size: imageBuffer.byteLength,
      processed_size: processedImage.byteLength,
      timestamp: new Date().toISOString()
    });

    return new Response(processedImage, {
      headers: {
        'Content-Type': getContentType(format),
        'Cache-Control': 'public, max-age=86400',
        'X-Cache': 'MISS',
        'X-Original-Size': imageBuffer.byteLength.toString(),
        'X-Processed-Size': processedImage.byteLength.toString(),
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Image resize error:', error);
    throw error;
  }
}

async function handleWatermark(request, env) {
  const formData = await request.formData();
  const imageFile = formData.get('image');
  const watermarkText = formData.get('text') || 'Royal Equips';
  const position = formData.get('position') || 'bottom-right';
  const opacity = parseFloat(formData.get('opacity')) || 0.5;
  const fontSize = parseInt(formData.get('fontSize')) || 24;
  const color = formData.get('color') || '#FFFFFF';

  if (!imageFile) {
    return new Response(JSON.stringify({
      error: 'Image file is required'
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const imageBuffer = await imageFile.arrayBuffer();

    // Generate cache key
    const cacheKey = `watermark:${watermarkText}:${position}:${opacity}:${fontSize}:${color}:${imageBuffer.byteLength}`;
    const hashedKey = await hashString(cacheKey);

    // Check cache
    if (env.IMAGE_CACHE) {
      const cached = await env.IMAGE_CACHE.get(hashedKey, 'arrayBuffer');
      if (cached) {
        return new Response(cached, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400',
            'X-Cache': 'HIT',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Add watermark using Canvas API or WebAssembly
    const watermarkedImage = await addWatermark(imageBuffer, {
      text: watermarkText,
      position,
      opacity,
      fontSize,
      color
    });

    // Cache the result
    if (env.IMAGE_CACHE) {
      await env.IMAGE_CACHE.put(hashedKey, watermarkedImage, {
        expirationTtl: 86400
      });
    }

    return new Response(watermarkedImage, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'X-Cache': 'MISS',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Watermark error:', error);
    throw error;
  }
}

async function handleOptimize(request, env) {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');
  const quality = parseInt(url.searchParams.get('quality')) || 85;
  const format = url.searchParams.get('format') || 'webp';

  if (!imageUrl) {
    return new Response(JSON.stringify({
      error: 'Image URL is required'
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Fetch and optimize image
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    const optimizedImage = await optimizeImage(imageBuffer, {
      quality,
      format
    });

    // Log optimization stats
    await logImageProcessing(env, {
      operation: 'optimize',
      original_url: imageUrl,
      format,
      quality,
      original_size: imageBuffer.byteLength,
      optimized_size: optimizedImage.byteLength,
      compression_ratio: ((imageBuffer.byteLength - optimizedImage.byteLength) / imageBuffer.byteLength * 100).toFixed(2),
      timestamp: new Date().toISOString()
    });

    return new Response(optimizedImage, {
      headers: {
        'Content-Type': getContentType(format),
        'Cache-Control': 'public, max-age=86400',
        'X-Original-Size': imageBuffer.byteLength.toString(),
        'X-Optimized-Size': optimizedImage.byteLength.toString(),
        'X-Compression-Ratio': ((imageBuffer.byteLength - optimizedImage.byteLength) / imageBuffer.byteLength * 100).toFixed(2) + '%',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Image optimization error:', error);
    throw error;
  }
}

// Helper functions
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getContentType(format) {
  const types = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'avif': 'image/avif',
    'auto': 'image/webp'
  };
  return types[format] || 'image/jpeg';
}

async function resizeWithCloudflare(imageBuffer, options) {
  // This would use Cloudflare's image resizing service
  // For now, return original buffer (simplified)
  return imageBuffer;
}

async function resizeWithWasm(imageBuffer, options) {
  // This would use a WebAssembly image processing library
  // For now, return original buffer (simplified)
  return imageBuffer;
}

async function addWatermark(imageBuffer, options) {
  // This would add watermark using Canvas API or WebAssembly
  // For now, return original buffer (simplified)
  return imageBuffer;
}

async function optimizeImage(imageBuffer, options) {
  // This would optimize image using WebAssembly or other tools
  // For now, return original buffer (simplified)
  return imageBuffer;
}

async function logImageProcessing(env, data) {
  try {
    if (env.BIGQUERY_PROJECT_ID) {
      await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${env.BIGQUERY_PROJECT_ID}/datasets/media_processing/tables/image_operations/insertAll`, {
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
    console.error('Image processing logging error:', error);
  }
}

export async function handleCrop(..._args){ /* TODO: implement handleCrop */ return { ok:true }; }


export async function handleFilter(..._args){ /* TODO: implement handleFilter */ return { ok:true }; }


export async function handleFormat(..._args){ /* TODO: implement handleFormat */ return { ok:true }; }
