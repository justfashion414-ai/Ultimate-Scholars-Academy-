import React from 'react';
import { motion } from 'motion/react';
import { Image as ImageIcon, ZoomIn, Trash2 } from 'lucide-react';
import { Photo } from '../../types';

interface PhotoGridProps {
  filteredPhotos: Photo[];
  currentGroupPhotos: Photo[];
  activeGroup: 0 | 1;
  setActiveGroup: (g: 0 | 1) => void;
  cleanUpMode: boolean;
  onPhotoClick: (globalIndex: number) => void;
  onDeletePhoto: (photo: Photo, e: React.MouseEvent) => void;
  selectedYear: string;
  totalPhotosCount: number;
}

export default function PhotoGrid({
  filteredPhotos,
  currentGroupPhotos,
  activeGroup,
  setActiveGroup,
  cleanUpMode,
  onPhotoClick,
  onDeletePhoto,
  selectedYear,
  totalPhotosCount
}: PhotoGridProps) {
  return (
    <div className="relative">
      {/* Cleanup helper warning */}
      {cleanUpMode && (
        <div className="text-center mb-4 text-rose-600 text-xs font-mono animate-pulse">
          🛑 Click any thumbnail to permanently delete it from the cloud.
        </div>
      )}

      {/* Grid Area */}
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
                className="group relative aspect-square bg-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-100 cursor-pointer text-left"
                onClick={() => cleanUpMode ? {} : onPhotoClick(globalIndex)}
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
                    onClick={(e) => onDeletePhoto(photo, e)}
                    className="absolute top-2 right-2 bg-rose-600 text-white p-2 rounded-lg hover:bg-rose-700 transition-all shadow-md z-30 cursor-pointer"
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
            <div className="col-span-full py-16 text-center text-slate-400 w-full">
              <ImageIcon className="mx-auto mb-3 text-slate-300" size={36} />
              <p className="text-sm">No photo memories found for the selected Class of {selectedYear === 'All' ? 'any year' : selectedYear}.</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* TWO GROUP SWITCHER */}
      {totalPhotosCount > 6 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setActiveGroup(0)}
            className={`px-4 py-1.5 text-xs font-mono tracking-wider uppercase rounded-full transition-all border cursor-pointer ${
              activeGroup === 0
                ? 'bg-[#0F2557] border-[#0F2557] text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            Memories Group 1 (1-6)
          </button>
          <button
            onClick={() => setActiveGroup(1)}
            className={`px-4 py-1.5 text-xs font-mono tracking-wider uppercase rounded-full transition-all border cursor-pointer ${
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
  );
}
