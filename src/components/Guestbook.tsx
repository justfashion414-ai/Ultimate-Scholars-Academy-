import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Pin, User, ShieldAlert, CheckCircle2, Loader2, Trash2, Calendar, X, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GuestbookEntry } from '../types';
import { fetchGuestbook, submitToModeration, deleteApprovedGuestbookEntry } from '../lib/firebaseService';

export default function Guestbook({ 
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
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Student' | 'Parent' | 'Teacher' | 'Alumni' | 'Well-wisher'>('Student');
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // Custom titles subscription
  const [sectionTitle, setSectionTitle] = useState("Memory Sticky Board");
  const [sectionSubtitle, setSectionSubtitle] = useState("Leave your greetings, advice, and congratulations for the SS3 Class of 2026. Your message will be pinned to our memory board.");

  // Load section titles and entries from Firebase Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "titles"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().guestbook || {};
        if (data.title) setSectionTitle(data.title);
        if (data.subtitle) setSectionSubtitle(data.subtitle);
      }
    });

    fetchGuestbook()
      .then(data => {
        setEntries(data);
      })
      .catch(err => {
        console.error("Error fetching board entries from Firestore:", err);
      });

    return () => unsub();
  }, [refreshKey]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    // Basic validation
    if (!name.trim()) {
      setFormError('Please enter your name.');
      return;
    }
    if (!message.trim()) {
      setFormError('Please enter a sticky note message.');
      return;
    }
    if (message.length < 5) {
      setFormError('Your message is a bit too short! Share a sweet thought.');
      return;
    }
    if (!selectedDate) {
      setFormError('Please select a memory or entry date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData = {
        name: name.trim(),
        role,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        selectedDate: selectedDate
      };

      const result = await submitToModeration('guestbook', submissionData);

      if (result.success) {
        setName('');
        setMessage('');
        setSelectedDate(new Date().toISOString().split('T')[0]);
        setFormSuccess(true);
        setTimeout(() => {
          setIsPostModalOpen(false);
          setFormSuccess(false);
        }, 2000);
      } else {
        setFormError("Failed to submit message to the board.");
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      setFormError(err.message || "Network error. Could not pin message to the board.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to format date strings nicely
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'July 2026';
    }
  };

  // Predefined elegant light-themed, high-contrast bold colorful shades for the sticky notes corkboard
  const stickyStyles = [
    {
      cardClass: 'bg-gradient-to-br from-[#FFFDE7] to-[#FFF59D] border-yellow-400 text-slate-900 shadow-[0_8px_25px_rgba(251,191,36,0.2)]',
      pinClass: 'bg-amber-600 border-amber-300 shadow-amber-600/50',
      glowClass: 'bg-yellow-400/10',
      textClass: 'text-slate-950 font-black',
      bodyTextClass: 'text-[#1a1200] font-bold',
      mutedTextClass: 'text-amber-950/90 font-semibold'
    },
    {
      cardClass: 'bg-gradient-to-br from-[#FFF0F5] to-[#FFB2C3] border-pink-400 text-slate-900 shadow-[0_8px_25px_rgba(236,72,153,0.2)]',
      pinClass: 'bg-pink-600 border-pink-300 shadow-pink-600/50',
      glowClass: 'bg-pink-400/10',
      textClass: 'text-slate-950 font-black',
      bodyTextClass: 'text-[#20000a] font-bold',
      mutedTextClass: 'text-pink-950/90 font-semibold'
    },
    {
      cardClass: 'bg-gradient-to-br from-[#E0F2FE] to-[#7DD3FC] border-blue-400 text-slate-900 shadow-[0_8px_25px_rgba(59,130,246,0.2)]',
      pinClass: 'bg-blue-600 border-blue-300 shadow-blue-600/50',
      glowClass: 'bg-blue-400/10',
      textClass: 'text-slate-950 font-black',
      bodyTextClass: 'text-[#03152e] font-bold',
      mutedTextClass: 'text-blue-950/90 font-semibold'
    },
    {
      cardClass: 'bg-gradient-to-br from-[#ECFDF5] to-[#6EE7B7] border-emerald-400 text-slate-900 shadow-[0_8px_25px_rgba(16,185,129,0.2)]',
      pinClass: 'bg-emerald-600 border-emerald-300 shadow-emerald-600/50',
      glowClass: 'bg-emerald-400/10',
      textClass: 'text-slate-950 font-black',
      bodyTextClass: 'text-[#012014] font-bold',
      mutedTextClass: 'text-emerald-950/90 font-semibold'
    },
    {
      cardClass: 'bg-gradient-to-br from-[#FFF7ED] to-[#FDBA74] border-orange-400 text-slate-900 shadow-[0_8px_25px_rgba(249,115,22,0.2)]',
      pinClass: 'bg-orange-600 border-orange-300 shadow-orange-600/50',
      glowClass: 'bg-orange-400/10',
      textClass: 'text-slate-950 font-black',
      bodyTextClass: 'text-[#240c01] font-bold',
      mutedTextClass: 'text-orange-950/90 font-semibold'
    },
    {
      cardClass: 'bg-gradient-to-br from-[#F5F3FF] to-[#A5B4FC] border-indigo-400 text-slate-900 shadow-[0_8px_25px_rgba(99,102,241,0.2)]',
      pinClass: 'bg-indigo-600 border-indigo-300 shadow-indigo-600/50',
      glowClass: 'bg-indigo-400/10',
      textClass: 'text-slate-950 font-black',
      bodyTextClass: 'text-[#0d0d2e] font-bold',
      mutedTextClass: 'text-indigo-950/90 font-semibold'
    },
    {
      cardClass: 'bg-gradient-to-br from-[#FFF5F5] to-[#FDA4AF] border-rose-400 text-slate-900 shadow-[0_8px_25px_rgba(244,63,94,0.2)]',
      pinClass: 'bg-rose-600 border-rose-300 shadow-rose-600/50',
      glowClass: 'bg-rose-400/10',
      textClass: 'text-slate-950 font-black',
      bodyTextClass: 'text-[#230209] font-bold',
      mutedTextClass: 'text-rose-950/90 font-semibold'
    },
    {
      cardClass: 'bg-gradient-to-br from-[#F0FDFA] to-[#5EEAD4] border-teal-400 text-slate-900 shadow-[0_8px_25px_rgba(20,184,166,0.2)]',
      pinClass: 'bg-teal-600 border-teal-300 shadow-teal-600/50',
      glowClass: 'bg-teal-400/10',
      textClass: 'text-slate-950 font-black',
      bodyTextClass: 'text-[#011a17] font-bold',
      mutedTextClass: 'text-teal-950/90 font-semibold'
    }
  ];

  const getStickyStyle = (entry: GuestbookEntry, idx: number) => {
    const charCodeSum = entry.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return stickyStyles[(charCodeSum + idx) % stickyStyles.length];
  };

  const getRoleBadgeColor = (roleStr: string) => {
    switch (roleStr) {
      case 'Student': return 'bg-blue-200 text-blue-950 border border-blue-400 font-extrabold';
      case 'Parent': return 'bg-emerald-200 text-emerald-950 border border-emerald-400 font-extrabold';
      case 'Teacher': return 'bg-amber-200 text-amber-950 border border-amber-400 font-extrabold';
      case 'Alumni': return 'bg-purple-200 text-purple-950 border border-purple-400 font-extrabold';
      default: return 'bg-slate-200 text-slate-950 border border-slate-400 font-extrabold';
    }
  };

  return (
    <section className="py-24 px-4 md:px-8 bg-[#0F2557] border-t border-[#D4A017]/20 relative" id="guestbook">
      <div className="max-w-6xl mx-auto">
        
        {/* SECTION HEADER */}
        <div className="text-center mb-12 relative">
          <span className="inline-block px-3.5 py-1 rounded-full bg-[#D4A017]/15 border border-[#D4A017]/30 text-[#D4A017] text-xs font-mono tracking-wider uppercase mb-3 font-semibold">
            Interactive Keepsake
          </span>
          <h2 className="text-3xl md:text-5xl font-serif text-white font-bold tracking-tight mb-2">
            {sectionTitle}
          </h2>
          <div className="w-16 h-1 bg-[#D4A017] mx-auto mb-4" />
          <p className="text-white/90 text-base md:text-lg max-w-2xl mx-auto leading-relaxed italic mb-6">
            {sectionSubtitle}
          </p>

          {/* DEDICATED HEADER POST BUTTON */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setFormError('');
                setFormSuccess(false);
                setIsPostModalOpen(true);
              }}
              className="px-6 py-3 rounded-full bg-[#D4A017] hover:bg-[#f4c84d] text-[#0F2557] font-serif font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-[#D4A017] flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Post Your Memory Note</span>
            </button>
          </div>
        </div>

        {/* ROW: FORM + SUBMISSIONS WALL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* LEFT COLUMN: STATIC FORM FOR DESKTOP (IF NOT PREVIEW) */}
          {!isPreview && (
            <div className="lg:col-span-5 bg-[#050E22]/80 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-[#D4A017]/30 shadow-2xl text-white">
              <h3 className="text-xl font-serif font-bold text-[#D4A017] mb-6 flex items-center gap-2">
                <Pin className="w-5 h-5 text-[#D4A017]" />
                Pin a Memory Card
              </h3>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* NAME INPUT */}
                <div>
                  <label htmlFor="guest-name" className="block text-xs font-mono uppercase tracking-wider text-white/70 font-bold mb-1.5">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-white/40" />
                    <input
                      id="guest-name"
                      type="text"
                      required
                      placeholder="e.g. Chief Chuka Ezenwa"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white placeholder-white/30"
                    />
                  </div>
                </div>

                {/* ROLE SELECTION */}
                <div>
                  <label htmlFor="guest-role" className="block text-xs font-mono uppercase tracking-wider text-white/70 font-bold mb-1.5">
                    Your Association / Role
                  </label>
                  <select
                    id="guest-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white font-medium"
                  >
                    <option value="Student">Student (Graduand / Junior)</option>
                    <option value="Parent">Parent / Guardian</option>
                    <option value="Teacher">Teacher / Administrator</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Well-wisher">Well-wisher</option>
                  </select>
                </div>

                {/* CALENDAR DATE SELECTION COMPONENT */}
                <div>
                  <label htmlFor="guest-date" className="block text-xs font-mono uppercase tracking-wider text-white/70 font-bold mb-1.5">
                    Select Memory / Event Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-white/40 pointer-events-none" />
                    <input
                      id="guest-date"
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white scheme-dark"
                    />
                  </div>
                </div>

                {/* MESSAGE TEXTAREA */}
                <div>
                  <label htmlFor="guest-message" className="block text-xs font-mono uppercase tracking-wider text-white/70 font-bold mb-1.5">
                    Memory Message
                  </label>
                  <textarea
                    id="guest-message"
                    required
                    rows={4}
                    placeholder="Share a school memory, write advice, or congratulate the class..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white placeholder-white/30 leading-relaxed font-sans"
                  />
                </div>

                {/* DYNAMIC ALERT BANNER */}
                <AnimatePresence mode="wait">
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3.5 bg-red-950/60 border border-red-500/40 text-red-200 text-xs rounded-xl"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{formError}</span>
                    </motion.div>
                  )}

                  {formSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs rounded-xl font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>Yes, congratulations, your upload has been successful. It will reflect soon.</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  id="btn-submit-guestbook"
                  disabled={isSubmitting}
                  className="cursor-pointer w-full bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-serif font-bold text-sm py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group border border-[#D4A017] disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Uploading...' : 'Pin Memory to Board'}</span>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
                  )}
                </button>

              </form>
            </div>
          )}

          {/* RIGHT COLUMN: INTERACTIVE STICKY WALL */}
          <div className={isPreview ? "lg:col-span-12 w-full" : "lg:col-span-7"}>
            <div className="flex justify-between items-center mb-6 text-white">
              <h4 className="text-white font-serif font-bold text-lg md:text-xl tracking-wide flex items-center gap-2">
                Active Memory Board ({entries.length})
              </h4>
              <button
                onClick={() => {
                  setFormError('');
                  setFormSuccess(false);
                  setIsPostModalOpen(true);
                }}
                className="px-4 py-2 rounded-full bg-[#D4A017]/20 hover:bg-[#D4A017]/30 border border-[#D4A017]/50 text-[#D4A017] font-sans font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Memory</span>
              </button>
            </div>

            {/* STICKY NOTES WRAPPER */}
            <div className={isPreview ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "max-h-[620px] overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-white/10"}>
              <AnimatePresence initial={false}>
                {(isPreview ? entries.slice(0, 6) : entries).map((entry, idx) => {
                  const style = getStickyStyle(entry, idx);
                  const rot = isPreview ? 'rotate-0' : (idx % 3 === 0 ? '-rotate-1' : idx % 3 === 1 ? 'rotate-1' : 'rotate-0');

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      className={`relative border-2 p-6 md:p-7 rounded-2xl shadow-xl hover:shadow-2xl transition-all overflow-hidden ${style.cardClass} ${rot} ${
                        cleanUpMode ? 'border-rose-500/50 hover:border-rose-500 bg-rose-950/10' : ''
                      }`}
                    >
                      {/* SUBTLE GLOW EFFECT */}
                      <div className={`absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-40 ${style.glowClass}`} />

                      {/* DYNAMIC PUSHPIN EMBLEM */}
                      <div className={`absolute top-3.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${style.pinClass} border-2 shadow-md flex items-center justify-center pointer-events-none z-10`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-90" />
                      </div>

                      {/* INDIVIDUAL DELETE TRASH BUTTON */}
                      {cleanUpMode && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to permanently delete this comment by ${entry.name}?`)) {
                              try {
                                await deleteApprovedGuestbookEntry(entry.id, entry.imageUrl);
                                if (onDataChange) onDataChange();
                              } catch (err) {
                                console.error("Error deleting comment:", err);
                                alert("Failed to delete this approved entry.");
                              }
                            }
                          }}
                          className="absolute top-3 right-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-2 shadow-lg transition-all cursor-pointer z-10 hover:scale-110 flex items-center justify-center border border-rose-500"
                          title="Delete approved message permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* POST CARD HEADER */}
                      <div className="flex justify-between items-start mb-3 pt-3 border-b border-black/10 pb-2">
                        <div>
                          <h5 className={`font-serif font-extrabold text-base md:text-lg leading-tight ${style.textClass}`}>
                            {entry.name}
                          </h5>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className={`inline-block text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full ${getRoleBadgeColor(entry.role)}`}>
                              {entry.role}
                            </span>
                            {entry.selectedDate && (
                              <span className="inline-block text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-black/10 text-slate-900 border border-black/20 font-bold">
                                {formatDate(entry.selectedDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono ${style.mutedTextClass}`}>
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>

                      {/* BOLDER, LARGER NOTE MESSAGE */}
                      <p className={`text-base md:text-lg font-extrabold leading-snug whitespace-pre-line font-sans tracking-wide text-slate-950 ${style.bodyTextClass}`}>
                        "{entry.message}"
                      </p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* LANDING PAGE CTA BUTTON - CHANGED TO "VIEW MORE" */}
        {isPreview && (
          <div className="text-center mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/guestbook"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#D4A017] to-[#f4c84d] text-[#0F2557] rounded-full text-sm font-serif font-bold shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-[#D4A017]"
            >
              <Send size={15} />
              <span>View More</span>
            </Link>

            <button
              onClick={() => {
                setFormError('');
                setFormSuccess(false);
                setIsPostModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-black/40 hover:bg-black/60 text-[#D4A017] rounded-full text-sm font-serif font-bold border border-[#D4A017]/40 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Post Your Memory Note</span>
            </button>
          </div>
        )}

      </div>

      {/* POP-UP MODAL FOR POSTING A MEMORY NOTE */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#050E22] border-2 border-[#D4A017]/40 p-6 md:p-8 rounded-3xl shadow-2xl text-white max-h-[90vh] overflow-y-auto"
            >
              {/* TOP CLOSE BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setIsPostModalOpen(false);
                  setFormError('');
                }}
                className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer border border-white/10"
                title="Cancel and close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-serif font-bold text-[#D4A017] flex items-center gap-2">
                  <Pin className="w-6 h-6 text-[#D4A017]" />
                  Post Your Memory Note
                </h3>
                <p className="text-xs text-white/70 font-sans mt-1">
                  Share a greeting, warm note, or congratulatory message for the SS3 Class of 2026.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                
                {/* NAME INPUT */}
                <div>
                  <label htmlFor="modal-guest-name" className="block text-xs font-mono uppercase tracking-wider text-white/70 font-bold mb-1.5">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-white/40" />
                    <input
                      id="modal-guest-name"
                      type="text"
                      required
                      placeholder="e.g. Chief Chuka Ezenwa"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white placeholder-white/30"
                    />
                  </div>
                </div>

                {/* ROLE SELECTION */}
                <div>
                  <label htmlFor="modal-guest-role" className="block text-xs font-mono uppercase tracking-wider text-white/70 font-bold mb-1.5">
                    Your Association / Role
                  </label>
                  <select
                    id="modal-guest-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white font-medium"
                  >
                    <option value="Student">Student (Graduand / Junior)</option>
                    <option value="Parent">Parent / Guardian</option>
                    <option value="Teacher">Teacher / Administrator</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Well-wisher">Well-wisher</option>
                  </select>
                </div>

                {/* CALENDAR DATE SELECTION */}
                <div>
                  <label htmlFor="modal-guest-date" className="block text-xs font-mono uppercase tracking-wider text-white/70 font-bold mb-1.5">
                    Select Memory / Event Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-white/40 pointer-events-none" />
                    <input
                      id="modal-guest-date"
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white scheme-dark"
                    />
                  </div>
                </div>

                {/* MESSAGE TEXTAREA */}
                <div>
                  <label htmlFor="modal-guest-message" className="block text-xs font-mono uppercase tracking-wider text-white/70 font-bold mb-1.5">
                    Memory Message
                  </label>
                  <textarea
                    id="modal-guest-message"
                    required
                    rows={4}
                    placeholder="Share a school memory, write advice, or congratulate the class..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white placeholder-white/30 leading-relaxed font-sans"
                  />
                </div>

                {/* DYNAMIC ALERT BANNER */}
                <AnimatePresence mode="wait">
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3.5 bg-red-950/80 border border-red-500/50 text-red-200 text-xs rounded-xl"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{formError}</span>
                    </motion.div>
                  )}

                  {formSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs rounded-xl font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>Yes, congratulations, your upload has been successful. It will reflect soon.</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ACTION BUTTONS: SUBMIT & CANCEL */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPostModalOpen(false);
                      setFormError('');
                      setFormSuccess(false);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/15 text-white font-medium text-xs transition-all cursor-pointer font-mono"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-serif font-bold text-xs py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 border border-[#D4A017] disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Uploading...' : 'Pin Memory Note'}</span>
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
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

