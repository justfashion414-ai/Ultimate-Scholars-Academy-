import { useState, useEffect, FormEvent } from 'react';
import { Award, Edit2, Trash2, Loader2 } from 'lucide-react';
import { fetchSuperlatives, addSuperlative, deleteApprovedSuperlative } from '../../lib/firebaseService';
import { Superlative } from '../../types';
import { handleUploadImageFile } from './adminUtils';

interface SuperlativesPanelProps {
  onDataChange: () => void;
  refreshKey?: number;
}

export default function SuperlativesPanel({ onDataChange, refreshKey = 0 }: SuperlativesPanelProps) {
  const [superlativesList, setSuperlativesList] = useState<Superlative[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [superlativeForm, setSuperlativeForm] = useState<Partial<Superlative>>({
    category: '', description: '', studentName: '', studentImage: ''
  });

  const loadSuperlatives = async () => {
    setLoading(true);
    try {
      const data = await fetchSuperlatives();
      setSuperlativesList(data);
    } catch (err) {
      console.error("Error loading superlatives:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuperlatives();
  }, [refreshKey]);

  const handleSaveSuperlative = async (e: FormEvent) => {
    e.preventDefault();
    if (!superlativeForm.category || !superlativeForm.studentName) {
      alert("Superlative Category and Recipient Student Name are required.");
      return;
    }

    setActionLoading(true);
    try {
      const targetId = superlativeForm.id || `sup-user-${Date.now()}`;
      const payload: Superlative = {
        id: targetId,
        category: superlativeForm.category,
        description: superlativeForm.description || 'Awarded with high honors',
        studentName: superlativeForm.studentName,
        studentImage: superlativeForm.studentImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop'
      };

      await addSuperlative(payload);
      setSuperlativeForm({ category: '', description: '', studentName: '', studentImage: '' });
      loadSuperlatives();
      onDataChange();
    } catch (err: any) {
      alert("Error saving superlative: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {loading && (
        <div className="text-center py-4 text-xs font-mono text-[#D4A017] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Synchronizing medal superlatives...</span>
        </div>
      )}

      <div className="bg-[#050E22]/60 p-6 rounded-2xl border border-white/5">
        <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center gap-2">
          <Award className="w-5 h-5" />
          {superlativeForm.id ? "Edit Superlative Award" : "Assign New Class Superlative Medal"}
        </h4>
        <form onSubmit={handleSaveSuperlative} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Superlative Title / Category</label>
            <input 
              type="text"
              required
              value={superlativeForm.category || ''}
              onChange={(e) => setSuperlativeForm(prev => ({...prev, category: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Most Likely to Succeed"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Award Recipient Student Name</label>
            <input 
              type="text"
              required
              value={superlativeForm.studentName || ''}
              onChange={(e) => setSuperlativeForm(prev => ({...prev, studentName: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Ebuka Obi-Uchendu"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Recipient Image File</label>
            <input 
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    setActionLoading(true);
                    const url = await handleUploadImageFile(file);
                    setSuperlativeForm(prev => ({...prev, studentImage: url}));
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setActionLoading(false);
                  }
                }
              }}
              className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20"
            />
            {superlativeForm.studentImage && (
              <img src={superlativeForm.studentImage} className="w-12 h-16 object-cover rounded border border-white/10 mt-1" />
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Description / Medal Citation</label>
            <input 
              type="text"
              value={superlativeForm.description || ''}
              onChange={(e) => setSuperlativeForm(prev => ({...prev, description: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. For showing unparalleled academic performance and vision"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            {superlativeForm.id && (
              <button 
                type="button" 
                onClick={() => setSuperlativeForm({ category: '', description: '', studentName: '', studentImage: '' })}
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
              <span>{superlativeForm.id ? "Update Award" : "Issue Superlative Award"}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Class Superlatives Wall & Medals ({superlativesList.length})</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {superlativesList.map(sup => (
            <div key={sup.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex gap-3 relative hover:border-[#D4A017]/45 transition-all">
              <img src={sup.studentImage} className="w-14 h-18 object-cover rounded-lg border border-white/10 bg-black/20" referrerPolicy="no-referrer" />
              <div className="space-y-1 text-xs truncate">
                <p className="font-serif font-bold text-white truncate">{sup.category}</p>
                <p className="text-[#D4A017] font-mono text-[9px] truncate">Recipient: {sup.studentName}</p>
                <p className="text-white/50 text-[9px] truncate font-serif italic">"{sup.description}"</p>
              </div>

              <div className="absolute top-2 right-2 flex gap-1">
                <button 
                  onClick={() => setSuperlativeForm(sup)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-[#D4A017] rounded-lg border border-white/5 cursor-pointer"
                  title="Edit Medal"
                >
                  <Edit2 size={11} />
                </button>
                <button 
                  onClick={async () => {
                    if (confirm(`Are you sure you want to permanently delete medal superlative "${sup.category}" awarded to "${sup.studentName}"?`)) {
                      try {
                        setActionLoading(true);
                        await deleteApprovedSuperlative(sup.id, sup.studentImage);
                        loadSuperlatives();
                        onDataChange();
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setActionLoading(false);
                      }
                    }
                  }}
                  className="p-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 rounded-lg border border-rose-500/20 cursor-pointer"
                  title="Delete Superlative"
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
