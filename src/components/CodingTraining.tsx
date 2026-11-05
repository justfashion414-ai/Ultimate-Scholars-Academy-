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
  LogOut
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
import { saveCodingProject } from '../lib/firebaseService';
import { auth } from '../lib/firebase';

// IMPORTANT: Editor starts COMPLETELY EMPTY by default as requested.
const DEFAULT_FILES = {
  'index.html': '',
  'styles.css': '',
  'script.js': ''
};

export default function CodingTraining() {
  const [files, setFiles] = useState(DEFAULT_FILES);
  const [activeFile, setActiveFile] = useState<keyof typeof DEFAULT_FILES>('index.html');
  const [output, setOutput] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLivePreview, setIsLivePreview] = useState(true);
  const [currentProjectTitle, setCurrentProjectTitle] = useState('My Practice Code');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Modals state
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isSavedProjectsModalOpen, setIsSavedProjectsModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#050E22] text-white flex flex-col font-sans">
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

      {/* TOP HEADER */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 sm:px-6 bg-[#0F2557] select-none">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#D4A017] rounded-lg">
              <Code2 className="w-5 h-5 text-[#0F2557]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight">Coding Lab</h1>
                <span className="text-[10px] bg-white/10 text-[#D4A017] px-2 py-0.5 rounded-full font-bold">
                  Class of 2026
                </span>
              </div>
              <p className="text-[10px] text-white/50 uppercase font-mono tracking-widest hidden sm:block">
                Web Development Practice Studio
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Templates Button */}
          <button
            onClick={() => setIsTemplatesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-[#D4A017]/40 text-[#D4A017] font-bold text-xs transition-transform active:scale-95 cursor-pointer shadow-sm"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Starter Templates</span>
            <span className="sm:hidden">Templates</span>
            <span className="px-1.5 py-0.2 bg-[#D4A017] text-[#0F2557] rounded-full text-[10px]">3</span>
          </button>

          {/* Teacher Progress Monitor Button */}
          <button
            onClick={() => setIsTeacherModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#071126] hover:bg-white/10 border border-white/15 text-white/90 font-semibold text-xs transition-colors cursor-pointer"
            title="Inspect all student progress"
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Teacher Monitor</span>
          </button>

          <div className="h-5 w-px bg-white/10 mx-1 hidden sm:block" />

          {/* Live Preview Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
            <span className={`text-[10px] font-bold uppercase tracking-widest hidden md:inline ${isLivePreview ? 'text-[#D4A017]' : 'text-white/30'}`}>
              Live Preview
            </span>
            <button
              onClick={() => setIsLivePreview(!isLivePreview)}
              className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer ${isLivePreview ? 'bg-[#D4A017]' : 'bg-white/10'}`}
              title="Toggle Live Preview"
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-[#0F2557] rounded-full transition-all ${isLivePreview ? 'left-4.5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Reset Button */}
          <button 
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold transition-all cursor-pointer text-white/70 hover:text-white"
            title="Clear editor back to empty"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Run Code Manual Button */}
          <button 
            onClick={runCode}
            disabled={isLivePreview}
            className={`flex items-center gap-1.5 px-4 sm:px-5 py-1.5 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95 ${
              isLivePreview 
                ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5' 
                : 'bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] cursor-pointer'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run</span>
          </button>
        </div>
      </header>

      {/* STUDENT ACCOUNT & WORKSPACE BAR */}
      <div className="bg-[#071126] border-b border-white/10 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Authenticated Student Identity & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <div className="w-6 h-6 rounded-full bg-[#D4A017] text-[#0F2557] flex items-center justify-center font-bold text-[11px] shadow-sm">
              {currentStudent.studentName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <span className="text-[10px] text-white/40 block leading-tight">
                {currentStudent.authMethod === 'student_id_pin' ? 'Student ID Login' : 'Email Login'}
              </span>
              <span className="font-bold text-white leading-tight block">
                {currentStudent.studentName}
              </span>
            </div>
          </div>

          <span className="hidden md:inline text-[10px] px-2.5 py-1 rounded-lg bg-white/10 text-white/80 font-mono border border-white/10">
            {currentStudent.authMethod === 'student_id_pin' 
              ? `ID: ${currentStudent.loginIdentifier || currentStudent.studentId.replace('student_', '').toUpperCase()}` 
              : currentStudent.studentEmail}
          </span>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {saveStatus === 'saving' ? 'Saving to Cloud...' : saveStatus === 'unsaved' ? 'Unsaved edits' : `Synced with Cloud ${lastSavedTime ? `@ ${lastSavedTime}` : ''}`}
            </span>
          </div>
        </div>

        {/* Right: Project Save & Load Controls and Exit Session */}
        <div className="flex items-center gap-2">
          {/* My Saved Projects */}
          <button
            onClick={() => setIsSavedProjectsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-medium transition-colors cursor-pointer text-xs"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#D4A017]" />
            <span>My Projects</span>
          </button>

          {/* Quick Save */}
          <button
            onClick={() => setIsSavedProjectsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold transition-all cursor-pointer text-xs shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Work</span>
          </button>

          <div className="h-4 w-px bg-white/20 mx-1 hidden sm:block" />

          {/* Exit / Sign Out Workspace */}
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-100 font-semibold transition-colors cursor-pointer text-xs"
            title="Sign out and return to the student login page"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Lab</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT: CODE EDITOR */}
        <div className="flex-1 flex flex-col border-r border-white/10 bg-[#050E22]">
          {/* FILE TABS */}
          <div className="flex items-center justify-between p-2 bg-[#0F2557]/50 border-b border-white/5 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1">
              {(['index.html', 'styles.css', 'script.js'] as const).map((fileName) => {
                const charCount = files[fileName].length;
                return (
                  <button
                    key={fileName}
                    onClick={() => setActiveFile(fileName)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
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

            <div className="text-[10px] text-white/40 font-mono pr-2 hidden sm:block">
              {files[activeFile].length} chars • {files[activeFile].split('\n').length} lines
            </div>
          </div>

          {/* EDITOR BODY */}
          <div className="flex-1 relative font-mono text-sm overflow-auto scrollbar-thin scrollbar-thumb-white/10">
            <Editor
              value={files[activeFile]}
              onValueChange={handleCodeChange}
              highlight={highlight}
              padding={20}
              placeholder={`// ${activeFile} is empty. Write your ${activeFile.endsWith('.html') ? 'HTML markup' : activeFile.endsWith('.css') ? 'CSS styles' : 'JavaScript code'} here, or load a Starter Template...`}
              className="code-editor min-h-full"
              style={{
                fontFamily: '"Fira Code", "Cascadia Code", "Source Code Pro", monospace',
                fontSize: 14,
                backgroundColor: 'transparent',
              }}
            />
          </div>
        </div>

        {/* RIGHT: PREVIEW & CONSOLE */}
        <div className="flex-1 flex flex-col bg-[#050E22]">
          {/* PREVIEW CONTAINER */}
          <div className="flex-[2] flex flex-col border-b border-white/10 relative">
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
              <div className="flex items-center gap-2 text-white/50 font-bold text-[10px] uppercase tracking-wider">
                <Laptop className="w-3.5 h-3.5 text-[#D4A017]" />
                <span>Live Browser Preview</span>
              </div>
              <div className="text-[10px] text-white/40">
                {isLivePreview ? 'Auto-updating' : 'Manual Run Mode'}
              </div>
            </div>

            <div className="flex-1 bg-white relative">
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
                <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#0a1532] text-center">
                  <div className="max-w-md space-y-4">
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
          <div className="flex-1 flex flex-col bg-black/40">
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
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
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
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

      {/* FOOTER */}
      <footer className="h-11 border-t border-white/10 bg-[#0F2557] flex items-center px-4 sm:px-6 text-[10px] text-white/50 gap-6">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-[#D4A017]" />
          <span className="uppercase tracking-widest font-bold text-white/70">Docs:</span>
        </div>
        <div className="flex gap-4 font-medium">
          <a href="https://developer.mozilla.org/en-US/docs/Web/HTML" target="_blank" rel="noreferrer" className="hover:text-[#D4A017] transition-all flex items-center gap-1">
            HTML Docs <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <a href="https://developer.mozilla.org/en-US/docs/Web/CSS" target="_blank" rel="noreferrer" className="hover:text-[#D4A017] transition-all flex items-center gap-1">
            CSS Docs <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank" rel="noreferrer" className="hover:text-[#D4A017] transition-all flex items-center gap-1">
            JavaScript Docs <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2 italic">
          Ultimate Scholars Academy • Student Web Coding Studio
        </div>
      </footer>

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
