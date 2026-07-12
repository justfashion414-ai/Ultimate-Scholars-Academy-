import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, CalendarDays } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string;
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isCompleted: false
  });

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

  return (
    <section className="py-24 px-4 md:px-8 bg-[#050E22] text-white relative overflow-hidden" id="countdown-section">
      
      {/* GLOWING AMBIENT BACKGROUNDS */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4A017]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        
        {/* BANNER TAG */}
        <div className="flex items-center justify-center gap-2 text-[#D4A017] mb-4">
          <CalendarDays className="w-5 h-5" />
          <span className="font-mono text-xs tracking-widest uppercase font-semibold">
            Save The Date • July 31, 2026
          </span>
        </div>

        {/* TITLE */}
        <h2 className="text-3xl md:text-5xl font-serif font-bold mb-3 tracking-tight">
          Countdown to the Grand Celebration
        </h2>
        <p className="text-[#D4A017] font-serif italic text-base md:text-lg mb-12">
          End of Session Party & Valedictory Banquet
        </p>

        {/* TIMER CARDS GRID */}
        {timeLeft.isCompleted ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/5 border-2 border-dashed border-[#D4A017]/40 rounded-3xl p-10 max-w-xl mx-auto shadow-2xl"
          >
            <Sparkles className="w-12 h-12 text-[#D4A017] mx-auto mb-4 animate-bounce" />
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">
              The Day Has Arrived!
            </h3>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              We are officially celebrating the SS3 Class of 2026. Join the party, write in the guestbook, and celebrate our future leaders!
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-3xl mx-auto">
            {[
              { value: timeLeft.days, label: "Days", desc: "Until the party" },
              { value: timeLeft.hours, label: "Hours", desc: "To get dressed" },
              { value: timeLeft.minutes, label: "Minutes", desc: "To finalize plans" },
              { value: timeLeft.seconds, label: "Seconds", desc: "Running live" }
            ].map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-[#0F2557]/60 border-l-4 border-[#D4A017] border-y border-r border-white/10 rounded-xl p-6 md:p-8 flex flex-col justify-center items-center shadow-lg relative group text-center"
              >
                {/* BACKPLATE HOVER SHINE */}
                <div className="absolute inset-0 rounded-r-xl border border-transparent group-hover:border-[#D4A017]/30 transition-colors pointer-events-none" />

                <span className="block text-5xl md:text-7xl font-mono font-bold text-[#D4A017] tracking-tight leading-none">
                  {String(card.value).padStart(2, '0')}
                </span>
                
                <span className="block text-xs font-mono tracking-widest text-white uppercase font-bold mt-3">
                  {card.label}
                </span>

                <span className="block text-[9px] text-white/40 font-mono tracking-wide mt-1">
                  {card.desc}
                </span>
              </motion.div>
            ))}
          </div>
        )}

        {/* QUOTE BANNER */}
        <div className="mt-16 bg-white/5 max-w-2xl mx-auto p-4 md:p-6 rounded-2xl border border-white/5">
          <p className="text-white/80 font-serif italic text-sm md:text-base">
            "Your education is a dress rehearsal for a life that is yours to lead. Let your knowledge light the way."
          </p>
        </div>

      </div>
    </section>
  );
}
