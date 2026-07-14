import { useState, useEffect, FormEvent } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { fetchPhotos, addPhoto, deleteApprovedPhoto } from '../../lib/firebaseService';
import { Photo } from '../../types';
import { handleUploadImageFile } from './adminUtils';

interface PhotosPanelProps {
  onDataChange: () => void;
  refreshKey?: number;
}

export default function PhotosPanel({ onDataChange, refreshKey = 0 }: PhotosPanelProps) {
  const [photosList, setPhotosList] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [photoForm, setPhotoForm] = useState({
    title: '', 
    url: '', 
    submittedBy: 'Admin Portal', 
    role: 'Teacher'
  });

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const data = await fetchPhotos();
      setPhotosList(data);
    } catch (err) {
      console.error("Error loading photos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [refreshKey]);

  const handleSavePhoto = async (e: FormEvent) => {
    e.preventDefault();
    if (!photoForm.title || !photoForm.url) {
      alert("Please provide both a title and an image.");
      return;
    }

    setActionLoading(true);
    try {
      await addPhoto({
        id: `photo-${Date.now()}`,
        title: photoForm.title,
        url: photoForm.url,
        uploadedAt: new Date().toISOString(),
        submittedBy: photoForm.submittedBy,
        role: photoForm.role
      });
      setPhotoForm({
        title: '', url: '', submittedBy: 'Admin Portal', role: 'Teacher'
      });
      loadPhotos();
      onDataChange();
    } catch (err: any) {
      alert("Error adding photo: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {loading && (
        <div className="text-center py-4 text-xs font-mono text-[#D4A017] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Synchronizing photo gallery...</span>
        </div>
      )}

      <div className="bg-[#050E22]/60 p-6 rounded-2xl border border-white/5">
        <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center gap-2 text-left">
          <Camera className="w-5 h-5" />
          Directly Post Photo to Yearbook Album
        </h4>
        <form onSubmit={handleSavePhoto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 text-left">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Photo Title / Caption</label>
            <input 
              type="text"
              required
              value={photoForm.title || ''}
              onChange={(e) => setPhotoForm(prev => ({...prev, title: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Interhouse Sports Day"
            />
          </div>
          <div className="space-y-1 text-left">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Photo Image File</label>
            <input 
              type="file"
              accept="image/*"
              required={!photoForm.url}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    setActionLoading(true);
                    const url = await handleUploadImageFile(file);
                    setPhotoForm(prev => ({...prev, url}));
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setActionLoading(false);
                  }
                }
              }}
              className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20"
            />
            {photoForm.url && (
              <img src={photoForm.url} className="w-24 h-16 object-cover rounded border border-white/10 mt-1" />
            )}
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button 
              type="submit" 
              disabled={actionLoading}
              className="py-2 px-6 rounded-xl bg-[#D4A017] hover:bg-[#b58814] disabled:opacity-50 text-[#0F2557] font-bold text-xs cursor-pointer shadow-md flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Upload Photo Live</span>
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3 text-left">
        <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Album Photo Gallery ({photosList.length})</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photosList.map(photo => (
            <div key={photo.id} className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 bg-black/40 group hover:border-[#D4A017]/55 transition-all">
              <img src={photo.url} className="w-full h-full object-cover filter brightness-90 group-hover:brightness-100 transition-all" referrerPolicy="no-referrer" />
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black to-black/0 text-left">
                <p className="text-[10px] font-sans font-bold text-white truncate">{photo.title}</p>
                <p className="text-[8px] font-mono text-white/50">Posted {new Date(photo.uploadedAt).toLocaleDateString()}</p>
              </div>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={async () => {
                    if (confirm(`Are you sure you want to permanently delete photo "${photo.title}"?`)) {
                      try {
                        setActionLoading(true);
                        await deleteApprovedPhoto(photo.id, photo.url);
                        loadPhotos();
                        onDataChange();
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setActionLoading(false);
                      }
                    }
                  }}
                  className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-500/20 cursor-pointer shadow-md"
                  title="Delete Photo"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
