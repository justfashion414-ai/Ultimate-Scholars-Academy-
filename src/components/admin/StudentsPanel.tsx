import { useState, useEffect, FormEvent } from 'react';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { fetchStudents, updateApprovedStudent, addApprovedStudent, deleteApprovedStudent } from '../../lib/firebaseService';
import { Student } from '../../types';
import { handleUploadImageFile } from './adminUtils';

interface StudentsPanelProps {
  onDataChange: () => void;
  refreshKey?: number;
}

export default function StudentsPanel({ onDataChange, refreshKey = 0 }: StudentsPanelProps) {
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [studentForm, setStudentForm] = useState<Partial<Student>>({
    name: '',
    nickname: '',
    image: '',
    favoriteMemory: '',
    messageToClassmates: '',
    aspirations: '',
    house: 'Blue House (Sovereigns)'
  });

  const loadStudents = async () => {
    setLoading(true);
    try {
      const list = await fetchStudents();
      setStudentsList(list);
    } catch (err) {
      console.error("Error loading students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [refreshKey]);

  const handleSaveStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.image) {
      alert("Name and Portrait Image are required.");
      return;
    }

    setActionLoading(true);
    try {
      if (studentForm.id) {
        await updateApprovedStudent(studentForm as Student);
      } else {
        const targetId = `student-${Date.now()}`;
        await addApprovedStudent({
          ...studentForm,
          id: targetId
        } as Student);
      }
      setStudentForm({
        name: '',
        nickname: '',
        image: '',
        favoriteMemory: '',
        messageToClassmates: '',
        aspirations: '',
        house: 'Blue House (Sovereigns)'
      });
      loadStudents();
      onDataChange();
    } catch (err: any) {
      alert("Error saving student profile: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-left">
      {loading && (
        <div className="text-center py-4 text-xs font-mono text-[#D4A017] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Synchronizing student list...</span>
        </div>
      )}

      <div className="bg-[#050E22]/60 p-6 rounded-2xl border border-white/5">
        <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {studentForm.id ? "Edit Student Profile" : "Register / Add Student Profile"}
        </h4>
        <form onSubmit={handleSaveStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Name</label>
            <input 
              type="text"
              required
              value={studentForm.name || ''}
              onChange={(e) => setStudentForm(prev => ({...prev, name: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Ebuka Obi-Uchendu"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Nickname</label>
            <input 
              type="text"
              value={studentForm.nickname || ''}
              onChange={(e) => setStudentForm(prev => ({...prev, nickname: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Star Boy"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Portrait Photo</label>
            <input 
              type="file"
              accept="image/*"
              required={!studentForm.image}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    setActionLoading(true);
                    const url = await handleUploadImageFile(file);
                    setStudentForm(prev => ({...prev, image: url}));
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setActionLoading(false);
                  }
                }
              }}
              className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20"
            />
            {studentForm.image && (
              <img src={studentForm.image} className="w-16 h-20 object-cover rounded border border-white/10 mt-1" />
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">House Color</label>
            <select
              value={studentForm.house || 'Blue House (Sovereigns)'}
              onChange={(e) => setStudentForm(prev => ({...prev, house: e.target.value as any}))}
              className="w-full px-3 py-2 bg-[#050E22] border border-white/10 rounded-xl text-xs text-white"
            >
              <option value="Blue House (Sovereigns)">Blue House (Sovereigns)</option>
              <option value="Red House (Challengers)">Red House (Challengers)</option>
              <option value="Green House (Champions)">Green House (Champions)</option>
              <option value="Yellow House (Leaders)">Yellow House (Leaders)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Favorite Yearbook Memory</label>
            <input 
              type="text"
              value={studentForm.favoriteMemory || ''}
              onChange={(e) => setStudentForm(prev => ({...prev, favoriteMemory: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Winning the inter-house debate tournament"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Future Aspirations</label>
            <input 
              type="text"
              value={studentForm.aspirations || ''}
              onChange={(e) => setStudentForm(prev => ({...prev, aspirations: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              placeholder="e.g. Computer Science at MIT"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Message To Classmates</label>
            <textarea 
              rows={3}
              value={studentForm.messageToClassmates || ''}
              onChange={(e) => setStudentForm(prev => ({...prev, messageToClassmates: e.target.value}))}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-sans"
              placeholder="Write an inspirational note or farewell message to your graduating classmates..."
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            {studentForm.id && (
              <button 
                type="button" 
                onClick={() => setStudentForm({
                  name: '', nickname: '', image: '', favoriteMemory: '', messageToClassmates: '', aspirations: '', house: 'Blue House (Sovereigns)'
                })}
                className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
            <button 
              type="submit" 
              disabled={actionLoading}
              className="py-2 px-6 rounded-xl bg-[#D4A017] hover:bg-[#b58814] disabled:opacity-50 text-[#0F2557] font-bold text-xs cursor-pointer shadow-md flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{studentForm.id ? "Update Profile" : "Register Profile Live"}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Graduating Class Roll ({studentsList.length})</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {studentsList.map(st => (
            <div key={st.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex gap-4 relative hover:border-[#D4A017]/45 transition-all group">
              <img src={st.image} className="w-16 h-20 object-cover rounded-lg border border-white/10 bg-black/20" referrerPolicy="no-referrer" />
              <div className="space-y-1 text-xs truncate text-left">
                <p className="font-serif font-bold text-white truncate">{st.name}</p>
                <p className="text-[#D4A017] font-mono text-[9px] truncate">"{st.nickname || 'Star Graduand'}"</p>
                <p className="text-white/40 text-[9px] uppercase tracking-wider font-mono truncate">{st.house}</p>
                {st.aspirations && <p className="text-[#D4A017]/85 text-[9px] truncate">🎯 {st.aspirations}</p>}
              </div>

              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setStudentForm(st)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-[#D4A017] rounded-lg border border-white/5 cursor-pointer shadow"
                  title="Edit Student"
                >
                  <Edit2 size={11} />
                </button>
                <button 
                  onClick={async () => {
                    if (confirm(`Are you sure you want to permanently delete student profile "${st.name}"?`)) {
                      try {
                        setActionLoading(true);
                        await deleteApprovedStudent(st.id, st.image);
                        loadStudents();
                        onDataChange();
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setActionLoading(false);
                      }
                    }
                  }}
                  className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-500/20 cursor-pointer shadow"
                  title="Delete Student"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
