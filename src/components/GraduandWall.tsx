import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, User, Award, BookOpen, Heart, X, Sparkles, Camera, Loader2, Plus, Check, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Student } from '../types';
import { fetchStudents, submitToModeration, deleteApprovedStudent } from '../lib/firebaseService';
import { compressImage } from '../lib/imageCompressor';

export default function GraduandWall({ 
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
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [filterHouse, setFilterHouse] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  
  // Custom titles subscription
  const [sectionTitle, setSectionTitle] = useState("The SS3 Class of 2026");
  const [sectionSubtitle, setSectionSubtitle] = useState("Click on any graduand's portrait to flip open their profile page, favorite memories, and parting messages.");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "titles"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().graduands || {};
        if (data.title) setSectionTitle(data.title);
        if (data.subtitle) setSectionSubtitle(data.subtitle);
      }
    });
    return () => unsub();
  }, []);

  // Add graduand states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    nickname: '',
    house: 'Blue House (Sovereigns)',
    aspirations: '',
    favoriteMemory: '',
    messageToClassmates: '',
    image: ''
  });

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [successBannerMsg, setSuccessBannerMsg] = useState('');
  const [selectedPortraitFile, setSelectedPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string>('');

  // Replace portrait states
  const [selectedReplacementFile, setSelectedReplacementFile] = useState<File | null>(null);
  const [replacementPreview, setReplacementPreview] = useState<string>('');
  const [isSubmittingReplacement, setIsSubmittingReplacement] = useState(false);

  // Reset replacement state on opening/closing student modal
  useEffect(() => {
    setSelectedReplacementFile(null);
    if (replacementPreview) {
      URL.revokeObjectURL(replacementPreview);
      setReplacementPreview('');
    }
    setUploadError('');
  }, [selectedStudent]);

  const houses = ['All', 'Blue House (Sovereigns)', 'Red House (Challengers)', 'Green House (Champions)', 'Yellow House (Leaders)'];

  // Load from Firebase Firestore on mount or when admin updates data
  useEffect(() => {
    fetchStudents()
      .then(data => {
        setStudents(data);
      })
      .catch(err => {
        console.error("Error loading students data from Firestore:", err);
      });
  }, [refreshKey]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedStudent(null);
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleImageError = (id: string) => {
    setFailedImages(prev => ({ ...prev, [id]: true }));
  };

  // Select Portrait for Replacement (Local state holding only)
  const handlePortraitUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be smaller than 5MB");
      return;
    }

    setUploadError("");
    if (replacementPreview) {
      URL.revokeObjectURL(replacementPreview);
    }
    
    setSelectedReplacementFile(file);
    setReplacementPreview(URL.createObjectURL(file as any));
  };

  // Submit the portrait replacement to Cloudinary and moderation
  const handleSubmitReplacementPortrait = async (studentId: string) => {
    if (!selectedReplacementFile) return;

    setIsSubmittingReplacement(true);
    setUploadError("");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;

        try {
          // Compress the image client-side to prevent payload size errors and optimize speed
          const base64data = await compressImage(rawBase64);
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file: base64data,
              filename: selectedReplacementFile.name
            }),
          });

          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const textError = await response.text();
            if (response.status === 413) {
              throw new Error("The image file is too large. Please select a smaller photo.");
            } else {
              throw new Error(`Server error (${response.status}): ${textError.substring(0, 100)}`);
            }
          }

          const data = await response.json();
          if (response.ok && data.success) {
            // Register a pending submission with Firestore for admin review
            const result = await submitToModeration('student_portrait_update', {
              studentId: studentId,
              image: data.url
            });

            if (result.success) {
              setSelectedReplacementFile(null);
              if (replacementPreview) {
                URL.revokeObjectURL(replacementPreview);
                setReplacementPreview('');
              }
              setSuccessBannerMsg("Your proposed portrait replacement has been uploaded and sent to the Admin Gatekeeper for approval!");
              setShowSuccessBanner(true);
              setSelectedStudent(null); // close student modal
              setTimeout(() => setShowSuccessBanner(false), 6000);
            } else {
              setUploadError("Failed to submit portrait change request to admin.");
            }
          } else {
            setUploadError(data.error || "Upload failed.");
          }
        } catch (err) {
          console.error("Upload failed:", err);
          setUploadError("Network error. Upload failed.");
        } finally {
          setIsSubmittingReplacement(false);
        }
      };
      reader.readAsDataURL(selectedReplacementFile);
    } catch (err) {
      setUploadError("Failed to read file.");
      setIsSubmittingReplacement(false);
    }
  };

  // Upload Portrait for "New Student Form"
  const handleNewStudentPortraitUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be smaller than 5MB");
      return;
    }

    setUploadError("");
    if (portraitPreview) {
      URL.revokeObjectURL(portraitPreview);
    }
    
    setSelectedPortraitFile(file);
    setPortraitPreview(URL.createObjectURL(file as any));
  };

  // Add a brand-new student to server pending table
  const handleAddStudentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!newStudent.name.trim()) {
      setUploadError("Please provide a name.");
      return;
    }
    if (!selectedPortraitFile) {
      setUploadError("Please select a portrait image first.");
      return;
    }

    setUploading(true);
    let finalImageUrl = "";
    try {
      // Upload portrait to Cloudinary
      finalImageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const rawBase64 = reader.result as string;
          try {
            // Compress the image client-side to keep under payload limit and optimize performance
            const base64data = await compressImage(rawBase64);
            const response = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file: base64data, filename: selectedPortraitFile.name })
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              const textError = await response.text();
              if (response.status === 413) {
                reject(new Error("The image file is too large. Please select a smaller photo."));
              } else {
                reject(new Error(`Server error during upload (${response.status}): ${textError.substring(0, 100)}`));
              }
              return;
            }

            const data = await response.json();
            if (response.ok && data.success) {
              resolve(data.url);
            } else {
              reject(new Error(data.error || "Upload failed."));
            }
          } catch (err: any) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsDataURL(selectedPortraitFile);
      });

      const submissionData = {
        name: newStudent.name.trim(),
        nickname: newStudent.nickname.trim() || "Graduand",
        image: finalImageUrl,
        favoriteMemory: newStudent.favoriteMemory.trim() || "Graduation and our final class assembly.",
        messageToClassmates: newStudent.messageToClassmates.trim() || "Stay focused, work hard, and never stop dreaming!",
        aspirations: newStudent.aspirations.trim() || "Leader of Tomorrow",
        house: newStudent.house
      };

      const result = await submitToModeration('student_add', submissionData);

      if (result.success) {
        // Reset and close
        setNewStudent({
          name: '',
          nickname: '',
          house: 'Blue House (Sovereigns)',
          aspirations: '',
          favoriteMemory: '',
          messageToClassmates: '',
          image: ''
        });
        setSelectedPortraitFile(null);
        if (portraitPreview) {
          URL.revokeObjectURL(portraitPreview);
          setPortraitPreview('');
        }
        setIsAddModalOpen(false);

        setSuccessBannerMsg("Your graduand registration has been sent to the Admin Gatekeeper! Once approved, you will join the wall.");
        setShowSuccessBanner(true);
        setTimeout(() => setShowSuccessBanner(false), 8000);
      } else {
        setUploadError("Failed to submit profile registration to admin.");
      }
    } catch (err: any) {
      console.error("Submission failed:", err);
      setUploadError(err.message || "Network error. Failed to send registration.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStudentClick = async (student: Student) => {
    if (confirm(`Are you sure you want to permanently delete graduand "${student.name}" from the album? This will also remove their portrait from Cloudinary.`)) {
      try {
        await deleteApprovedStudent(student.id, student.image);
        if (onDataChange) onDataChange();
      } catch (err) {
        console.error("Failed to delete student:", err);
        alert("Failed to delete this approved graduand.");
      }
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesHouse = filterHouse === 'All' || student.house === filterHouse;
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (student.aspirations && student.aspirations.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesHouse && matchesSearch;
  });

  const displayStudents = isPreview ? students.slice(0, 3) : filteredStudents;

  return (
    <div className={!isPreview ? "min-h-screen bg-[#0F2557] text-white" : ""}>
      {/* HEADER NAVBAR (ONLY ON FULL SUB-PAGE) */}
      {!isPreview && (
        <nav className="bg-[#050E22]/80 border-b border-[#D4A017]/20 py-4 sticky top-0 z-40 shadow-md backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#D4A017] text-[#0F2557] flex items-center justify-center font-bold text-sm">S</span>
              <span className="font-sans font-bold text-white text-sm md:text-base">Scholars Academy</span>
            </Link>
            <Link 
              to="/"
              className="text-xs md:text-sm font-semibold text-white hover:text-[#D4A017] transition-all flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back to Campus Landing
            </Link>
          </div>
        </nav>
      )}

      <section className="py-20 px-4 md:px-8 bg-[#0F2557] border-t border-[#D4A017]/20 animate-fade-in" id="graduand-wall">
        <div className="max-w-7xl mx-auto">
          
          {/* SECTION HEADER */}
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 rounded-full bg-[#D4A017]/15 border border-[#D4A017]/30 text-[#D4A017] text-xs font-mono tracking-wider uppercase mb-3">
              Primary Gallery
            </span>
            <h2 className="text-3xl md:text-5xl font-serif text-white font-bold tracking-tight mb-2">
              {sectionTitle}
            </h2>
            <div className="w-16 h-1 bg-[#D4A017] mx-auto mb-4" />
            <p className="text-white/85 text-base md:text-lg max-w-2xl mx-auto leading-relaxed italic">
              {sectionSubtitle}
            </p>
          </div>

          {/* SUCCESS NOTIFICATION BANNER */}
          <AnimatePresence>
            {showSuccessBanner && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="max-w-5xl mx-auto mb-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 font-medium text-xs md:text-sm flex items-center gap-3 shadow-lg"
              >
                <Check className="w-5 h-5 text-emerald-400 shrink-0 bg-emerald-500/20 p-1 rounded-full border border-emerald-400/30" />
                <span>{successBannerMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CONTROLS: HOUSE FILTER, SEARCH, AND ADD BUTTON */}
          {!isPreview && (
            <div className="bg-[#050E22]/60 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-xl border border-[#D4A017]/20 mb-8 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* SEARCH */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-white/40" />
                <input 
                  type="text" 
                  placeholder="Search by name, nickname..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] bg-black/30 text-white placeholder-white/40"
                  id="graduand-search-input"
                />
              </div>

              {/* HOUSE SELECTOR TAB/CHIPS */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {houses.map((house) => {
                  const isActive = filterHouse === house;
                  const displayName = house === 'All' ? 'All Houses' : house.split(' ')[0];
                  
                  return (
                    <button
                      key={house}
                      onClick={() => setFilterHouse(house)}
                      id={`btn-filter-${house.replace(/\s+/g, '-').toLowerCase()}`}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-[#D4A017] border-[#D4A017] text-[#0F2557] shadow-sm' 
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      {displayName}
                    </button>
                  );
                })}
              </div>

              {/* ADD GRADUAND BUTTON - ONLY AVAILABLE FOR ADMINS VIA CLEANUP MODE OR IN ADMIN PANEL */}
              {cleanUpMode && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1.5 bg-[#D4A017] hover:bg-[#D4A017]/90 text-[#0F2557] font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Join Album (Add Graduand)
                </button>
              )}

            </div>
          )}

          {/* GRID LAYOUT */}
          {displayStudents.length === 0 ? (
            <div className="text-center py-12 bg-black/20 rounded-2xl border border-white/10 shadow-sm max-w-md mx-auto">
              <User className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/70 font-medium font-serif">No graduands match your search criteria.</p>
              <button 
                onClick={() => { setFilterHouse('All'); setSearchQuery(''); }}
                className="mt-3 text-xs text-[#D4A017] underline font-bold cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayStudents.map((student, idx) => {
              const isImageFailed = failedImages[student.id];
              const isSearchOrFilterActive = searchQuery !== '' || filterHouse !== 'All';
              // Featured layout for featured students (only when no active filter)
              const isFeatured = !isSearchOrFilterActive && (student.id === 'stud-1' || student.id === 'stud-8');

              if (isFeatured) {
                return (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.5, delay: Math.min(idx * 0.05, 0.4) }}
                    className={`md:col-span-2 md:row-span-2 rounded-2xl p-5 md:p-6 flex flex-col justify-between hover:shadow-2xl transition-all duration-300 cursor-pointer group hover:border-[#D4A017]/80 relative min-h-[380px] ${
                      cleanUpMode
                        ? 'bg-rose-950/15 border-2 border-rose-500 hover:border-rose-400'
                        : 'bg-[#050E22]/80 border-2 border-[#D4A017]'
                    }`}
                    onClick={() => {
                      if (cleanUpMode) {
                        handleDeleteStudentClick(student);
                      } else {
                        setSelectedStudent(student);
                      }
                    }}
                  >
                    {cleanUpMode ? (
                      <div className="absolute top-4 right-4 text-[10px] bg-rose-600 text-white font-bold font-mono uppercase px-2.5 py-1 rounded shadow animate-pulse flex items-center gap-1 z-10">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </div>
                    ) : (
                      <div className="absolute top-4 right-4 text-[10px] text-[#D4A017] font-bold font-mono uppercase border border-[#D4A017]/40 px-2.5 py-1 bg-[#050E22] rounded shadow">
                        {student.id === 'stud-1' ? 'Class Captain' : 'Head Girl'}
                      </div>
                    )}

                    <div className="flex-grow flex flex-col sm:flex-row gap-5 mb-4 mt-6">
                      <div className="w-full sm:w-1/2 aspect-[4/5] rounded-xl overflow-hidden border border-white/10 bg-black/40 relative shrink-0">
                        {isImageFailed ? (
                          <div className="w-full h-full bg-gradient-to-br from-[#0F2557] to-[#1e3d7a] flex flex-col items-center justify-center text-[#D4A017] font-serif font-extrabold text-3xl">
                            <span>{student.name.split(' ').map(n => n[0]).join('')}</span>
                          </div>
                        ) : (
                          <img
                             src={student.image}
                             alt={student.name}
                             referrerPolicy="no-referrer"
                             className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                             onError={() => handleImageError(student.id)}
                             loading="lazy"
                           />
                        )}
                        <span className="absolute bottom-2 left-2 text-[9px] font-mono bg-black/70 px-2 py-0.5 rounded text-[#D4A017]">
                          {student.house.split(' ')[0]}
                        </span>
                      </div>

                      <div className="flex-grow flex flex-col justify-center text-left">
                        <span className="text-[10px] text-[#D4A017] font-mono tracking-widest uppercase">Set Dignitary</span>
                        <h3 className="serif text-2xl font-bold text-white group-hover:text-[#D4A017] transition-colors">{student.name}</h3>
                        <p className="sans text-sm text-[#D4A017]/80 font-serif italic mb-3">"{student.nickname}"</p>
                        <p className="sans text-xs text-white/70 leading-relaxed mb-4 italic line-clamp-4">
                          "{student.favoriteMemory}"
                        </p>
                        {student.aspirations && (
                          <div className="text-white/60 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 mt-auto">
                            <Sparkles className="w-3.5 h-3.5 text-[#D4A017]" />
                            <span>Future {student.aspirations}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-4 flex justify-between items-center text-[10px] text-white/50 font-mono">
                      <span>SCHOLARS ACADEMY • VALEDICTORIAN</span>
                      <span className={`font-bold ${cleanUpMode ? 'text-rose-400 animate-pulse' : 'text-[#D4A017] group-hover:underline'}`}>
                        {cleanUpMode ? '❌ PERMANENTLY DELETE' : 'VIEW PROFILE ➔'}
                      </span>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: Math.min(idx * 0.05, 0.4) }}
                  className={`border rounded-xl p-4 flex flex-col items-center justify-between text-center hover:shadow-lg transition-all duration-300 cursor-pointer group relative ${
                    cleanUpMode
                      ? 'bg-rose-950/15 border-rose-500 hover:border-rose-400'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#D4A017]/30'
                  }`}
                  onClick={() => {
                    if (cleanUpMode) {
                      handleDeleteStudentClick(student);
                    } else {
                      setSelectedStudent(student);
                    }
                  }}
                >
                  <div className="w-full flex justify-between items-center mb-3">
                    <span className={`text-[8px] font-mono px-2 py-0.5 rounded ${
                      student.house.includes('Blue') ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20' :
                      student.house.includes('Red') ? 'bg-red-500/15 text-red-300 border border-red-500/20' :
                      student.house.includes('Green') ? 'bg-green-500/15 text-green-300 border border-green-500/20' :
                      'bg-yellow-500/15 text-yellow-300 border border-yellow-500/20'
                    }`}>
                      {student.house.split(' ')[0]}
                    </span>
                    {cleanUpMode ? (
                      <Trash2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                    ) : (
                      <Award className="w-3.5 h-3.5 text-white/20 group-hover:text-[#D4A017] transition-colors" />
                    )}
                  </div>

                  <div className="w-24 h-24 rounded-full overflow-hidden border border-white/10 bg-[#050E22] mb-3 shrink-0 relative group-hover:scale-105 transition-transform duration-300">
                    {isImageFailed ? (
                      <div className="w-full h-full bg-gradient-to-br from-[#0F2557] to-[#1e3d7a] flex items-center justify-center text-[#D4A017] font-serif font-bold text-lg">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    ) : (
                      <img
                        src={student.image}
                        alt={student.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover filter brightness-95"
                        onError={() => handleImageError(student.id)}
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div className="flex-grow flex flex-col justify-center">
                    <h4 className="serif text-sm font-semibold text-white group-hover:text-[#D4A017] transition-colors line-clamp-1">{student.name}</h4>
                    <p className="sans text-[10px] text-[#D4A017] font-serif italic mb-1">"{student.nickname}"</p>
                    {student.aspirations && (
                      <p className="sans text-[9px] text-white/50 uppercase tracking-wider font-mono line-clamp-1 mt-1">
                        Future {student.aspirations.split(' & ')[0]}
                      </p>
                    )}
                  </div>

                  <div className="w-full border-t border-white/5 pt-2.5 mt-3 text-[9px] font-mono tracking-widest uppercase transition-colors">
                    {cleanUpMode ? (
                      <span className="text-rose-400 font-bold animate-pulse">❌ CLICK TO DELETE</span>
                    ) : (
                      <span className="text-white/40 group-hover:text-[#D4A017]">View profile</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* VIEW FULL ALBUM BUTTON (ONLY FOR PREVIEW) */}
        {isPreview && (
          <div className="text-center mt-12">
            <Link
              to="/graduands"
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#D4A017] hover:bg-[#b58814] text-[#0F2557] rounded-full text-sm font-semibold shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer font-sans"
            >
              <span>View Full 2026 Class Album</span>
            </Link>
          </div>
        )}

        {/* DETAILED STUDENT CARD DIALOG WITH PORTRAIT UPLOAD OPTION */}
        <AnimatePresence>
          {selectedStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-10">
              {/* BACKDROP */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[#050E22]/90 backdrop-blur-md"
                onClick={() => setSelectedStudent(null)}
              />

              {/* CARD DIALOG CONTENT */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-[#0F2557] rounded-3xl overflow-hidden shadow-2xl max-w-3xl w-full z-10 border border-[#D4A017]/30 max-h-[90vh] flex flex-col md:flex-row text-white"
              >
                {/* CLOSE BUTTON */}
                <button
                  onClick={() => setSelectedStudent(null)}
                  id="btn-close-student-modal"
                  className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
                  aria-label="Close details"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* LEFT: IMAGE AND PORTRAIT CHANGER */}
                <div className="w-full md:w-5/12 relative aspect-[4/5] md:aspect-auto bg-slate-900 shrink-0 flex flex-col justify-end">
                  {failedImages[selectedStudent.id] && !replacementPreview ? (
                    <div className="w-full h-full bg-gradient-to-br from-[#0F2557] to-[#1e3d7a] flex flex-col items-center justify-center text-[#D4A017] font-serif font-extrabold text-5xl p-8">
                      <span>{selectedStudent.name.split(' ').map(n => n[0]).join('')}</span>
                      <span className="text-xs font-mono tracking-widest mt-3 uppercase text-white/50">Scholars Academy</span>
                    </div>
                  ) : (
                    <img
                      src={replacementPreview || selectedStudent.image}
                      alt={selectedStudent.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover absolute inset-0"
                    />
                  )}
                  
                  {/* DIRECT CLOUDINARY PORTRAIT PORTAL */}
                  <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 items-start">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-[10px] font-mono uppercase tracking-wider font-bold hover:bg-[#D4A017] hover:text-[#0F2557] transition-all cursor-pointer border border-[#D4A017]/30 shadow-lg">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{selectedReplacementFile ? "Change Selected" : "Replace Portrait"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePortraitUpload}
                      />
                    </label>

                    {selectedReplacementFile && (
                      <button
                        onClick={() => handleSubmitReplacementPortrait(selectedStudent.id)}
                        disabled={isSubmittingReplacement}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-mono uppercase tracking-wider font-bold hover:bg-emerald-500 transition-all cursor-pointer shadow-lg border border-emerald-400"
                      >
                        {isSubmittingReplacement ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Submit to Admin</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* BOTTOM BLACK STRIPE */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 pt-16 pointer-events-none" />
                  <div className="relative p-6 z-10">
                    <span className="text-[#D4A017] font-mono text-[9px] tracking-widest uppercase">OFFICIAL PORTRAIT</span>
                    <h4 className="text-white font-serif text-2xl font-bold leading-tight">{selectedStudent.name}</h4>
                    <p className="text-white/70 font-mono text-xs mt-1 italic">"{selectedStudent.nickname}"</p>
                  </div>
                </div>

                {/* RIGHT: DEEP DETAILS */}
                <div className="w-full md:w-7/12 p-6 md:p-8 overflow-y-auto max-h-[50vh] md:max-h-[90vh] flex flex-col justify-between">
                  <div>
                    {/* META BADGES */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-mono uppercase tracking-wider font-semibold">
                        {selectedStudent.house}
                      </span>
                      {selectedStudent.aspirations && (
                        <span className="px-3 py-1 rounded-full bg-[#D4A017]/10 border border-[#D4A017]/30 text-[#D4A017] text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#D4A017]" />
                          {selectedStudent.aspirations}
                        </span>
                      )}
                    </div>

                    {uploadError && (
                      <div className="mb-4 text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl text-xs font-mono">
                        {uploadError}
                      </div>
                    )}

                    {/* FAVORITE MEMORY */}
                    <div className="mb-6">
                      <h5 className="text-white/50 font-mono text-[10px] tracking-wider uppercase mb-1.5 flex items-center gap-1.5 font-bold">
                        <BookOpen className="w-3.5 h-3.5 text-[#D4A017]" />
                        FAVORITE SCHOOL MEMORY
                      </h5>
                      <p className="text-white/95 font-serif leading-relaxed text-sm md:text-base border-l-2 border-[#D4A017] pl-3 italic bg-black/20 py-2 rounded-r-lg">
                        "{selectedStudent.favoriteMemory}"
                      </p>
                    </div>

                    {/* CLASSMATE MESSAGE */}
                    <div className="mb-6">
                      <h5 className="text-white/50 font-mono text-[10px] tracking-wider uppercase mb-1.5 flex items-center gap-1.5 font-bold">
                        <Heart className="w-3.5 h-3.5 text-red-400" />
                        MESSAGE TO CLASSMATES
                      </h5>
                      <p className="text-white/80 leading-relaxed text-sm font-serif italic">
                        "{selectedStudent.messageToClassmates}"
                      </p>
                    </div>
                  </div>

                  {/* DECORATIVE FOOTER */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between mt-4">
                    <span className="text-[10px] text-white/40 font-mono">SCHOLARS ACADEMY • VALEDICTORIAN</span>
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="text-xs font-bold font-serif text-[#D4A017] hover:underline cursor-pointer"
                    >
                      Close Profile
                    </button>
                  </div>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ADD NEW STUDENT DIALOG */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-10">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[#050E22]/90 backdrop-blur-md"
                onClick={() => setIsAddModalOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-[#0F2557] rounded-3xl overflow-hidden shadow-2xl max-w-xl w-full z-10 border border-[#D4A017]/30 text-white p-6 md:p-8"
              >
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <h3 className="text-2xl font-serif font-bold text-[#D4A017] mb-2 flex items-center gap-2">
                  <Plus className="w-6 h-6" />
                  Add Yourself to the Album
                </h3>
                <p className="text-white/70 text-xs font-mono mb-6 uppercase tracking-wider">
                  Upload your photo and record your high school memories!
                </p>

                <form onSubmit={handleAddStudentSubmit} className="space-y-4">
                  {/* PORTRAIT PHOTO UPLOAD */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-white/65 font-bold mb-1.5">
                      Portrait Photo (Required)
                    </label>
                    
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-4 bg-black/20 hover:bg-black/30 hover:border-[#D4A017]/30 transition-all relative cursor-pointer min-h-[140px]">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleNewStudentPortraitUpload}
                        disabled={uploading}
                      />
                      
                      {uploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-8 h-8 text-[#D4A017] animate-spin mb-2" />
                          <span className="text-xs text-white/60 font-mono">Uploading portrait to cloud...</span>
                        </div>
                      ) : portraitPreview ? (
                        <div className="flex items-center gap-3 w-full">
                          <div className="w-16 h-16 rounded-full overflow-hidden border border-[#D4A017]/40 shrink-0">
                            <img src={portraitPreview} alt="Selected portrait" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                          <div className="text-left">
                            <span className="text-xs text-[#D4A017] font-mono font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Portrait Selected!
                            </span>
                            <span className="text-[10px] text-white/40 block mt-0.5 font-mono">Ready to submit</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center">
                          <Camera className="w-8 h-8 text-white/40 mb-2" />
                          <span className="text-xs text-white/60 font-mono">Upload Graduand Portrait</span>
                          <span className="text-[10px] text-white/40 mt-1">PNG, JPG up to 5MB</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DETAILS */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-white/65 font-bold mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Adebayo Benson"
                        value={newStudent.name}
                        onChange={e => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-white/65 font-bold mb-1">
                        Nickname
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Benji"
                        value={newStudent.nickname}
                        onChange={e => setNewStudent(prev => ({ ...prev, nickname: e.target.value }))}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-white/65 font-bold mb-1">
                        House Wear Group
                      </label>
                      <select
                        value={newStudent.house}
                        onChange={e => setNewStudent(prev => ({ ...prev, house: e.target.value }))}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white"
                      >
                        <option value="Blue House (Sovereigns)">Blue House (Sovereigns)</option>
                        <option value="Red House (Challengers)">Red House (Challengers)</option>
                        <option value="Green House (Champions)">Green House (Champions)</option>
                        <option value="Yellow House (Leaders)">Yellow House (Leaders)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-white/65 font-bold mb-1">
                        Aspirations
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Neurosurgeon"
                        value={newStudent.aspirations}
                        onChange={e => setNewStudent(prev => ({ ...prev, aspirations: e.target.value }))}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white"
                      />
                    </div>
                  </div>

                  {/* MEMORIES */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-white/65 font-bold mb-1">
                      Favorite School Memory
                    </label>
                    <textarea
                      placeholder="e.g. The final class party with jollof rice and dancing the Gbese..."
                      rows={2}
                      value={newStudent.favoriteMemory}
                      onChange={e => setNewStudent(prev => ({ ...prev, favoriteMemory: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-white/65 font-bold mb-1">
                      Goodbye Message to Classmates
                    </label>
                    <textarea
                      placeholder="e.g. We came, we saw, we conquered! Stay connected..."
                      rows={2}
                      value={newStudent.messageToClassmates}
                      onChange={e => setNewStudent(prev => ({ ...prev, messageToClassmates: e.target.value }))}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white"
                    />
                  </div>

                  {uploadError && (
                    <p className="text-red-400 text-xs font-mono">{uploadError}</p>
                  )}

                  <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D4A017] hover:bg-[#D4A017]/90 text-[#0F2557] flex items-center gap-1 transition-all shadow-md cursor-pointer"
                    >
                      Save Profile
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </section>
  </div>
  );
}
