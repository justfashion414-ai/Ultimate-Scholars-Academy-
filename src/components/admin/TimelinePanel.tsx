import { useState, useEffect, FormEvent } from 'react';
import { Calendar, Edit2, Trash2, Loader2 } from 'lucide-react';
import { fetchTimeline, addApprovedTimelineEvent, deleteApprovedTimelineEvent } from '../../lib/firebaseService';
import { TimelineEvent } from '../../types';
import { handleUploadImageFile } from './adminUtils';

interface TimelinePanelProps {
  onDataChange: () => void;
  refreshKey?: number;
}

export default function TimelinePanel({ onDataChange, refreshKey = 0 }: TimelinePanelProps) {
  const [timelineList, setTimelineList] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [timelineForm, setTimelineForm] = useState<Partial<TimelineEvent>>({
    date: '', title: '', description: '', image: ''
  });

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const data = await fetchTimeline();
      setTimelineList(data);
    } catch (err) {
      console.error("Error loading timeline:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [refreshKey]);

  const handleSaveTimeline = async (e: FormEvent) => {
    e.preventDefault();
    if (!timelineForm.title || !timelineForm.date) {
      alert("Milestone Title and Event Date are required.");
      return;
    }

    setActionLoading(true);
    try {
      const targetId = timelineForm.id || `time-user-${Date.now()}`;
      const payload: TimelineEvent = {
        id: targetId,
        title: timelineForm.title,
        date: timelineForm.date,
        description: timelineForm.description || '',
        image: timelineForm.image || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=400'
      };

      await addApprovedTimelineEvent(payload);
      setTimelineForm({ date: '', title: '', description: '', image: '' });
      loadTimeline();
      onDataChange();
    } catch (err: any) {
      alert("Error saving milestone: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {loading && (
        <div className="text-center py-4 text-xs font-mono text-[#D4A017] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Synchronizing timeline milestones...</span>
        </div>
      )}

      <div className="bg-[#050E22]/60 p-6 rounded-2xl border border-white/5">
        <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {timelineForm.id ? "Edit Journey Milestone" : "Add Journey Timeline Milestone"}
        </h4>
        <form onSubmit={handleSaveTimeline} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Milestone Title</label>
            <input 
              type="text"
              required
              value={timelineForm.title || ''}
              onChange={(e) => setTimelineForm(prev => ({...prev, title: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. First Academic Orientation"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Event Date / Period</label>
            <input 
              type="text"
              required
              value={timelineForm.date || ''}
              onChange={(e) => setTimelineForm(prev => ({...prev, date: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Sept 2020"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Event Image File</label>
            <input 
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    setActionLoading(true);
                    const url = await handleUploadImageFile(file);
                    setTimelineForm(prev => ({...prev, image: url}));
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setActionLoading(false);
                  }
                }
              }}
              className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20"
            />
            {timelineForm.image && (
              <img src={timelineForm.image} className="w-16 h-12 object-cover rounded border border-white/10 mt-1" />
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Milestone Description</label>
            <input 
              type="text"
              value={timelineForm.description || ''}
              onChange={(e) => setTimelineForm(prev => ({...prev, description: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="Write description details here..."
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            {timelineForm.id && (
              <button 
                type="button" 
                onClick={() => setTimelineForm({ date: '', title: '', description: '', image: '' })}
                className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
            <button 
              type="submit" 
              disabled={actionLoading}
              className="py-2 px-6 rounded-xl bg-[#D4A017] hover:bg-[#b58814] disabled:opacity-50 text-[#0F2557] font-bold text-xs cursor-pointer shadow-md flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{timelineForm.id ? "Update Milestone" : "Save Milestone"}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Academic Journey Milestones ({timelineList.length})</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {timelineList.map(ev => (
            <div key={ev.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex gap-3 relative hover:border-[#D4A017]/45 transition-all">
              <img src={ev.image} className="w-16 h-16 object-cover rounded-lg border border-white/10 bg-black/20" referrerPolicy="no-referrer" />
              <div className="space-y-1 text-xs truncate">
                <p className="font-serif font-bold text-white truncate">{ev.title}</p>
                <p className="text-[#D4A017] font-mono text-[9px] truncate">{ev.date}</p>
                <p className="text-white/50 text-[9px] truncate">{ev.description}</p>
              </div>

              <div className="absolute top-2 right-2 flex gap-1">
                <button 
                  onClick={() => setTimelineForm(ev)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-[#D4A017] rounded-lg border border-white/5 cursor-pointer"
                  title="Edit Event"
                >
                  <Edit2 size={11} />
                </button>
                <button 
                  onClick={async () => {
                    if (confirm(`Are you sure you want to permanently delete milestone event "${ev.title}"?`)) {
                      try {
                        setActionLoading(true);
                        await deleteApprovedTimelineEvent(ev.id, ev.image);
                        loadTimeline();
                        onDataChange();
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setActionLoading(false);
                      }
                    }
                  }}
                  className="p-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 rounded-lg border border-rose-500/20 cursor-pointer"
                  title="Delete Event"
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
