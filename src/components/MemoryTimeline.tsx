import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Image as ImageIcon, Plus, X, Loader2, Check, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TimelineEvent } from '../types';
import { fetchTimeline, submitToModeration, deleteApprovedTimelineEvent } from '../lib/firebaseService';
import { compressImage } from '../lib/imageCompressor';

export default function MemoryTimeline({ 
  refreshKey,
  cleanUpMode = false,
  onDataChange,
  isPreview = false
}: { 
  refreshKey?: number;
  cleanUpMode?: boolean;
  onDataChange?: () => void;
  isPreview?: boolean;
}) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Add memory states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemory, setNewMemory] = useState({
    title: '',
    date: '',
    description: '',
    image: ''
  });
  const [selectedMemoryFile, setSelectedMemoryFile] = useState<File | null>(null);
  const [memoryPreview, setMemoryPreview] = useState<string>('');

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [successBannerMsg, setSuccessBannerMsg] = useState('');

  // Load from Firebase Firestore on mount or when admin updates data
  useEffect(() => {
    fetchTimeline()
      .then(data => {
        setEvents(data);
      })
      .catch(err => {
        console.error("Error fetching timeline events from Firestore:", err);
      });
  }, [refreshKey]);

  const handleImageError = (id: string) => {
    setFailedImages(prev => ({ ...prev, [id]: true }));
  };

  const handleDeleteTimelineEvent = async (event: TimelineEvent) => {
    if (confirm(`Are you sure you want to permanently delete timeline event "${event.title}"? This will also remove its photo from Cloudinary.`)) {
      try {
        await deleteApprovedTimelineEvent(event.id, event.image);
        if (onDataChange) onDataChange();
      } catch (err) {
        console.error("Failed to delete timeline event:", err);
        alert("Failed to delete this approved timeline event.");
      }
    }
  };

  // Handle uploading the memory picture directly to Cloudinary
  const handleMemoryImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be smaller than 5MB");
      return;
    }

    setUploadError("");
    if (memoryPreview) {
      URL.revokeObjectURL(memoryPreview);
    }
    
    setSelectedMemoryFile(file);
    setMemoryPreview(URL.createObjectURL(file as any));
  };

  // Handle saving new memory
  const handleSaveMemory = async (e: FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!newMemory.title.trim()) {
      setUploadError("Please provide a memory title.");
      return;
    }
    if (!newMemory.date.trim()) {
      setUploadError("Please provide a date.");
      return;
    }
    if (!selectedMemoryFile) {
      setUploadError("Please select a memory photo first.");
      return;
    }

    setUploading(true);
    let finalImageUrl = "";
    try {
      // Upload portrait to Cloudinary
      finalImageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const rawBase64 = reader.result as string;
          try {
            // Compress client-side to keep under payload limit and optimize performance
            const base64data = await compressImage(rawBase64);
            const response = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file: base64data, filename: selectedMemoryFile.name })
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              const textError = await response.text();
              if (response.status === 413) {
                reject(new Error("The image file is too large. Please select a smaller photo."));
              } else {
                reject(new Error(`Server error during upload (${response.status}): ${textError.substring(0, 100)}`));
              }
              return;
            }

            const data = await response.json();
            if (response.ok && data.success) {
              resolve(data.url);
            } else {
              reject(new Error(data.error || "Upload failed."));
            }
          } catch (err: any) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsDataURL(selectedMemoryFile);
      });

      const submissionData = {
        title: newMemory.title.trim(),
        date: newMemory.date.trim(),
        description: newMemory.description.trim() || "A wonderful memory captured at Scholars Academy.",
        image: finalImageUrl
      };

      const result = await submitToModeration('timeline', submissionData);

      if (result.success) {
        // Reset form
        setNewMemory({
          title: '',
          date: '',
          description: '',
          image: ''
        });
        setSelectedMemoryFile(null);
        if (memoryPreview) {
          URL.revokeObjectURL(memoryPreview);
          setMemoryPreview('');
        }
        setIsAddModalOpen(false);

        setSuccessBannerMsg("Yes, congratulations, your upload has been successful. It will reflect soon.");
        setShowSuccessBanner(true);
        setTimeout(() => setShowSuccessBanner(false), 8000);
      } else {
        setUploadError("Failed to submit memory to admin.");
      }
    } catch (err: any) {
      console.error("Submission failed:", err);
      setUploadError(err.message || "Network error. Failed to send school memory.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="py-24 px-4 md:px-8 bg-white border-t border-slate-100" id="memory-timeline">
      <div className="max-w-6xl mx-auto">
        
        {/* SECTION HEADER */}
        <div className="text-center mb-16 relative">
          <span className="inline-block px-3 py-1 rounded-full bg-[#0F2557]/5 border border-[#0F2557]/10 text-[#0F2557] text-xs font-mono tracking-wider uppercase mb-3">
            Academic Journey
          </span>
          <h2 className="text-3xl md:text-5xl font-serif text-[#0F2557] font-bold tracking-tight mb-2">
            Memory Timeline
          </h2>
          <div className="w-16 h-1 bg-[#D4A017] mx-auto mb-4" />
          <p className="text-slate-600 text-sm max-w-lg mx-auto leading-relaxed mb-6">
            Reliving the key milestones and unforgettable events that shaped our final year at Scholars Academy.
          </p>

          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-[#0F2557] hover:bg-[#1b3d7d] text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#D4A017]" />
              Add a School Memory / Milestone
            </button>
          </div>
        </div>

        {/* SUCCESS NOTIFICATION BANNER */}
        <AnimatePresence>
          {showSuccessBanner && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="max-w-4xl mx-auto mb-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-800 font-medium text-xs md:text-sm flex items-center gap-3 shadow-lg"
            >
              <Check className="w-5 h-5 text-emerald-500 shrink-0 bg-emerald-500/20 p-1 rounded-full border border-emerald-500/30" />
              <span>{successBannerMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TIMELINE BENTO GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {(isPreview ? events.slice(0, 4) : events).map((event, idx) => {
            const isImageFailed = failedImages[event.id];

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                onClick={() => {
                  if (cleanUpMode) {
                    handleDeleteTimelineEvent(event);
                  }
                }}
                className={`border rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-all relative group min-h-[300px] cursor-pointer ${
                  cleanUpMode
                    ? 'bg-rose-950/10 border-rose-500 hover:border-rose-400'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                {/* CHECKPOINT MARKER / TRASH BUTTON */}
                {cleanUpMode ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTimelineEvent(event);
                    }}
                    className="absolute top-4 right-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1.5 shadow-md transition-all z-10 cursor-pointer border border-rose-500"
                    title="Delete timeline event permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-[#D4A017] shadow-sm" />
                )}

                <div>
                  {/* DATE BADGE */}
                  <div className="flex items-center gap-1.5 text-[#D4A017] font-mono text-[10px] font-bold mb-3 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{event.date.split(',')[0]}</span>
                  </div>

                  {/* EVENT TITLE */}
                  <h3 className="text-[#0F2557] font-serif font-bold text-base mb-2 group-hover:text-[#D4A017] transition-colors">
                    {event.title}
                  </h3>

                  {/* DESCRIPTION */}
                  <p className="text-slate-600 text-xs leading-relaxed mb-4 line-clamp-4">
                    {event.description}
                  </p>
                </div>

                {/* IMAGE FRAME */}
                <div className="w-full aspect-[16/10] rounded-xl overflow-hidden shadow-inner bg-slate-200 border border-slate-100 mt-auto">
                  {isImageFailed ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-[10px] font-mono">Scholars Gallery</span>
                    </div>
                  ) : (
                    <img
                      src={event.image}
                      alt={event.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover filter brightness-95 group-hover:scale-105 transition-transform duration-500"
                      onError={() => handleImageError(event.id)}
                      loading="lazy"
                    />
                  )}
                </div>
              </motion.div>
            );
          })}

        </div>

        {/* ADD MEMORY MODAL DIALOG */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-10">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[#050E22]/90 backdrop-blur-md"
                onClick={() => setIsAddModalOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full z-10 border border-[#0F2557]/20 text-slate-800 p-6 md:p-8"
              >
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <h3 className="text-2xl font-serif font-bold text-[#0F2557] mb-1 flex items-center gap-2">
                  <ImageIcon className="w-6 h-6 text-[#D4A017]" />
                  Add a Class Memory
                </h3>
                <p className="text-slate-500 text-xs font-mono mb-6 uppercase tracking-wider">
                  Upload a photo to write yourself into Scholars history!
                </p>

                <form onSubmit={handleSaveMemory} className="space-y-4 text-left">
                  {/* PHOTO UPLOADER */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                      Memory Photo (Required)
                    </label>
                    
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 hover:border-[#0F2557]/30 transition-all relative cursor-pointer min-h-[140px]">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleMemoryImageUpload}
                        disabled={uploading}
                      />
                      
                      {uploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-8 h-8 text-[#0F2557] animate-spin mb-2" />
                          <span className="text-xs text-slate-500 font-mono">Uploading photo...</span>
                        </div>
                      ) : memoryPreview ? (
                        <div className="flex items-center gap-3 w-full">
                          <div className="w-20 aspect-[16/10] rounded-lg overflow-hidden border border-[#D4A017] shrink-0">
                            <img src={memoryPreview} alt="Selected memory preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                          <div className="text-left">
                            <span className="text-xs text-[#0F2557] font-mono font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Photo Selected!
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">Ready to submit</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center">
                          <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-xs text-slate-600 font-mono">Select Memory Image</span>
                          <span className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* MEMORY FIELDS */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                        Memory Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Science Fair"
                        value={newMemory.title}
                        onChange={e => setNewMemory(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2557]/10 focus:border-[#0F2557]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                        Date / Month
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. June 15, 2026"
                        value={newMemory.date}
                        onChange={e => setNewMemory(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2557]/10 focus:border-[#0F2557]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Brief Description
                    </label>
                    <textarea
                      placeholder="Share a sweet note about what happened, who was there, and why it is unforgettable..."
                      rows={3}
                      value={newMemory.description}
                      onChange={e => setNewMemory(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2557]/10 focus:border-[#0F2557]"
                    />
                  </div>

                  {uploadError && (
                    <p className="text-red-500 text-xs font-mono">{uploadError}</p>
                  )}

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0F2557] hover:bg-[#193a7c] text-white flex items-center gap-1 transition-all shadow-md cursor-pointer"
                    >
                      Save Memory
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {isPreview && (
          <div className="text-center mt-12">
            <Link
              to="/timeline"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#0F2557] to-[#16377c] text-white rounded-full text-sm font-semibold shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <span>Explore Complete Timeline Milestones</span>
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}
