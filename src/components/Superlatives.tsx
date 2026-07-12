import { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, ShieldCheck, Heart, Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SUPERLATIVES_DATA } from '../data';

export default function Superlatives({ isPreview = false }: { isPreview?: boolean }) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setFailedImages(prev => ({ ...prev, [id]: true }));
  };

  // Assign custom award icons to categories
  const getAwardIcon = (category: string) => {
    switch (category) {
      case 'Most Likely to Succeed':
        return <Trophy className="w-6 h-6 text-[#D4A017]" />;
      case 'Best Dressed':
        return <Star className="w-6 h-6 text-[#D4A017]" />;
      case 'Class Clown':
        return <Sparkles className="w-6 h-6 text-[#D4A017]" />;
      case 'Most Studious':
        return <ShieldCheck className="w-6 h-6 text-[#D4A017]" />;
      case 'Most Likely to Become President':
        return <Heart className="w-6 h-6 text-[#D4A017]" />;
      default:
        return <Trophy className="w-6 h-6 text-[#D4A017]" />;
    }
  };

  const displayAwards = isPreview ? SUPERLATIVES_DATA.slice(0, 3) : SUPERLATIVES_DATA;

  return (
    <div className={!isPreview ? "min-h-screen bg-[#0F2557] text-white" : ""}>
      {/* HEADER NAVBAR (ONLY ON FULL SUB-PAGE) */}
      {!isPreview && (
        <nav className="bg-[#050E22]/80 border-b border-[#D4A017]/20 py-4 sticky top-0 z-40 shadow-md backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#D4A017] text-[#0F2557] flex items-center justify-center font-bold text-sm">S</span>
              <span className="font-sans font-bold text-white text-sm md:text-base">Scholars Academy</span>
            </Link>
            <Link 
              to="/"
              className="text-xs md:text-sm font-semibold text-white hover:text-[#D4A017] transition-all flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back to Campus Landing
            </Link>
          </div>
        </nav>
      )}

      <section className="py-24 px-4 md:px-8 bg-[#0F2557] relative overflow-hidden animate-fade-in" id="superlatives">
        
        {/* DECORATIVE EMBELLISHMENTS */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4A017]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4A017]/30 to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#D4A017]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          
          {/* SECTION HEADER */}
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-[#D4A017]/15 border border-[#D4A017]/40 text-[#D4A017] text-xs font-mono tracking-widest uppercase mb-3">
              SS3 Awards
            </span>
            <h2 className="text-3xl md:text-5xl font-serif text-white font-bold tracking-tight mb-2">
              Class Superlatives
            </h2>
            <p className="text-[#D4A017] font-serif italic text-base md:text-lg">
              "Voted by classmates as the outstanding stars of the set"
            </p>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#D4A017] to-transparent mx-auto mt-4" />
          </div>

          {/* CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            {displayAwards.map((award, idx) => {
              const isImageFailed = failedImages[award.id];

              // Beautiful asymmetrical Bento column spans:
              // Row 1: 2 items spanning 3 columns each (Total 6)
              // Row 2: 3 items spanning 2 columns each (Total 6)
              const bentoColSpan = isPreview ? 'lg:col-span-2' : (idx < 2 ? 'lg:col-span-3' : 'lg:col-span-2');

            return (
              <motion.div
                key={award.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className={`bg-[#050E22]/60 border border-[#D4A017]/30 rounded-2xl p-6 flex flex-col justify-between text-center relative group backdrop-blur-sm shadow-xl ${bentoColSpan}`}
              >
                {/* GOLD BORDER ACCENT */}
                <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-[#D4A017]/80 transition-colors pointer-events-none" />

                <div className="flex flex-col items-center">
                  {/* AWARD BADGE */}
                  <div className="w-12 h-12 rounded-full bg-[#D4A017]/15 border border-[#D4A017]/30 flex items-center justify-center mb-4 shadow-inner relative">
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#D4A017] animate-ping opacity-25 group-hover:block hidden" />
                    {getAwardIcon(award.category)}
                  </div>

                  {/* IMAGE FRAME */}
                  <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#D4A017] mb-4 shadow-md bg-[#0F2557] shrink-0 relative group-hover:scale-105 transition-transform duration-300">
                    {isImageFailed ? (
                      <div className="w-full h-full bg-[#0F2557] flex items-center justify-center text-white font-serif font-bold text-xl">
                        {award.studentName.split(' ').map(n => n[0]).join('')}
                      </div>
                    ) : (
                      <img
                        src={award.studentImage}
                        alt={award.studentName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover filter brightness-95"
                        onError={() => handleImageError(award.id)}
                        loading="lazy"
                      />
                    )}
                  </div>
                </div>

                {/* CATEGORY & STUDENT INFO */}
                <div className="flex-grow flex flex-col justify-between mt-2">
                  <div>
                    <h3 className="text-[#D4A017] font-serif font-bold text-lg leading-tight tracking-wide mb-1 group-hover:text-amber-300 transition-colors">
                      {award.category}
                    </h3>
                    <p className="text-white font-medium text-xs font-sans mb-3 tracking-wide uppercase">
                      {award.studentName}
                    </p>
                  </div>
                  <p className="text-white/70 font-sans text-xs leading-relaxed italic border-t border-white/10 pt-3">
                    "{award.description}"
                  </p>
                </div>

                {/* DECORATIVE EMBLEM */}
                <div className="w-full text-center mt-4">
                  <span className="text-[8px] font-mono tracking-widest text-[#D4A017]/60 uppercase font-semibold">
                    ★ CLASS MEDAL ★
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* VIEW ALL SUPERLATIVES BUTTON (ONLY FOR PREVIEW) */}
        {isPreview && (
          <div className="text-center mt-12">
            <Link
              to="/superlatives"
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#D4A017] hover:bg-[#b58814] text-[#0F2557] rounded-full text-sm font-semibold shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer font-sans"
            >
              <span>View All Class Superlatives</span>
            </Link>
          </div>
        )}

      </div>
    </section>
  </div>
  );
}
