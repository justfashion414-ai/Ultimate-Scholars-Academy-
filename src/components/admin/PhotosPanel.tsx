import { useState, useEffect, FormEvent, useRef } from 'react';
import { Camera, Trash2, Loader2, Upload, CheckCircle2 } from 'lucide-react';
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
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [submittedBy, setSubmittedBy] = useState('Admin Portal');
  const [role, setRole] = useState('Teacher');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [singleUrl, setSingleUrl] = useState('');

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 30);
      if (e.target.files.length > 30) {
        alert("Maximum 30 images can be uploaded at once. The first 30 images were selected.");
      }
      setSelectedFiles(files);
      setSingleUrl('');
    }
  };

  const handleSavePhoto = async (e: FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0 && !singleUrl) {
      alert("Please select image file(s) or provide an image URL.");
      return;
    }

    setActionLoading(true);
    try {
      if (selectedFiles.length > 0) {
        const total = selectedFiles.length;
        const baseTitle = title.trim() || 'Yearbook Memory';

        for (let i = 0; i < total; i++) {
          const file = selectedFiles[i];
          setUploadProgress(`Uploading photo ${i + 1} of ${total}...`);
          
          const uploadedUrl = await handleUploadImageFile(file);
          const photoTitle = total === 1 ? baseTitle : `${baseTitle} (${i + 1})`;

          await addPhoto({
            id: `photo-${Date.now()}-${i}`,
            title: photoTitle,
            url: uploadedUrl,
            uploadedAt: new Date().toISOString(),
            submittedBy: submittedBy || 'Admin Portal',
            role: role || 'Teacher'
          });
        }
      } else if (singleUrl) {
        setUploadProgress('Saving photo URL...');
        await addPhoto({
          id: `photo-${Date.now()}`,
          title: title.trim() || 'Yearbook Memory',
          url: singleUrl,
          uploadedAt: new Date().toISOString(),
          submittedBy: submittedBy || 'Admin Portal',
          role: role || 'Teacher'
        });
      }

      setTitle('');
      setSelectedFiles([]);
      setSingleUrl('');
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      await loadPhotos();
      onDataChange();
    } catch (err: any) {
      alert("Error uploading photos: " + (err.message || "Upload failed"));
    } finally {
      setActionLoading(false);
      setUploadProgress('');
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
        <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center justify-between text-left">
          <span className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Bulk Upload Photos to Album (Up to 30 Images at once)
          </span>
          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
            MAX 30 AT ONCE
          </span>
        </h4>

        <form onSubmit={handleSavePhoto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 text-left">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">
              Album Event Title / Group Caption
            </label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30"
              placeholder="e.g. Cultural Day Celebrations"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">
              Uploader Name / Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="text"
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                placeholder="Sender Name"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              >
                <option value="Teacher">Teacher / Admin</option>
                <option value="Student">Student</option>
                <option value="Parent">Parent</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2 space-y-2 text-left">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">
              Select Photos (Select up to 30 image files at once)
            </label>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-[#D4A017]/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-black/20 hover:bg-black/30"
            >
              <input 
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={actionLoading}
              />
              
              <Upload className="w-8 h-8 text-[#D4A017]/70 mx-auto mb-2" />
              
              {selectedFiles.length > 0 ? (
                <div>
                  <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    {selectedFiles.length} {selectedFiles.length === 1 ? 'image' : 'images'} selected (Ready for bulk upload)
                  </p>
                  <ul className="text-[10px] text-white/60 space-y-1 mt-2 max-h-24 overflow-y-auto text-left list-disc list-inside bg-black/30 p-2 rounded-lg">
                    {selectedFiles.map((file, idx) => (
                      <li key={idx} className="truncate">{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</li>
                    ))}
                  </ul>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFiles([]);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }} 
                    className="text-[10px] text-[#D4A017] underline mt-2 hover:text-white"
                  >
                    Clear selection
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-white">Click to select images from your computer or phone</p>
                  <p className="text-[10px] text-white/40 mt-1 uppercase font-mono tracking-wider">
                    Supports PNG, JPG, JPEG, WEBP — Up to 30 photos at once
                  </p>
                </div>
              )}
            </div>
          </div>

          {actionLoading && (
            <div className="md:col-span-2 bg-[#D4A017]/10 border border-[#D4A017]/30 p-3 rounded-xl flex items-center justify-center gap-2 text-xs text-[#D4A017] font-mono font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{uploadProgress || 'Processing upload...'}</span>
            </div>
          )}

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button 
              type="submit" 
              disabled={actionLoading || (selectedFiles.length === 0 && !singleUrl)}
              className="py-2.5 px-8 rounded-xl bg-[#D4A017] hover:bg-[#b58814] disabled:opacity-40 text-[#0F2557] font-serif font-bold text-xs cursor-pointer shadow-lg flex items-center gap-2 transition-all"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>
                {selectedFiles.length > 1 
                  ? `Bulk Upload ${selectedFiles.length} Photos Now` 
                  : 'Upload Photo Live'}
              </span>
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3 text-left">
        <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">
          Album Photo Gallery ({photosList.length})
        </h4>
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

