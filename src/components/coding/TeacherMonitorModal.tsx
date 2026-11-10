import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  GraduationCap, 
  Search, 
  RefreshCw, 
  Eye, 
  FileCode, 
  FileText, 
  FileJson, 
  User, 
  Clock, 
  ArrowRight,
  ExternalLink,
  Laptop,
  CheckCircle2,
  FolderOpen,
  KeyRound,
  Mail,
  Hash,
  ShieldCheck,
  Check
} from 'lucide-react';
import { CodingProject, CodingStudentProfile } from '../../types';
import { fetchAllCodingProjects, fetchAllStudents, resetStudentPin } from '../../lib/firebaseService';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface TeacherMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadStudentProject: (project: CodingProject) => void;
}

export default function TeacherMonitorModal({
  isOpen,
  onClose,
  onLoadStudentProject
}: TeacherMonitorModalProps) {
  const [projects, setProjects] = useState<CodingProject[]>([]);
  const [studentsList, setStudentsList] = useState<CodingStudentProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [inspectedProject, setInspectedProject] = useState<CodingProject | null>(null);
  const [markInput, setMarkInput] = useState('');
  const [markMsg, setMarkMsg] = useState('');

  // Teacher PIN reset state
  const [newPinInput, setNewPinInput] = useState('');
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [pinResetSuccess, setPinResetSuccess] = useState(false);

  useEffect(() => {
    setMarkInput(inspectedProject?.grade || '');
  }, [inspectedProject]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [allProjects, allStudents] = await Promise.all([
        fetchAllCodingProjects(),
        fetchAllStudents()
      ]);
      setProjects(allProjects);
      setStudentsList(allStudents);

      if (!selectedStudentId) {
        if (allStudents.length > 0) {
          setSelectedStudentId(allStudents[0].studentId);
        } else if (allProjects.length > 0) {
          setSelectedStudentId(allProjects[0].studentId);
        }
      }
    } catch (err) {
      console.error('Error fetching teacher data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  // Combined student map
  const studentMap = useMemo(() => {
    const map = new Map<string, {
      studentId: string;
      studentName: string;
      studentEmail?: string;
      className?: string;
      authMethod?: 'email_password' | 'student_id_pin';
      loginIdentifier?: string;
      pin?: string;
      projects: CodingProject[];
      latestUpdate: string;
    }>();

    // First populate from registered students list
    studentsList.forEach(s => {
      map.set(s.studentId, {
        studentId: s.studentId,
        studentName: s.studentName,
        studentEmail: s.studentEmail,
        className: s.className,
        authMethod: s.authMethod,
        loginIdentifier: s.loginIdentifier,
        pin: s.pin,
        projects: [],
        latestUpdate: s.lastActive || ''
      });
    });

    // Merge in projects
    projects.forEach(p => {
      const existing = map.get(p.studentId);
      if (!existing) {
        map.set(p.studentId, {
          studentId: p.studentId,
          studentName: p.studentName || 'Anonymous Student',
          studentEmail: p.studentEmail,
          className: 'Class of 2026',
          authMethod: p.studentEmail?.includes('@student.local') ? 'student_id_pin' : 'email_password',
          loginIdentifier: p.studentEmail,
          projects: [p],
          latestUpdate: p.updatedAt || p.createdAt
        });
      } else {
        existing.projects.push(p);
        if (new Date(p.updatedAt || p.createdAt) > new Date(existing.latestUpdate || 0)) {
          existing.latestUpdate = p.updatedAt || p.createdAt;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => 
      new Date(b.latestUpdate || 0).getTime() - new Date(a.latestUpdate || 0).getTime()
    );
  }, [projects, studentsList]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentMap;
    const q = searchQuery.toLowerCase();
    return studentMap.filter(s => 
      s.studentName.toLowerCase().includes(q) ||
      (s.studentEmail && s.studentEmail.toLowerCase().includes(q)) ||
      (s.loginIdentifier && s.loginIdentifier.toLowerCase().includes(q))
    );
  }, [studentMap, searchQuery]);

  const activeStudent = useMemo(() => {
    return studentMap.find(s => s.studentId === selectedStudentId) || (filteredStudents[0] ?? null);
  }, [studentMap, selectedStudentId, filteredStudents]);

  // Live preview HTML for the inspected project
  const inspectedPreviewHtml = useMemo(() => {
    if (!inspectedProject) return '';
    let html = inspectedProject.files['index.html'] || '<p style="font-family:sans-serif;padding:20px;color:#888;">Empty HTML file</p>';
    const css = inspectedProject.files['styles.css'] || '';
    const js = inspectedProject.files['script.js'] || '';

    if (css) {
      if (html.includes('</head>')) {
        html = html.replace('</head>', `<style>${css}</style></head>`);
      } else {
        html = `<style>${css}</style>` + html;
      }
    }

    if (js) {
      const scriptTag = `<script>${js}<\/script>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}</body>`);
      } else {
        html += scriptTag;
      }
    }

    return html;
  }, [inspectedProject]);

  const handleResetPin = async () => {
    if (!activeStudent || !newPinInput.trim()) return;
    if (newPinInput.trim().length < 4) {
      alert("PIN must be at least 4 digits.");
      return;
    }
    setIsResettingPin(true);
    try {
      await resetStudentPin(activeStudent.studentId, newPinInput.trim());
      setPinResetSuccess(true);
      setTimeout(() => {
        setPinResetSuccess(false);
        setNewPinInput('');
      }, 2000);
      loadAllData();
    } catch (e: any) {
      alert(e.message || "Failed to reset PIN");
    } finally {
      setIsResettingPin(false);
    }
  };

  // Award / update a mark for the inspected project
  const saveMark = async () => {
    if (!inspectedProject) return;
    const g = markInput.trim();
    if (g && (!/^\d{1,3}$/.test(g) || Number(g) > 100)) {
      alert('Enter a score from 0 to 100, or clear the field to unmark.');
      return;
    }
    try {
      await setDoc(doc(db, 'coding_projects', inspectedProject.id), { grade: g }, { merge: true });
      const updated = { ...inspectedProject, grade: g || undefined } as CodingProject;
      setInspectedProject(updated);
      setProjects((prev) => prev.map((pp) => (pp.id === updated.id ? updated : pp)));
      setMarkMsg(g ? `Mark saved: ${g}/100` : 'Mark cleared');
      setTimeout(() => setMarkMsg(''), 2500);
    } catch (e: any) {
      alert(e?.message || 'Failed to save the mark.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#0b1739] border border-white/15 rounded-2xl w-full max-w-6xl h-[88vh] shadow-2xl overflow-hidden text-white flex flex-col"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0F2557]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Students Projects</h2>
                <span className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded-full font-mono">
                  Live Firestore Database
                </span>
              </div>
              <p className="text-xs text-white/60">
                Every project students have submitted, with the date it was saved and their mark
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Refresh database records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-3.5 border-b border-white/10 bg-[#081533]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5 text-[#D4A017]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">{studentMap.length}</div>
              <div className="text-[11px] text-white/50">Total Enrolled Students</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5 text-emerald-400">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">{projects.length}</div>
              <div className="text-[11px] text-white/50">Total Saved Projects</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5 text-sky-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">
                {studentMap.length > 0 ? (projects.length / studentMap.length).toFixed(1) : 0}
              </div>
              <div className="text-[11px] text-white/50">Avg Projects / Student</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5 text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">
                {studentMap[0]?.latestUpdate ? new Date(studentMap[0].latestUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
              </div>
              <div className="text-[11px] text-white/50">Latest Activity</div>
            </div>
          </div>
        </div>

        {/* 3-COLUMN DASHBOARD */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* COLUMN 1: STUDENT ROSTER */}
          <div className="w-full md:w-80 border-r border-white/10 bg-[#071126] flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by name, email, or ID..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D4A017]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/40">
                  {studentsList.length === 0 && projects.length === 0 
                    ? 'No students registered yet. Students can register with Email/Password or Student ID/PIN.' 
                    : 'No students match filter.'}
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isSelected = activeStudent?.studentId === s.studentId;
                  const isIdPin = s.authMethod === 'student_id_pin';
                  return (
                    <button
                      key={s.studentId}
                      onClick={() => {
                        setSelectedStudentId(s.studentId);
                        setInspectedProject(s.projects[0] || null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-[#0F2557] border-[#D4A017] shadow-md shadow-[#D4A017]/10'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#D4A017]/20 border border-[#D4A017]/40 flex items-center justify-center font-bold text-xs text-[#D4A017] flex-shrink-0">
                        {s.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span>{s.studentName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isIdPin ? (
                            <span className="text-[10px] bg-amber-500/20 text-[#D4A017] px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-0.5">
                              <Hash className="w-2.5 h-2.5" />
                              {s.loginIdentifier || s.studentId.replace('student_', '').toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-[10px] text-white/50 truncate flex items-center gap-0.5">
                              <Mail className="w-2.5 h-2.5" />
                              {s.studentEmail}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#D4A017]">
                          {s.projects.length} proj
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 2: STUDENT'S SAVED PROJECTS */}
          <div className="w-full md:w-80 border-r border-white/10 bg-[#050E22] flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/10 bg-[#0F2557]/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  {activeStudent ? activeStudent.studentName : 'Student'} Portfolio
                </span>
                <span className="text-[10px] text-white/40">
                  {activeStudent ? `${activeStudent.projects.length} saved project(s)` : '0 saved'}
                </span>
              </div>
            </div>

            {/* If student uses ID + PIN, show teacher PIN reset tool */}
            {activeStudent && activeStudent.authMethod === 'student_id_pin' && (
              <div className="p-3 border-b border-white/10 bg-amber-500/5 text-xs space-y-2">
                <div className="flex items-center justify-between text-white/70">
                  <span className="font-semibold flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-[#D4A017]" />
                    Student PIN Control
                  </span>
                  <span className="font-mono text-[10px] text-[#D4A017]">
                    Current: {activeStudent.pin ? '••••' : 'Set'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={8}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="New 4-digit PIN"
                    className="flex-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#D4A017]"
                  />
                  <button
                    onClick={handleResetPin}
                    disabled={isResettingPin || !newPinInput.trim()}
                    className="px-2.5 py-1 rounded-lg bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-[11px] disabled:opacity-40 cursor-pointer"
                  >
                    {pinResetSuccess ? 'Updated!' : 'Reset PIN'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {!activeStudent || activeStudent.projects.length === 0 ? (
                <div className="text-center py-12 text-xs text-white/40 space-y-2">
                  <FolderOpen className="w-8 h-8 mx-auto text-white/20" />
                  <p>No projects saved by {activeStudent ? activeStudent.studentName : 'this student'} yet.</p>
                  <p className="text-[11px] text-white/30">Their work will appear here automatically as they save practice sessions.</p>
                </div>
              ) : (
                activeStudent.projects.map((proj) => {
                  const isSelected = inspectedProject?.id === proj.id;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => setInspectedProject(proj)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-[#0F2557] border-[#D4A017]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate">{proj.title}</h4>
                        <span className="text-[10px] text-white/40">
                          {new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {proj.description && (
                        <p className="text-[11px] text-white/60 line-clamp-2">{proj.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-white/40">
                        <div className="flex gap-2 font-mono">
                          {proj.files['index.html'] && <span className="text-amber-400">HTML</span>}
                          {proj.files['styles.css'] && <span className="text-sky-400">CSS</span>}
                          {proj.files['script.js'] && <span className="text-yellow-400">JS</span>}
                        </div>
                        <span className="text-white/60 font-semibold flex items-center gap-1">
                          <Eye className="w-3 h-3 text-[#D4A017]" />
                          Inspect
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 3: LIVE CODE & PREVIEW INSPECTOR */}
          <div className="flex-1 bg-[#030917] flex flex-col overflow-hidden">
            {!inspectedProject ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white/40">
                <Laptop className="w-12 h-12 mb-3 text-white/20" />
                <h3 className="text-sm font-bold text-white mb-1">Select a Student Project</h3>
                <p className="text-xs max-w-sm">
                  Click on any saved assignment from the middle list to preview their running webpage or inspect their raw code.
                </p>
              </div>
            ) : (
              <>
                {/* INSPECTOR TOP BAR */}
                <div className="p-3 border-b border-white/10 bg-[#071126] flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white truncate">
                      {inspectedProject.title} — {activeStudent?.studentName}
                    </h3>
                    <p className="text-[10px] text-white/50 font-mono">
                      Last edited {new Date(inspectedProject.updatedAt || inspectedProject.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Mark */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-white/50 font-semibold hidden sm:inline">Mark</span>
                      <input
                        value={markInput}
                        onChange={(e) => setMarkInput(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="0-100"
                        className="w-16 px-2 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white text-center focus:outline-none focus:border-[#D4A017]"
                      />
                      <button
                        onClick={saveMark}
                        className="px-2.5 py-1.5 rounded-lg bg-[#D4A017] hover:bg-[#e5b31f] text-[#0F2557] text-xs font-bold transition-colors cursor-pointer"
                      >
                        Save mark
                      </button>
                      {markMsg && <span className="text-[10px] text-emerald-400">{markMsg}</span>}
                    </div>

                    {/* Load Into Workspace */}
                    <button
                      onClick={() => {
                        onLoadStudentProject(inspectedProject);
                        onClose();
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Open this code in the teacher workspace for demonstration or corrections"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Open in Workspace</span>
                    </button>
                  </div>
                </div>

                {/* INSPECTOR CONTENT */}
                <div className="flex-1 overflow-hidden relative">
                  (
                    <div className="w-full h-full bg-white">
                      <iframe
                        srcDoc={inspectedPreviewHtml}
                        title="Student Output Preview"
                        sandbox="allow-scripts"
                        className="w-full h-full border-none"
                      />
                    </div>
                  )
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
