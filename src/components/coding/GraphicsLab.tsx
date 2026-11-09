import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Palette, Upload, Loader2, Trash2, MessageSquare, Award, ImagePlus, Code2,
  LogOut, ArrowLeft, CheckCircle2, AlertCircle, X, Star, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadToCloudinary, deleteFromCloudinary } from '../../lib/cloudinaryService';
import { CodingStudentProfile, GraphicsSubmission } from '../../types';
import { saveStudentProfile } from '../../lib/firebaseService';
import ProfileAvatar from './ProfileAvatar';

interface GraphicsLabProps {
  profile: CodingStudentProfile;
  onSignOut: () => void;
  onProfileUpdated: (p: CodingStudentProfile) => void;
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function GraphicsLab({ profile, onSignOut, onProfileUpdated }: GraphicsLabProps) {
  const [submissions, setSubmissions] = useState<GraphicsSubmission[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [toDelete, setToDelete] = useState<GraphicsSubmission | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // LIVE: my submissions update the moment a teacher marks or comments
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'graphics_submissions'),
      (snap) => {
        const mine: GraphicsSubmission[] = [];
        snap.forEach((d) => {
          const data = d.data() as GraphicsSubmission;
          if (data.studentId === profile.studentId) mine.push({ ...data, id: d.id });
        });
        mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubmissions(mine);
      },
      (err) => console.error('Graphics submissions listener:', err)
    );
    return () => unsub();
  }, [profile.studentId]);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErrorMsg('Please choose an image file (JPG, PNG, WebP).');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErrorMsg('Image too large. Maximum 10 MB.');
      return;
    }
    setErrorMsg('');
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!title.trim() || !file) {
      setErrorMsg('Give your assignment a title and choose an image first.');
      return;
    }
    setUploading(true);
    setErrorMsg('');
    setNotice('');
    try {
      const imageUrl = await uploadToCloudinary(file, {
        folder: 'scholars_class_2026/graphics',
        filename: `${profile.studentId}_${title.trim().replace(/\s+/g, '_').slice(0, 40)}`
      });
      const newId = `gfx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const submission: GraphicsSubmission = {
        id: newId,
        studentId: profile.studentId,
        studentName: profile.studentName,
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'graphics_submissions', newId), submission);
      clearForm();
      setNotice('Assignment submitted! Your teacher sees it immediately.');
      setTimeout(() => setNotice(''), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'graphics_submissions', toDelete.id));
      deleteFromCloudinary(toDelete.imageUrl).catch(() => {});
      setToDelete(null);
      setNotice('Submission removed.');
      setTimeout(() => setNotice(''), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not delete. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  const markedCount = submissions.filter((s) => s.grade).length;

  const handleSwitchToCoding = async () => {
    const updated: CodingStudentProfile = { ...profile, track: 'coding' };
    await saveStudentProfile(updated);
    onProfileUpdated(updated);
  };

  return (
    <div className="min-h-screen bg-[#050E22] text-white flex flex-col font-sans selection:bg-[#D4A017] selection:text-[#0F2557]">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-[#071126]/95 px-3 sm:px-6 py-3 flex items-center justify-between gap-2 sticky top-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <ProfileAvatar profile={profile} onUpdated={onProfileUpdated} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#D4A017] shrink-0" />
              <span className="text-sm font-bold truncate">{profile.studentName}</span>
            </div>
            <div className="text-[10px] text-white/50 font-mono">Graphics Design Studio</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            to="/coding-training"
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Switch account"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <button
            onClick={handleSwitchToCoding}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-[#D4A017]/40 text-[#D4A017] hover:bg-[#D4A017]/10 text-xs font-semibold transition-colors cursor-pointer"
            title="Move to the Coding Lab"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch to Coding Lab</span>
            <span className="sm:hidden">Coding</span>
          </button>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-300 text-xs font-semibold text-white/70 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {notice && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{notice}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="p-2 rounded-lg bg-[#D4A017]/15 text-[#D4A017]"><ImagePlus className="w-4 h-4" /></div>
            <div>
              <div className="font-bold text-sm">{submissions.length}</div>
              <div className="text-[10px] text-white/50">Assignments submitted</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400"><Award className="w-4 h-4" /></div>
            <div>
              <div className="font-bold text-sm">{markedCount}</div>
              <div className="text-[10px] text-white/50">Marked by teacher</div>
            </div>
          </div>
        </div>

        {/* UPLOAD FORM */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-[#0b1739] border border-white/10 p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#D4A017]/15 text-[#D4A017] border border-[#D4A017]/30">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Submit an Assignment</h2>
              <p className="text-[11px] text-white/50">Upload your design as an image: logos, posters, flyers, banners.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Assignment Title <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Week 3 - School Logo Design"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4A017]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">Notes (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Made with Canva - gold and navy school colours"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4A017]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 mb-1.5">
              Your Design <span className="text-amber-400">*</span>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-2xl p-5 text-center transition-colors cursor-pointer ${
                previewUrl ? 'border-[#D4A017]/50 bg-[#D4A017]/5' : 'border-white/15 hover:border-white/30 bg-white/[0.03]'
              }`}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Selected design" className="max-h-56 mx-auto rounded-xl shadow-lg" />
              ) : (
                <div className="space-y-1.5 py-3">
                  <ImagePlus className="w-7 h-7 mx-auto text-white/30" />
                  <p className="text-xs text-white/60 font-semibold">Tap to choose an image</p>
                  <p className="text-[10px] text-white/40">JPG, PNG or WebP, up to 10 MB</p>
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] || null)}
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-3.5 rounded-2xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? 'Uploading your design...' : 'Submit Assignment'}</span>
          </button>
        </motion.section>

        {/* MY SUBMISSIONS */}
        <section className="space-y-3">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-[#D4A017]" />
            My Submissions ({submissions.length})
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" title="Live" />
          </h2>

          {submissions.length === 0 && (
            <div className="p-8 text-center rounded-2xl bg-white/[0.03] border border-white/10">
              <Palette className="w-8 h-8 mx-auto text-white/20 mb-2" />
              <p className="text-xs text-white/50">Nothing submitted yet. Your first design will appear here.</p>
            </div>
          )}

          {submissions.map((sub) => (
            <div key={sub.id} className="rounded-2xl bg-[#0b1739] border border-white/10 overflow-hidden">
              <div className="flex gap-3 p-3">
                <img
                  src={sub.imageUrl}
                  alt={sub.title}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-white/10 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(sub.imageUrl, '_blank')}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold truncate">{sub.title}</h3>
                      <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" /> {timeAgo(sub.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => setToDelete(sub)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                      title="Delete submission"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {sub.description && (
                    <p className="text-[11px] text-white/60 mt-1 line-clamp-2">{sub.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {sub.grade ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                        Marked {sub.grade}/100
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-[10px] font-semibold border border-white/10">
                        Awaiting marks
                      </span>
                    )}
                    {(sub.teacherComments?.length || 0) > 0 && (
                      <button
                        onClick={() => setOpenComments(openComments === sub.id ? null : sub.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4A017]/15 text-[#D4A017] text-[10px] font-bold border border-[#D4A017]/40 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        {sub.teacherComments!.length} teacher comment{sub.teacherComments!.length === 1 ? '' : 's'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {openComments === sub.id && (sub.teacherComments?.length || 0) > 0 && (
                <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2.5">
                  {[...sub.teacherComments!].reverse().map((c) => (
                    <div key={c.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-xs text-white/85">{c.text}</p>
                      <p className="text-[9px] text-white/35 mt-1">{c.author} · {timeAgo(c.at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      </main>

      {/* DELETE CONFIRMATION */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#0b1739] border border-white/15 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <h4 className="font-bold">Delete this submission?</h4>
            </div>
            <p className="text-xs text-white/60 mb-5">"{toDelete.title}" and its image will be removed, along with any teacher feedback on it.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-400 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-white/10 bg-[#071126] px-6 py-3 text-center text-[10px] text-white/30 font-mono">
        Ultimate Scholars Academy • Graphics Design Studio
      </footer>
    </div>
  );
}
