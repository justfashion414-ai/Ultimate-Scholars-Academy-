import { uploadToCloudinary } from '../../lib/cloudinaryService';

export function getYouTubeID(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export const handleUploadImageFile = async (file: File): Promise<string> => {
  return uploadToCloudinary(file, { filename: file.name });
};

export const handleUploadVideoFile = async (file: File): Promise<string> => {
  return uploadToCloudinary(file, { resourceType: 'video', filename: file.name });
};
