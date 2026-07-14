import { compressImage } from '../../lib/imageCompressor';

export function getYouTubeID(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export const handleUploadImageFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const rawBase64 = reader.result as string;
        // Client-side compression to prevent payload limits and optimize bandwidth
        const base64data = await compressImage(rawBase64);
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64data, filename: file.name })
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const textError = await res.text();
          if (res.status === 413) {
            reject(new Error("The image file is too large to process. Please try a smaller file or compress it first."));
          } else {
            reject(new Error(`Server error (${res.status}): ${textError.substring(0, 100)}`));
          }
          return;
        }

        const data = await res.json();
        if (res.ok && data.url) {
          resolve(data.url);
        } else {
          reject(new Error(data.error || "Upload failed. Please check credentials."));
        }
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
  });
};
