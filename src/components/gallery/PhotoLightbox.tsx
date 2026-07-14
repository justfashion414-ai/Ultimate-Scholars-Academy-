import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Photo } from '../../types';

interface PhotoLightboxProps {
  lightboxIndex: number | null;
  filteredPhotos: Photo[];
  onClose: () => void;
  onPrev: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
}

export default function PhotoLightbox({
  lightboxIndex,
  filteredPhotos,
  onClose,
  onPrev,
  onNext
}: PhotoLightboxProps) {
  if (lightboxIndex === null || !filteredPhotos[lightboxIndex]) return null;

  const currentPhoto = filteredPhotos[lightboxIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
        onClick={onClose}
      >
        {/* CLOSE BUTTON */}
        <button 
          className="absolute top-4 right-4 md:top-8 md:right-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all z-50 cursor-pointer"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {/* PREV BUTTON */}
        <button 
          className="absolute left-4 md:left-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all z-50 cursor-pointer"
          onClick={onPrev}
        >
          <ChevronLeft size={24} />
        </button>

        {/* PHOTO & CONTENT CONTAINER */}
        <div 
          className="max-w-4xl max-h-[80vh] w-full flex flex-col items-center justify-center relative"
          onClick={e => e.stopPropagation()}
        >
          <motion.img
            key={lightboxIndex}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
            src={currentPhoto.url}
            alt={currentPhoto.title}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
          />
          <div className="text-center mt-6 text-white max-w-xl">
            <span className="text-xs text-[#D4A017] uppercase tracking-widest font-mono">
              {currentPhoto.role}: {currentPhoto.submittedBy}
            </span>
            <h3 className="text-lg md:text-xl font-medium mt-1">
              {currentPhoto.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Uploaded {new Date(currentPhoto.uploadedAt).toLocaleDateString()}
            </p>

            {/* WhatsApp Share Button */}
            <div className="mt-4 flex justify-center">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Check out this beautiful memory from Scholars Academy Class of 2026: "${currentPhoto.title}" 📸\n\nView here: ${currentPhoto.url}`
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

        {/* NEXT BUTTON */}
        <button 
          className="absolute right-4 md:right-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all z-50 cursor-pointer"
          onClick={onNext}
        >
          <ChevronRight size={24} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
