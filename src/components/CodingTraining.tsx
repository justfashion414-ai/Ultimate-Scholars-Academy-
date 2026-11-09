import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Code2, 
  Play, 
  Terminal, 
  ChevronLeft, 
  FileCode, 
  FileJson, 
  FileText,
  RotateCcw,
  ExternalLink,
  BookOpen,
  Laptop,
  LayoutTemplate,
  Save,
  FolderOpen,
  User,
  GraduationCap,
  Sparkles,
  Check,
  AlertCircle,
  CloudCheck,
  CheckCircle2,
  LogOut,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import { signOut } from 'firebase/auth';

// Import Prism languages
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';

// Modals, Pages and Types
import CodingTemplatesModal from './coding/CodingTemplatesModal';
import CodingLoginPage from './coding/CodingLoginPage';
import SavedProjectsModal from './coding/SavedProjectsModal';
import TeacherMonitorModal from './coding/TeacherMonitorModal';
import { CodingTemplate } from './coding/templates';
import { CodingProject, CodingStudentProfile } from '../types';
import { saveCodingProject, fetchStudentCodingProjects } from '../lib/firebaseService';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import ForcePasswordSetup from './ForcePasswordSetup';
import GraphicsLab from './coding/GraphicsLab';
import ProfileAvatar from './coding/ProfileAvatar';

// IMPORTANT: Editor starts COMPLETELY EMPTY by default as requested.
const DEFAULT_FILES = {
  'index.html': '',
  'styles.css': '',
  'script.js': ''
};

type MobilePane = 'code' | 'preview' | 'console';



