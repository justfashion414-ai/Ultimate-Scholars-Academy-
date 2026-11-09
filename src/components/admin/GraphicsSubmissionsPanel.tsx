import { useState, useEffect, useMemo } from 'react';
import {
  Palette, Eye, Trash2, MessageSquare, Loader2, AlertTriangle, X,
  CheckCircle2, Award, Clock, ExternalLink, Search, ListChecks, ArrowRight,
  Inbox, User
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { GraphicsSubmission, CodingStudentProfile } from '../../types';
import { deleteFromCloudinary } from '../../lib/cloudinaryService';
import { fetchAllStudents } from '../../lib/firebaseService';

function timeAgo(iso?: string): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return 'unknown';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function GraphicsSubmissionsPanel({ onDataChange }: { onDataChange: () => void }) {
  const [submissions, setSubmissions] = useState<GraphicsSubmission[]>([]);
  const [students, setStudents] = useState<CodingStudentProfile[]>([]);
  const [live, setLive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unmarked' | 'marked'>('unmarked');
  const [openId, setOpenId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<GraphicsSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const [viewer, setViewer] = useState<GraphicsSubmission | null>(null);
  const [viewerIdx, setViewerIdx] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'graphics_submissions'),
      (snap) => {
        const list: GraphicsSubmission[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as GraphicsSubmission), id: d.id }));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setSubmissions(list);
        setLive(true);
      },
      (err) => {
        console.error('Graphics listener error:', err);
        setLive(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setStudents(await fetchAllStudents());
      } catch (e) {
        console.error('Error loading students:', e);
      }
    })();
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const openDetail = (g: GraphicsSubmission) => {
    setOpenId(g.id);
    setGradeInput(g.grade || '');
    setCommentInput('');
  };

  const openSub = useMemo(() => submissions.find((s) => s.id === openId) || null, [submissions, openId]);

  const saveGrade = async () => {
    if (!openSub) return;
    const g = gradeInput.trim();
    if (g && !/^\d{1,3}$/.test(g)) {
      alert('Enter a score from 0 to 100, or clear the field to unmark.');
      return;
    }
    if (g && Number(g) > 100) {
      alert('Score cannot be above 100.');
      return;
    }
    try {
      await setDoc(doc(db, 'graphics_submissions', openSub.id), { grade: g }, { merge: true });
      flash(g ? `Marked ${openSub.studentName}: ${g}/100.` : 'Mark cleared.');
      onDataChange();
    } catch (e: any) {
      alert(e.message || 'Failed to save the mark.');
    }
  };

  const addComment = async () => {
    if (!openSub || !commentInput.trim()) return;
    const c = {
      id: `c_${Date.now()}`,
      text: commentInput.trim(),
      author: auth.currentUser?.email || 'admin',
      at: new Date().toISOString()
    };
    try {
      await setDoc(
        doc(db, 'graphics_submissions', openSub.id),
        { teacherComments: [c, ...(openSub.teacherComments || [])] },
        { merge: true }
      );
      setCommentInput('');
      flash('Comment added. The student sees it in their studio.');
      onDataChange();
    } catch (e: any) {
      alert(e.message || 'Failed to add the comment.');
    }
  };

  const deleteComment = async (cid: string) => {
    if (!openSub) return;
    try {
      await setDoc(
        doc(db, 'graphics_submissions', openSub.id),
        { teacherComments: (openSub.teacherComments || []).filter((c) => c.id !== cid) },
        { merge: true }
      );
      onDataChange();
    } catch (e: any) {
      alert(e.message || 'Failed to remove the comment.');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'graphics_submissions', toDelete.id));
      (toDelete.imageUrls?.length ? toDelete.imageUrls : [toDelete.imageUrl]).forEach((u) => deleteFromCloudinary(u).catch(() => {}));
      setToDelete(null);
      if (openId === toDelete.id) setOpenId(null);
      flash('Submission deleted.');
      onDataChange();
    } catch (e: any) {
      alert(e.message || 'Failed to delete.');
    } finally {
      setIsDeleting(false);
    }
  };

  const studentNameOf = (id: string) => students.find((s) => s.studentId === id)?.studentName || 'Unknown Student';

  const graphicsStudents = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    students
      .filter((s) => (s.track || 'coding') === 'graphics')
      .forEach((s) => map.set(s.studentId, { id: s.studentId, name: s.studentName, count: 0 }));
    submissions.forEach((sub) => {
      const ex = map.get(sub.studentId);
      if (ex) ex.count += 1;
      else map.set(sub.studentId, { id: sub.studentId, name: studentNameOf(sub.studentId), count: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [students, submissions]);

  const visible = useMemo(() => {
    let list = submissions;
    if (statusFilter === 'unmarked') list = list.filter((s) => !s.grade);
    else if (statusFilter === 'marked') list = list.filter((s) => s.grade);
    if (studentFilter !== 'all') list = list.filter((s) => s.studentId === studentFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.title.toLowerCase().includes(q) || s.studentName.toLowerCase().includes(q) || studentNameOf(s.studentId).toLowerCase().includes(q));
    }
    return list;
  }, [submissions, studentFilter, statusFilter, searchQuery, students]);

  const markedCount = submissions.filter((s) => s.grade).length;
  const unmarkedCount = submissions.length - markedCount;

  // Queue navigation: step to the next submission that still needs marking
  const openSubIndex = useMemo(() => visible.findIndex((s) => s.id === openId), [visible, openId]);
  const nextUnmarked = useMemo(() => {
    if (openSubIndex < 0) return null;
    for (let i = openSubIndex + 1; i < visible.length; i++) {
      if (!visible[i].grade) return visible[i];
    }
    return visible.find((s) => !s.grade && s.id !== openId) || null;
  }, [visible, openSubIndex, openId]);
  const studentSubs = useMemo(
    () => (openSub ? submissions.filter((s) => s.studentId === openSub.studentId) : []),
    [submissions, openSub]
  );

  if (openSub) {
    const comments = openSub.teacherComments || [];
    const urls = openSub.imageUrls?.length ? openSub.imageUrls : [openSub.imageUrl];
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setOpenId(null)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 text-xs font-semibold cursor-pointer"
          >
            <X className="w-4 h-4" /> All submissions
          </button>
          <div className="min-w-0">
            <h3 className="font-serif font-bold text-lg truncate">{openSub.title}</h3>
            <p className="text-xs text-white/50">
              {openSub.studentName} · submitted {timeAgo(openSub.createdAt)}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${openSub.grade ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' : 'bg-amber-500/15 text-amber-300 border-amber-500/40'}`}>
            {openSub.grade ? `Marked ${openSub.grade}/100` : 'Needs marking'}
          </span>
          {nextUnmarked && (
            <button
              onClick={() => openDetail(nextUnmarked)}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4A017] text-[#030914] text-xs font-bold hover:bg-[#e5b31f] cursor-pointer shrink-0"
              title={`Next unmarked: ${nextUnmarked.title}`}
            >
              Next unmarked <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* STUDENT CONTEXT STRIP */}
        <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="p-2 rounded-lg bg-white/5 text-[#D4A017]"><User className="w-4 h-4" /></div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">{openSub.studentName}</p>
            <p className="text-[10px] text-white/45">
              {studentSubs.length} submission{studentSubs.length === 1 ? '' : 's'} in total · {studentSubs.filter((x) => !x.grade).length} still needing a mark
            </p>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {studentSubs.slice(0, 6).map((sub) => (
              <button
                key={sub.id}
                onClick={() => openDetail(sub)}
                title={sub.title}
                className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${sub.id === openSub.id ? 'border-[#D4A017]' : 'border-white/10 hover:border-white/40'}`}
              >
                <img src={sub.imageUrl} alt={sub.title} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* IMAGE */}
          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-[#081533] p-3">
              <img
                src={urls[0]}
                alt={openSub.title}
                className="w-full max-h-[480px] object-contain rounded-xl cursor-zoom-in"
                onClick={() => { setViewer(openSub); setViewerIdx(0); }}
              />
              {urls.length > 1 && (
                <div className="grid grid-cols-5 gap-1.5 mt-2">
                  {urls.map((u, i) => (
                    <button
                      key={u}
                      onClick={() => { setViewer(openSub); setViewerIdx(i); }}
                      title={`Image ${i + 1}`}
                      className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-[#D4A017]/60 cursor-pointer"
                    >
                      <img src={u} alt={`${openSub.title} ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-2.5">
                <p className="text-[11px] text-white/40">{openSub.description || 'No notes from the student.'}</p>
                <a
                  href={openSub.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#D4A017] hover:text-[#e5b31f] cursor-pointer shrink-0"
                >
                  <ExternalLink className="w-3 h-3" /> Full size
                </a>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 font-semibold">Mark:</span>
              <input
                value={gradeInput}
                onChange={(e) => setGradeInput(e.target.value)}
                placeholder="0-100"
                inputMode="numeric"
                className="w-20 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono focus:outline-none focus:border-[#D4A017]/60"
              />
              <button onClick={saveGrade} className="px-3 py-2 rounded-xl bg-[#D4A017] text-[#030914] text-xs font-bold hover:bg-[#e5b31f] cursor-pointer">Save mark</button>
              <button
                onClick={() => setToDelete(openSub)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold cursor-pointer ml-auto"
              >
                <Trash2 className="w-4 h-4" /> Delete submission
              </button>
            </div>
          </div>

          {/* FEEDBACK */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-[#D4A017]" />
                <h4 className="text-sm font-bold">Teacher feedback ({comments.length})</h4>
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addComment(); }}
                  placeholder="Write a comment for this student..."
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs focus:outline-none focus:border-[#D4A017]/60"
                />
                <button
                  onClick={addComment}
                  disabled={!commentInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#D4A017] text-[#030914] text-xs font-bold hover:bg-[#e5b31f] disabled:opacity-40 cursor-pointer shrink-0"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2 overflow-y-auto flex-1">
                {comments.length === 0 && <p className="text-xs text-white/40">No comments yet.</p>}
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white/85 break-words">{c.text}</p>
                      <p className="text-[10px] text-white/40 mt-1">{c.author} · {timeAgo(c.at)}</p>
                    </div>
                    <button
                      onClick={() => deleteComment(c.id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                      title="Remove comment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {viewer && (() => {
          const vUrls = viewer.imageUrls?.length ? viewer.imageUrls : [viewer.imageUrl];
          return (
            <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 sm:p-6 cursor-zoom-out" onClick={() => setViewer(null)}>
              <div className="max-w-full max-h-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <img src={vUrls[Math.min(viewerIdx, vUrls.length - 1)]} alt={viewer.title} className="max-w-full max-h-[80vh] object-contain rounded-xl" />
                {vUrls.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto max-w-full">
                    {vUrls.map((u, i) => (
                      <img
                        key={u}
                        src={u}
                        alt={`${viewer.title} ${i + 1}`}
                        className={`w-12 h-12 rounded-lg object-cover border-2 cursor-pointer shrink-0 ${i === viewerIdx ? 'border-[#D4A017]' : 'border-white/20'}`}
                        onClick={() => setViewerIdx(i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {toDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#0b1739] border border-white/15 rounded-2xl p-6 max-w-sm w-full text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
                <h4 className="font-bold">Delete this submission?</h4>
              </div>
              <p className="text-xs text-white/60 mb-5">"{toDelete.title}" by {toDelete.studentName} and its image will be permanently removed. This cannot be undone.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setToDelete(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 cursor-pointer">Cancel</button>
                <button onClick={confirmDelete} disabled={isDeleting} className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-400 disabled:opacity-50 cursor-pointer flex items-center gap-2">
                  {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </div>
        )}
      </div>
    );
  }

  // OVERVIEW
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="p-2.5 bg-[#D4A017]/15 text-[#D4A017] border border-[#D4A017]/30 rounded-xl">
          <Palette className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-lg">Graphics Submissions</h3>
          <p className="text-xs text-white/50 flex items-center gap-2">
            {live ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live: updates the moment a student uploads</>
            ) : (
              <><Loader2 className="w-3 h-3 animate-spin" /> Connecting to live updates...</>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Graphics students', value: graphicsStudents.length, icon: Palette, tone: 'text-[#D4A017]' },
          { label: 'Total submissions', value: submissions.length, icon: Eye, tone: 'text-[#D4A017]' },
          { label: 'Needs marking', value: unmarkedCount, icon: ListChecks, tone: unmarkedCount ? 'text-amber-300' : 'text-white/40' },
          { label: 'Marked', value: markedCount, icon: Award, tone: 'text-emerald-400' }
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className={`p-2 rounded-lg bg-white/5 ${m.tone}`}><m.icon className="w-4 h-4" /></div>
            <div>
              <div className={`font-bold text-base ${m.tone}`}>{m.value}</div>
              <div className="text-[10px] text-white/50">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MARKING QUEUE TABS */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/10 w-full sm:w-auto sm:inline-flex">
        {([
          { key: 'unmarked', label: 'Needs marking', count: unmarkedCount, icon: ListChecks },
          { key: 'marked', label: 'Marked', count: markedCount, icon: Award },
          { key: 'all', label: 'All', count: submissions.length, icon: Inbox }
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
              statusFilter === t.key ? 'bg-[#D4A017] text-[#0F2557]' : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${statusFilter === t.key ? 'bg-[#0F2557]/20' : 'bg-white/10'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student or title..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs focus:outline-none focus:border-[#D4A017]/60"
          />
        </div>
        <select
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs focus:outline-none focus:border-[#D4A017]/60 cursor-pointer"
        >
          <option value="all">All students ({submissions.length})</option>
          {graphicsStudents.map((g) => (
            <option key={g.id} value={g.id}>{g.name} ({g.count})</option>
          ))}
        </select>
      </div>

      {visible.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-white/[0.03] border border-white/10">
          <Palette className="w-6 h-6 text-white/30 mx-auto mb-2" />
          <p className="text-xs text-white/50">
            {submissions.length === 0
              ? 'No graphics submissions yet. They appear here live once students upload in their studio.'
              : statusFilter === 'unmarked'
                ? 'Nothing waiting on you. Every submission has a mark.'
                : 'No submissions match this filter.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {visible.map((g) => (
          <button
            key={g.id}
            onClick={() => openDetail(g)}
            className="text-left rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#D4A017]/40 overflow-hidden transition-colors cursor-pointer group"
          >
            <div className="relative aspect-square bg-black/40">
              <img src={g.imageUrl} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-[9px] font-bold text-[#D4A017] border border-[#D4A017]/30">
                {g.studentName}
              </span>
              {(g.imageUrls?.length || 0) > 1 && (
                <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-full bg-black/70 text-[9px] font-bold text-white/90 border border-white/20">
                  {g.imageUrls!.length} images
                </span>
              )}
              {g.grade ? (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-[9px] font-bold text-[#04140d]">
                  {g.grade}/100
                </span>
              ) : (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500/90 text-[9px] font-bold text-[#2a1c00]">
                  Needs marking
                </span>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-xs font-bold truncate">{g.title}</p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40">
                <Clock className="w-2.5 h-2.5" /> {timeAgo(g.createdAt)}
                {(g.teacherComments?.length || 0) > 0 && (
                  <span className="flex items-center gap-1 text-[#D4A017]">
                    <MessageSquare className="w-2.5 h-2.5" /> {g.teacherComments!.length}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}
    </div>
  );
}
