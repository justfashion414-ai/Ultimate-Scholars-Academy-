import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Gift, Cake, Megaphone, Award, Quote, Bell, Heart, Star, Film, Image } from 'lucide-react';
import { CustomSection } from '../types';

interface CustomSectionsRendererProps {
  sections: CustomSection[];
}

export default function CustomSectionsRenderer({ sections }: CustomSectionsRendererProps) {
  if (!sections || sections.length === 0) return null;

  // Helper to check and extract YouTube video IDs
  const getYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  return (
    <>
      {sections.map((section, index) => {
        const isEven = index % 2 === 0;
        const hasMedia = section.mediaUrl && section.mediaType && section.mediaType !== 'none';
        const isVideo = section.mediaType === 'video';
        const ytId = isVideo && section.mediaUrl ? getYouTubeID(section.mediaUrl) : '';
        const layout = section.layoutType || 'standard';

        // 1. FESTIVE BIRTHDAY / CELEBRATION LAYOUT
        if (layout === 'birthday') {
          return (
            <section 
              key={section.id} 
              className="py-24 px-4 md:px-8 border-t border-[#D4A017]/20 relative overflow-hidden bg-gradient-to-b from-[#18081a] via-[#050E22] to-[#120524]"
              id={`custom-sec-${section.id}`}
            >
              {/* Confetti and balloons visual effects (ambient glow circles) */}
              <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-pink-500/10 blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute top-1/2 left-1/3 w-96 h-96 rounded-full bg-[#D4A017]/5 blur-3xl pointer-events-none" />

              {/* Decorative Floating Party Symbols (SVGs/Balloons/Stars) */}
              <div className="absolute top-12 right-[15%] text-pink-500/30 text-xl font-sans animate-bounce pointer-events-none select-none hidden md:block">🎉</div>
              <div className="absolute bottom-16 left-[10%] text-amber-500/30 text-2xl font-sans animate-bounce pointer-events-none select-none hidden md:block" style={{ animationDelay: '1s' }}>🎈</div>
              <div className="absolute top-1/3 left-[5%] text-indigo-400/30 text-lg font-sans animate-pulse pointer-events-none select-none hidden md:block">✨</div>

              <div className="max-w-6xl mx-auto relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                  
                  {/* Celebration Content */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="lg:col-span-7 space-y-6 text-white order-2 lg:order-1"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[10px] font-mono tracking-wider uppercase">
                          <Cake className="w-3.5 h-3.5 text-pink-400 animate-bounce" /> Celebration Spotlight
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono tracking-wider uppercase">
                          <Gift className="w-3.5 h-3.5 text-amber-400" /> Birthday Greeting
                        </span>
                      </div>
                      
                      <h2 className="text-4xl md:text-5xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-[#D4A017] to-amber-200 tracking-tight">
                        {section.title}
                      </h2>
                      
                      <div className="w-20 h-1 bg-gradient-to-r from-pink-500 to-amber-500 rounded-full" />
                      
                      <p className="text-white/90 text-base md:text-lg leading-relaxed whitespace-pre-line font-sans drop-shadow-sm bg-black/20 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                        {section.subtext}
                      </p>
                    </div>
                  </motion.div>

                  {/* Celebrant Photo / Media Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, type: 'spring', bounce: 0.3 }}
                    className="lg:col-span-5 flex flex-col items-center order-1 lg:order-2"
                  >
                    <div className="relative p-3 bg-white text-slate-800 rounded-3xl shadow-2xl border border-pink-200 max-w-sm w-full transform hover:rotate-0 transition-transform duration-500">
                      
                      {/* Little crown or heart pin on top */}
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 bg-pink-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white animate-bounce">
                        <Heart className="w-4 h-4 fill-white" />
                      </div>

                      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-100">
                        {hasMedia ? (
                          isVideo ? (
                            ytId ? (
                              <iframe 
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${ytId}`}
                                allowFullScreen
                                title={section.title}
                              />
                            ) : (
                              <video 
                                src={section.mediaUrl} 
                                controls 
                                className="w-full h-full object-cover"
                              />
                            )
                          ) : (
                            <img 
                              src={section.mediaUrl} 
                              alt={section.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-slate-400 p-6 text-center">
                            <Cake className="w-12 h-12 text-pink-500/60 animate-pulse" />
                            <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Celebrating Academic Success & Milestones</p>
                          </div>
                        )}
                      </div>

                      {/* Polaroid Style Caption */}
                      <div className="pt-4 pb-2 px-2 text-center">
                        <p className="font-serif font-bold text-lg text-slate-900 tracking-tight">{section.title}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-mono tracking-widest mt-1">
                          {section.subLabel || 'Class of 2026 Special Moment'}
                        </p>
                      </div>

                    </div>
                  </motion.div>

                </div>
              </div>
            </section>
          );
        }

        // 2. IMPORTANT ANNOUNCEMENT / BANNER LAYOUT
        if (layout === 'announcement') {
          return (
            <section 
              key={section.id} 
              className="py-16 px-4 md:px-8 border-y-2 border-[#D4A017]/30 relative overflow-hidden bg-gradient-to-r from-[#1E110A] via-[#0D1B2A] to-[#1E110A]"
              id={`custom-sec-${section.id}`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4A017] via-red-500 to-[#D4A017]" />
              {/* Backlight */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-48 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

              <div className="max-w-5xl mx-auto relative z-10">
                <div className="bg-black/40 border border-red-500/20 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-md">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    
                    {/* Big Icon Column */}
                    <div className="shrink-0">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner">
                        <Megaphone className="w-8 h-8 md:w-10 md:h-10 animate-bounce" />
                      </div>
                    </div>

                    {/* Announcement Details */}
                    <div className="flex-grow text-center md:text-left space-y-4">
                      <div className="space-y-1.5">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono font-bold tracking-widest uppercase">
                          <Bell className="w-3.5 h-3.5 text-red-400" /> {section.subLabel || 'High-Priority Notice'}
                        </span>
                        <h2 className="text-2xl md:text-3xl font-serif font-black text-white tracking-tight">
                          {section.title}
                        </h2>
                      </div>

                      <p className="text-white/80 text-sm md:text-base leading-relaxed whitespace-pre-line font-sans border-l-2 border-[#D4A017]/40 pl-4 py-1 text-left">
                        {section.subtext}
                      </p>

                      {hasMedia && (
                        <div className="pt-2">
                          <div className="relative max-w-md aspect-video rounded-xl overflow-hidden border border-white/10 shadow-lg mx-auto md:mx-0">
                            {isVideo ? (
                              ytId ? (
                                <iframe 
                                  className="w-full h-full"
                                  src={`https://www.youtube.com/embed/${ytId}`}
                                  allowFullScreen
                                  title={section.title}
                                />
                              ) : (
                                <video 
                                  src={section.mediaUrl} 
                                  controls 
                                  className="w-full h-full object-cover"
                                />
                              )
                            ) : (
                              <img 
                                src={section.mediaUrl} 
                                alt={section.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </section>
          );
        }

        // 3. FEATURED SPOTLIGHT / QUOTE LAYOUT
        if (layout === 'spotlight') {
          return (
            <section 
              key={section.id} 
              className="py-24 px-4 md:px-8 border-t border-[#D4A017]/20 relative overflow-hidden bg-[#0A1128]"
              id={`custom-sec-${section.id}`}
            >
              {/* Luxury ambient light */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#D4A017]/10 blur-3xl pointer-events-none" />

              <div className="max-w-4xl mx-auto relative z-10 text-center space-y-8">
                
                <div className="inline-flex p-3 bg-white/5 border border-[#D4A017]/30 rounded-full text-[#D4A017] shadow-xl">
                  <Award className="w-8 h-8" />
                </div>

                <div className="space-y-4 max-w-3xl mx-auto">
                  <span className="text-xs font-mono tracking-widest text-[#D4A017] uppercase block">{section.subLabel || 'Featured Spotlights & Commendations'}</span>
                  <h2 className="text-3xl md:text-5xl font-serif font-black text-white tracking-tight">
                    {section.title}
                  </h2>
                  <div className="w-16 h-1 bg-[#D4A017] mx-auto rounded-full" />
                </div>

                {/* Large Elegant Quote Box */}
                <div className="relative bg-gradient-to-b from-[#0F2557]/80 to-[#050E22]/90 border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
                  {/* Absolute quote marks */}
                  <Quote className="absolute -top-5 -left-5 w-14 h-14 text-[#D4A017]/20 fill-[#D4A017]/10" />
                  <Quote className="absolute -bottom-5 -right-5 w-14 h-14 text-[#D4A017]/20 fill-[#D4A017]/10 transform rotate-180" />

                  <p className="text-white font-serif italic text-lg md:text-xl md:leading-relaxed relative z-10 whitespace-pre-line">
                    "{section.subtext}"
                  </p>

                  {hasMedia && (
                    <div className="mt-8 flex justify-center">
                      <div className="relative max-w-xs aspect-square w-48 rounded-full overflow-hidden border-2 border-[#D4A017] shadow-xl bg-black">
                        {isVideo ? (
                          <video 
                            src={section.mediaUrl} 
                            controls 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img 
                            src={section.mediaUrl} 
                            alt={section.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </section>
          );
        }

        // 4. STANDARD COLUMN ALTERNATING LAYOUT
        return (
          <section 
            key={section.id} 
            className={`py-20 px-4 md:px-8 border-t border-[#D4A017]/20 relative overflow-hidden ${
              isEven ? 'bg-[#050E22]' : 'bg-[#0F2557]'
            }`}
            id={`custom-sec-${section.id}`}
          >
            {/* Background ambient light */}
            <div className={`absolute top-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 ${
              isEven ? 'left-10 bg-[#D4A017]' : 'right-10 bg-indigo-500'
            }`} />

            <div className="max-w-6xl mx-auto relative z-10">
              <div className={`grid grid-cols-1 ${hasMedia ? 'lg:grid-cols-12' : 'max-w-3xl mx-auto'} gap-12 items-center`}>
                
                {/* Text Column */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className={`${hasMedia ? (isEven ? 'lg:col-span-7 lg:order-2' : 'lg:col-span-7') : 'text-center'} space-y-6 text-white`}
                >
                  <div className="space-y-4">
                    <div className={`flex items-center gap-2 ${!hasMedia && 'justify-center'}`}>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A017]/15 border border-[#D4A017]/30 text-[#D4A017] text-[10px] font-mono tracking-wider uppercase">
                        <Sparkles className="w-3 h-3" /> {section.subLabel || 'Special Update'}
                      </span>
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">
                      {section.title}
                    </h2>
                    
                    <div className={`w-12 h-1 bg-[#D4A017] ${!hasMedia && 'mx-auto'}`} />
                    
                    <p className="text-white/80 text-sm md:text-base leading-relaxed whitespace-pre-line font-sans">
                      {section.subtext}
                    </p>
                  </div>
                </motion.div>

                {/* Media Column */}
                {hasMedia && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className={`lg:col-span-5 flex flex-col items-center ${isEven ? 'lg:order-1' : ''}`}
                  >
                    <div className="relative w-full max-w-md aspect-video md:aspect-[4/3] rounded-3xl overflow-hidden border border-[#D4A017]/30 shadow-2xl bg-black/40 flex items-center justify-center">
                      {isVideo ? (
                        ytId ? (
                          <iframe 
                            className="w-full h-full min-h-[220px]"
                            src={`https://www.youtube.com/embed/${ytId}`}
                            allowFullScreen
                            title={section.title}
                          />
                        ) : (
                          <video 
                            src={section.mediaUrl} 
                            controls 
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <img 
                          src={section.mediaUrl} 
                          alt={section.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </motion.div>
                )}

              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
