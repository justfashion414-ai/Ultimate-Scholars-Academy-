import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Code2, Search, Eye, Trash2, Star, MessageSquare, Save, Loader2,
  AlertTriangle, X, Clock, Award, ChevronLeft, CheckCircle2, User, Sparkles, ChevronDown
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { CodingProject, TeacherComment, CodingStudentProfile } from '../../types';
import { fetchAllStudents, deleteCodingProject } from '../../lib/firebaseService';

type FileTab = 'preview' | 'index.html' | 'styles.css' | 'script.js';

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function buildPreviewHtml(p: CodingProject): string {
  let html = p.files?.['index.html'] || '<p style="font-family:sans-serif;padding:20px;color:#888;">Empty HTML file</p>';
  const css = p.files?.['styles.css'] || '';
  const js = p.files?.['script.js'] || '';
  if (css) {
    if (html.includes('</head>')) html = html.replace('</head>', `<style>${css}</style></head>`);
    else html = `<style>${css}</style>` + html;
  }
  if (js) {
    const scriptTag = `<script>${js}<\/script>`;
    if (html.includes('</body>')) html = html.replace('</body>', `${scriptTag}</body>`);
    else html += scriptTag;
  }
  return html;
}

export default function StudentProjectsPanel({ onDataChange }: { onDataChange: () => void }) {
  const [projects, setProjects] = useState<CodingProject[]>([]);
  const [students, setStudents] = useState<CodingStudentProfile[]>([]);
  const [live, setLive] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileStudentId, setMobileStudentId] = useState<string | null>(null);

  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [editFiles, setEditFiles] = useState<CodingProject['files']>({ 'index.html': '', 'styles.css': '', 'script.js': '' });
  const [editTab, setEditTab] = useState<FileTab>('preview');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gradeInput, setGradeInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<CodingProject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const lastSavedFiles = useRef<string>('');

  // LIVE listener: the panel updates the moment a student saves their work
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'coding_projects'),
      (snap) => {
        const list: CodingProject[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as CodingProject), id: d.id }));
        list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
        setProjects(list);
        setLive(true);
      },
      (err) => {
        console.error('Live project listener error:', err);
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
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, []);

  const openProject = useMemo(
    () => projects.find((p) => p.id === openProjectId) || null,
    [projects, openProjectId]
  );

  // Keep the editor in sync with live saves when the admin has no unsaved edits
  useEffect(() => {
    if (!openProject) return;
    const fresh = JSON.stringify(openProject.files);
    if (!dirty && fresh !== lastSavedFiles.current) {
      lastSavedFiles.current = fresh;
      setEditFiles({
        'index.html': openProject.files?.['index.html'] || '',
        'styles.css': openProject.files?.['styles.css'] || '',
        'script.js': openProject.files?.['script.js'] || ''
      });
    }
  }, [openProject, dirty]);

  const openDetail = (p: CodingProject) => {
    setOpenProjectId(p.id);
    lastSavedFiles.current = JSON.stringify(p.files);
    setEditFiles({
      'index.html': p.files?.['index.html'] || '',
      'styles.css': p.files?.['styles.css'] || '',
      'script.js': p.files?.['script.js'] || ''
    });
    setEditTab('preview');
    setDirty(false);
    setGradeInput(p.grade || '');
    setCommentInput('');
  };

  const closeDetail = () => {
    setOpenProjectId(null);
    setDirty(false);
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const saveChanges = async () => {
    if (!openProject) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'coding_projects', openProject.id),
        {
          files: editFiles,
          updatedAt: new Date().toISOString(),
          lastEditedBy: `admin:${auth.currentUser?.email || 'admin'}`
        },
        { merge: true }
      );
      lastSavedFiles.current = JSON.stringify(editFiles);
      setDirty(false);
      flash('Changes saved to the student project.');
      onDataChange();
    } catch (e: any) {
      alert(e.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStar = async () => {
    if (!openProject) return;
    try {
      await setDoc(doc(db, 'coding_projects', openProject.id), { starred: !openProject.starred }, { merge: true });
      flash(openProject.starred ? 'Star removed.' : 'Project starred.');
      onDataChange();
    } catch (e: any) {
      alert(e.message || 'Failed to update star.');
    }
  };

  const saveGrade = async () => {
    if (!openProject) return;
    try {
      const g = gradeInput.trim();
      if (g && !/^\d{1,3}$/.test(g)) {
        alert('Enter a score from 0 to 100, or clear the field to unmark.');
        return;
      }
      if (g && Number(g) > 100) {
        alert('Score cannot be above 100.');
        return;
      }
      await setDoc(doc(db, 'coding_projects', openProject.id), { grade: g }, { merge: true });
      flash(g ? `Marked ${openProject.studentName}: ${g}/100.` : 'Mark cleared.');
      onDataChange();
    } catch (e: any) {
      alert(e.message || 'Failed to save the mark.');
    }
  };

  const addComment = async () => {
    if (!openProject || !commentInput.trim()) return;
    const c: TeacherComment = {
      id: `c_${Date.now()}`,
      text: commentInput.trim(),
      author: auth.currentUser?.email || 'admin',
      at: new Date().toISOString()
    };
    try {
      await setDoc(
        doc(db, 'coding_projects', openProject.id),
        { teacherComments: [c, ...(openProject.teacherComments || [])] },
        { merge: true }
      );
      setCommentInput('');
      flash('Comment added. The student sees it in their coding lab.');
      onDataChange();
    } catch (e: any) {
      alert(e.message || 'Failed to add the comment.');
    }
  };

  const deleteComment = async (cid: string) => {
    if (!openProject) return;
    try {
      await setDoc(
        doc(db, 'coding_projects', openProject.id),
        { teacherComments: (openProject.teacherComments || []).filter((c) => c.id !== cid) },
        { merge: true }
      );
      onDataChange();
    } catch (e: any) {
      alert(e.message || 'Failed to remove the comment.');
    }
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCodingProject(projectToDelete.id, projectToDelete.studentId);
      setProjectToDelete(null);
      if (openProjectId === projectToDelete.id) closeDetail();
      flash('Project deleted.');
      onDataChange();
    } catch (e: any) {
      alert(e.message || 'Failed to delete the project.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Sidebar: students grouped with their projects
  const studentMap = useMemo(() => {
    const map = new Map<string, { studentId: string; studentName: string; projects: CodingProject[]; latest: string }>();
    students.forEach((s) => map.set(s.studentId, { studentId: s.studentId, studentName: s.studentName, projects: [], latest: s.lastActive || '' }));
    projects.forEach((p) => {
      const ex = map.get(p.studentId);
      if (ex) {
        ex.projects.push(p);
        if (new Date(p.updatedAt || 0) > new Date(ex.latest || 0)) ex.latest = p.updatedAt;
      } else {
        map.set(p.studentId, { studentId: p.studentId, studentName: p.studentName || 'Anonymous Student', projects: [p], latest: p.updatedAt || '' });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.projects.length - a.projects.length || new Date(b.latest || 0).getTime() - new Date(a.latest || 0).getTime());
  }, [students, projects]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentMap;
    const q = searchQuery.toLowerCase();
    return studentMap.filter((s) => s.studentName.toLowerCase().includes(q));
  }, [studentMap, searchQuery]);

  const visibleProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => `${p.title} ${p.studentName || ''}`.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  const markedCount = projects.filter((p) => p.grade && p.grade !== '').length;
  const starredCount = projects.filter((p) => p.starred).length;

  if (openProject) {
    const previewHtml = buildPreviewHtml({ ...openProject, files: editFiles });
    const comments = openProject.teacherComments || [];
    return (
      <div className="p-4 sm:p-6 space-y-4">
        {/* BACK + TITLE */}
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={closeDetail} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 text-xs font-semibold cursor-pointer">
            <ChevronLeft className="w-4 h-4" /> All projects
          </button>
          <div className="min-w-0">
            <h3 className="font-serif font-bold text-lg truncate">{openProject.title}</h3>
            <p className="text-xs text-white/50 flex items-center gap-2">
              <User className="w-3 h-3" /> {openProject.studentName}
              <span className="text-white/30">|</span>
              <Clock className="w-3 h-3" /> updated {fmtDate(openProject.updatedAt)}
              {openProject.lastEditedBy?.startsWith('admin:') && (
                <span className="text-[#D4A017]">(last edited by admin)</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {openProject.starred && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D4A017]/20 text-[#D4A017] text-[10px] font-bold border border-[#D4A017]/40">
                <Star className="w-3 h-3" /> Starred
              </span>
            )}
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${openProject.grade ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' : 'bg-white/5 text-white/50 border-white/10'}`}>
              {openProject.grade ? `Marked ${openProject.grade}/100` : 'Unmarked'}
            </span>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
          <button onClick={toggleStar} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold cursor-pointer">
            <Star className={`w-4 h-4 ${openProject.starred ? 'text-[#D4A017] fill-[#D4A017]' : 'text-white/60'}`} />
            {openProject.starred ? 'Unstar' : 'Star'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/50 font-semibold">Mark:</span>
            <input
              value={gradeInput}
              onChange={(e) => setGradeInput(e.target.value)}
              placeholder="0-100"
              inputMode="numeric"
              className="w-20 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono focus:outline-none focus:border-[#D4A017]/60"
            />
            <button onClick={saveGrade} className="px-3 py-2 rounded-xl bg-[#D4A017] text-[#030914] text-xs font-bold hover:bg-[#e5b31f] cursor-pointer">Save mark</button>
          </div>
          <button onClick={() => setProjectToDelete(openProject)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold cursor-pointer ml-auto">
            <Trash2 className="w-4 h-4" /> Delete project
          </button>
        </div>

        {/* LIVE PREVIEW (full height, no file tabs) */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#081533]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Live preview</span>
            <span className="text-[10px] text-white/30 font-mono">{(openProject.files?.['index.html'] || '').length} chars of HTML</span>
          </div>
          <iframe title="Project preview" srcDoc={previewHtml} sandbox="allow-scripts allow-modals" className="w-full h-[70vh] min-h-[480px] bg-white" />
        </div>

        {/* FEEDBACK */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
              className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs focus:outline-none focus:border-[#D4A017]/60"
            />
            <button onClick={addComment} disabled={!commentInput.trim()} className="px-4 py-2.5 rounded-xl bg-[#D4A017] text-[#030914] text-xs font-bold hover:bg-[#e5b31f] disabled:opacity-40 cursor-pointer">Add</button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {comments.length === 0 && <p className="text-xs text-white/40">No comments yet. Comments appear in the student's coding lab.</p>}
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/85 break-words">{c.text}</p>
                  <p className="text-[10px] text-white/40 mt-1">{c.author} · {fmtDate(c.at)}</p>
                </div>
                <button onClick={() => deleteComment(c.id)} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 cursor-pointer" title="Remove comment">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* DELETE CONFIRMATION */}
        {projectToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#0b1739] border border-white/15 rounded-2xl p-6 max-w-sm w-full text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
                <h4 className="font-bold">Delete this project?</h4>
              </div>
              <p className="text-xs text-white/60 mb-5">"{projectToDelete.title}" by {projectToDelete.studentName} will be permanently removed. This cannot be undone.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setProjectToDelete(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 cursor-pointer">Cancel</button>
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

  // OVERVIEW VIEW
  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="p-2.5 bg-[#D4A017]/15 text-[#D4A017] border border-[#D4A017]/30 rounded-xl">
          <Code2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-lg">Student Projects</h3>
          <span
            className={`w-2 h-2 rounded-full inline-block ${live ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`}
            title={live ? 'Live' : 'Connecting...'}
          />
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Students with work', value: studentMap.filter((s) => s.projects.length > 0).length, icon: User },
          { label: 'Total projects', value: projects.length, icon: Code2 },
          { label: 'Marked', value: markedCount, icon: Award },
          { label: 'Starred', value: starredCount, icon: Star }
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="p-2 rounded-lg bg-white/5 text-[#D4A017]"><m.icon className="w-4 h-4" /></div>
            <div>
              <div className="font-bold text-sm">{m.value}</div>
              <div className="text-[10px] text-white/50">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* STUDENT LIST (desktop only; mobile picks students from the dropdown) */}
        <div className="hidden md:block md:w-60 shrink-0 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs focus:outline-none focus:border-[#D4A017]/60"
            />
          </div>
          <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
            {loadingStudents && <p className="text-xs text-white/40 px-2 py-2">Loading students...</p>}
            {!loadingStudents && filteredStudents.length === 0 && <p className="text-xs text-white/40 px-2 py-2">No students found.</p>}
            {filteredStudents.map((s) => (
              <button key={s.studentId} onClick={() => setMobileStudentId(s.studentId)} className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#D4A017]/40 cursor-pointer">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{s.studentName}</div>
                  <div className="text-[10px] text-white/40">{s.projects.length} project{s.projects.length === 1 ? '' : 's'} · {fmtDate(s.latest)}</div>
                </div>
                {s.projects.some((p) => p.grade) && <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="Has marked work" />}
                {s.projects.some((p) => p.starred) && <Star className="w-3.5 h-3.5 text-[#D4A017] fill-[#D4A017] shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* MOBILE: tap a student's name to open their projects in a popup */}
        <div className="md:hidden space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-9 pr-3 py-3 rounded-xl bg-black/40 border border-white/10 text-xs focus:outline-none focus:border-[#D4A017]/60"
            />
          </div>
          {loadingStudents && <p className="text-xs text-white/40 px-2 py-2">Loading students...</p>}
          {!loadingStudents && filteredStudents.length === 0 && <p className="text-xs text-white/40 px-2 py-2">No students found.</p>}
          {filteredStudents.map((s) => (
            <button
              key={s.studentId}
              onClick={() => setMobileStudentId(s.studentId)}
              className="w-full text-left flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#D4A017]/40 cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-white/5 text-[#D4A017]"><User className="w-4 h-4" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate">{s.studentName}</div>
                <div className="text-[11px] text-white/40">{s.projects.length} project{s.projects.length === 1 ? '' : 's'} · {fmtDate(s.latest)}</div>
              </div>
              <span className="text-[10px] font-bold text-[#D4A017] shrink-0">View</span>
            </button>
          ))}
        </div>

        {/* PROJECT LIST (desktop) */}
        <div className="hidden md:block flex-1 min-w-0 space-y-2">
          {visibleProjects.length === 0 && (
            <div className="p-8 text-center rounded-2xl bg-white/[0.03] border border-white/10">
              <Sparkles className="w-6 h-6 text-white/30 mx-auto mb-2" />
              <p className="text-xs text-white/50">
                {projects.length === 0
                  ? 'No projects saved yet. They appear here live once students save work in the coding lab.'
                  : 'No projects match this student or search.'}
              </p>
            </div>
          )}
          {visibleProjects.map((p) => (
            <button
              key={p.id}
              onClick={() => openDetail(p)}
              className="w-full text-left p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#D4A017]/40 hover:bg-white/[0.05] transition-colors cursor-pointer flex flex-wrap items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold truncate">{p.title}</span>
                  {p.starred && <Star className="w-3.5 h-3.5 text-[#D4A017] fill-[#D4A017] shrink-0" />}
                </div>
                <div className="text-[11px] text-white/50 mt-0.5 truncate">
                  {p.studentName} · updated {fmtDate(p.updatedAt)}
                  {p.lastEditedBy?.startsWith('admin:') && <span className="text-[#D4A017]"> · edited by admin</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.grade ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">{p.grade}/100</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-[10px] font-semibold border border-white/10">Unmarked</span>
                )}
                {(p.teacherComments?.length || 0) > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-white/60 text-[10px] font-semibold border border-white/10">
                    <MessageSquare className="w-3 h-3" /> {p.teacherComments!.length}
                  </span>
                )}
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D4A017]/15 text-[#D4A017] text-[10px] font-bold border border-[#D4A017]/30">
                  <Eye className="w-3 h-3" /> Review
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* POPUP: one student's projects */}
      {mobileStudentId && (() => {
        const stu = studentMap.find((s) => s.studentId === mobileStudentId);
        if (!stu) return null;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80" onClick={() => setMobileStudentId(null)}>
            <div
              className="w-full max-w-lg bg-[#0b1739] border border-white/15 rounded-2xl max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-[#0F2557] shrink-0">
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{stu.studentName}</h4>
                  <p className="text-[10px] text-white/50">{stu.projects.length} saved project{stu.projects.length === 1 ? '' : 's'}</p>
                </div>
                <button onClick={() => setMobileStudentId(null)} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 cursor-pointer" title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-3 space-y-2">
                {stu.projects.length === 0 && <p className="text-xs text-white/40 text-center py-6">No projects saved yet.</p>}
                {stu.projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setMobileStudentId(null); openDetail(p); }}
                    className="w-full text-left p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-[#D4A017]/40 cursor-pointer flex items-center gap-3"
                  >
                    <Eye className="w-4 h-4 text-[#D4A017] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate">{p.title}</div>
                      <div className="text-[10px] text-white/40">updated {fmtDate(p.updatedAt)}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${p.grade ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' : 'bg-white/5 text-white/40 border-white/10'}`}>
                      {p.grade ? `${p.grade}/100` : 'Unmarked'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}
    </div>
  );
}
