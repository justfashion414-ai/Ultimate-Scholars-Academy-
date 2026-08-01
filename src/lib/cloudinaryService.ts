import { compressImage } from './imageCompressor';

export interface UploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'auto';
  filename?: string;
}

/**
 * Universal Cloudinary upload service.
 * 1. Tries server API endpoint (/api/upload or /api/upload-video) first.
 * 2. If the endpoint is unavailable (e.g., static hosting on Netlify where /api/upload returns SPA HTML),
 *    it seamlessly falls back to direct client-side Cloudinary upload using VITE_CLOUDINARY_CLOUD_NAME & VITE_CLOUDINARY_UPLOAD_PRESET.
 */
export async function uploadToCloudinary(
  fileOrBase64: File | string,
  options: UploadOptions = {}
): Promise<string> {
  const { folder = 'scholars_album', resourceType = 'auto', filename = 'file' } = options;

  let processedInput = fileOrBase64;
  
  // Compress if it's a raw base64 image
  if (typeof processedInput === 'string' && processedInput.startsWith('data:image')) {
    try {
      processedInput = await compressImage(processedInput);
    } catch {
      // Ignore error and use original string
    }
  }

  // 1. Try server endpoint first
  try {
    const isVideoFile = fileOrBase64 instanceof File && fileOrBase64.type.startsWith('video/');
    const apiEndpoint = isVideoFile ? '/api/upload-video' : '/api/upload';

    let res: Response;
    if (isVideoFile && fileOrBase64 instanceof File) {
      const formData = new FormData();
      formData.append('video', fileOrBase64);
      formData.append('folder', folder);
      res = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });
    } else {
      let filePayload: string;
      if (processedInput instanceof File) {
        filePayload = await fileToBase64(processedInput);
        if (filePayload.startsWith('data:image')) {
          try {
            filePayload = await compressImage(filePayload);
          } catch {
            // Ignore
          }
        }
      } else {
        filePayload = processedInput;
      }

      res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: filePayload, folder, filename }),
      });
    }

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
      if (data.url) {
        return data.url;
      }
    }
  } catch (serverErr) {
    console.warn("Express upload route unreachable, falling back to direct client-side upload...", serverErr);
  }

  // 2. Fallback: Direct client-side Cloudinary upload (for Netlify)
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'scholars_preset';

  if (!cloudName) {
    throw new Error(
      "Static hosting detected (Netlify). Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to Netlify Environment Variables to enable photo/video uploads."
    );
  }

  const directResourceType = resourceType === 'auto'
    ? (fileOrBase64 instanceof File && fileOrBase64.type.startsWith('video/') ? 'video' : 'image')
    : resourceType;

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${directResourceType}/upload`;

  const formData = new FormData();
  if (fileOrBase64 instanceof File) {
    formData.append('file', fileOrBase64);
  } else {
    formData.append('file', processedInput as string);
  }
  formData.append('upload_preset', uploadPreset);
  if (folder) {
    formData.append('folder', folder);
  }

  const directRes = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!directRes.ok) {
    const errData = await directRes.json().catch(() => ({}));
    throw new Error(
      errData.error?.message || `Direct Cloudinary upload failed (Status ${directRes.status}). Ensure '${uploadPreset}' is set up as an Unsigned upload preset in Cloudinary.`
    );
  }

  const directData = await directRes.json();
  if (!directData.secure_url) {
    throw new Error("Cloudinary response did not contain a valid URL.");
  }

  return directData.secure_url;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function deleteFromCloudinary(url: string): Promise<boolean> {
  if (!url || !url.includes('cloudinary.com')) return false;

  try {
    const res = await fetch('/api/delete-cloudinary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return true;
    }
  } catch (err) {
    console.warn("Delete API endpoint unreachable on static host:", err);
  }
  return false;
}
