import { useState, useEffect, FormEvent, useRef } from 'react';
import { Video, Trash2, Play, Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { fetchVideos, addApprovedVideoMemory, deleteApprovedVideoMemory } from '../../lib/firebaseService';
import { VideoMemory } from '../../types';
import { getYouTubeID, handleUploadVideoFile } from './adminUtils';

interface VideosPanelProps {
  onDataChange: () => void;
  refreshKey?: number;
}

export default function VideosPanel({ onDataChange, refreshKey = 0 }: VideosPanelProps) {
  const [videosList, setVideosList] = useState<VideoMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [submittedBy, setSubmittedBy] = useState('Admin Portal');
  const [role, setRole] = useState('Teacher');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const data = await fetchVideos();
      setVideosList(data);
    } catch (err) {
      console.error("Error loading videos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [refreshKey]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 10);
      if (e.target.files.length > 10) {
        alert("Maximum 10 videos can be uploaded at once. The first 10 videos were selected.");
      }
      setSelectedFiles(files);
    }
  };

  const handleSaveVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      alert("Please select video file(s) to upload.");
      return;
    }

    setActionLoading(true);
    try {
      const total = selectedFiles.length;
      const baseTitle = title.trim() || 'Video Memory';

      for (let i = 0; i < total; i++) {
        const file = selectedFiles[i];
        setUploadProgress(`Uploading video ${i + 1} of ${total}...`);
        
        const uploadedUrl = await handleUploadVideoFile(file);
        const videoTitle = total === 1 ? baseTitle : `${baseTitle} (${i + 1})`;

        await addApprovedVideoMemory({
          id: `video-${Date.now()}-${i}`,
          title: videoTitle,
          url: uploadedUrl,
          thumbnailUrl: '',
          submittedBy: submittedBy || 'Admin Portal',
          role: role || 'Teacher',
          uploadedAt: new Date().toISOString()
        });
      }

      setTitle('');
      setSelectedFiles([]);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      await loadVideos();
      onDataChange();
    } catch (err: any) {
      alert("Error adding video: " + (err.message || "Upload failed"));
    } finally {
      setActionLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="space-y-8 text-left">
      {loading && (
        <div className="text-center py-4 text-xs font-mono text-[#D4A017] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Synchronizing video vault...</span>
        </div>
      )}

      <div className="bg-[#050E22]/60 p-6 rounded-2xl border border-white/5">
        <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Bulk Upload Videos to Vault (Up to 10 Videos at once)
          </span>
          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
            MAX 10 AT ONCE
          </span>
        </h4>

        <form onSubmit={handleSaveVideo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Video Title / Category</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30"
              placeholder="e.g. Graduation Ceremony Live Recording"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Sender Name / Role</label>
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
                className="w-full px-3 py-2 bg-[#050E22] border border-white/10 rounded-xl text-xs text-white"
              >
                <option value="Teacher">Teacher</option>
                <option value="Student">Student</option>
                <option value="Parent">Parent</option>
                <option value="Alumni">Alumni</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">
              Select Videos (Select up to 10 video files at once)
            </label>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-[#D4A017]/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-black/20 hover:bg-black/30"
            >
              <input 
                type="file"
                ref={fileInputRef}
                accept="video/*"
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
                    {selectedFiles.length} {selectedFiles.length === 1 ? 'video' : 'videos'} selected (Ready for bulk upload)
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
                  <p className="text-xs font-semibold text-white">Click to select video files from your computer or phone</p>
                  <p className="text-[10px] text-white/40 mt-1 uppercase font-mono tracking-wider">
                    MP4, WebM, MOV, or OGG — Up to 10 videos at once
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

          <div className="md:col-span-2 flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={actionLoading || selectedFiles.length === 0}
              className="py-2.5 px-8 rounded-xl bg-[#D4A017] hover:bg-[#b58814] disabled:opacity-40 text-[#0F2557] font-serif font-bold text-xs cursor-pointer shadow-lg flex items-center gap-2 transition-all"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>
                {selectedFiles.length > 1 
                  ? `Bulk Upload ${selectedFiles.length} Videos Now` 
                  : 'Publish Video Live'}
              </span>
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Video Vault Album ({videosList.length})</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {videosList.map(vid => (
            <div key={vid.id} className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 bg-black/40 group hover:border-[#D4A017]/55 transition-all">
              {vid.thumbnailUrl ? (
                <img src={vid.thumbnailUrl} className="w-full h-full object-cover filter brightness-75 group-hover:brightness-90 transition-all" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900/40">
                  <Play className="w-8 h-8 text-[#D4A017]/60" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-4 flex flex-col justify-end text-left">
                <p className="text-xs font-bold text-white truncate">{vid.title}</p>
                <p className="text-[9px] font-mono text-[#D4A017] truncate">By {vid.submittedBy} ({vid.role})</p>
                <p className="text-[8px] font-mono text-white/40">Uploaded {new Date(vid.uploadedAt).toLocaleDateString()}</p>
              </div>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={async () => {
                    if (confirm(`Are you sure you want to permanently delete video "${vid.title}"?`)) {
                      try {
                        setActionLoading(true);
                        await deleteApprovedVideoMemory(vid.id);
                        loadVideos();
                        onDataChange();
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setActionLoading(false);
                      }
                    }
                  }}
                  className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-500/20 cursor-pointer shadow-md"
                  title="Delete Video"
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
