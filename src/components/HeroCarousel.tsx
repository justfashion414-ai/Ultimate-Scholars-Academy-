import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, ChevronDown } from 'lucide-react';
import { CAROUSEL_IMAGES } from '../data';
import { subscribeSchoolLogo, subscribeActiveBannerEvent, fetchPhotos } from '../lib/firebaseService';

interface HeroCarouselProps {
  targetDate: string; // ISO format string
  onViewAlbumClick: () => void;
}

export default function HeroCarousel({ targetDate, onViewAlbumClick }: HeroCarouselProps) {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setShouldReduceMotion(event.matches);
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [activeEventName, setActiveEventName] = useState<string | null>(null);
  const [dynamicImages, setDynamicImages] = useState<string[]>([]);
  const [isImagesLoaded, setIsImagesLoaded] = useState(false);
  const [bannerTitle, setBannerTitle] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isCompleted: false
  });

  // Image load error state to display graceful fallback panels
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // 3-click logo trigger state
  const [logoClickCount, setLogoClickCount] = useState(0);

  const handleLogoClick = () => {
    setLogoClickCount(prev => {
      const next = prev + 1;
      if (next >= 3) {
        window.dispatchEvent(new CustomEvent('trigger-admin-portal'));
        return 0;
      }
      return next;
    });
  };

  useEffect(() => {
    if (logoClickCount > 0) {
      const timer = setTimeout(() => {
        setLogoClickCount(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [logoClickCount]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference <= 0) {
        setTimeLeft(prev => ({ ...prev, isCompleted: true }));
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isCompleted: false
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  useEffect(() => {
    const unsubscribeLogo = subscribeSchoolLogo(url => {
      setLogoUrl(url || null);
    });
    return () => unsubscribeLogo();
  }, []);

  // Fetch photos and subscribe to selected banner event
  useEffect(() => {
    let currentSelectedEvent: string | null = null;

    const loadImages = async (selEvent: string | null) => {
      try {
        const allPhotos = await fetchPhotos();
        if (allPhotos && allPhotos.length > 0) {
          let targetEvent = selEvent;
          
          if (!targetEvent) {
            // Pick the event of the photo uploaded last
            // Approved photos are ordered by uploadedAt desc
            targetEvent = allPhotos[0].title;
          }

          // Filter photos matching this event
          const matchedPhotos = allPhotos.filter(
            p => p.title.trim().toLowerCase() === targetEvent?.trim().toLowerCase()
          );
          
          const urls = matchedPhotos.map(p => p.url);
          if (urls.length > 0) {
            setDynamicImages(urls);
            setBannerTitle(targetEvent);
            setIsImagesLoaded(true);
            return;
          }
        }
        
        // Fallback to default
        setDynamicImages([]);
        setBannerTitle('');
        setIsImagesLoaded(true);
      } catch (err) {
        console.error("Error loading banner images:", err);
        setIsImagesLoaded(true);
      }
    };

    const unsubscribeEvent = subscribeActiveBannerEvent(eventName => {
      currentSelectedEvent = eventName;
      loadImages(currentSelectedEvent);
    });

    return () => {
      unsubscribeEvent();
    };
  }, []);

  const handleImageError = (url: string) => {
    setFailedImages(prev => ({ ...prev, [url]: true }));
  };

  // Determine which list of images to use
  const bannerImages = isImagesLoaded && dynamicImages.length > 0 ? dynamicImages : CAROUSEL_IMAGES;

  // Split images into two rows for the staggered movement effect (desktop)
  const dMidPoint = Math.ceil(bannerImages.length / 2);
  const dRow1 = bannerImages.slice(0, dMidPoint);
  const dRow2 = bannerImages.slice(dMidPoint);

  // Split images into three rows for mobile
  const mSize = Math.ceil(bannerImages.length / 3);
  const mRow1 = bannerImages.slice(0, mSize);
  const mRow2 = bannerImages.slice(mSize, mSize * 2);
  const mRow3 = bannerImages.slice(mSize * 2);

  // Duplicate arrays to create a continuous infinite scroll effect (at least 15 items per row)
  const extendRow = (arr: string[]) => {
    if (arr.length === 0) return [];
    let extended = [...arr];
    while (extended.length < 15) {
      extended = [...extended, ...arr];
    }
    return extended;
  };

  const dRow1Extended = extendRow(dRow1);
  const dRow2Extended = extendRow(dRow2);

  const mRow1Extended = extendRow(mRow1);
  const mRow2Extended = extendRow(mRow2);
  const mRow3Extended = extendRow(mRow3);

  return (
    <div className="relative w-full bg-[#050E22] overflow-hidden flex flex-col" id="hero-section">
      
      {/* HEADER LOGO STRIP */}
      <div className="relative z-10 w-full px-6 py-3 md:py-4 flex justify-between items-center border-b border-white/5 bg-[#050E22]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="School Logo"
              referrerPolicy="no-referrer"
              onClick={handleLogoClick}
              className="w-10 h-10 object-contain rounded-full bg-white/5 p-1 border border-white/10 shadow-md cursor-pointer transition-transform active:scale-95"
            />
          ) : (
            <div 
              onClick={handleLogoClick}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4A017] to-[#b0820e] flex items-center justify-center text-[#0F2557] font-serif font-extrabold text-lg shadow-md border border-white/10 cursor-pointer transition-transform active:scale-95"
            >
              S
            </div>
          )}
          <div>
            <h1 className="text-white font-serif font-semibold text-sm tracking-wider md:text-base">SCHOLARS ACADEMY</h1>
            <p className="text-[#D4A017] font-mono text-[9px] tracking-widest uppercase">Class of 2026</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-white/80 text-xs font-medium">
          <Calendar className="w-3.5 h-3.5 text-[#D4A017]" />
          <span>July 31, 2026 • End of Session</span>
        </div>
      </div>

      {/* SCROLLING TIMELINE CAROUSEL ROW */}
      <div className="relative w-full py-4 md:py-6 flex flex-col justify-center bg-black/10 shrink-0">
        {!isImagesLoaded ? (
          <div className="w-full h-32 md:h-44 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <span className="w-6 h-6 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-white/45 font-mono uppercase tracking-widest">Loading memories...</span>
            </div>
          </div>
        ) : (
          <>
            {/* DESKTOP TWO LINES (hidden on mobile, flex on md) */}
            <div className="hidden md:flex flex-col gap-4 w-full">
              {/* ROW 1: RIGHT TO LEFT */}
              <div className="relative flex w-full overflow-hidden py-0.5">
                <motion.div 
                  className="flex gap-4 shrink-0 whitespace-nowrap"
                  animate={shouldReduceMotion ? {} : {
                    x: [0, -1200]
                  }}
                  transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 32,
                  }}
                  whileHover={shouldReduceMotion ? {} : { animationPlayState: 'paused' }}
                >
                  {dRow1Extended.map((imgUrl, idx) => (
                    <div 
                      key={`dr1-${idx}`} 
                      className="w-48 h-32 md:w-60 md:h-40 rounded-xl overflow-hidden shrink-0 border border-[#D4A017]/20 shadow-lg bg-[#0F2557] hover:border-[#D4A017]/60 transition-colors"
                    >
                      {failedImages[imgUrl] ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0F2557] to-[#1e3d7a] text-[#D4A017] font-serif font-bold text-xl border-2 border-[#D4A017]/20">
                          SA
                        </div>
                      ) : (
                        <img 
                          src={imgUrl} 
                          alt="School gallery high school portrait" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover select-none pointer-events-none filter brightness-95"
                          onError={() => handleImageError(imgUrl)}
                          loading="eager"
                        />
                      )}
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* ROW 2: LEFT TO RIGHT */}
              <div className="relative flex w-full overflow-hidden py-0.5">
                <motion.div 
                  className="flex gap-4 shrink-0 whitespace-nowrap"
                  animate={shouldReduceMotion ? {} : {
                    x: [-1200, 0]
                  }}
                  transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 36,
                  }}
                  whileHover={shouldReduceMotion ? {} : { animationPlayState: 'paused' }}
                >
                  {dRow2Extended.map((imgUrl, idx) => (
                    <div 
                      key={`dr2-${idx}`} 
                      className="w-48 h-32 md:w-60 md:h-40 rounded-xl overflow-hidden shrink-0 border border-[#D4A017]/20 shadow-lg bg-[#0F2557] hover:border-[#D4A017]/60 transition-colors"
                    >
                      {failedImages[imgUrl] ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0F2557] to-[#1e3d7a] text-[#D4A017] font-serif font-bold text-xl border-2 border-[#D4A017]/20">
                          SA
                        </div>
                      ) : (
                        <img 
                          src={imgUrl} 
                          alt="Graduation celebration moments" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover select-none pointer-events-none filter brightness-95"
                          onError={() => handleImageError(imgUrl)}
                          loading="eager"
                        />
                      )}
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* MOBILE THREE LINES (flex on mobile, hidden on md) */}
            <div className="flex md:hidden flex-col gap-2.5 w-full overflow-hidden">
              {/* ROW 1: RIGHT TO LEFT */}
              <div className="relative flex w-full overflow-hidden py-0.5">
                <motion.div 
                  className="flex gap-3 shrink-0 whitespace-nowrap"
                  animate={shouldReduceMotion ? {} : {
                    x: [0, -900]
                  }}
                  transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 25,
                  }}
                >
                  {mRow1Extended.map((imgUrl, idx) => (
                    <div 
                      key={`mr1-${idx}`} 
                      className="w-32 h-22 rounded-lg overflow-hidden shrink-0 border border-[#D4A017]/20 shadow-md bg-[#0F2557]"
                    >
                      {failedImages[imgUrl] ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#0F2557] text-[#D4A017] font-serif font-bold text-xs">
                          SA
                        </div>
                      ) : (
                        <img 
                          src={imgUrl} 
                          alt="School portrait" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(imgUrl)}
                        />
                      )}
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* ROW 2: LEFT TO RIGHT */}
              <div className="relative flex w-full overflow-hidden py-0.5">
                <motion.div 
                  className="flex gap-3 shrink-0 whitespace-nowrap"
                  animate={shouldReduceMotion ? {} : {
                    x: [-900, 0]
                  }}
                  transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 28,
                  }}
                >
                  {mRow2Extended.map((imgUrl, idx) => (
                    <div 
                      key={`mr2-${idx}`} 
                      className="w-32 h-22 rounded-lg overflow-hidden shrink-0 border border-[#D4A017]/20 shadow-md bg-[#0F2557]"
                    >
                      {failedImages[imgUrl] ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#0F2557] text-[#D4A017] font-serif font-bold text-xs">
                          SA
                        </div>
                      ) : (
                        <img 
                          src={imgUrl} 
                          alt="School portrait" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(imgUrl)}
                        />
                      )}
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* ROW 3: RIGHT TO LEFT */}
              <div className="relative flex w-full overflow-hidden py-0.5">
                <motion.div 
                  className="flex gap-3 shrink-0 whitespace-nowrap"
                  animate={shouldReduceMotion ? {} : {
                    x: [0, -900]
                  }}
                  transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 30,
                  }}
                >
                  {mRow3Extended.map((imgUrl, idx) => (
                    <div 
                      key={`mr3-${idx}`} 
                      className="w-32 h-22 rounded-lg overflow-hidden shrink-0 border border-[#D4A017]/20 shadow-md bg-[#0F2557]"
                    >
                      {failedImages[imgUrl] ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#0F2557] text-[#D4A017] font-serif font-bold text-xs">
                          SA
                        </div>
                      ) : (
                        <img 
                          src={imgUrl} 
                          alt="School portrait" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(imgUrl)}
                        />
                      )}
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CALL TO ACTION ROW (Tightly positioned under the scrolling image banner) */}
      <div className="relative z-10 w-full text-center pb-5 pt-3.5 flex flex-col items-center gap-3 bg-[#050E22]/95 border-t border-white/5 shrink-0">
        {bannerTitle && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg mx-auto py-2 px-6 bg-gradient-to-r from-[#0F2557] to-[#1a3d82] border-y border-[#D4A017]/30 text-white flex items-center justify-center gap-2 text-xs md:text-sm font-sans tracking-wide uppercase shadow-lg"
          >
            <span className="font-semibold text-white/80">Showcasing Event:</span>
            <strong className="text-[#D4A017] font-bold tracking-wider">{bannerTitle}</strong>
          </motion.div>
        )}

        <motion.button
          onClick={onViewAlbumClick}
          id="btn-view-album"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="cursor-pointer bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-serif font-bold text-sm md:text-base px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group border border-[#D4A017]"
        >
          <span>View The Album</span>
          <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
        </motion.button>
        <p className="text-white/30 text-[9px] font-mono tracking-widest uppercase">
          SCROLL TO EXPLORE THE MEMORIES
        </p>
      </div>
    </div>
  );
}
