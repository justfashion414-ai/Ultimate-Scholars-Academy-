import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, ZoomIn, X, ChevronLeft, ChevronRight, Calendar, User, Trash2, Plus, Loader2, Check, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchPhotos, deleteApprovedPhoto } from '../lib/firebaseService';
import { Photo } from '../types';

// Import modular gallery components
import PhotoGrid from './gallery/PhotoGrid';
import PhotoLightbox from './gallery/PhotoLightbox';
import PhotoUploadForm from './gallery/PhotoUploadForm';

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

  // Modal and banner states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [successBannerMsg, setSuccessBannerMsg] = useState('');

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

  // Reload approved photos list
  const loadPhotos = () => {
    setLoading(true);
    fetchPhotos()
      .then(data => {
        const sorted = [...data].sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
        setPhotos(sorted);
      })
      .catch(err => console.error("Error loading photos:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPhotos();
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

  // Divide photos into preview groups (6 per group)
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

  // Triggered on successful upload
  const handleUploadSuccess = (msg: string) => {
    setSuccessBannerMsg(msg);
    setShowSuccessBanner(true);
    setTimeout(() => setShowSuccessBanner(false), 6000);
    loadPhotos();
    if (onDataChange) onDataChange();
  };

  // ==========================================
  // LANDING PAGE COMPACT PREVIEW MODE
  // ==========================================
  if (isPreview) {
    return (
      <section id="photo-gallery" className="py-24 bg-slate-50 relative overflow-hidden">
        {/* Visual elements */}
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white to-transparent pointer-events-none" />
        <div className="absolute top-12 left-12 w-64 h-64 bg-[#D4A017]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
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
          <PhotoGrid 
            filteredPhotos={filteredPhotos}
            currentGroupPhotos={currentGroupPhotos}
            activeGroup={activeGroup}
            setActiveGroup={setActiveGroup}
            cleanUpMode={cleanUpMode}
            onPhotoClick={(idx) => setLightboxIndex(idx)}
            onDeletePhoto={handleDeletePhoto}
            selectedYear={selectedYear}
            totalPhotosCount={filteredPhotos.length}
          />

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
        <PhotoLightbox 
          lightboxIndex={lightboxIndex}
          filteredPhotos={filteredPhotos}
          onClose={() => setLightboxIndex(null)}
          onPrev={handlePrevImage}
          onNext={handleNextImage}
        />

        {/* PHOTO UPLOAD MODAL FOR PREVIEW MODE */}
        <PhotoUploadForm 
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      </section>
    );
  }

  // ==========================================
  // FULL STANDALONE SUB-PAGE ROUTE MODE
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-[#D4A017]/30 text-left">
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
              <div className="p-4 flex flex-col justify-between text-left">
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
                  className="absolute top-3 left-3 bg-rose-600 text-white p-2.5 rounded-xl hover:bg-rose-700 transition-all shadow-md z-30 cursor-pointer"
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
      <PhotoLightbox 
        lightboxIndex={lightboxIndex}
        filteredPhotos={filteredPhotos}
        onClose={() => setLightboxIndex(null)}
        onPrev={handlePrevImage}
        onNext={handleNextImage}
      />

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-12 mt-24 text-center">
        <div className="max-w-7xl mx-auto px-4 text-slate-400 text-xs font-mono">
          © {new Date().getFullYear()} Scholars Academy Class of 2026. All Rights Reserved.
        </div>
      </footer>

      {/* PHOTO UPLOAD MODAL */}
      <PhotoUploadForm 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
