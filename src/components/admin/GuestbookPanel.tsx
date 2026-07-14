import { useState, useEffect } from 'react';
import { Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { fetchGuestbook, deleteApprovedGuestbookEntry } from '../../lib/firebaseService';
import { GuestbookEntry } from '../../types';

interface GuestbookPanelProps {
  onDataChange: () => void;
  refreshKey?: number;
}

export default function GuestbookPanel({ onDataChange, refreshKey = 0 }: GuestbookPanelProps) {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await fetchGuestbook();
      setEntries(data);
    } catch (err) {
      console.error("Error loading guestbook:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [refreshKey]);

  const handleDelete = async (entry: GuestbookEntry) => {
    if (!confirm(`Are you sure you want to permanently delete this memory sticky note from "${entry.name}"?`)) {
      return;
    }

    setDeletingId(entry.id);
    try {
      await deleteApprovedGuestbookEntry(entry.id, entry.imageUrl);
      loadEntries();
      onDataChange();
    } catch (err: any) {
      alert("Error deleting guestbook entry: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-serif font-bold text-[#D4A017] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#D4A017]" />
            <span>Approved Memory Sticky Board ({entries.length})</span>
          </h3>
          <p className="text-[10px] text-white/40 font-mono mt-0.5">Manage and delete approved congratulatory sticky notes shown on the live wall.</p>
        </div>
      </div>

      {loading && (
        <div className="text-center py-10 text-xs font-mono text-[#D4A017] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Synchronizing sticky board entries...</span>
        </div>
      )}

      {!loading && entries.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl text-white/45">
          <p className="text-xs font-mono uppercase tracking-widest">No guestbook entries found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(entry => (
            <div 
              key={entry.id} 
              className="bg-[#050E22]/40 border border-white/5 rounded-2xl p-5 hover:border-rose-500/30 transition-all flex flex-col justify-between gap-4 relative"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-white font-mono">{entry.name}</h5>
                    <p className="text-[9px] text-[#D4A017] font-mono uppercase tracking-wider">{entry.role}</p>
                  </div>
                  <span className="text-[9px] text-white/30 font-mono">
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : 'Classic'}
                  </span>
                </div>

                <p className="text-xs text-white/80 italic font-serif leading-relaxed text-left">
                  "{entry.message}"
                </p>

                {entry.imageUrl && (
                  <img 
                    src={entry.imageUrl} 
                    className="w-full h-32 object-cover rounded-lg border border-white/5 bg-black/20" 
                    alt="Sticky image attachment"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              <div className="pt-3 border-t border-white/5 flex justify-end">
                <button
                  type="button"
                  disabled={deletingId === entry.id}
                  onClick={() => handleDelete(entry)}
                  className="py-1.5 px-3 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-500/20 hover:border-rose-500/40 transition-all text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {deletingId === entry.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Permanently Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
