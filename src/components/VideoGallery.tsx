import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Video, Plus, X, Loader2, Check, VideoOff, Award, Film, User, Link as LinkIcon, Upload, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VideoMemory } from '../types';
import { fetchVideos, submitToModeration, deleteApprovedVideoMemory } from '../lib/firebaseService';

export default function VideoGallery({ 
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
  const [videos, setVideos] = useState<VideoMemory[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('All');

  function getItemYear(item: { title: string; uploadedAt?: string }) {
    const match = item.title.match(/\b(202[0-9])\b/);
    if (match) {
      return match[1];
    }
    if (item.uploadedAt) {
      const yearMatch = item.uploadedAt.match(/^(202[0-9])/);
      if (yearMatch) {
        return yearMatch[1];
      }
    }
    return "2026";
  }
  
  // Modal states
  const [activeVideo, setActiveVideo] = useState<VideoMemory | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [successBannerMsg, setSuccessBannerMsg] = useState('');

  // Form states
  const [newVideo, setNewVideo] = useState({
    title: '',
    submittedBy: '',
    role: 'Student',
    url: '',
    thumbnailUrl: ''
  });
  const [submissionType, setSubmissionType] = useState<'link' | 'file'>('link');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load videos on mount or when refreshKey updates
  useEffect(() => {
    setLoadingVideos(true);
    fetchVideos()
      .then(data => {
        setVideos(data);
      })
      .catch(err => {
        console.error("Error fetching videos:", err);
      })
      .finally(() => {
        setLoadingVideos(false);
      });
  }, [refreshKey]);

  const handleDeleteVideoClick = async (vid: VideoMemory) => {
    if (confirm(`Are you sure you want to permanently delete video "${vid.title}"? This will also remove any hosted video/thumbnail files on Cloudinary.`)) {
      try {
        await deleteApprovedVideoMemory(vid.id, vid.url, vid.thumbnailUrl);
        if (onDataChange) onDataChange();
      } catch (err) {
        console.error("Failed to delete video:", err);
        alert("Failed to delete this approved video.");
      }
    }
  };

  // Handle direct file drag & drop or selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 5) {
      setUploadError("You can only upload up to 5 videos at a time.");
      return;
    }

    const selected: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("video/")) {
        setUploadError(`Please select valid video files only ("${file.name}" is not a video).`);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setUploadError(`Each video must be smaller than 15MB ("${file.name}" is too large).`);
        return;
      }
      selected.push(file);
    }

    setSelectedFiles(selected);
    setUploadError("");
  };

  const uploadVideoFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          const res = await fetch('/api/upload-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file: base64data,
              filename: file.name
            })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            resolve(data.url);
          } else {
            reject(new Error(data.error || "Failed to upload video file."));
          }
        } catch (err) {
          reject(new Error("Network error during video upload."));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read video file."));
      reader.readAsDataURL(file);
    });
  };

  // Submit new video to Admin Gatekeeper
  const handleSubmitVideo = async (e: FormEvent) => {
    e.preventDefault();
    setUploadError("");
    setSubmitting(true);

    try {
      // 1. If upload type is file, perform the server upload first
      if (submissionType === 'file') {
        if (!selectedFiles || selectedFiles.length === 0) {
          setUploadError("Please select a video file first.");
          setSubmitting(false);
          return;
        }
        setUploading(true);
        try {
          const uploadedUrls: string[] = [];
          const thumbnailUrls: string[] = [];
          
          for (const file of selectedFiles) {
            const url = await uploadVideoFile(file);
            uploadedUrls.push(url);
            
            // Generate thumbnail URL
            let thumbUrl = "";
            if (url.includes("cloudinary.com")) {
              let thumb = url;
              const lastDot = thumb.lastIndexOf(".");
              if (lastDot !== -1) {
                thumb = thumb.substring(0, lastDot) + ".jpg";
              }
              thumb = thumb.replace("/video/upload/", "/video/upload/so_1/");
              thumbUrl = thumb;
            } else {
              try {
                const frameBase64 = await extractVideoFrame(file);
                const thumbRes = await fetch('/api/upload', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    file: frameBase64,
                    filename: `thumb-${Date.now()}.jpg`
                  })
                });
                const thumbData = await thumbRes.json();
                if (thumbRes.ok && thumbData.success) {
                  thumbUrl = thumbData.url;
                }
              } catch (e) {
                thumbUrl = "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=500&auto=format&fit=crop";
              }
            }
            thumbnailUrls.push(thumbUrl || "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=500&auto=format&fit=crop");
          }

          const submissionData = {
            title: newVideo.title,
            submittedBy: newVideo.submittedBy,
            role: newVideo.role,
            urls: uploadedUrls,
            thumbnailUrls: thumbnailUrls,
            url: uploadedUrls[0],
            thumbnailUrl: thumbnailUrls[0],
            uploadedAt: new Date().toISOString()
          };

          const result = await submitToModeration('video_memory', submissionData);

          if (result.success) {
            setNewVideo({
              title: '',
              submittedBy: '',
              role: 'Student',
              url: '',
              thumbnailUrl: ''
            });
            setSelectedFiles([]);
            setIsSubmitModalOpen(false);
            setSuccessBannerMsg("Your graduation video highlights have been uploaded and sent to the Admin Gatekeeper for review!");
            setShowSuccessBanner(true);
            setTimeout(() => setShowSuccessBanner(false), 8000);
          } else {
            setUploadError("Failed to submit video request to admin.");
          }
        } catch (err: any) {
          setUploadError(err.message || "File upload failed.");
          setSubmitting(false);
          return;
        } finally {
          setUploading(false);
        }
      } else {
        // Link submission
        let finalVideoUrl = newVideo.url;
        if (!finalVideoUrl.trim()) {
          setUploadError("Please provide a valid video link.");
          setSubmitting(false);
          return;
        }

        let finalThumbnailUrl = newVideo.thumbnailUrl;
        if (!finalThumbnailUrl) {
          if (finalVideoUrl.includes("cloudinary.com")) {
            let thumb = finalVideoUrl;
            const lastDot = thumb.lastIndexOf(".");
            if (lastDot !== -1) {
              thumb = thumb.substring(0, lastDot) + ".jpg";
            }
            thumb = thumb.replace("/video/upload/", "/video/upload/so_1/");
            finalThumbnailUrl = thumb;
          } else {
            const youtubeId = getYouTubeID(finalVideoUrl);
            if (youtubeId) {
              finalThumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
            } else if (finalVideoUrl.includes("vimeo.com")) {
              const vimeoId = getVimeoID(finalVideoUrl);
              finalThumbnailUrl = `https://vumbnail.com/${vimeoId}.jpg`;
            } else {
              finalThumbnailUrl = "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=500&auto=format&fit=crop";
            }
          }
        }

        const submissionData = {
          title: newVideo.title,
          submittedBy: newVideo.submittedBy,
          role: newVideo.role,
          url: finalVideoUrl,
          thumbnailUrl: finalThumbnailUrl || "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=500&auto=format&fit=crop",
          uploadedAt: new Date().toISOString()
        };

        const result = await submitToModeration('video_memory', submissionData);

        if (result.success) {
          setNewVideo({
            title: '',
            submittedBy: '',
            role: 'Student',
            url: '',
            thumbnailUrl: ''
          });
          setSelectedFiles([]);
          setIsSubmitModalOpen(false);
          setSuccessBannerMsg("Your graduation video highlight has been uploaded and sent to the Admin Gatekeeper for review!");
          setShowSuccessBanner(true);
          setTimeout(() => setShowSuccessBanner(false), 8000);
        } else {
          setUploadError("Failed to submit video request to admin.");
        }
      }
    } catch (err: any) {
      console.error("Video submission failed:", err);
      setUploadError(err.message || "Network error. Failed to send video memory.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVideos = selectedYear === 'All'
    ? videos
    : videos.filter(v => getItemYear(v) === selectedYear);

  return (
    <section id="video-gallery" className="py-24 bg-gradient-to-b from-[#0F2557] to-[#0A1838] text-white relative overflow-hidden">
      {/* Decorative vector overlays */}
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#D4A017]/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#D4A017]/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* SECTION HEADER */}
        <div className="text-center mb-16 relative">
          <span className="inline-block px-3 py-1 rounded-full bg-[#D4A017]/10 border border-[#D4A017]/20 text-[#D4A017] text-xs font-mono tracking-wider uppercase mb-3">
            Motion Memories
          </span>
          <h2 className="text-3xl md:text-5xl font-serif text-white font-bold tracking-tight mb-2">
            Class of 2026 Video Vault
          </h2>
          <div className="w-16 h-1 bg-[#D4A017] mx-auto mb-4" />
          <p className="text-slate-300 text-sm max-w-lg mx-auto leading-relaxed mb-6">
            Relive our active laughs, athletic competitions, stage drama prep, and daily campus banter through live-motion highlights.
          </p>

          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-[#D4A017] hover:bg-[#b08412] text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-900" />
              Upload / Share Video Highlight
            </button>
          </div>

          {/* Year Toggle Button Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {['All', '2026', '2025', '2024', '2023'].map(yr => {
              const isActive = selectedYear === yr;
              return (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-[#D4A017] border-[#D4A017] text-slate-900 shadow-md font-bold'
                      : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  {yr === 'All' ? '🌟 All Years' : `🎓 Class of ${yr}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* SUCCESS NOTIFICATION BANNER */}
        <AnimatePresence>
          {showSuccessBanner && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="max-w-4xl mx-auto mb-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 font-medium text-xs md:text-sm flex items-center gap-3 shadow-lg"
            >
              <Check className="w-5 h-5 text-emerald-400 shrink-0 bg-emerald-500/20 p-1 rounded-full border border-emerald-500/30" />
              <span>{successBannerMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIDEOS GRID */}
        {loadingVideos ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-[#D4A017] animate-spin" />
            <p className="text-white/60 text-xs font-mono tracking-widest uppercase">Retrieving Video Clips...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 bg-white/5 border border-white/10 rounded-3xl max-w-xl mx-auto p-8">
            <VideoOff className="w-12 h-12 text-[#D4A017]/40 mx-auto mb-4" />
            <h4 className="text-base font-serif font-bold mb-1">No video memories approved yet</h4>
            <p className="text-xs text-white/50 mb-4">Be the first to submit a video clip highlight from our memorable 2026 school sessions!</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-16 bg-white/5 border border-white/10 rounded-3xl max-w-xl mx-auto p-8">
            <VideoOff className="w-12 h-12 text-[#D4A017]/40 mx-auto mb-4" />
            <h4 className="text-base font-serif font-bold mb-1">No video memories for Class of {selectedYear}</h4>
            <p className="text-xs text-white/50 mb-4">No video highlights have been uploaded for this graduation year yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(isPreview ? filteredVideos.slice(0, 3) : filteredVideos).map((vid, idx) => (
              <motion.div
                key={vid.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                onClick={() => {
                  if (cleanUpMode) {
                    handleDeleteVideoClick(vid);
                  }
                }}
                className={`group relative border rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between ${
                  cleanUpMode
                    ? 'bg-rose-950/15 border-rose-500 hover:border-rose-400 cursor-pointer'
                    : 'bg-[#132c61] border-white/10 hover:border-[#D4A017]/30'
                }`}
              >
                {/* Visual Thumbnail or Video Tag */}
                <div className="relative aspect-video bg-black/40 overflow-hidden">
                  <img
                    src={vid.thumbnailUrl || "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=500&auto=format&fit=crop"}
                    alt={vid.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                  
                  {/* Decorative Play Overlay */}
                  <button
                    onClick={(e) => {
                      if (cleanUpMode) {
                        e.stopPropagation();
                        handleDeleteVideoClick(vid);
                      } else {
                        setActiveVideo(vid);
                      }
                    }}
                    className={`absolute inset-0 m-auto w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                      cleanUpMode
                        ? 'bg-rose-600 border border-rose-400 group-hover:bg-rose-700 animate-pulse'
                        : 'bg-white/10 backdrop-blur-md border border-white/20 group-hover:bg-[#D4A017] group-hover:border-transparent group-hover:scale-110'
                    }`}
                  >
                    {cleanUpMode ? (
                      <Trash2 className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 fill-current text-white group-hover:text-slate-900 ml-0.5" />
                    )}
                  </button>

                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 uppercase tracking-wider text-slate-300">
                    <Film className="w-3 h-3 text-[#D4A017]" />
                    {cleanUpMode ? 'Delete Video' : 'Clip'}
                  </div>
                </div>

                {/* Info block */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-md font-serif font-bold leading-snug text-white group-hover:text-[#D4A017] transition-colors mb-2">
                      {vid.title}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] text-[#D4A017] font-bold">
                        {vid.submittedBy.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white/90 leading-none">{vid.submittedBy}</p>
                        <p className="text-[10px] text-white/50 leading-none mt-0.5 font-mono uppercase">{vid.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {isPreview && (
          <div className="text-center mt-16">
            <Link
              to="/video-gallery"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#D4A017] to-[#eec143] text-slate-900 rounded-full text-sm font-bold shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <Film size={16} />
              <span>Explore Class Video Vault</span>
            </Link>
          </div>
        )}

      </div>

      {/* 1. PLAYBACK VIDEO MODAL */}
      <AnimatePresence>
        {activeVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveVideo(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-sm cursor-pointer"
            />

            {/* Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-[#0F2557] border border-white/10 rounded-3xl overflow-hidden w-full max-w-4xl shadow-2xl z-10 flex flex-col"
            >
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 border border-white/15 flex items-center justify-center hover:bg-[#D4A017] hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Video Player Box */}
              <div className="aspect-video w-full bg-black relative">
                {activeVideo.url.includes("youtube.com") || activeVideo.url.includes("youtu.be") ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${getYouTubeID(activeVideo.url)}?autoplay=1`}
                    title={activeVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : activeVideo.url.includes("vimeo.com") ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://player.vimeo.com/video/${getVimeoID(activeVideo.url)}?autoplay=1`}
                    title={activeVideo.title}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={activeVideo.url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Video Details footer */}
              <div className="p-6 bg-[#0A1838] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#D4A017] mb-1">{activeVideo.title}</h3>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-white/40" />
                    <p className="text-xs text-white/60">
                      Shared by <span className="font-semibold text-white">{activeVideo.submittedBy}</span> ({activeVideo.role})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Check out this amazing video memory from Scholars Academy Class of 2026: "${activeVideo.title}" 🎥\n\nWatch here: ${activeVideo.url}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full text-xs font-bold transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span>Share to WhatsApp</span>
                  </a>
                  <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                    Class Highlight
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. SUBMIT MODAL */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!submitting) setIsSubmitModalOpen(false);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-[#0F2557] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl z-10 text-white"
            >
              {/* Close Button */}
              <button
                disabled={submitting}
                onClick={() => setIsSubmitModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <Video className="w-6 h-6 text-[#D4A017]" />
                <h3 className="text-xl font-serif font-bold">Submit a Video Memory</h3>
              </div>
              <p className="text-white/60 text-xs mb-6 uppercase tracking-wider font-mono">
                Submit an athletic relay clip, a classroom joke, or a speech snippet.
              </p>

              <form onSubmit={handleSubmitVideo} className="space-y-4">
                
                {/* SUBMISSION TYPE TOGGLE */}
                <div className="bg-black/20 p-1 rounded-xl border border-white/5 flex gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmissionType('link');
                      setUploadError('');
                    }}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                      submissionType === 'link' ? 'bg-[#D4A017] text-slate-900' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    Video Link
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmissionType('file');
                      setUploadError('');
                    }}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                      submissionType === 'file' ? 'bg-[#D4A017] text-slate-900' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Video File Upload
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Video Title / Occasion</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Interhouse Relay Final Lap"
                    value={newVideo.title}
                    onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amina"
                      value={newVideo.submittedBy}
                      onChange={(e) => setNewVideo(prev => ({ ...prev, submittedBy: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Your Role</label>
                    <select
                      value={newVideo.role}
                      onChange={(e) => setNewVideo(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white select-custom"
                    >
                      <option value="Student">Student</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Parent">Parent</option>
                      <option value="Alumni">Alumni</option>
                    </select>
                  </div>
                </div>

                {/* CONDITIONAL SUBMISSION SECTIONS */}
                {submissionType === 'link' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">YouTube, Vimeo, or MP4 URL</label>
                    <input
                      type="url"
                      required={submissionType === 'link'}
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={newVideo.url}
                      onChange={(e) => setNewVideo(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Select Video Files (Up to 5, Under 15MB each)</label>
                    
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/20 hover:border-[#D4A017]/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-black/10 hover:bg-black/20"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="video/*"
                        className="hidden"
                        multiple
                      />
                      
                      <Video className="w-8 h-8 text-[#D4A017]/60 mx-auto mb-2" />
                      {selectedFiles && selectedFiles.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold text-emerald-400">
                            {selectedFiles.length} {selectedFiles.length === 1 ? 'video' : 'videos'} selected:
                          </p>
                          <ul className="text-[10px] text-white/60 space-y-1 mt-2 text-left list-disc list-inside">
                            {selectedFiles.map((file, idx) => (
                              <li key={idx} className="truncate">{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</li>
                            ))}
                          </ul>
                          <p className="text-[9px] text-[#D4A017] mt-2 underline cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); }}>Clear selection</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold">Click to browse video files</p>
                          <p className="text-[10px] text-white/40 mt-1 uppercase font-mono tracking-wider">MP4, WebM, or OGG up to 15MB each</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Cover Thumbnail Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={newVideo.thumbnailUrl}
                    onChange={(e) => setNewVideo(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                  />
                  <p className="text-[9px] text-white/40 leading-normal pl-1">Provides a beautiful splash cover for your video card.</p>
                </div>

                {uploadError && (
                  <p className="text-red-400 font-mono text-xs font-semibold text-center mt-2 bg-red-500/10 border border-red-500/20 py-2 rounded-xl">
                    {uploadError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-[#D4A017] hover:bg-[#b08412] text-slate-900 font-bold text-sm rounded-xl transition-all shadow-md mt-6 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                      {uploading ? "Uploading Video..." : "Sending Submission..."}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-slate-900" />
                      Submit to Moderation Queue
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

// Helpers to extract embed IDs for clean iframe renderings
function getYouTubeID(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

function getVimeoID(url: string) {
  const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
  const match = url.match(regExp);
  return match ? match[3] : '';
}

function extractVideoFrame(fileOrUrl: File | string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    let objectUrl: string | null = null;
    if (fileOrUrl instanceof File) {
      objectUrl = URL.createObjectURL(fileOrUrl);
      video.src = objectUrl;
    } else {
      video.crossOrigin = "anonymous";
      video.src = fileOrUrl;
    }

    const timeout = setTimeout(() => {
      video.onerror = null;
      video.onseeked = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("Timeout loading video metadata"));
    }, 12000);

    video.onloadedmetadata = () => {
      const seekTime = Math.min(1, video.duration / 2);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL("image/jpeg", 0.85);
          resolve(base64);
        } else {
          reject(new Error("Failed to get 2D canvas context"));
        }
      } catch (err) {
        reject(err);
      } finally {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(new Error("Failed to load video file/URL source"));
    };
  });
}
