import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FolderOpen, 
  Save, 
  Trash2, 
  Clock, 
  ArrowRight, 
  FileCode,
  Plus,
  Check,
  AlertTriangle
} from 'lucide-react';
import { CodingProject, CodingStudentProfile } from '../../types';
import { fetchStudentCodingProjects, saveCodingProject, deleteCodingProject } from '../../lib/firebaseService';

interface SavedProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudent: CodingStudentProfile | null;
  currentFiles: {
    'index.html': string;
    'styles.css': string;
    'script.js': string;
  };
  onLoadProject: (project: CodingProject) => void;
  onRequireAuth?: () => void;
}

export default function SavedProjectsModal({
  isOpen,
  onClose,
  currentStudent,
  currentFiles,
  onLoadProject,
  onRequireAuth
}: SavedProjectsModalProps) {
  const [projects, setProjects] = useState<CodingProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Confirmation modal state for project deletion
  const [projectToDelete, setProjectToDelete] = useState<CodingProject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProjects = async () => {
    if (!currentStudent) return;
    setLoading(true);
    try {
      const list = await fetchStudentCodingProjects(currentStudent.studentId);
      setProjects(list);
    } catch (e) {
      console.error('Error loading projects:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (!currentStudent) {
        if (onRequireAuth) onRequireAuth();
        else onClose();
      } else {
        loadProjects();
      }
    }
  }, [isOpen, currentStudent]);

  if (!isOpen) return null;

  const handleSaveCurrentProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentStudent) {
      onRequireAuth();
      return;
    }
    if (!saveTitle.trim()) return;

    setIsSaving(true);
    const newProject: CodingProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studentId: currentStudent.studentId,
      studentName: currentStudent.studentName,
      studentEmail: currentStudent.studentEmail,
      title: saveTitle.trim(),
      description: saveDescription.trim(),
      files: currentFiles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveCodingProject(newProject);
      setSuccessMsg(`Project "${newProject.title}" saved to Cloud! Accessible from any device.`);
      setSaveTitle('');
      setSaveDescription('');
      setShowSaveForm(false);
      await loadProjects();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Failed to save project:', err);
      setSuccessMsg(`Saved locally: ${err.message || 'Offline fallback active'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentStudent || !projectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCodingProject(projectToDelete.id, currentStudent.studentId);
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      const deletedName = projectToDelete.title;
      setProjectToDelete(null);
      setSuccessMsg(`Project "${deletedName}" has been permanently deleted.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error('Failed to delete project:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0b1739] border border-white/15 rounded-2xl w-full max-w-3xl h-[80vh] shadow-2xl overflow-hidden text-white flex flex-col relative"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0F2557]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4A017] rounded-xl text-[#0F2557]">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                My Saved Projects
                {currentStudent && (
                  <span className="text-xs text-[#D4A017] font-normal">
                    ({currentStudent.studentName})
                  </span>
                )}
              </h2>
              <p className="text-xs text-white/60">
                Permanently saved practice files and homework assignments
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#071126] border-b border-white/10">
          <div className="text-xs text-white/60">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'} saved
          </div>
          <button
            onClick={() => setShowSaveForm(!showSaveForm)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-xs transition-transform active:scale-95 cursor-pointer"
          >
            {showSaveForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showSaveForm ? 'Cancel Save' : 'Save Current Code As New Project'}</span>
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SAVE FORM */}
          {showSaveForm && (
            <form onSubmit={handleSaveCurrentProject} className="p-4 rounded-xl bg-white/5 border border-[#D4A017]/40 space-y-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Save className="w-4 h-4 text-[#D4A017]" />
                Save Current Editor Work
              </h3>
              <div>
                <label className="block text-xs text-white/70 mb-1">Project Title *</label>
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="e.g. Lesson 2 Exercise - My Portfolio Page"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-xs placeholder-white/30 focus:outline-none focus:border-[#D4A017]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Notes / Description (Optional)</label>
                <input
                  type="text"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="e.g. Practicing CSS grid and media queries"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-xs placeholder-white/30 focus:outline-none focus:border-[#D4A017]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSaveForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Permanently'}</span>
                </button>
              </div>
            </form>
          )}

          {/* PROJECT LIST */}
          {loading ? (
            <div className="text-center py-12 text-white/40 text-xs">
              Loading your saved projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <FolderOpen className="w-10 h-10 mx-auto text-white/20" />
              <p className="text-sm font-semibold text-white/70">No saved projects yet</p>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                Write code in the editor, then click "Save Current Code As New Project" to store your progress permanently.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 flex flex-col justify-between gap-3 group transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-white group-hover:text-[#D4A017] transition-colors line-clamp-1">
                        {proj.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setProjectToDelete(proj)}
                        className="text-white/30 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {proj.description && (
                      <p className="text-xs text-white/60 mt-1 line-clamp-2">
                        {proj.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-3 text-[11px] text-white/40">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(proj.updatedAt || proj.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <FileCode className="w-3 h-3" />
                        {proj.files['index.html'] ? `${proj.files['index.html'].length} chars` : 'empty'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onLoadProject(proj);
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 hover:bg-[#D4A017] text-white hover:text-[#0F2557] font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <span>Open in Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DELETE CONFIRMATION MODAL OVERLAY */}
        <AnimatePresence>
          {projectToDelete && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="bg-[#0b1739] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-white"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex-shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-white">Delete Saved Project?</h3>
                    <p className="text-xs text-white/70 mt-1 leading-relaxed">
                      Are you sure you want to delete <span className="font-semibold text-amber-300">"{projectToDelete.title}"</span>?
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60">
                  <span className="text-rose-300 font-semibold">Warning:</span> This action cannot be undone. All saved HTML, CSS, and JavaScript files associated with this project will be permanently erased.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setProjectToDelete(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Project'}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
