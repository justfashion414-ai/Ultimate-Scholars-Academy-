import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, CheckCircle2, Loader2, ArrowRight, Play, Eye, Check, X 
} from 'lucide-react';
import { 
  fetchPendingSubmissions, 
  fetchStudents, 
  approveSubmission, 
  rejectSubmission,
  PendingSubmission
} from '../../lib/firebaseService';
import { Student } from '../../types';
import { getYouTubeID } from './adminUtils';

interface ModerationQueueProps {
  onDataChange: () => void;
  refreshKey?: number;
}

export default function ModerationQueue({ onDataChange, refreshKey = 0 }: ModerationQueueProps) {
  const [pendingItems, setPendingItems] = useState<PendingSubmission[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [actionLoading, setActionLoading] = useState<Record<string, 'approve' | 'reject' | null>>({});
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Media preview modal state
  const [previewMedia, setPreviewMedia] = useState<{
    id: string;
    type: 'image' | 'video';
    url: string;
    title: string;
    submittedBy?: string;
    role?: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setFeedbackMsg('');
    try {
      const [pending, students] = await Promise.all([
        fetchPendingSubmissions(),
        fetchStudents()
      ]);
      setPendingItems(pending);
      setStudentsList(students);
    } catch (err) {
      console.error("Error loading moderation queue data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const getStudentNameById = (id: string) => {
    const s = studentsList.find(student => student.id === id);
    return s ? s.name : "Unknown Student";
  };

  const getStudentImageById = (id: string) => {
    const s = studentsList.find(student => student.id === id);
    return s ? s.image : null;
  };

  const handleModerationAction = async (pendingId: string, action: 'approve' | 'reject') => {
    setActionLoading(prev => ({ ...prev, [pendingId]: action }));
    try {
      const item = pendingItems.find(i => i.id === pendingId);
      if (!item) return;

      if (action === 'approve') {
        await approveSubmission(item);
        setFeedbackMsg(`Item successfully approved and posted live!`);
      } else {
        await rejectSubmission(item);
        setFeedbackMsg(`Item rejected and purged from moderation queues.`);
      }

      setPendingItems(prev => prev.filter(i => i.id !== pendingId));
      onDataChange();
    } catch (err: any) {
      console.error('Error in moderation action:', err);
      alert(err.message || 'Failed to complete moderation action.');
    } finally {
      setActionLoading(prev => ({ ...prev, [pendingId]: null }));
    }
  };

  const triggerPreview = (item: PendingSubmission) => {
    const data = item.data;
    if (item.type === 'video_memory') {
      const ytId = getYouTubeID(data.url || '');
      const finalUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : data.url;
      setPreviewMedia({
        id: item.id,
        type: 'video',
        url: finalUrl,
        title: data.title || 'Video Contribution',
        submittedBy: data.submittedBy || 'Anonymous',
        role: data.role || 'Guest'
      });
    } else {
      const imgUrl = data.imageUrl || data.image || data.url || '';
      setPreviewMedia({
        id: item.id,
        type: 'image',
        url: imgUrl,
        title: data.title || data.name || 'Image Contribution',
        submittedBy: data.submittedBy || data.name || 'Anonymous',
        role: data.role || 'Guest'
      });
    }
  };

  const filteredPending = pendingItems.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-serif font-bold text-[#D4A017] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#D4A017]" />
            <span>Awaiting Approval Queue ({pendingItems.length})</span>
          </h3>
          <p className="text-[10px] text-white/40 font-mono mt-0.5">Moderate guest uploads and student portrait proposals before they go live.</p>
        </div>
        <div className="flex bg-[#050E22] p-1 rounded-lg border border-white/5 gap-1 overflow-x-auto max-w-full scrollbar-none whitespace-nowrap shrink-0">
          {['all', 'guestbook', 'student_add', 'student_portrait_update', 'video_memory', 'teacher_tribute', 'photo', 'timeline'].map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-2.5 py-1 rounded-md text-[9px] font-mono uppercase tracking-widest cursor-pointer transition-colors ${filterType === f ? 'bg-[#D4A017] text-[#0F2557] font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in text-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {loading && (
        <div className="text-center py-10 text-xs font-mono text-[#D4A017] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Synchronizing moderation queues...</span>
        </div>
      )}

      {!loading && filteredPending.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl text-white/45">
          <CheckCircle2 className="w-12 h-12 text-[#D4A017] mx-auto mb-3 opacity-60" />
          <h4 className="font-serif font-bold text-white/80">All Clean!</h4>
          <p className="text-xs font-mono uppercase tracking-widest mt-1">No pending guest or graduand posts awaiting review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPending.map(item => {
            const data = item.data;
            const isApproving = actionLoading[item.id] === 'approve';
            const isRejecting = actionLoading[item.id] === 'reject';

            return (
              <div key={item.id} className="bg-[#050E22]/40 border border-white/10 rounded-2xl p-5 hover:border-[#D4A017]/30 transition-all flex flex-col md:flex-row items-start justify-between gap-6">
                <div className="flex-grow space-y-3 w-full">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-[#D4A017]/10 border border-[#D4A017]/30 text-[#D4A017] font-mono text-[9px] font-bold uppercase tracking-wider">
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {item.type === 'guestbook' && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-white font-mono text-left">{data.name} ({data.role})</p>
                      <p className="text-xs text-white/80 italic font-serif text-left">"{data.message}"</p>
                      {data.imageUrl && (
                        <img 
                          src={data.imageUrl} 
                          onClick={() => triggerPreview(item)}
                          className="w-36 h-24 sm:w-24 sm:h-24 object-cover rounded-lg border border-white/10 mt-2 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                          referrerPolicy="no-referrer" 
                          title="Click to preview"
                        />
                      )}
                    </div>
                  )}

                  {item.type === 'student_add' && (
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <img 
                        src={data.image} 
                        onClick={() => triggerPreview(item)}
                        className="w-24 h-30 sm:w-16 sm:h-20 object-cover rounded-lg border border-white/10 bg-black/20 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all animate-fade-in" 
                        referrerPolicy="no-referrer" 
                        title="Click to preview"
                      />
                      <div className="space-y-1 text-xs text-left">
                        <p className="font-bold text-[#D4A017]">{data.name} ({data.nickname})</p>
                        <p className="text-white/60 font-mono text-[10px] uppercase">{data.house}</p>
                        <p className="text-white/70 italic">"Fav Memory: {data.favoriteMemory}"</p>
                      </div>
                    </div>
                  )}

                  {item.type === 'student_portrait_update' && (
                    <div className="space-y-2 text-left">
                      <p className="text-xs text-white">Replacing portrait of <strong className="text-[#D4A017]">{getStudentNameById(data.studentId)}</strong></p>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <span className="text-[8px] font-mono text-white/40 block mb-1">CURRENT</span>
                          <img 
                            src={getStudentImageById(data.studentId) || ''} 
                            className="w-16 h-20 sm:w-12 sm:h-16 object-cover rounded border border-white/5" 
                            referrerPolicy="no-referrer" 
                          />
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#D4A017]" />
                        <div className="text-center">
                          <span className="text-[8px] font-mono text-[#D4A017] block mb-1">PROPOSED</span>
                          <img 
                            src={data.image} 
                            onClick={() => triggerPreview(item)}
                            className="w-16 h-20 sm:w-12 sm:h-16 object-cover rounded border-2 border-emerald-500 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                            referrerPolicy="no-referrer" 
                            title="Click to preview"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {item.type === 'video_memory' && (
                    <div className="space-y-3 text-xs text-left">
                      <p className="font-bold text-white">{data.title}</p>
                      {data.urls && Array.isArray(data.urls) ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full max-w-lg mt-2">
                          {data.urls.map((url, i) => {
                            const thumb = data.thumbnailUrls?.[i] || "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=500";
                            return (
                              <div key={i} className="relative group aspect-video bg-black/20 rounded-lg overflow-hidden border border-white/5">
                                <img src={thumb} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const ytId = getYouTubeID(url);
                                    const finalUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : url;
                                    setPreviewMedia({
                                      id: item.id,
                                      type: 'video',
                                      url: finalUrl,
                                      title: `${data.title} (${i+1}/${data.urls.length})`,
                                      submittedBy: data.submittedBy || 'Contributor',
                                      role: data.role || 'Contributor'
                                    });
                                  }}
                                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors cursor-pointer"
                                >
                                  <Play className="w-4 h-4 text-[#D4A017]" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex gap-4 items-start">
                          {data.thumbnailUrl && (
                            <img 
                              src={data.thumbnailUrl} 
                              onClick={() => triggerPreview(item)}
                              className="w-32 h-20 sm:w-24 sm:h-16 object-cover rounded-lg border border-white/10 bg-black/20 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                              referrerPolicy="no-referrer" 
                            />
                          )}
                          <button 
                            type="button"
                            onClick={() => triggerPreview(item)}
                            className="text-xs text-[#D4A017] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3" /> Preview Video Memory
                          </button>
                        </div>
                      )}
                      <p className="text-white/50 font-mono text-[10px]">
                        Posted by {data.submittedBy} ({data.role})
                      </p>
                    </div>
                  )}

                  {item.type === 'teacher_tribute' && (
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <img 
                        src={data.image || "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400"} 
                        onClick={() => triggerPreview(item)}
                        className="w-24 h-24 sm:w-16 sm:h-16 object-cover rounded-lg border border-white/10 bg-black/20 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                        referrerPolicy="no-referrer" 
                        title="Click to preview"
                      />
                      <div className="space-y-1 text-xs text-left w-full">
                        <p className="font-bold text-[#D4A017]">{data.name} (Teacher of {data.subject})</p>
                        <p className="text-white/85 italic">"{data.message}"</p>
                      </div>
                    </div>
                  )}

                  {item.type === 'photo' && (
                    <div className="space-y-3 text-xs text-left">
                      <p className="font-bold text-white">{data.title}</p>
                      {data.urls && Array.isArray(data.urls) ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full max-w-lg mt-2">
                          {data.urls.map((url, i) => (
                            <img 
                              key={i} 
                              src={url} 
                              onClick={() => {
                                setPreviewMedia({
                                  id: item.id,
                                  type: 'image',
                                  url: url,
                                  title: `${data.title} (${i+1}/${data.urls.length})`,
                                  submittedBy: data.submittedBy || 'Contributor',
                                  role: data.role || 'Contributor'
                                });
                              }}
                              className="w-full aspect-video sm:w-16 sm:h-12 object-cover rounded-lg border border-white/10 bg-black/20 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all animate-fade-in" 
                              referrerPolicy="no-referrer" 
                            />
                          ))}
                        </div>
                      ) : (
                        <img 
                          src={data.url} 
                          onClick={() => triggerPreview(item)}
                          className="w-36 h-24 sm:w-24 sm:h-16 object-cover rounded-lg border border-white/10 bg-black/20 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all animate-fade-in" 
                          referrerPolicy="no-referrer" 
                          title="Click to preview"
                        />
                      )}
                      <p className="text-white/50 font-mono text-[10px]">
                        Submitted by {data.submittedBy} ({data.role})
                      </p>
                    </div>
                  )}

                  {item.type === 'timeline' && (
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {data.image && (
                        <img 
                          src={data.image} 
                          onClick={() => triggerPreview(item)}
                          className="w-36 h-24 sm:w-24 sm:h-16 object-cover rounded-lg border border-white/10 bg-black/20 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                          referrerPolicy="no-referrer" 
                          title="Click to preview"
                        />
                      )}
                      <div className="space-y-1 text-xs text-left">
                        <p className="font-bold text-[#D4A017]">{data.title} ({data.date})</p>
                        <p className="text-white/80">"{data.description}"</p>
                      </div>
                    </div>
                  )}

                  {/* Quick Preview Assist Button */}
                  {(data.imageUrl || data.image || data.url || data.urls) && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => triggerPreview(item)}
                        className="w-full sm:w-auto py-2 px-3.5 bg-white/5 hover:bg-white/10 active:scale-95 text-[#D4A017] font-mono text-[10px] font-bold rounded-xl border border-white/10 hover:border-[#D4A017]/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Immersive Media Inspect</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleModerationAction(item.id, 'approve')}
                    disabled={isApproving || isRejecting}
                    className="flex-1 md:flex-none py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleModerationAction(item.id, 'reject')}
                    disabled={isApproving || isRejecting}
                    className="flex-1 md:flex-none py-2 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Immersive preview modal */}
      <AnimatePresence>
        {previewMedia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 cursor-pointer" 
              onClick={() => setPreviewMedia(null)} 
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-4xl bg-[#030914] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh] md:max-h-[75vh]"
            >
              <button 
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* MEDIA PREVIEW FRAME */}
              <div className="w-full md:w-3/5 aspect-video md:aspect-auto md:h-full bg-black/40 flex items-center justify-center relative min-h-[250px]">
                {previewMedia.type === 'video' ? (
                  <iframe 
                    src={previewMedia.url} 
                    className="w-full h-full aspect-video border-0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen 
                  />
                ) : (
                  <img 
                    src={previewMedia.url} 
                    className="w-full h-full object-contain max-h-[40vh] md:max-h-full" 
                    referrerPolicy="no-referrer" 
                  />
                )}
              </div>

              {/* DETAILS SIDEBAR */}
              <div className="w-full md:w-2/5 p-6 md:p-8 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto">
                <div className="space-y-4 text-left">
                  <span className="text-[10px] font-mono text-[#D4A017] uppercase tracking-widest block">Proposed Content Details</span>
                  <h4 className="text-lg font-serif font-bold text-white leading-tight">{previewMedia.title}</h4>
                  
                  {previewMedia.submittedBy && (
                    <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 font-mono text-xs">
                      <p className="text-white/40 uppercase text-[9px] tracking-wider mb-1">PROPOSED BY</p>
                      <p className="text-white font-bold text-xs truncate">{previewMedia.submittedBy}</p>
                      <p className="text-[#D4A017] text-[10px] mt-0.5">{previewMedia.role || 'Contributor'}</p>
                    </div>
                  )}

                  <div className="text-[11px] text-white/50 leading-relaxed font-mono">
                    <p>• Safe verification on sandboxed DB</p>
                    <p>• Verified format and source integrity</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-6 border-t border-white/5 shrink-0">
                  <button
                    onClick={() => {
                      handleModerationAction(previewMedia.id, 'approve');
                      setPreviewMedia(null);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    onClick={() => {
                      handleModerationAction(previewMedia.id, 'reject');
                      setPreviewMedia(null);
                    }}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer border border-red-500/20"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
