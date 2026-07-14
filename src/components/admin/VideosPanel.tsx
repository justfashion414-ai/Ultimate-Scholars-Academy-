import { useState, useEffect, FormEvent } from 'react';
import { Video, Trash2, Play, Loader2 } from 'lucide-react';
import { fetchVideos, addApprovedVideoMemory, deleteApprovedVideoMemory } from '../../lib/firebaseService';
import { VideoMemory } from '../../types';
import { getYouTubeID } from './adminUtils';

interface VideosPanelProps {
  onDataChange: () => void;
  refreshKey?: number;
}

export default function VideosPanel({ onDataChange, refreshKey = 0 }: VideosPanelProps) {
  const [videosList, setVideosList] = useState<VideoMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [videoForm, setVideoForm] = useState({
    title: '', url: '', submittedBy: 'Admin Portal', role: 'Teacher', thumbnailUrl: ''
  });

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

  const handleSaveVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!videoForm.title || !videoForm.url) {
      alert("Please provide both a title and a video link.");
      return;
    }

    setActionLoading(true);
    try {
      let finalThumb = videoForm.thumbnailUrl || '';
      if (!finalThumb) {
        const ytId = getYouTubeID(videoForm.url);
        if (ytId) {
          finalThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        }
      }

      await addApprovedVideoMemory({
        id: `video-${Date.now()}`,
        title: videoForm.title,
        url: videoForm.url,
        thumbnailUrl: finalThumb,
        submittedBy: videoForm.submittedBy || 'Admin Portal',
        role: videoForm.role || 'Teacher',
        uploadedAt: new Date().toISOString()
      });

      setVideoForm({
        title: '', url: '', submittedBy: 'Admin Portal', role: 'Teacher', thumbnailUrl: ''
      });
      loadVideos();
      onDataChange();
    } catch (err: any) {
      alert("Error adding video: " + err.message);
    } finally {
      setActionLoading(false);
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
        <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center gap-2">
          <Video className="w-5 h-5" />
          Post YouTube Video / Memories
        </h4>
        <form onSubmit={handleSaveVideo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Video Title</label>
            <input 
              type="text"
              required
              value={videoForm.title}
              onChange={(e) => setVideoForm(prev => ({...prev, title: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Graduation Ceremony Live Recording"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">YouTube Link / Video URL</label>
            <input 
              type="url"
              required
              value={videoForm.url}
              onChange={(e) => setVideoForm(prev => ({...prev, url: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Sender Name (Optional)</label>
            <input 
              type="text"
              value={videoForm.submittedBy}
              onChange={(e) => setVideoForm(prev => ({...prev, submittedBy: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="Admin Portal"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Sender Role</label>
            <select
              value={videoForm.role}
              onChange={(e) => setVideoForm(prev => ({...prev, role: e.target.value}))}
              className="w-full px-3 py-2 bg-[#050E22] border border-white/10 rounded-xl text-xs text-white"
            >
              <option value="Teacher">Teacher</option>
              <option value="Student">Student</option>
              <option value="Parent">Parent</option>
              <option value="Alumni">Alumni</option>
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={actionLoading}
              className="py-2 px-6 rounded-xl bg-[#D4A017] hover:bg-[#b58814] disabled:opacity-50 text-[#0F2557] font-bold text-xs cursor-pointer shadow-md flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Publish Video Live</span>
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
