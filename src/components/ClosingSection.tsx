import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, PhoneCall, Copy, Check, Twitter, Facebook, Shield } from 'lucide-react';
import { subscribeSchoolLogo } from '../lib/firebaseService';

export default function ClosingSection() {
  const [copied, setCopied] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeSchoolLogo(url => {
      setLogoUrl(url || null);
    });
    return () => unsubscribe();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const shareText = "Check out the digital graduation album for Scholars Academy SS3 Class of 2026! 🎓✨";

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <footer className="bg-[#0F2557] text-white py-24 px-4 md:px-8 relative overflow-hidden" id="closing-section">
      
      {/* DECORATIVE LINES */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4A017]/40 to-transparent" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        
        {/* LOGO SHIELD */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="School Logo"
            referrerPolicy="no-referrer"
            className="w-16 h-16 object-contain rounded-full bg-white/5 p-1.5 border border-white/20 mx-auto mb-6 shadow-xl"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4A017] to-[#b0820e] flex items-center justify-center text-[#0F2557] font-serif font-black text-2xl shadow-xl border border-white/20 mx-auto mb-6">
            SA
          </div>
        )}

        {/* CLASS MOTTO */}
        <p className="text-[#D4A017] font-serif italic text-2xl md:text-4xl tracking-wide mb-3 leading-tight">
          "Knowledge Lights the Way"
        </p>
        
        <h3 className="text-white/60 font-mono text-xs tracking-widest uppercase mb-8">
          Scholars Academy • SS3 Class of 2026
        </h3>

        {/* CENTRAL BRAND BANNER */}
        <div className="max-w-xl mx-auto mb-12">
          <p className="text-white/70 text-sm md:text-base leading-relaxed">
            As our journey concludes and we step forward into new horizons, we carry with us the values, the wisdom, and the unbreakable friendships of Scholars Academy. Shine bright and stay legendary!
          </p>
        </div>

        {/* ACTION BUTTONS (SOCIAL SHARE & WHATSAPP) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
          
          {/* WHATSAPP CONTACT LINK */}
          <a
            href="https://wa.me/2348000000000?text=Hello%20Scholars%20Academy%20I%20would%20love%20to%20request%20a%20personalized%20copy%20of%20the%20Class%20of%202026%20Graduation%20Album."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20ba59] text-white font-serif font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Order Personalized Album</span>
          </a>

          {/* COPY LINK BUTTON */}
          <button
            onClick={handleCopyLink}
            id="btn-copy-album-link"
            className="cursor-pointer w-full sm:w-auto bg-white/10 hover:bg-white/15 border border-white/20 text-white font-serif font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 relative"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2 text-amber-300"
                >
                  <Check className="w-4 h-4" />
                  <span>Album Link Copied!</span>
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4 text-[#D4A017]" />
                  <span>Share Album Link</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>

        </div>

        {/* SOCIAL SHARING ICON BUTTON STRIP */}
        <div className="flex justify-center items-center gap-4 mb-16">
          <button
            onClick={handleShareTwitter}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-[#D4A017] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Share on Twitter"
          >
            <Twitter className="w-4 h-4" />
          </button>
          <button
            onClick={handleShareFacebook}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-[#D4A017] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Share on Facebook"
          >
            <Facebook className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#D4A017]">
            <Share2 className="w-4 h-4" />
          </div>
        </div>

        {/* BOTTOM FINE PRINT */}
        <div className="border-t border-white/5 pt-8 text-center text-white/30 text-xs font-mono space-y-3">
          <p>© {new Date().getFullYear()} Scholars Academy, SS3 Class of 2026. All rights reserved.</p>
          <p className="mt-1">Crafted with care for the Valedictory End of Session Banquet</p>
        </div>

      </div>
    </footer>
  );
}
