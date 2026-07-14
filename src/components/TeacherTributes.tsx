import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote, HeartHandshake, Trash2, ArrowLeft, Plus, Loader2, Check, Camera, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchTeacherTributes, deleteApprovedTeacherTribute, submitToModeration } from '../lib/firebaseService';
import { TeacherTribute } from '../types';
import { compressImage } from '../lib/imageCompressor';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function TeacherTributes({
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
  const [tributes, setTributes] = useState<TeacherTribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const [sectionTitle, setSectionTitle] = useState("Teacher Tributes");
  const [sectionSubtitle, setSectionSubtitle] = useState("Heartfelt parting messages and wisdom shared by our beloved teachers, counselors, and school administrators.");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "titles"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().teachers || {};
        if (data.title) setSectionTitle(data.title);
        if (data.subtitle) setSectionSubtitle(data.subtitle);
      }
    });
    return () => unsub();
  }, []);

  // Submit state and handlers
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    subject: '',
    message: '',
    image: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [successBannerMsg, setSuccessBannerMsg] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be smaller than 5MB");
      return;
    }

    setUploadError("");
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setSelectedAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file as any));
  };

  const handleRemoveAvatar = () => {
    setSelectedAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview('');
    }
    setUploadError("");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.subject || !form.message) {
      setUploadError("Please fill in all textual fields.");
      return;
    }

    setUploading(true);
    let finalImageUrl = "";
    try {
      if (selectedAvatarFile) {
        // Upload photo to Cloudinary with compression
        finalImageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const rawBase64 = reader.result as string;
            try {
              const base64data = await compressImage(rawBase64);
              const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: base64data, filename: selectedAvatarFile.name }),
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
          reader.readAsDataURL(selectedAvatarFile);
        });
      }

      const result = await submitToModeration('teacher_tribute', {
        name: form.name.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        image: finalImageUrl || "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=300&auto=format&fit=crop",
        submittedAt: new Date().toISOString()
      });

      if (result.success) {
        setSuccessBannerMsg("Yes, congratulations, your upload has been successful. It will reflect soon.");
        setShowSuccessBanner(true);
        setIsSubmitModalOpen(false);
        setForm({ name: '', subject: '', message: '', image: '' });
        setSelectedAvatarFile(null);
        if (avatarPreview) {
          URL.revokeObjectURL(avatarPreview);
          setAvatarPreview('');
        }
        setTimeout(() => setShowSuccessBanner(false), 8000);
      } else {
        setUploadError("Failed to submit tribute for moderation.");
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "An error occurred during submission.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTeacherTributes()
      .then(data => {
        setTributes(data);
      })
      .catch(err => console.error("Error fetching teacher tributes:", err))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleImageError = (id: string) => {
    setFailedImages(prev => ({ ...prev, [id]: true }));
  };

  const handleDeleteTribute = async (teacher: TeacherTribute, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm(`Are you sure you want to permanently delete teacher tribute for "${teacher.name}"?`)) {
      try {
        await deleteApprovedTeacherTribute(teacher.id, teacher.image);
        setTributes(prev => prev.filter(t => t.id !== teacher.id));
        if (onDataChange) onDataChange();
      } catch (err) {
        console.error("Failed to delete teacher tribute:", err);
        alert("Failed to delete tribute.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#FAF9F5]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#0F2557] border-t-transparent rounded-full mb-4"
        />
        <p className="text-slate-500 font-mono text-xs">Loading mentors' wisdom...</p>
      </div>
    );
  }

  // ==========================================
  // PUBLIC FOLLOW-UP DEDICATED SUB-PAGE MODE
  // ==========================================
  if (!isPreview) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-slate-800 antialiased selection:bg-[#D4A017]/30">
        {/* HEADER NAVBAR */}
        <nav className="bg-white border-b border-slate-100 py-4 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#0F2557] text-[#D4A017] flex items-center justify-center font-bold text-sm">S</span>
              <span className="font-sans font-bold text-[#0F2557] text-sm md:text-base">Scholars Academy</span>
            </Link>
            <Link 
              to="/"
              className="text-xs md:text-sm font-semibold text-[#0F2557] hover:text-[#D4A017] transition-all flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back to Campus Landing
            </Link>
          </div>
        </nav>

        {/* BODY */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-[#0F2557]/5 border border-[#0F2557]/10 text-[#0F2557] text-xs font-mono tracking-wider uppercase mb-3">
              Parting Wisdom
            </span>
            <h1 className="text-4xl md:text-5xl font-serif text-[#0F2557] font-bold tracking-tight mb-2">
              {sectionTitle} & Counsel
            </h1>
            <div className="w-16 h-1 bg-[#D4A017] mx-auto mb-4" />
            <p className="text-slate-600 text-sm max-w-xl mx-auto leading-relaxed mb-5">
              {sectionSubtitle}
            </p>

            {/* SUCCESS BANNER */}
            <AnimatePresence>
              {showSuccessBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-md mx-auto p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 mb-4"
                >
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{successBannerMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0F2557] hover:bg-[#1a3d82] text-white rounded-xl text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={14} className="text-[#D4A017]" />
              <span>Send a Teacher Tribute</span>
            </button>
          </div>

          {/* Clean up Mode warning */}
          {cleanUpMode && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-center py-3 px-4 rounded-xl mb-8 font-mono text-xs max-w-sm mx-auto">
              🛑 Click any red trash button to delete teacher tribute.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {tributes.map((teacher, idx) => {
              const isImageFailed = failedImages[teacher.id];
              return (
                <motion.div
                  key={teacher.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white border border-amber-200/40 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col sm:flex-row gap-6 relative"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-amber-100/40 border border-amber-200/20 rotate-1 shadow-sm opacity-80 pointer-events-none" />

                  {/* AVATAR */}
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border border-slate-200/60 shadow-inner bg-slate-50 shrink-0 mx-auto sm:mx-0 relative">
                    {isImageFailed ? (
                      <div className="w-full h-full bg-[#0F2557]/5 flex items-center justify-center text-[#0F2557] font-serif font-bold text-2xl">
                        {teacher.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                    ) : (
                      <img
                        src={teacher.image}
                        alt={teacher.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(teacher.id)}
                        loading="lazy"
                      />
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#D4A017] rounded-full flex items-center justify-center shadow-sm">
                      <HeartHandshake className="w-3 h-3 text-[#0F2557]" />
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="flex-grow flex flex-col justify-between text-left">
                    <div>
                      <Quote className="w-8 h-8 text-[#D4A017] opacity-20 mb-1 rotate-180" />
                      <p className="text-slate-700 font-serif leading-relaxed text-sm italic mb-6">
                        "{teacher.message}"
                      </p>
                    </div>

                    <div className="border-t border-dashed border-amber-200/60 pt-4 flex justify-between items-center mt-auto">
                      <div>
                        <h4 className="text-[#0F2557] font-serif font-bold text-sm tracking-wide">
                          {teacher.name}
                        </h4>
                        <p className="text-[#D4A017] font-mono text-[10px] uppercase tracking-widest mt-0.5">
                          {teacher.subject}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                        Faculty Mentor
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  {cleanUpMode && (
                    <button
                      onClick={(e) => handleDeleteTribute(teacher, e)}
                      className="absolute top-3 right-3 bg-rose-600 text-white p-2 rounded-lg hover:bg-rose-700 transition-all shadow-md z-30 border border-rose-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </main>

        {/* TEACHER TRIBUTE SUBMISSION MODAL FOR FULL STANDALONE MODE */}
        <AnimatePresence>
          {isSubmitModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-10 overflow-y-auto">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
                onClick={() => setIsSubmitModalOpen(false)}
              />

              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-[#FAF9F5] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-amber-200/20 text-left z-10 text-slate-800"
              >
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all"
                >
                  <X size={18} />
                </button>

                <div className="mb-6">
                  <h3 className="text-xl font-sans font-bold text-[#0F2557] flex items-center gap-2">
                    <HeartHandshake className="text-[#D4A017]" size={20} />
                    <span>Send a Teacher Tribute</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Share your congratulations, parting instructions, and blessings. Uploaded items will reflect soon.
                  </p>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {/* Photo Drag & Select File box */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-2">
                      Profile Portrait (Optional)
                    </label>
                    <div className="relative border-2 border-dashed border-amber-200/40 hover:border-[#D4A017] rounded-2xl p-4 transition-all text-center bg-white">
                    {avatarPreview ? (
                      <div className="space-y-2">
                        <img src={avatarPreview} className="w-16 h-16 object-cover rounded-full border border-slate-100 mx-auto" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="text-xs text-red-500 underline font-semibold"
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                        <label className="cursor-pointer block">
                          {uploading ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <Loader2 className="w-6 h-6 text-[#D4A017] animate-spin" />
                              <span className="text-[10px] font-semibold text-slate-600">Uploading portrait...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                              <Camera size={20} className="text-[#D4A017] mb-1 mx-auto" />
                              <span className="text-xs font-bold text-slate-700">Choose portrait picture</span>
                              <span className="text-[9px]">Max 5MB</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                            disabled={uploading}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Your Name & Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Samuel Adeniyi"
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Subject / Department / Role
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Physics Mentor, VP Academic"
                      value={form.subject}
                      onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Your Tribute & Counsel Message
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Write your advice, memories, and parting wishes to the Class of 2026..."
                      value={form.message}
                      onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] bg-white resize-none"
                    />
                  </div>

                  {uploadError && (
                    <p className="text-rose-500 text-xs font-semibold font-mono">{uploadError}</p>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsSubmitModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0F2557] text-white hover:bg-[#1a3d82] flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      <span>Submit Tribute</span>
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

  // ==========================================
  // LANDING PAGE PREVIEW MODE (Slicing 3)
  // ==========================================
  return (
    <section className="py-24 px-4 md:px-8 bg-[#FAF9F5] border-t border-slate-100" id="teacher-tributes">
      <div className="max-w-6xl mx-auto">
        
        {/* SECTION HEADER */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-[#0F2557]/5 border border-[#0F2557]/10 text-[#0F2557] text-xs font-mono tracking-wider uppercase mb-3">
            Mentors & Guides
          </span>
          <h2 className="text-3xl md:text-5xl font-serif text-[#0F2557] font-bold tracking-tight mb-2">
            {sectionTitle}
          </h2>
          <div className="w-16 h-1 bg-[#D4A017] mx-auto mb-4" />
          <p className="text-slate-600 text-sm max-w-lg mx-auto leading-relaxed mb-5">
            {sectionSubtitle}
          </p>

          {/* SUCCESS BANNER */}
          <AnimatePresence>
            {showSuccessBanner && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-md mx-auto p-3 bg-[#0F2557]/5 border border-[#0F2557]/10 text-[#0F2557] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 mb-4 animate-fade-in"
              >
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successBannerMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0F2557] hover:bg-[#1a3d82] text-white rounded-xl text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={14} className="text-[#D4A017]" />
            <span>Send a Teacher Tribute</span>
          </button>
        </div>

        {/* TRIBUTE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tributes.slice(0, 3).map((teacher, idx) => {
            const isImageFailed = failedImages[teacher.id];
            const rotation = idx % 2 === 0 ? '-rotate-1 md:-rotate-0.5' : 'rotate-1 md:rotate-0.5';

            return (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                whileHover={{ scale: 1.01, rotate: '0deg' }}
                className={`bg-white border border-amber-200/50 rounded-3xl p-6 md:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col gap-6 ${rotation} relative text-left`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-amber-100/60 border border-amber-200/40 rotate-1 shadow-sm opacity-80 pointer-events-none" />

                <div className="flex items-center gap-4">
                  {/* AVATAR */}
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner bg-slate-50 shrink-0 relative">
                    {isImageFailed ? (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[#0F2557] font-serif font-bold text-xl">
                        {teacher.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                    ) : (
                      <img
                        src={teacher.image}
                        alt={teacher.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(teacher.id)}
                        loading="lazy"
                      />
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#D4A017] rounded-full flex items-center justify-center text-[#0F2557] shadow-sm">
                      <HeartHandshake className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[#0F2557] font-serif font-bold text-sm tracking-wide leading-none">
                      {teacher.name}
                    </h4>
                    <p className="text-[#D4A017] font-mono text-[9px] uppercase tracking-widest mt-1">
                      {teacher.subject}
                    </p>
                  </div>
                </div>

                {/* NOTE CONTENT */}
                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <Quote className="w-6 h-6 text-[#D4A017] opacity-20 mb-1 rotate-180" />
                    <p className="text-slate-700 font-serif leading-relaxed text-xs italic line-clamp-4">
                      "{teacher.message}"
                    </p>
                  </div>
                </div>

                {cleanUpMode && (
                  <button
                    onClick={(e) => handleDeleteTribute(teacher, e)}
                    className="absolute top-3 right-3 bg-rose-600 text-white p-1.5 rounded-lg hover:bg-rose-700 transition-all shadow-sm z-30"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            to="/teacher-tributes"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#0F2557] to-[#1a3d7d] text-white rounded-full text-sm font-semibold shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <span>Read All Teacher Tributes</span>
          </Link>
        </div>

        <div className="text-center mt-6 text-[#0F2557]/40 font-mono text-[10px] tracking-widest">
          ✦ THANK YOU FOR GUIDING OUR WAY ✦
        </div>

      </div>

      {/* TEACHER TRIBUTE SUBMISSION MODAL */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-10 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
              onClick={() => setIsSubmitModalOpen(false)}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#FAF9F5] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-amber-200/20 text-left z-10 text-slate-800"
            >
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all"
              >
                <X size={18} />
              </button>

              <div className="mb-6">
                <h3 className="text-xl font-sans font-bold text-[#0F2557] flex items-center gap-2">
                  <HeartHandshake className="text-[#D4A017]" size={20} />
                  <span>Send a Teacher Tribute</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Share your congratulations, parting instructions, and blessings. Uploaded items will reflect soon.
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Photo Drag & Select File box */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-2">
                    Profile Portrait (Optional)
                  </label>
                  <div className="relative border-2 border-dashed border-amber-200/40 hover:border-[#D4A017] rounded-2xl p-4 transition-all text-center bg-white">
                    {avatarPreview ? (
                      <div className="space-y-2">
                        <img src={avatarPreview} className="w-16 h-16 object-cover rounded-full border border-slate-100 mx-auto" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="text-xs text-red-500 underline font-semibold"
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        {uploading ? (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Loader2 className="w-6 h-6 text-[#D4A017] animate-spin" />
                            <span className="text-[10px] font-semibold text-slate-600">Uploading portrait...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <Camera size={20} className="text-[#D4A017] mb-1 mx-auto" />
                            <span className="text-xs font-bold text-slate-700">Choose portrait picture</span>
                            <span className="text-[9px]">Max 5MB</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Your Name & Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Samuel Adeniyi"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Subject / Department / Role
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Physics Mentor, VP Academic"
                    value={form.subject}
                    onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Your Tribute & Counsel Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Write your advice, memories, and parting wishes to the Class of 2026..."
                    value={form.message}
                    onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] bg-white resize-none"
                  />
                </div>

                {uploadError && (
                  <p className="text-rose-500 text-xs font-semibold font-mono">{uploadError}</p>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0F2557] text-white hover:bg-[#1a3d82] flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    <span>Submit Tribute</span>
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
