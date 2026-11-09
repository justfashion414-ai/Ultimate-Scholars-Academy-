import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { uploadToCloudinary } from '../../lib/cloudinaryService';
import { CodingStudentProfile } from '../../types';
import { saveStudentProfile } from '../../lib/firebaseService';

interface ProfileAvatarProps {
  profile: CodingStudentProfile;
  onUpdated: (p: CodingStudentProfile) => void;
  size?: 'sm' | 'lg';
}

/** Student profile picture: click to upload, saves to Cloudinary + the student's Firestore doc. */
export default function ProfileAvatar({ profile, onUpdated, size = 'sm' }: ProfileAvatarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const dims = size === 'lg' ? 'w-16 h-16' : 'w-9 h-9';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image too large. Maximum 8 MB.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const url = await uploadToCloudinary(file, {
        folder: 'scholars_class_2026/profile_pics',
        filename: `pic_${profile.studentId}`
      });
      const updated: CodingStudentProfile = { ...profile, photoUrl: url };
      await saveStudentProfile(updated);
      onUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="relative group shrink-0">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title={profile.photoUrl ? 'Change profile picture' : 'Upload profile picture'}
        className={`${dims} rounded-full overflow-hidden border-2 border-[#D4A017]/60 bg-white/10 flex items-center justify-center cursor-pointer hover:border-[#D4A017] transition-colors`}
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 text-[#D4A017] animate-spin" />
        ) : profile.photoUrl ? (
          <img src={profile.photoUrl} alt={profile.studentName} className="w-full h-full object-cover" />
        ) : (
          <Camera className={size === 'lg' ? 'w-6 h-6 text-white/60' : 'w-4 h-4 text-white/60'} />
        )}
      </button>
      <span className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-[#D4A017] text-[#0F2557] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <Camera className="w-2.5 h-2.5" />
      </span>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && (
        <p className="absolute top-full mt-1 left-0 text-[9px] text-rose-300 whitespace-nowrap z-50">{error}</p>
      )}
    </div>
  );
}
