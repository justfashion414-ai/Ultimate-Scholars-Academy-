import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, ZoomIn, X, ChevronLeft, ChevronRight, Calendar, User, Trash2, Plus, Loader2, Check, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchPhotos, deleteApprovedPhoto, submitToModeration } from '../lib/firebaseService';
import { Photo } from '../types';
import { compressImage } from '../lib/imageCompressor';

export default function PhotoGallery({
  refreshKey = 0,
  cleanUpMode = false,
  onDataChange,
  isPreview = false
}: {
  refreshKey?: number;
  cleanUpMode?: boolean;
  onDataChange?: () => void;
  isPreview?: boolean;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeGroup, setActiveGroup] = useState<0 | 1>(0);
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

  // Submission States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<{
    title: string;
    submittedBy: string;
    role: string;
    image: string;
    images: string[];
  }>({
    title: '',
    submittedBy: '',
    role: 'Student',
    image: '',
    images: []
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [successBannerMsg, setSuccessBannerMsg] = useState('');

  const clearSelectedPhotos = () => {
    localPreviews.forEach(url => URL.revokeObjectURL(url));
    setLocalPreviews([]);
    setSelectedFiles([]);
  };

  const handlePhotoUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 5) {
      setUploadError("You can only upload up to 5 images at a time.");
      return;
    }

    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 5 * 1024 * 1024) {
        setUploadError(`Each image must be smaller than 5MB ("${files[i].name}" is too large).`);
        return;
      }
    }

    setUploadError("");
    
    // Revoke previous URLs to avoid memory leaks
    localPreviews.forEach(url => URL.revokeObjectURL(url));

    const selectedList = Array.from(files);
    const previewUrls = selectedList.map(file => URL.createObjectURL(file as any));

    setSelectedFiles(selectedList);
    setLocalPreviews(previewUrls);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setUploadError("Please select a photo first.");
      return;
    }
    if (!uploadForm.title || !uploadForm.submittedBy) {
      setUploadError("Please fill in all fields.");
      return;
    }

    setIsUploading(true);
    setUploadingCount(selectedFiles.length);
    setUploadError("");
    try {
      const urls: string[] = [];

      const uploadSingleFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const rawBase64 = reader.result as string;
            try {
              const base64data = await compressImage(rawBase64);
              const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: base64data, filename: file.name }),
              });

              const data = await response.json();
              if (response.ok && data.success) {
                resolve(data.url);
              } else {
                reject(new Error(data.error || "Upload failed."));
              }
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error("Failed to read file."));
          reader.readAsDataURL(file);
        });
      };

      for (let i = 0; i < selectedFiles.length; i++) {
        const url = await uploadSingleFile(selectedFiles[i]);
        urls.push(url);
      }

      const submissionData: any = {
        title: uploadForm.title,
        submittedBy: uploadForm.submittedBy,
        role: uploadForm.role,
        urls: urls,
        url: urls[0],
        uploadedAt: new Date().toISOString()
      };

      const result = await submitToModeration('photo', submissionData);

      if (result.success) {
        setSuccessBannerMsg("Your photo memory has been submitted and sent to the Admin Gatekeeper for approval!");
        setShowSuccessBanner(true);
        setIsUploadModalOpen(false);
        // Reset form
        setUploadForm({ title: '', submittedBy: '', role: 'Student', image: '', images: [] });
        clearSelectedPhotos();
        setTimeout(() => setShowSuccessBanner(false), 6000);
      } else {
        setUploadError("Failed to submit photo for moderation.");
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "An error occurred during submission.");
    } finally {
      setIsUploading(false);
      setUploadingCount(0);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPhotos()
      .then(data => {
        // Sort by uploadedAt desc
        const sorted = [...data].sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
        setPhotos(sorted);
      })
      .catch(err => console.error("Error loading photos:", err))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDeletePhoto = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm(`Are you sure you want to permanently delete this photo memory?\n"${photo.title}"`)) {
      try {
        await deleteApprovedPhoto(photo.id, photo.url);
        setPhotos(prev => prev.filter(p => p.id !== photo.id));
        if (onDataChange) onDataChange();
      } catch (err) {
        console.error("Failed to delete photo:", err);
        alert("Failed to delete photo. Check authorization.");
      }
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex(prev => (prev === null ? null : (prev === 0 ? filteredPhotos.length - 1 : prev - 1)));
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex(prev => (prev === null ? null : (prev === filteredPhotos.length - 1 ? 0 : prev + 1)));
    }
  };

  // Filter photos by selected year
  const filteredPhotos = selectedYear === 'All'
    ? photos
    : photos.filter(p => getItemYear(p) === selectedYear);

  // Divide photos into preview groups
  // Group 1: index 0 to 5 (6 photos)
  // Group 2: index 6 to 11 (6 photos)
  const group1 = filteredPhotos.slice(0, 6);
  const group2 = filteredPhotos.slice(6, 12);
  const currentGroupPhotos = activeGroup === 0 ? group1 : group2;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#D4A017] border-t-transparent rounded-full mb-4"
        />
        <p className="text-slate-500 font-mono text-sm">Loading visual album...</p>
      </div>
    );
  }

  // ==========================================
  // LANDING PAGE COMPACT PREVIEW MODE
  // ==========================================
  if (isPreview) {
    return (
      <section id="photo-gallery" className="py-24 bg-slate-50 relative overflow-hidden">
        {/* Visual elements */}
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white to-transparent pointer-events-none" />
        <div className="absolute top-12 left-12 w-64 h-64 bg-[#D4A017]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-[#D4A017]/10 border border-[#D4A017]/20 text-[#D4A017] text-xs font-mono tracking-wider uppercase mb-3">
              Snapshots of SS3
            </span>
            <h2 className="text-3xl md:text-4xl font-sans font-bold tracking-tight text-[#0F2557]">
              Graduation Photo Album
            </h2>
            <p className="mt-4 text-slate-600 max-w-xl mx-auto text-sm md:text-base">
              Explore freeze-frame moments from our high school journey. Beautiful memories captured forever.
            </p>

            {/* SUCCESS BANNER */}
            <AnimatePresence>
              {showSuccessBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-md mx-auto mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{successBannerMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* UPLOAD TRIGGER BUTTON */}
            <div className="mt-5">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F2557] hover:bg-[#1a3d82] text-white rounded-xl text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Share a Photo Memory</span>
              </button>
            </div>

            {/* Year Toggle Button Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {['All', '2026', '2025', '2024', '2023'].map(yr => {
                const isActive = selectedYear === yr;
                return (
                  <button
                    key={yr}
                    onClick={() => {
                      setSelectedYear(yr);
                      setActiveGroup(0);
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-[#0F2557] border-[#0F2557] text-white shadow-md font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {yr === 'All' ? '🌟 All Years' : `🎓 Class of ${yr}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid Container */}
          <div className="relative">
            {/* Cleanup helper warning */}
            {cleanUpMode && (
              <div className="text-center mb-4 text-rose-600 text-xs font-mono animate-pulse">
                🛑 Click any thumbnail to permanently delete it from the cloud.
              </div>
            )}

            {/* Horizontal Scroll / Grid Area */}
            <div className="overflow-x-auto scrollbar-none pb-4">
              <motion.div 
                layout
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 min-w-[320px]"
              >
                {currentGroupPhotos.map((photo, index) => {
                  const globalIndex = activeGroup === 0 ? index : index + 6;
                  return (
                    <motion.div
                      key={photo.id}
                      layoutId={`photo-card-${photo.id}`}
                      className="group relative aspect-square bg-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-100 cursor-pointer"
                      onClick={() => cleanUpMode ? {} : setLightboxIndex(globalIndex)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                      
                      {/* Dark overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                        <span className="text-[10px] text-[#D4A017] uppercase font-mono tracking-wider">
                          {photo.role}: {photo.submittedBy}
                        </span>
                        <h4 className="text-xs font-semibold text-white truncate">
                          {photo.title}
                        </h4>
                      </div>

                      {/* Clean up delete badge */}
                      {cleanUpMode ? (
                        <button
                          onClick={(e) => handleDeletePhoto(photo, e)}
                          className="absolute top-2 right-2 bg-rose-600 text-white p-2 rounded-lg hover:bg-rose-700 transition-all shadow-md z-30"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn size={12} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* Empty State placeholder */}
                {currentGroupPhotos.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-400">
                    <ImageIcon className="mx-auto mb-3 text-slate-300" size={36} />
                    <p className="text-sm">No photo memories found for the selected Class of {selectedYear === 'All' ? 'any year' : selectedYear}.</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* TWO GROUP SWITCHER - EXPLICIT REQUIREMENT (Mobile Friendly, no more than these buttons) */}
            {photos.length > 6 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setActiveGroup(0)}
                  className={`px-4 py-1.5 text-xs font-mono tracking-wider uppercase rounded-full transition-all border ${
                    activeGroup === 0
                      ? 'bg-[#0F2557] border-[#0F2557] text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Memories Group 1 (1-6)
                </button>
                <button
                  onClick={() => setActiveGroup(1)}
                  className={`px-4 py-1.5 text-xs font-mono tracking-wider uppercase rounded-full transition-all border ${
                    activeGroup === 1
                      ? 'bg-[#0F2557] border-[#0F2557] text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Memories Group 2 (7-12)
                </button>
              </div>
            )}
          </div>

          {/* VIEW ALL BUTTON */}
          <div className="text-center mt-12">
            <Link
              to="/photo-gallery"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#0F2557] to-[#16377c] text-white rounded-full text-sm font-semibold shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <ImageIcon size={16} />
              <span>Explore Full Graduation Album</span>
            </Link>
          </div>
        </div>

        {/* LIGHTBOX MODAL */}
        <AnimatePresence>
          {lightboxIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
              onClick={() => setLightboxIndex(null)}
            >
              <button 
                className="absolute top-4 right-4 md:top-8 md:right-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all z-50 cursor-pointer"
                onClick={() => setLightboxIndex(null)}
              >
                <X size={20} />
              </button>

              <button 
                className="absolute left-4 md:left-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all z-50 cursor-pointer"
                onClick={(e) => handlePrevImage(e)}
              >
                <ChevronLeft size={24} />
              </button>

              <div 
                className="max-w-4xl max-h-[80vh] w-full flex flex-col items-center justify-center relative"
                onClick={e => e.stopPropagation()}
              >
                <motion.img
                  key={lightboxIndex}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 25, stiffness: 120 }}
                  src={filteredPhotos[lightboxIndex]?.url}
                  alt={filteredPhotos[lightboxIndex]?.title}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                />
                <div className="text-center mt-6 text-white max-w-xl">
                  <span className="text-xs text-[#D4A017] uppercase tracking-widest font-mono">
                    {filteredPhotos[lightboxIndex]?.role}: {filteredPhotos[lightboxIndex]?.submittedBy}
                  </span>
                  <h3 className="text-lg md:text-xl font-medium mt-1">
                    {filteredPhotos[lightboxIndex]?.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Uploaded {new Date(filteredPhotos[lightboxIndex]?.uploadedAt).toLocaleDateString()}
                  </p>

                  {/* WhatsApp Share Button */}
                  <div className="mt-4 flex justify-center">
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `Check out this beautiful memory from Scholars Academy Class of 2026: "${filteredPhotos[lightboxIndex]?.title}" 📸\n\nView here: ${filteredPhotos[lightboxIndex]?.url}`
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
                  </div>
                </div>
              </div>

              <button 
                className="absolute right-4 md:right-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all z-50 cursor-pointer"
                onClick={(e) => handleNextImage(e)}
              >
                <ChevronRight size={24} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHOTO UPLOAD MODAL FOR PREVIEW MODE */}
        <AnimatePresence>
          {isUploadModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-10 overflow-y-auto">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
                onClick={() => setIsUploadModalOpen(false)}
              />

              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 text-left z-10 text-slate-800"
              >
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-all"
                >
                  <X size={18} />
                </button>

                <div className="mb-6">
                  <h3 className="text-xl font-sans font-bold text-[#0F2557] flex items-center gap-2">
                    <Camera className="text-[#D4A017]" size={20} />
                    <span>Share Photo Memory</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload snapshots from classes, field trips, or school events. Submissions go to admin queue.
                  </p>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {/* Photo Drag & Select File box */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-2">
                      Select Photographs (Up to 5, Max 5MB each)
                    </label>
                    <div className="relative border-2 border-dashed border-slate-200 hover:border-[#D4A017] rounded-2xl p-6 transition-all text-center bg-slate-50">
                      {localPreviews && localPreviews.length > 0 ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            {localPreviews.map((imgUrl, idx) => (
                              <img key={idx} src={imgUrl} className="w-full h-20 object-cover rounded-xl border border-slate-100" referrerPolicy="no-referrer" />
                            ))}
                          </div>
                          <p className="text-[10px] text-emerald-600 font-semibold">{localPreviews.length} images selected!</p>
                          <button
                            type="button"
                            onClick={clearSelectedPhotos}
                            className="text-xs text-red-500 underline font-semibold cursor-pointer"
                          >
                            Remove All Photos
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          {isUploading ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-8 h-8 text-[#D4A017] animate-spin" />
                              <span className="text-xs font-semibold text-slate-600">
                                {uploadingCount > 1 ? `Uploading ${uploadingCount} files to cloud...` : "Uploading to cloud..."}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                              <Camera size={28} className="text-slate-300 mb-1 mx-auto" />
                              <span className="text-xs font-bold text-slate-700">Choose files or drag & drop</span>
                              <span className="text-[10px]">JPG, PNG, WEBP (Up to 5 files)</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUploadChange}
                            disabled={isUploading}
                            multiple
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ebuka Okafor"
                      value={uploadForm.submittedBy}
                      onChange={e => setUploadForm(prev => ({ ...prev, submittedBy: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                        Role
                      </label>
                      <select
                        value={uploadForm.role}
                        onChange={e => setUploadForm(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                      >
                        <option value="Student">Student</option>
                        <option value="Teacher">Teacher</option>
                        <option value="Alumnus">Alumnus</option>
                        <option value="Visitor">Visitor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                        Caption / Title
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SS3 Graduation dinner"
                        value={uploadForm.title}
                        onChange={e => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                      />
                    </div>
                  </div>

                  {uploadError && (
                    <p className="text-rose-500 text-xs font-semibold font-mono">{uploadError}</p>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0F2557] text-white hover:bg-[#1a3d82] flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      <span>Submit Memory</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>
    );
  }

  // ==========================================
  // FULL STANDALONE SUB-PAGE ROUTE MODE
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-[#D4A017]/30">
      {/* HEADER NAVBAR */}
      <nav className="bg-white border-b border-slate-100 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#0F2557] text-[#D4A017] flex items-center justify-center font-bold text-sm font-sans">S</span>
            <span className="font-sans font-bold text-[#0F2557] text-sm md:text-base">Scholars Academy</span>
          </Link>
          <Link 
            to="/"
            className="text-xs md:text-sm font-semibold text-[#0F2557] hover:text-[#D4A017] transition-all flex items-center gap-1.5"
          >
            ← Back to Campus Landing
          </Link>
        </div>
      </nav>

      {/* BODY CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* BANNER HEADER */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-[#0F2557]/5 border border-[#0F2557]/10 text-[#0F2557] text-xs font-mono tracking-wider uppercase mb-3">
            Full Resolution Gallery
          </span>
          <h1 className="text-4xl md:text-5xl font-sans font-bold tracking-tight text-[#0F2557]">
            Scholars Academy Class of 2026 Album
          </h1>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-sm md:text-base">
            Savor every memory, smile, and shared dream of the graduands. These photos are permanently stored in our alumni record.
          </p>

          {/* SUCCESS BANNER */}
          <AnimatePresence>
            {showSuccessBanner && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-md mx-auto mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{successBannerMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* UPLOAD TRIGGER BUTTON */}
          <div className="mt-5">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F2557] hover:bg-[#1a3d82] text-white rounded-xl text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Share a Photo Memory</span>
            </button>
          </div>

          {/* Year Toggle Button Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {['All', '2026', '2025', '2024', '2023'].map(yr => {
              const isActive = selectedYear === yr;
              return (
                <button
                  key={yr}
                  onClick={() => {
                    setSelectedYear(yr);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-[#0F2557] border-[#0F2557] text-white shadow-md font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {yr === 'All' ? '🌟 All Years' : `🎓 Class of ${yr}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean up Mode Notification */}
        {cleanUpMode && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-center py-3.5 px-4 rounded-xl mb-8 font-mono text-xs md:text-sm animate-pulse max-w-md mx-auto">
            🧹 <strong>ADMIN CLEAN UP ACTIVE:</strong> Click any photo to delete it permanently from Cloudinary & Firestore.
          </div>
        )}

        {/* Grid of All Photos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPhotos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 cursor-pointer relative"
              onClick={() => cleanUpMode ? {} : setLightboxIndex(index)}
            >
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                <img
                  src={photo.url}
                  alt={photo.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-all duration-500"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn size={14} />
                </div>
              </div>

              {/* Info section */}
              <div className="p-4 flex flex-col justify-between">
                <h3 className="font-semibold text-slate-900 group-hover:text-[#0F2557] transition-colors truncate">
                  {photo.title}
                </h3>
                
                <div className="flex items-center justify-between mt-3 text-xs text-slate-500 font-mono pt-3 border-t border-slate-50">
                  <span className="flex items-center gap-1">
                    <User size={12} className="text-[#D4A017]" />
                    <span className="truncate max-w-[120px]">{photo.submittedBy}</span>
                  </span>
                  <span className="bg-[#0F2557]/5 text-[#0F2557] px-2 py-0.5 rounded-full text-[10px]">
                    {photo.role}
                  </span>
                </div>
              </div>

              {/* Admin direct delete trigger */}
              {cleanUpMode && (
                <button
                  onClick={(e) => handleDeletePhoto(photo, e)}
                  className="absolute top-3 left-3 bg-rose-600 text-white p-2.5 rounded-xl hover:bg-rose-700 transition-all shadow-md z-30"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </motion.div>
          ))}

          {photos.length === 0 ? (
            <div className="col-span-full py-24 text-center text-slate-400">
              <ImageIcon className="mx-auto mb-4 text-slate-300" size={48} />
              <p className="text-base font-semibold">Our photobook is currently empty</p>
              <p className="text-xs text-slate-500 mt-1">Check back later or ask the admin to upload senior photographs.</p>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="col-span-full py-24 text-center text-slate-400">
              <ImageIcon className="mx-auto mb-4 text-slate-300" size={48} />
              <p className="text-base font-semibold">No photos for Class of {selectedYear}</p>
              <p className="text-xs text-slate-500 mt-1">No photos have been uploaded for this graduation year yet.</p>
            </div>
          ) : null}
        </div>
      </main>

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
            onClick={() => setLightboxIndex(null)}
          >
            <button 
              className="absolute top-4 right-4 md:top-8 md:right-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all z-50 cursor-pointer"
              onClick={() => setLightboxIndex(null)}
            >
              <X size={20} />
            </button>

            <button 
              className="absolute left-4 md:left-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all z-50 cursor-pointer"
              onClick={(e) => handlePrevImage(e)}
            >
              <ChevronLeft size={24} />
            </button>

            <div 
              className="max-w-4xl max-h-[80vh] w-full flex flex-col items-center justify-center relative"
              onClick={e => e.stopPropagation()}
            >
              <motion.img
                key={lightboxIndex}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                src={filteredPhotos[lightboxIndex]?.url}
                alt={filteredPhotos[lightboxIndex]?.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
              />
              <div className="text-center mt-6 text-white max-w-xl">
                <span className="text-xs text-[#D4A017] uppercase tracking-widest font-mono">
                  {filteredPhotos[lightboxIndex]?.role}: {filteredPhotos[lightboxIndex]?.submittedBy}
                </span>
                <h3 className="text-lg md:text-xl font-medium mt-1">
                  {filteredPhotos[lightboxIndex]?.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Uploaded {new Date(filteredPhotos[lightboxIndex]?.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <button 
              className="absolute right-4 md:right-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all z-50 cursor-pointer"
              onClick={(e) => handleNextImage(e)}
            >
              <ChevronRight size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-xs font-mono">
          © {new Date().getFullYear()} Scholars Academy Class of 2026. All Rights Reserved.
        </div>
      </footer>

      {/* PHOTO UPLOAD MODAL */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-10 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
              onClick={() => setIsUploadModalOpen(false)}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 text-left z-10"
            >
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-all"
              >
                <X size={18} />
              </button>

              <div className="mb-6">
                <h3 className="text-xl font-sans font-bold text-[#0F2557] flex items-center gap-2">
                  <Camera className="text-[#D4A017]" size={20} />
                  <span>Share Photo Memory</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload snapshots from classes, field trips, or school events. Submissions go to admin queue.
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Photo Drag & Select File box */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-2">
                    Select Photographs (Up to 5, Max 5MB each)
                  </label>
                  <div className="relative border-2 border-dashed border-slate-200 hover:border-[#D4A017] rounded-2xl p-6 transition-all text-center bg-slate-50">
                    {localPreviews && localPreviews.length > 0 ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {localPreviews.map((imgUrl, idx) => (
                            <img key={idx} src={imgUrl} className="w-full h-20 object-cover rounded-xl border border-slate-100" referrerPolicy="no-referrer" />
                          ))}
                        </div>
                        <p className="text-[10px] text-emerald-600 font-semibold">{localPreviews.length} images selected!</p>
                        <button
                          type="button"
                          onClick={clearSelectedPhotos}
                          className="text-xs text-red-500 underline font-semibold cursor-pointer"
                        >
                          Remove All Photos
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        {isUploading ? (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-8 h-8 text-[#D4A017] animate-spin" />
                            <span className="text-xs font-semibold text-slate-600">
                              {uploadingCount > 1 ? `Uploading ${uploadingCount} files to cloud...` : "Uploading to cloud..."}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                            <Camera size={28} className="text-slate-300 mb-1 mx-auto" />
                            <span className="text-xs font-bold text-slate-700">Choose files or drag & drop</span>
                            <span className="text-[10px]">JPG, PNG, WEBP (Up to 5 files)</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUploadChange}
                          disabled={isUploading}
                          multiple
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ebuka Okafor"
                    value={uploadForm.submittedBy}
                    onChange={e => setUploadForm(prev => ({ ...prev, submittedBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Role
                    </label>
                    <select
                      value={uploadForm.role}
                      onChange={e => setUploadForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                    >
                      <option value="Student">Student</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Alumnus">Alumnus</option>
                      <option value="Visitor">Visitor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Caption / Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SS3 Graduation dinner"
                      value={uploadForm.title}
                      onChange={e => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017]"
                    />
                  </div>
                </div>

                {uploadError && (
                  <p className="text-rose-500 text-xs font-semibold font-mono">{uploadError}</p>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0F2557] text-white hover:bg-[#1a3d82] flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    <span>Submit Memory</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