export default function CodingTraining() {
  const [files, setFiles] = useState(DEFAULT_FILES);
  const [activeFile, setActiveFile] = useState<keyof typeof DEFAULT_FILES>('index.html');
  const [output, setOutput] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLivePreview, setIsLivePreview] = useState(true);
  const [currentProjectTitle, setCurrentProjectTitle] = useState('My Practice Code');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [teacherFeedback, setTeacherFeedback] = useState<{ latest: string; count: number; grade?: string } | null>(null);

  // Pull teacher feedback for the open project so students see marks live
  useEffect(() => {
    let cancelled = false;
    if (!currentProjectId) { setTeacherFeedback(null); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'coding_projects', currentProjectId));
        if (cancelled) return;
        if (!snap.exists()) { setTeacherFeedback(null); return; }
        const d = snap.data() as CodingProject;
        const comments = d.teacherComments || [];
        if (!comments.length && !d.grade) { setTeacherFeedback(null); return; }
        setTeacherFeedback({ latest: comments[0]?.text || '', count: comments.length, grade: d.grade });
      } catch {
        if (!cancelled) setTeacherFeedback(null);
      }
    })();
    return () => { cancelled = true; };
  }, [currentProjectId]);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Modals state
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isSavedProjectsModalOpen, setIsSavedProjectsModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Layout state: collapsible sidebar + mobile pane switching
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobilePane>('code');

  // Student Profile State
  const [currentStudent, setCurrentStudent] = useState<CodingStudentProfile | null>(() => {
    try {
      const stored = localStorage.getItem('scholars_coding_current_student');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // AUTO-LOAD: when a student opens the Lab, bring back their most recent
  // saved project so the editor shows their code instead of an empty page.
  // Local mirror is read first for an instant restore; the cloud copy is
  // merged in (picks up work saved on another device).
  const restoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentStudent) {
      restoredRef.current = null;
      return;
    }
    if (restoredRef.current === currentStudent.studentId) return;
    restoredRef.current = currentStudent.studentId;

    const byNewest = (a: CodingProject, b: CodingProject) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    const applyProject = (latest: CodingProject) => {
      if (!latest || !latest.files) return;
      setFiles({
        'index.html': latest.files['index.html'] || '',
        'styles.css': latest.files['styles.css'] || '',
        'script.js': latest.files['script.js'] || ''
      });
      setCurrentProjectTitle(latest.title || 'My Practice Code');
      setCurrentProjectId(latest.id);
      setSaveStatus('saved');
      if (latest.updatedAt || latest.createdAt) {
        setLastSavedTime(new Date(latest.updatedAt || latest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
      setTimeout(runCode, 100);
    };

    let cancelled = false;
    const localKey = `scholars_coding_projects_${currentStudent.studentId}`;
    try {
      const localProjects: CodingProject[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      if (localProjects.length > 0) {
        applyProject([...localProjects].sort(byNewest)[0]);
      }
    } catch (e) {
      // Local restore failed; fall through to the cloud fetch
    }

    fetchStudentCodingProjects(currentStudent.studentId)
      .then((cloudProjects) => {
        if (cancelled || !cloudProjects || cloudProjects.length === 0) return;
        applyProject([...cloudProjects].sort(byNewest)[0]);
      })
      .catch(() => {
        // Offline or permissions issue: the local restore above already applied
      });
    return () => { cancelled = true; };
  }, [currentStudent]);

  // Sync auth state for email/password student accounts
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user && !currentStudent) {
        try {
          const stored = localStorage.getItem('scholars_coding_current_student');
          if (stored) {
            const parsed: CodingStudentProfile = JSON.parse(stored);
            if (parsed.authMethod === 'email_password' && parsed.studentId === user.uid) {
              setCurrentStudent(parsed);
            }
          }
        } catch (e) {
          // ignore
        }
      }
    });
    return () => unsub();
  }, [currentStudent]);

  // SECURITY GATE: a flagged admin must set a permanent password before the interface
  const [forcedPwGate, setForcedPwGate] = useState<{ email: string } | null>(null);
  useEffect(() => {
    const user = auth.currentUser;
    const emailAddr = user?.email?.toLowerCase();
    if (!currentStudent || !emailAddr) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'admins', emailAddr));
        if (!cancelled && snap.exists() && (snap.data() as any).mustSetPassword === true) {
          setForcedPwGate({ email: emailAddr });
        }
      } catch {
        // ignore read failures; the gate also applies at sign-in
      }
    })();
    return () => { cancelled = true; };
  }, [currentStudent]);

  const hasExistingCode = useMemo(() => {
    return Boolean(files['index.html'].trim() || files['styles.css'].trim() || files['script.js'].trim());
  }, [files]);

  // Code Execution Engine
  const runCode = () => {
    if (!files['index.html'].trim() && !files['styles.css'].trim() && !files['script.js'].trim()) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    setOutput(['[SYSTEM] Code execution started...']);
    
    const consoleInterceptor = `
      <script>
        (function() {
          const log = console.log;
          const error = console.error;
          console.log = function(...args) {
            window.parent.postMessage({ type: 'log', content: args.map(a => String(a)).join(' ') }, '*');
            log.apply(console, args);
          };
          console.error = function(...args) {
            window.parent.postMessage({ type: 'error', content: args.map(a => String(a)).join(' ') }, '*');
            error.apply(console, args);
          };
          window.onerror = function(msg) {
            window.parent.postMessage({ type: 'error', content: msg }, '*');
          };
        })();
      </script>
    `;

    let html = files['index.html'] || '<!DOCTYPE html><html><head></head><body></body></html>';

    // Inject styles
    if (files['styles.css']) {
      if (html.includes('</head>')) {
        html = html.replace('</head>', `<style>${files['styles.css']}</style></head>`);
      } else {
        html = `<style>${files['styles.css']}</style>` + html;
      }
    }

    // Inject console interceptor
    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + consoleInterceptor);
    } else {
      html = consoleInterceptor + html;
    }

    // Inject script
    if (files['script.js']) {
      const scriptContent = `<script>${files['script.js']}<\/script>`;
      if (html.includes('<script src="script.js"></script>')) {
        html = html.replace('<script src="script.js"></script>', scriptContent);
      } else if (html.includes('</body>')) {
        html = html.replace('</body>', scriptContent + '</body>');
      } else {
        html += scriptContent;
      }
    }

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(url);
  };

  // Live Preview Debounce
  useEffect(() => {
    if (isLivePreview) {
      const debounceTimer = setTimeout(() => {
        runCode();
      }, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [files, isLivePreview]);

  // Console message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'log') {
        setOutput(prev => [...prev, `[LOG] ${event.data.content}`]);
      } else if (event.data?.type === 'error') {
        setOutput(prev => [...prev, `[ERROR] ${event.data.content}`]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Track edits to indicate unsaved changes
  const handleCodeChange = (newCode: string) => {
    setFiles(prev => ({ ...prev, [activeFile]: newCode }));
    if (currentStudent && hasExistingCode) {
      setSaveStatus('unsaved');
    }
  };

  // Auto-save logic (debounced 3s when signed in)
  useEffect(() => {
    if (!currentStudent || !hasExistingCode) return;
    
    const autoSaveTimer = setTimeout(async () => {
      setSaveStatus('saving');
      const projId = currentProjectId || `proj_${Date.now()}`;
      if (!currentProjectId) {
        setCurrentProjectId(projId);
      }

      const project: CodingProject = {
        id: projId,
        studentId: currentStudent.studentId,
        studentName: currentStudent.studentName,
        studentEmail: currentStudent.studentEmail,
        title: currentProjectTitle || 'Current Practice Session',
        files,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await saveCodingProject(project);
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (e) {
        setSaveStatus('unsaved');
      }
    }, 3000);

    return () => clearTimeout(autoSaveTimer);
  }, [files, currentStudent, currentProjectId, currentProjectTitle]);

  // Reset: Cleans completely back to empty
  const handleReset = () => {
    if (hasExistingCode && !window.confirm('Clear all code in the editor? Your files will be reset to empty.')) {
      return;
    }
    setFiles(DEFAULT_FILES);
    setActiveFile('index.html');
    setOutput([]);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSaveStatus('saved');
  };

  // Apply a template
  const handleSelectTemplate = (template: CodingTemplate) => {
    setFiles({
      'index.html': template.files['index.html'] || '',
      'styles.css': template.files['styles.css'] || '',
      'script.js': template.files['script.js'] || ''
    });
    setActiveFile('index.html');
    setCurrentProjectTitle(template.title);
    setCurrentProjectId(`proj_${Date.now()}_${template.id}`);
    setOutput([`[SYSTEM] Loaded "${template.title}". Ready for editing.`]);
    setTimeout(runCode, 100);
  };

  // Load a saved project
  const handleLoadProject = (project: CodingProject) => {
    setFiles(project.files);
    setCurrentProjectTitle(project.title);
    setCurrentProjectId(project.id);
    setActiveFile('index.html');
    setOutput([`[SYSTEM] Opened project "${project.title}".`]);
    setSaveStatus('saved');
    setLastSavedTime(new Date(project.updatedAt || project.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setTimeout(runCode, 100);
  };

  // Save profile
  const handleSaveStudentProfile = (profile: CodingStudentProfile | null) => {
    setCurrentStudent(profile);
    if (profile) {
      localStorage.setItem('scholars_coding_current_student', JSON.stringify(profile));
    } else {
      localStorage.removeItem('scholars_coding_current_student');
      setCurrentProjectId(null);
    }
  };

  // Sign out student and return to the Coding Login Page
  const handleSignOut = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn("Sign out notice:", e);
    }
    localStorage.removeItem('scholars_coding_current_student');
    setCurrentStudent(null);
    setCurrentProjectId(null);
    setShowExitConfirm(false);
    setFiles(DEFAULT_FILES);
    setOutput([]);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const highlight = (code: string) => {
    const lang = activeFile.endsWith('.html') ? 'markup' : activeFile.endsWith('.css') ? 'css' : 'javascript';
    return Prism.highlight(code, Prism.languages[lang], lang);
  };

  const saveStatusText = saveStatus === 'saving'
    ? 'Saving to Cloud...'
    : saveStatus === 'unsaved'
      ? 'Unsaved edits'
      : `Synced with Cloud ${lastSavedTime ? `@ ${lastSavedTime}` : ''}`;

  const saveStatusColor = saveStatus === 'saving'
    ? 'bg-amber-400 animate-pulse'
    : saveStatus === 'unsaved'
      ? 'bg-rose-400'
      : 'bg-emerald-400';

  // Mobile pane switch. Preview tab always runs the code first so the
  // student immediately sees what their code produces.
  const switchMobileView = (pane: MobilePane) => {
    setMobileView(pane);
    if (pane === 'preview' && !isLivePreview && hasExistingCode) {
      runCode();
    }
  };

  // GATEKEEPER: Coding Login Page MUST appear first before getting into the coding interface
  if (!currentStudent) {
    return (
      <CodingLoginPage 
        onLoginSuccess={(profile) => {
          handleSaveStudentProfile(profile);
        }} 
      />
    );
  }

  // GRAPHICS TRACK: graphics students land in the design studio, not the code lab
  if ((currentStudent.track || 'coding') === 'graphics') {
    return (
      <GraphicsLab
        profile={currentStudent}
        onSignOut={handleSignOut}
        onProfileUpdated={handleSaveStudentProfile}
      />
    );
  }

  // SECURITY GATE: flagged administrators must set a permanent password first
  if (forcedPwGate) {
    return (
      <ForcePasswordSetup
        email={forcedPwGate.email}
        onDone={() => setForcedPwGate(null)}
      />
    );
  }

  return (
    <div className="h-[100dvh] bg-[#050E22] text-white flex flex-col font-sans overflow-hidden">
      <style>{`
        .code-editor {
          font-family: 'Fira Code', 'Cascadia Code', 'Source Code Pro', monospace !important;
          font-size: 14px !important;
          line-height: 1.6 !important;
        }
        .code-editor textarea {
          outline: none !important;
        }
        /* VS Code Dark+ Colors */
        .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #6a9955; }
        .token.punctuation { color: #d4d4d4; }
        .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol, .token.deleted { color: #569cd6; }
        .token.selector, .token.attr-name, .token.char, .token.builtin, .token.inserted { color: #9cdcfe; }
        .token.string, .token.attr-value { color: #ce9178; }
        .token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string { color: #d4d4d4; }
        .token.atrule, .token.attr-value, .token.keyword { color: #c586c0; }
        .token.function, .token.class-name { color: #dcdcaa; }
        .token.regex, .token.important, .token.variable { color: #d16969; }
      `}</style>

      {/* TOP HEADER: single clean bar. Everything else lives in the sidebar. */}
      <header className="h-14 shrink-0 border-b border-white/10 flex items-center justify-between px-2 sm:px-5 bg-[#0F2557] select-none z-30">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {/* Collapsible sidebar button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white cursor-pointer"
            title="Open menu"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white hidden sm:block" title="Back to album">
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-[#D4A017] rounded-lg shrink-0">
              <Code2 className="w-5 h-5 text-[#0F2557]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight truncate">Coding Lab</h1>
                <span className="hidden sm:inline text-[10px] bg-white/10 text-[#D4A017] px-2 py-0.5 rounded-full font-bold">
                  Class of 2026
                </span>
              </div>
            </div>

            {/* Compact cloud sync status */}
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${saveStatusColor}`}
              title={saveStatusText}
            />
          </div>
        </div>

        {/* RUN: always visible, one tap away on every screen size */}
        <button 
          onClick={runCode}
          className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
          title="Run your code now"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run</span>
        </button>

        <ProfileAvatar profile={currentStudent} onUpdated={handleSaveStudentProfile} />
      </header>

      {/* MOBILE PANE SWITCHER: Code / Preview / Console */}
      <nav className="lg:hidden shrink-0 grid grid-cols-3 gap-1.5 p-1.5 bg-[#071126] border-b border-white/10">
        {([
          { id: 'code' as MobilePane, label: 'Code', icon: <FileCode className="w-3.5 h-3.5" /> },
          { id: 'preview' as MobilePane, label: 'Preview', icon: <Laptop className="w-3.5 h-3.5" /> },
          { id: 'console' as MobilePane, label: 'Console', icon: <Terminal className="w-3.5 h-3.5" /> },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchMobileView(tab.id)}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mobileView === tab.id
                ? 'bg-[#D4A017] text-[#0F2557] shadow'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.id === 'console' && output.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${mobileView === tab.id ? 'bg-[#0F2557] text-[#D4A017]' : 'bg-white/10 text-white/70'}`}>
                {output.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* MAIN CONTENT AREA */}
      {teacherFeedback && (
        <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 sm:px-5 py-2 bg-[#D4A017]/10 border-b border-[#D4A017]/25 text-[11px]">
          <MessageSquare className="w-3.5 h-3.5 text-[#D4A017] shrink-0" />
          <span className="font-bold text-[#D4A017]">Teacher feedback{teacherFeedback.grade ? ` · Marked ${teacherFeedback.grade}/100` : ''}:</span>
          <span className="text-white/85 truncate">{teacherFeedback.latest}</span>
          {teacherFeedback.count > 1 && <span className="text-white/40">(+{teacherFeedback.count - 1} more in My Projects)</span>}
        </div>
      )}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT: CODE EDITOR */}
        <div className={`${mobileView === 'code' ? 'flex' : 'hidden'} lg:flex flex-1 min-h-0 min-w-0 flex-col border-b lg:border-b-0 lg:border-r border-white/10 bg-[#050E22]`}>
          {/* FILE TABS */}
          <div className="shrink-0 flex items-center justify-between p-2 bg-[#0F2557]/50 border-b border-white/5 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1">
              {(['index.html', 'styles.css', 'script.js'] as const).map((fileName) => {
                const charCount = files[fileName].length;
                return (
                  <button
                    key={fileName}
                    onClick={() => setActiveFile(fileName)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                      activeFile === fileName 
                        ? 'bg-white/10 text-[#D4A017] shadow-sm font-semibold' 
                        : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                    }`}
                  >
                    {fileName.endsWith('.html') && <FileCode className="w-3.5 h-3.5 text-emerald-400" />}
                    {fileName.endsWith('.css') && <FileText className="w-3.5 h-3.5 text-sky-400" />}
                    {fileName.endsWith('.js') && <FileJson className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{fileName}</span>
                    {charCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A017]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] text-white/40 font-mono pr-2 hidden md:block">
              {files[activeFile].length} chars • {files[activeFile].split('\n').length} lines
            </div>
          </div>

          {/* EDITOR BODY */}
          <div className="flex-1 min-h-0 relative font-mono text-sm overflow-auto scrollbar-thin scrollbar-thumb-white/10">
            <Editor
              value={files[activeFile]}
              onValueChange={handleCodeChange}
              highlight={highlight}
              padding={16}
              placeholder={`// ${activeFile} is empty. Write your ${activeFile.endsWith('.html') ? 'HTML markup' : activeFile.endsWith('.css') ? 'CSS styles' : 'JavaScript code'} here, or open the menu for Starter Templates...`}
              className="code-editor min-h-full"
              style={{
                fontFamily: '"Fira Code", "Cascadia Code", "Source Code Pro", monospace',
                fontSize: 14,
                backgroundColor: 'transparent',
              }}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Preview + Console (stacked on desktop, tabbed on mobile) */}
        <div className={`${mobileView === 'code' ? 'hidden' : 'flex'} lg:flex flex-1 min-h-0 min-w-0 flex-col`}>
          {/* PREVIEW */}
          <div className={`${mobileView === 'preview' ? 'flex' : 'hidden'} lg:flex flex-[2] min-h-0 flex-col border-b border-white/10 relative`}>
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
              <div className="flex items-center gap-2 text-white/50 font-bold text-[10px] uppercase tracking-wider">
                <Laptop className="w-3.5 h-3.5 text-[#D4A017]" />
                <span>Live Browser Preview</span>
              </div>
              <div className="text-[10px] text-white/40">
                {isLivePreview ? 'Auto-updating' : 'Manual Run Mode'}
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-white relative">
              {previewUrl ? (
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className="absolute inset-0 w-full h-full border-none"
                  title="Live Preview"
                  sandbox="allow-scripts allow-modals"
                />
              ) : (
                /* EMPTY STATE IN PREVIEW WHEN EDITOR IS EMPTY */
                <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#0a1532] text-center overflow-y-auto">
                  <div className="max-w-md space-y-4 py-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#D4A017]">
                      <FileCode className="w-8 h-8 opacity-80" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Editor is Empty</h3>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">
                        Start writing your code in <span className="text-emerald-400 font-mono">index.html</span>, or pick one of our starter templates to kick off:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                      <button
                        onClick={() => setIsTemplatesModalOpen(true)}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer group"
                      >
                        <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <FileCode className="w-3 h-3" />
                          Pure HTML
                        </div>
                        <div className="text-[10px] text-white/40 mt-1">No CSS or JS</div>
                      </button>

                      <button
                        onClick={() => setIsTemplatesModalOpen(true)}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer group"
                      >
                        <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          HTML + CSS
                        </div>
                        <div className="text-[10px] text-white/40 mt-1">Styled Card</div>
                      </button>

                      <button
                        onClick={() => setIsTemplatesModalOpen(true)}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer group"
                      >
                        <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                          <FileJson className="w-3 h-3" />
                          HTML+CSS+JS
                        </div>
                        <div className="text-[10px] text-white/40 mt-1">Interactive App</div>
                      </button>
                    </div>

                    <button
                      onClick={() => setIsTemplatesModalOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
                    >
                      <LayoutTemplate className="w-4 h-4" />
                      <span>Browse All 3 Templates</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CONSOLE OUTPUT */}
          <div className={`${mobileView === 'console' ? 'flex' : 'hidden'} lg:flex flex-1 min-h-0 flex-col bg-black/40`}>
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
              <div className="flex items-center gap-2 text-white/50 font-bold text-[10px] uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5" />
                <span>Console Logs</span>
              </div>
              <button 
                onClick={() => setOutput([])}
                className="text-[10px] text-white/30 hover:text-white/60 uppercase tracking-widest cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
              {output.length === 0 ? (
                <div className="text-white/20 italic">
                  No output yet. Write console.log() in script.js or interact with buttons to view messages.
                </div>
              ) : (
                output.map((line, idx) => (
                  <div key={idx} className={line.startsWith('[ERROR]') ? 'text-rose-400' : line.startsWith('[SYSTEM]') ? 'text-blue-400' : 'text-emerald-400'}>
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* COLLAPSIBLE SIDEBAR (MENU DRAWER) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="relative w-72 max-w-[85vw] h-full bg-[#0F2557] border-r border-white/10 flex flex-col shadow-2xl"
            >
              {/* Sidebar header */}
              <div className="h-14 shrink-0 px-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-[#D4A017] rounded-lg shrink-0">
                    <Code2 className="w-4 h-4 text-[#0F2557]" />
                  </div>
                  <span className="text-sm font-bold truncate">Coding Lab Menu</span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable sidebar body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
                {/* Student identity + cloud sync */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#D4A017] text-[#0F2557] flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                      {currentStudent.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-white/40 block leading-tight">
                        {currentStudent.authMethod === 'student_id_pin' ? 'Student ID Login' : 'Email Login'}
                      </span>
                      <span className="font-bold text-white leading-tight block truncate">
                        {currentStudent.studentName}
                      </span>
                    </div>
                  </div>
                  <span className="block text-[10px] px-2.5 py-1 rounded-lg bg-white/10 text-white/80 font-mono border border-white/10 truncate">
                    {currentStudent.authMethod === 'student_id_pin'
                      ? `ID: ${currentStudent.loginIdentifier || currentStudent.studentId.replace('student_', '').toUpperCase()}`
                      : currentStudent.studentEmail}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{saveStatusText}</span>
                  </div>
                </div>

                {/* Workspace actions */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold px-1">Workspace</p>
                  <button
                    onClick={() => { setIsDrawerOpen(false); setIsTemplatesModalOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-[#D4A017]/40 text-[#D4A017] font-bold text-xs transition-colors cursor-pointer"
                  >
                    <LayoutTemplate className="w-4 h-4" />
                    <span>Starter Templates</span>
                    <span className="ml-auto px-1.5 py-0.5 bg-[#D4A017] text-[#0F2557] rounded-full text-[10px]">3</span>
                  </button>
                  <button
                    onClick={() => { setIsDrawerOpen(false); setIsSavedProjectsModalOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 font-medium text-xs transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-[#D4A017]" />
                    <span>My Projects</span>
                  </button>
                  <button
                    onClick={() => { setIsDrawerOpen(false); setIsSavedProjectsModalOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Work</span>
                  </button>
                  <button
                    onClick={() => { setIsDrawerOpen(false); setIsTeacherModalOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 font-medium text-xs transition-colors cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                    <span>Teacher Monitor</span>
                  </button>
                </div>

                {/* Editor settings */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold px-1">Editor Settings</p>
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs font-medium text-white/90">Live Preview</span>
                    <button
                      onClick={() => setIsLivePreview(!isLivePreview)}
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${isLivePreview ? 'bg-[#D4A017]' : 'bg-white/10'}`}
                      title="Toggle Live Preview"
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-[#0F2557] rounded-full transition-all ${isLivePreview ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <button
                    onClick={() => { setIsDrawerOpen(false); handleReset(); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Editor</span>
                  </button>
                </div>

                {/* Docs */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold px-1 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-[#D4A017]" />
                    Docs
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <a href="https://developer.mozilla.org/en-US/docs/Web/HTML" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white/70 hover:text-[#D4A017] transition-colors">
                      HTML <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a href="https://developer.mozilla.org/en-US/docs/Web/CSS" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white/70 hover:text-[#D4A017] transition-colors">
                      CSS <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white/70 hover:text-[#D4A017] transition-colors">
                      JS <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Sidebar footer */}
              <div className="shrink-0 p-4 border-t border-white/10 space-y-2.5">
                <button
                  onClick={() => setShowExitConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-100 font-semibold transition-colors cursor-pointer text-xs"
                  title="Sign out and return to the student login page"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit Lab</span>
                </button>
                <p className="text-[10px] text-white/30 text-center italic">
                  Ultimate Scholars Academy • Student Web Coding Studio
                </p>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <CodingTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        hasExistingCode={hasExistingCode}
      />

      <SavedProjectsModal
        isOpen={isSavedProjectsModalOpen}
        onClose={() => setIsSavedProjectsModalOpen(false)}
        currentStudent={currentStudent}
        currentFiles={files}
        onLoadProject={handleLoadProject}
        onRequireAuth={() => {
          setIsSavedProjectsModalOpen(false);
        }}
      />

      <TeacherMonitorModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        onLoadStudentProject={handleLoadProject}
      />

      {/* EXIT / SIGN OUT CONFIRMATION MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0b1739] border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl text-white space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Exit Coding Workspace?</h3>
                <p className="text-xs text-white/60">Are you sure you want to end your coding session?</p>
              </div>
            </div>

            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 text-xs text-white/70 leading-relaxed space-y-2">
              <p>
                Your latest saved files are stored safely in Cloud Firestore.
              </p>
              <p className="text-white/50 text-[11px]">
                Exiting will sign out your session and return to the student login page so the next student can log in.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Stay in Editor
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Sign Out & Exit</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
