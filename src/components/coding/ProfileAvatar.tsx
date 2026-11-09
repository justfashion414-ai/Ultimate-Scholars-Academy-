import { useRef, useState } from 'react';
import { Camera, Loader2, LogOut, UserCog, X, Check, Palette, Code2 } from 'lucide-react';
import { uploadToCloudinary } from '../../lib/cloudinaryService';
import { CodingStudentProfile } from '../../types';
import { saveStudentProfile } from '../../lib/firebaseService';

interface ProfileAvatarProps {
  profile: CodingStudentProfile;
  onUpdated: (p: CodingStudentProfile) => void;
  onSignOut?: () => void;
  size?: 'sm' | 'lg';
}

function initialsOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Professional profile avatar: initials until a photo is uploaded, with a menu for editing the profile and signing out. */
export default function ProfileAvatar({ profile, onUpdated, onSignOut, size = 'sm' }: ProfileAvatarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const dims = size === 'lg' ? 'w-16 h-16 text-lg' : 'w-9 h-9 text-[11px]';

  const openEditor = () => {
    setMenuOpen(false);
    setNameDraft(profile.studentName || '');
    setError('');
    setDone(false);
    setEditOpen(true);
  };

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
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSaveName = async () => {
    const name = nameDraft.trim();
    if (!name) {
      setError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated: CodingStudentProfile = { ...profile, studentName: name };
      await saveStudentProfile(updated);
      onUpdated(updated);
      setDone(true);
      setTimeout(() => setEditOpen(false), 700);
    } catch (err: any) {
      setError(err.message || 'Could not save changes. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const avatarVisual = (cls: string) => (
    <span className={`${cls} rounded-full overflow-hidden border-2 border-[#D4A017]/60 bg-gradient-to-br from-[#0F2557] to-[#071126] flex items-center justify-center font-bold text-[#D4A017] select-none`}>
      {profile.photoUrl ? (
        <img src={profile.photoUrl} alt={profile.studentName} className="w-full h-full object-cover" />
      ) : (
        initialsOf(profile.studentName)
      )}
    </span>
  );

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        title="Profile menu"
        className={`${dims} cursor-pointer hover:border-[#D4A017] transition-all hover:scale-105`}
      >
        {avatarVisual(`${dims} inline-flex`)}
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#0b1739] border border-white/15 shadow-2xl z-50 overflow-hidden">
            <div className="p-4 flex items-center gap-3 border-b border-white/10">
              {avatarVisual('w-11 h-11 text-sm inline-flex shrink-0')}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{profile.studentName}</p>
                <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-[#D4A017]/15 text-[#D4A017] text-[9px] font-bold border border-[#D4A017]/30">
                  {(profile.track || 'coding') === 'graphics' ? <Palette className="w-2.5 h-2.5" /> : <Code2 className="w-2.5 h-2.5" />}
                  {(profile.track || 'coding') === 'graphics' ? 'Graphics Track' : 'Coding Track'}
                </span>
              </div>
            </div>
            <div className="p-1.5 space-y-0.5">
              <button
                onClick={openEditor}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                <UserCog className="w-4 h-4 text-[#D4A017]" />
                Edit profile
              </button>
              {onSignOut && (
                <button
                  onClick={() => { setMenuOpen(false); onSignOut(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-300 hover:text-rose-200 hover:bg-rose-500/15 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1739] border border-white/15 rounded-3xl p-6 max-w-sm w-full space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Edit profile</h3>
              <button onClick={() => setEditOpen(false)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                title="Upload profile picture"
                className="relative group cursor-pointer"
              >
                {avatarVisual('w-20 h-20 text-xl inline-flex')}
                <span className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${uploading ? 'opacity-100' : ''}`}>
                  {uploading ? <Loader2 className="w-5 h-5 text-[#D4A017] animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                </span>
              </button>
              <p className="text-[10px] text-white/40">Tap the photo to {profile.photoUrl ? 'change it' : 'upload one'} (JPG or PNG, max 8 MB)</p>
              {done && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">Full name</label>
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4A017]"
              />
            </div>

            {error && <p className="text-[11px] text-rose-300">{error}</p>}

            <button
              onClick={handleSaveName}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
        </div>
      )}
    </div>
  );
}
