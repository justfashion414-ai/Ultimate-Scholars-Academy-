import crypto from 'crypto';

function getCloudinaryPublicId(url: string): string | null {
  try {
    if (!url || !url.includes('cloudinary.com')) return null;

    let pathAndName = '';
    const versionMatch = url.match(/\/v\d+\//);
    if (versionMatch) {
      const index = url.lastIndexOf(versionMatch[0]);
      pathAndName = url.substring(index + versionMatch[0].length);
    } else {
      let uploadMarker = '/upload/';
      let uploadIndex = url.indexOf(uploadMarker);
      if (uploadIndex === -1) {
        uploadMarker = '/video/';
        uploadIndex = url.indexOf(uploadMarker);
      }
      if (uploadIndex === -1) {
        uploadMarker = '/image/';
        uploadIndex = url.indexOf(uploadMarker);
      }

      if (uploadIndex !== -1) {
        pathAndName = url.substring(uploadIndex + uploadMarker.length);
        const segments = pathAndName.split('/');
        const cleanedSegments = segments.filter((seg) => {
          if (seg.includes(',')) return false;
          const knownPrefixes = ['c_', 'w_', 'h_', 'q_', 'so_', 'e_', 'fl_', 'ar_', 'b_', 'co_', 'd_'];
          return !knownPrefixes.some((prefix) => seg.startsWith(prefix));
        });
        pathAndName = cleanedSegments.join('/');
      } else {
        return null;
      }
    }

    if (pathAndName.includes('?')) pathAndName = pathAndName.split('?')[0];
    if (pathAndName.includes('#')) pathAndName = pathAndName.split('#')[0];

    const lastDot = pathAndName.lastIndexOf('.');
    if (lastDot !== -1) pathAndName = pathAndName.substring(0, lastDot);

    return pathAndName;
  } catch (e) {
    return null;
  }
}

export async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { url } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing Cloudinary URL to delete' }),
      };
    }

    const publicId = getCloudinaryPublicId(url);
    if (!publicId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Could not parse public_id from Cloudinary URL' }),
      };
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing Cloudinary credentials (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET or VITE_ equivalents) on Netlify server' }),
      };
    }

    const isVideo = url.includes('/video/') || url.match(/\.(mp4|mov|avi|mkv|webm)($|\?)/i) !== null;
    const resourceType = isVideo ? 'video' : 'image';

    const timestamp = Math.round(Date.now() / 1000).toString();
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash('sha1')
      .update(stringToSign)
      .digest('hex');

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_id: publicId,
        timestamp: timestamp,
        api_key: apiKey,
        signature: signature,
      }),
    });

    const data = (await response.json()) as { result?: string; error?: any };
    if (data.result === 'ok' || data.result === 'not_found') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true, message: 'Deleted or asset already removed from Cloudinary' }),
      };
    } else {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: data.error?.message || 'Failed to destroy Cloudinary asset' }),
      };
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: err.message || 'Internal error deleting Cloudinary asset' }),
    };
  }
}
