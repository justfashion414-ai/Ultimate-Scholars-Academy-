import { compressImage } from './imageCompressor';

export interface UploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'auto';
  filename?: string;
}

/**
 * Converts a base64 Data URI string into a binary Blob for binary multipart uploads.
 */
function dataURItoBlob(dataURI: string): Blob {
  const parts = dataURI.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const byteString = atob(parts[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

/**
 * Converts a File object to a base64 Data URI string.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Three-tier Cloudinary upload service:
 * 1. Signature-based direct upload via Netlify Function (preferred for Netlify deployment).
 * 2. Express server route (/api/upload or /api/upload-video with multer) for AI Studio preview.
 * 3. Unsigned preset-based direct upload as final fallback.
 */
export async function uploadToCloudinary(
  fileOrBase64: File | string,
  options: UploadOptions = {}
): Promise<string> {
  const { folder = 'scholars_class_2026', resourceType = 'auto', filename = 'upload' } = options;

  const isVideoFile =
    (fileOrBase64 instanceof File && fileOrBase64.type.startsWith('video/')) ||
    resourceType === 'video';

  const directResourceType = isVideoFile ? 'video' : 'image';

  let uploadPayload: File | Blob | string = fileOrBase64;

  // Process and compress images before any upload attempt
  if (!isVideoFile) {
    try {
      let rawBase64: string;
      let initialSizeKB = 0;

      if (fileOrBase64 instanceof File) {
        initialSizeKB = Math.round(fileOrBase64.size / 1024);
        rawBase64 = await fileToBase64(fileOrBase64);
      } else if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:image')) {
        initialSizeKB = Math.round((fileOrBase64.length * 0.75) / 1024);
        rawBase64 = fileOrBase64;
      } else {
        rawBase64 = '';
      }

      if (rawBase64 && rawBase64.startsWith('data:image')) {
        const compressedBase64 = await compressImage(rawBase64);
        const compressedBlob = dataURItoBlob(compressedBase64);
        const compressedSizeKB = Math.round(compressedBlob.size / 1024);

        console.log(
          `[Cloudinary] Client-side image compression: ${initialSizeKB} KB -> ${compressedSizeKB} KB`
        );
        uploadPayload = compressedBlob;
      }
    } catch (err) {
      console.warn('[Cloudinary] Pre-upload image compression skipped or failed:', err);
    }
  }

  // =========================================================================
  // TIER 1: Signature-based direct upload via Netlify Function (Preferred)
  // =========================================================================
  try {
    const sigRes = await fetch('/api/cloudinary-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder, resourceType: directResourceType }),
    });

    const sigContentType = sigRes.headers.get('content-type') || '';
    if (sigRes.ok && sigContentType.includes('application/json')) {
      const sigData = await sigRes.json();

      if (sigData.signature && sigData.timestamp && sigData.apiKey && sigData.cloudName) {
        const formData = new FormData();
        if (uploadPayload instanceof File || uploadPayload instanceof Blob) {
          formData.append('file', uploadPayload, filename);
        } else {
          formData.append('file', uploadPayload as string);
        }
        formData.append('api_key', sigData.apiKey);
        formData.append('timestamp', sigData.timestamp);
        formData.append('signature', sigData.signature);
        formData.append('folder', sigData.folder || folder);

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${directResourceType}/upload`;
        const directRes = await fetch(cloudinaryUrl, {
          method: 'POST',
          body: formData,
        });

        if (directRes.ok) {
          const cloudData = await directRes.json();
          if (cloudData.secure_url) {
            console.log('[Cloudinary] Upload succeeded via Tier 1 (Netlify Function signature)');
            return cloudData.secure_url;
          }
        } else {
          const errData = await directRes.json().catch(() => ({}));
          console.warn('[Cloudinary] Tier 1 Cloudinary direct upload failed:', errData);
        }
      }
    } else {
      console.log('[Cloudinary] Tier 1 signature endpoint unavailable (Status ' + sigRes.status + ')');
    }
  } catch (err) {
    console.warn('[Cloudinary] Tier 1 (Netlify Function signature) unreachable:', err);
  }

  // =========================================================================
  // TIER 2: Express server route (/api/upload or /api/upload-video with multer)
  // =========================================================================
  try {
    const apiEndpoint = isVideoFile ? '/api/upload-video' : '/api/upload';
    const fieldName = isVideoFile ? 'video' : 'image';

    const formData = new FormData();
    if (uploadPayload instanceof File || uploadPayload instanceof Blob) {
      formData.append(fieldName, uploadPayload, filename);
    } else {
      formData.append(fieldName, uploadPayload as string);
    }
    formData.append('folder', folder);
    formData.append('filename', filename);

    const expressRes = await fetch(apiEndpoint, {
      method: 'POST',
      body: formData,
    });

    const contentType = expressRes.headers.get('content-type') || '';
    if (expressRes.ok && contentType.includes('application/json')) {
      const data = await expressRes.json();
      if (data.success && data.url) {
        console.log('[Cloudinary] Upload succeeded via Tier 2 (Express server/multer)');
        return data.url;
      }
      if (data.url) {
        return data.url;
      }
    } else {
      console.log('[Cloudinary] Tier 2 Express server route returned non-JSON or status ' + expressRes.status);
    }
  } catch (err) {
    console.warn('[Cloudinary] Tier 2 (Express server route) unreachable:', err);
  }

  // =========================================================================
  // TIER 3: Existing Unsigned preset-based direct upload (Last-resort fallback)
  // =========================================================================
  console.log('[Cloudinary] Falling back to Tier 3 (Unsigned preset direct upload)...');
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'scholars_preset';

  if (!cloudName) {
    throw new Error(
      "Cloudinary configuration missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET environment variables."
    );
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${directResourceType}/upload`;

  const fallbackFormData = new FormData();
  if (uploadPayload instanceof File || uploadPayload instanceof Blob) {
    fallbackFormData.append('file', uploadPayload, filename);
  } else {
    fallbackFormData.append('file', uploadPayload as string);
  }
  fallbackFormData.append('upload_preset', uploadPreset);
  if (folder) {
    fallbackFormData.append('folder', folder);
  }

  const fallbackRes = await fetch(url, {
    method: 'POST',
    body: fallbackFormData,
  });

  if (!fallbackRes.ok) {
    const errData = await fallbackRes.json().catch(() => ({}));
    throw new Error(
      errData.error?.message ||
        `Cloudinary upload failed across all tiers (Status ${fallbackRes.status}).`
    );
  }

  const fallbackData = await fallbackRes.json();
  if (!fallbackData.secure_url) {
    throw new Error('Cloudinary response did not contain a valid URL.');
  }

  console.log('[Cloudinary] Upload succeeded via Tier 3 (Unsigned preset)');
  return fallbackData.secure_url;
}

/**
 * Deletes an asset from Cloudinary using Netlify Function / Express backend route.
 */
export async function deleteFromCloudinary(url: string): Promise<boolean> {
  if (!url || !url.includes('cloudinary.com')) return false;

  // Tier 1: Try /api/delete-cloudinary
  try {
    const res = await fetch('/api/delete-cloudinary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success) {
        console.log('[Cloudinary] Delete succeeded via /api/delete-cloudinary');
        return true;
      }
    }
  } catch (err) {
    console.warn('[Cloudinary] Delete API endpoint unreachable:', err);
  }

  // Tier 2: Try direct /.netlify/functions/delete-cloudinary fallback
  try {
    const netlifyRes = await fetch('/.netlify/functions/delete-cloudinary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const netlifyContentType = netlifyRes.headers.get('content-type') || '';
    if (netlifyRes.ok && netlifyContentType.includes('application/json')) {
      const netlifyData = await netlifyRes.json();
      if (netlifyData.success) {
        console.log('[Cloudinary] Delete succeeded via /.netlify/functions/delete-cloudinary');
        return true;
      }
    }
  } catch (err) {
    console.warn('[Cloudinary] Netlify Function delete endpoint unreachable:', err);
  }

  return false;
}
