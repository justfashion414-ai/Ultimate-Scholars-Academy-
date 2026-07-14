import { useState, useEffect, FormEvent } from 'react';
import { Quote, Edit2, Trash2, Loader2 } from 'lucide-react';
import { fetchTeacherTributes, addTeacherTribute, deleteApprovedTeacherTribute } from '../../lib/firebaseService';
import { TeacherTribute } from '../../types';
import { handleUploadImageFile } from './adminUtils';

interface TeacherTributesPanelProps {
  onDataChange: () => void;
  refreshKey?: number;
}

export default function TeacherTributesPanel({ onDataChange, refreshKey = 0 }: TeacherTributesPanelProps) {
  const [tributesList, setTributesList] = useState<TeacherTribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [tributeForm, setTributeForm] = useState<Partial<TeacherTribute>>({
    name: '', subject: '', message: '', image: ''
  });

  const loadTributes = async () => {
    setLoading(true);
    try {
      const data = await fetchTeacherTributes();
      setTributesList(data);
    } catch (err) {
      console.error("Error loading teacher tributes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTributes();
  }, [refreshKey]);

  const handleSaveTribute = async (e: FormEvent) => {
    e.preventDefault();
    if (!tributeForm.name || !tributeForm.message) {
      alert("Teacher Name and Parting Message are required.");
      return;
    }

    setActionLoading(true);
    try {
      const targetId = tributeForm.id || `trib-user-${Date.now()}`;
      const payload: TeacherTribute = {
        id: targetId,
        name: tributeForm.name,
        subject: tributeForm.subject || 'Faculty Advisor',
        message: tributeForm.message,
        image: tributeForm.image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=256&h=256&fit=crop'
      };

      await addTeacherTribute(payload);
      setTributeForm({ name: '', subject: '', message: '', image: '' });
      loadTributes();
      onDataChange();
    } catch (err: any) {
      alert("Error saving teacher tribute: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {loading && (
        <div className="text-center py-4 text-xs font-mono text-[#D4A017] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Synchronizing teacher tributes...</span>
        </div>
      )}

      <div className="bg-[#050E22]/60 p-6 rounded-2xl border border-white/5">
        <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center gap-2">
          <Quote className="w-5 h-5" />
          {tributeForm.id ? "Edit Teacher Tribute" : "Publish Teacher Tribute / Parting Wisdom"}
        </h4>
        <form onSubmit={handleSaveTribute} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Teacher / Advisor Name</label>
            <input 
              type="text"
              required
              value={tributeForm.name || ''}
              onChange={(e) => setTributeForm(prev => ({...prev, name: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Dr. John Doe"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Subject / Department</label>
            <input 
              type="text"
              value={tributeForm.subject || ''}
              onChange={(e) => setTributeForm(prev => ({...prev, subject: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Physics / Form Teacher"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Teacher Portrait Image File</label>
            <input 
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    setActionLoading(true);
                    const url = await handleUploadImageFile(file);
                    setTributeForm(prev => ({...prev, image: url}));
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setActionLoading(false);
                  }
                }
              }}
              className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20"
            />
            {tributeForm.image && (
              <img src={tributeForm.image} className="w-16 h-16 object-cover rounded-lg border border-white/10 mt-1" />
            )}
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Parting Message / Wise Counsel</label>
            <textarea 
              rows={3}
              required
              value={tributeForm.message || ''}
              onChange={(e) => setTributeForm(prev => ({...prev, message: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-serif italic"
              placeholder="Write parting thoughts, blessings, or advice to the graduating class..."
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            {tributeForm.id && (
              <button 
                type="button" 
                onClick={() => setTributeForm({ name: '', subject: '', message: '', image: '' })}
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
              <span>{tributeForm.id ? "Update Tribute" : "Publish Tribute"}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Active Teacher Tributes ({tributesList.length})</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tributesList.map(tr => (
            <div key={tr.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex gap-3 relative hover:border-[#D4A017]/45 transition-all">
              <img src={tr.image} className="w-14 h-14 object-cover rounded-full border border-white/10 bg-black/20" referrerPolicy="no-referrer" />
              <div className="space-y-1 text-xs truncate">
                <p className="font-serif font-bold text-white truncate">{tr.name}</p>
                <p className="text-[#D4A017] font-mono text-[9px] truncate">{tr.subject}</p>
                <p className="text-white/50 text-[9px] truncate font-serif italic">"{tr.message}"</p>
              </div>

              <div className="absolute top-2 right-2 flex gap-1">
                <button 
                  onClick={() => setTributeForm(tr)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-[#D4A017] rounded-lg border border-white/5 cursor-pointer"
                  title="Edit Tribute"
                >
                  <Edit2 size={11} />
                </button>
                <button 
                  onClick={async () => {
                    if (confirm(`Are you sure you want to permanently delete teacher tribute for "${tr.name}"?`)) {
                      try {
                        setActionLoading(true);
                        await deleteApprovedTeacherTribute(tr.id, tr.image);
                        loadTributes();
                        onDataChange();
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setActionLoading(false);
                      }
                    }
                  }}
                  className="p-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 rounded-lg border border-rose-500/20 cursor-pointer"
                  title="Delete Tribute"
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
