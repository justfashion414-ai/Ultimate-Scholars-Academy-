import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Lock, Unlock, Check, X, Loader2, Eye, RefreshCw, LogOut, 
  MessageSquare, UserPlus, Camera, Calendar, CheckCircle2, AlertTriangle, ArrowRight, Video, Play, Trash2,
  Award, Quote, Plus, Edit2, Upload, FileText, Sparkles, Settings, ArrowUp, ArrowDown, BookOpen,
  ChevronLeft, Menu, ArrowLeft
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDocs, collection, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  fetchPendingSubmissions, 
  fetchStudents, 
  approveSubmission, 
  rejectSubmission, 
  PendingSubmission,
  seedDatabaseIfEmpty,
  checkIsAdmin,
  fetchAdmins,
  addAdminUser,
  removeAdminUser,
  addApprovedStudent,
  updateApprovedStudent,
  deleteApprovedStudent,
  fetchSuperlatives,
  addSuperlative,
  deleteApprovedSuperlative,
  fetchPhotos,
  addPhoto,
  deleteApprovedPhoto,
  addApprovedTimelineEvent,
  deleteApprovedTimelineEvent,
  addApprovedVideoMemory,
  deleteApprovedVideoMemory,
  fetchTeacherTributes,
  addTeacherTribute,
  deleteApprovedTeacherTribute,
  fetchSchoolLogo,
  saveSchoolLogo,
  subscribeSchoolLogo,
  saveActiveBannerEvent,
  subscribeActiveBannerEvent,
  addApprovedCustomSection,
  updateApprovedCustomSection,
  deleteApprovedCustomSection
} from '../lib/firebaseService';
import { AdminUser, Student, Superlative, Photo, TimelineEvent, VideoMemory, TeacherTribute, CustomSection } from '../types';
import { compressImage } from '../lib/imageCompressor';

export default function AdminPortal({ 
  onDataChange, 
  refreshKey,
  cleanUpMode = false,
  setCleanUpMode = () => {}
}: { 
  onDataChange: () => void; 
  refreshKey?: number;
  cleanUpMode?: boolean;
  setCleanUpMode?: (val: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('justfashion414@gmail.com');
  const [password, setPassword] = useState('admin2026');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('scholars_admin_session') === 'true';
  });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Dashboard state (Mod queue)
  const [pendingItems, setPendingItems] = useState<PendingSubmission[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [fetchingPending, setFetchingPending] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<Record<string, 'approve' | 'reject' | null>>({});
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Admin tabs & lists
  const [activeTab, setActiveTab] = useState<'queue' | 'students' | 'superlatives' | 'photos' | 'videos' | 'timeline' | 'tributes' | 'admins' | 'settings' | 'custom_sections'>('queue');
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [customSectionsList, setCustomSectionsList] = useState<CustomSection[]>([]);
  const [customSectionForm, setCustomSectionForm] = useState<Partial<CustomSection>>({
    title: '', subtext: '', mediaUrl: '', mediaType: 'none', orderIndex: 0, layoutType: 'standard'
  });
  const [fetchingAdmins, setFetchingAdmins] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [addAdminError, setAddAdminError] = useState('');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  
  // Preview media overlay state
  const [previewMedia, setPreviewMedia] = useState<{
    id: string;
    type: 'video' | 'image';
    url: string;
    title: string;
    submittedBy: string;
    role: string;
  } | null>(null);

  // Other dynamic data states for admin tabs
  const [superlativesList, setSuperlativesList] = useState<Superlative[]>([]);
  const [photosList, setPhotosList] = useState<Photo[]>([]);
  const [videosList, setVideosList] = useState<VideoMemory[]>([]);
  const [timelineList, setTimelineList] = useState<TimelineEvent[]>([]);
  const [tributesList, setTributesList] = useState<TeacherTribute[]>([]);

  // Individual Tab Form Loading States
  const [tabLoading, setTabLoading] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [activeBannerEvent, setActiveBannerEventState] = useState<string>('');
  const [uniqueEventsList, setUniqueEventsList] = useState<string[]>([]);
  const [mobileShowSidebar, setMobileShowSidebar] = useState(false);

  // Trigger high-fidelity preview for a moderation queue item
  const triggerPreview = (item: PendingSubmission) => {
    const data = item.data;
    let mediaUrl = '';
    let mediaType: 'image' | 'video' = 'image';

    if (item.type === 'guestbook') {
      mediaUrl = data.imageUrl || '';
    } else if (item.type === 'student_add') {
      mediaUrl = data.image || '';
    } else if (item.type === 'student_portrait_update') {
      mediaUrl = data.image || '';
    } else if (item.type === 'video_memory') {
      mediaUrl = Array.isArray(data.urls) ? (data.urls[0] || '') : (data.url || '');
      mediaType = 'video';
    } else if (item.type === 'photo') {
      mediaUrl = Array.isArray(data.urls) ? (data.urls[0] || '') : (data.url || '');
    } else if (item.type === 'teacher_tribute') {
      mediaUrl = data.image || '';
    } else if (item.type === 'timeline') {
      mediaUrl = data.image || '';
    }

    if (mediaUrl) {
      const ytId = getYouTubeID(mediaUrl);
      const finalUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : mediaUrl;
      setPreviewMedia({
        id: item.id,
        type: mediaType,
        url: finalUrl,
        title: `${item.type.replace('_', ' ').toUpperCase()} - ${data.name || data.title || 'Submission'}`,
        submittedBy: data.submittedBy || data.name || 'Contributor',
        role: data.role || 'Contributor'
      });
    } else {
      alert("This submission does not contain any visual media to preview. It can be reviewed directly in the queue card.");
    }
  };

  // Form states for adding / editing records
  const [studentForm, setStudentForm] = useState<Partial<Student>>({
    name: '', nickname: '', image: '', favoriteMemory: '', messageToClassmates: '', aspirations: '', house: 'Blue House (Sovereigns)'
  });
  const [superlativeForm, setSuperlativeForm] = useState<Partial<Superlative>>({
    category: '', description: '', studentName: '', studentImage: ''
  });
  const [photoForm, setPhotoForm] = useState<Partial<Photo>>({
    title: '', url: '', submitterName: 'Admin Portal', submitterRole: 'Teacher'
  });
  const [videoForm, setVideoForm] = useState<Partial<VideoMemory>>({
    title: '', url: '', submittedBy: 'Admin Portal', role: 'Teacher', thumbnailUrl: ''
  });
  const [timelineForm, setTimelineForm] = useState<Partial<TimelineEvent>>({
    date: '', title: '', description: '', image: ''
  });
  const [tributeForm, setTributeForm] = useState<Partial<TeacherTribute>>({
    name: '', subject: '', message: '', image: ''
  });

  // Settings & Visibility states
  const [aboutSettings, setAboutSettings] = useState({
    aboutTitle: "About the School",
    aboutSubtitle: "Nurturing Leaders, Inspiring Excellence",
    aboutText: "Scholars Academy was founded with a singular focus: to foster academic brilliance and build character in our students. Over the years, our institution has stood as a beacon of academic achievement, athletic prowess, and strong moral leadership.",
    aboutImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop",
    aboutProprietorName: "Mrs. O. Okafor",
    aboutProprietorRole: "Founder / Proprietor"
  });
  
  const [componentVisibility, setComponentVisibility] = useState<Record<string, boolean>>({
    about: true,
    graduands: true,
    superlatives: true,
    teachers: true,
    photos: true,
    timeline: true,
    videos: true,
    countdown: true,
    guestbook: true,
    closing: true
  });

  const [headerSettings, setHeaderSettings] = useState({
    graduandsTitle: "The SS3 Class of 2026",
    graduandsSubtitle: "Click on any graduand's portrait to flip open their profile page, favorite memories, and parting messages.",
    guestbookTitle: "Memory Sticky Board",
    guestbookSubtitle: "Leave a classic congratulatory message, share a personal inside joke, or write down your wishes for the graduating class.",
    teachersTitle: "Teacher Tributes",
    teachersSubtitle: "Heartfelt parting messages and wisdom shared by our beloved teachers, counselors, and school administrators."
  });

  const [sectionOrder, setSectionOrder] = useState<string[]>([
    "about", "graduands", "superlatives", "teachers", "photos", "timeline", "videos", "countdown", "guestbook", "closing"
  ]);

  // Save About School Settings
  const handleSaveAboutSchool = async (e: FormEvent) => {
    e.preventDefault();
    setTabLoading(true);
    setFeedbackMsg('');
    try {
      await setDoc(doc(db, "settings", "school"), aboutSettings, { merge: true });
      setFeedbackMsg("About the School settings updated successfully!");
      onDataChange();
    } catch (err: any) {
      alert("Error saving About School: " + err.message);
    } finally {
      setTabLoading(false);
    }
  };

  // Upload Proprietor Image
  const handleProprietorImageUpload = async (file: File) => {
    setTabLoading(true);
    try {
      const url = await handleUploadImageFile(file);
      setAboutSettings(prev => ({ ...prev, aboutImage: url }));
      setFeedbackMsg("Proprietor photo uploaded successfully! Be sure to click 'Save About School' to apply.");
    } catch (err: any) {
      alert("Failed to upload image: " + err.message);
    } finally {
      setTabLoading(false);
    }
  };

  // Remove Proprietor Image
  const handleRemoveProprietorImage = () => {
    setAboutSettings(prev => ({ ...prev, aboutImage: null }));
    setFeedbackMsg("Proprietor photo marked for removal. Be sure to click 'Save About School' to apply.");
  };

  // Toggle Visibility
  const handleToggleVisibility = async (key: string, currentValue: boolean) => {
    setTabLoading(true);
    setFeedbackMsg('');
    const nextVal = !currentValue;
    try {
      if (key.startsWith('sect-')) {
        const targetSection = customSectionsList.find(cs => cs.id === key);
        if (targetSection) {
          const updated = { ...targetSection, visible: nextVal };
          await updateApprovedCustomSection(updated);
          setCustomSectionsList(prev => prev.map(cs => cs.id === key ? updated : cs));
        }
      } else {
        const nextVis = { ...componentVisibility, [key]: nextVal };
        setComponentVisibility(nextVis);
        await setDoc(doc(db, "settings", "visibility"), { [key]: nextVal }, { merge: true });
      }
      setFeedbackMsg(`Updated section visibility!`);
      onDataChange();
    } catch (err: any) {
      alert("Error saving visibility: " + err.message);
    } finally {
      setTabLoading(false);
    }
  };

  // Reorder Sections
  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sectionOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    // Swap
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    
    setSectionOrder(newOrder);
    setTabLoading(true);
    setFeedbackMsg('');
    try {
      await setDoc(doc(db, "settings", "order"), { sections: newOrder }, { merge: true });
      setFeedbackMsg("Homepage section arrangement updated successfully!");
      onDataChange();
    } catch (err: any) {
      alert("Error saving layout arrangement: " + err.message);
    } finally {
      setTabLoading(false);
    }
  };

  // Save Section Headers
  const handleSaveHeaders = async (e: FormEvent) => {
    e.preventDefault();
    setTabLoading(true);
    setFeedbackMsg('');
    try {
      await setDoc(doc(db, "settings", "titles"), {
        graduands: {
          title: headerSettings.graduandsTitle,
          subtitle: headerSettings.graduandsSubtitle,
        },
        guestbook: {
          title: headerSettings.guestbookTitle,
          subtitle: headerSettings.guestbookSubtitle,
        },
        teachers: {
          title: headerSettings.teachersTitle,
          subtitle: headerSettings.teachersSubtitle,
        }
      }, { merge: true });
      setFeedbackMsg("Section headers updated successfully!");
      onDataChange();
    } catch (err: any) {
      alert("Error saving section headers: " + err.message);
    } finally {
      setTabLoading(false);
    }
  };

  // Base64 Image Upload Helper
  const handleUploadImageFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const rawBase64 = reader.result as string;
          // Client-side compression to prevent payload limits and optimize bandwidth
          const base64data = await compressImage(rawBase64);
          
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: base64data, filename: file.name })
          });

          // Prevent JSON parser crash if server returns non-JSON (e.g. 413 Payload Too Large HTML error page)
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const textError = await res.text();
            if (res.status === 413) {
              reject(new Error("The image file is too large to process. Please try a smaller file or compress it first."));
            } else {
              reject(new Error(`Server error (${res.status}): ${textError.substring(0, 100)}`));
            }
            return;
          }

          const data = await res.json();
          if (res.ok && data.url) {
            resolve(data.url);
          } else {
            reject(new Error(data.error || "Upload failed. Please check credentials."));
          }
        } catch (err: any) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleUploadVideoFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const rawBase64 = reader.result as string;
          const res = await fetch('/api/upload-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: rawBase64, filename: file.name })
          });
          const data = await res.json();
          if (res.ok && data.url) {
            resolve(data.url);
          } else {
            reject(new Error(data.error || "Video upload failed."));
          }
        } catch (err: any) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isAdminUser = await checkIsAdmin(user.email);
        if (isAdminUser) {
          setIsAuthenticated(true);
          localStorage.setItem('scholars_admin_session', 'true');
          localStorage.setItem('scholars_admin_email', user.email || '');
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('scholars_admin_session');
          localStorage.removeItem('scholars_admin_email');
          await signOut(auth);
          setLoginError(`Access Denied: ${user.email} is not authorized as an administrator.`);
        }
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('scholars_admin_session');
        localStorage.removeItem('scholars_admin_email');
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for 3-clicks logo trigger to automatically open the portal
  useEffect(() => {
    const handleTrigger = () => {
      setIsOpen(true);
    };
    window.addEventListener('trigger-admin-portal', handleTrigger);
    return () => window.removeEventListener('trigger-admin-portal', handleTrigger);
  }, []);

  // Default mobile view to content tab when opened
  useEffect(() => {
    if (isOpen) {
      setMobileShowSidebar(false);
    }
  }, [isOpen]);

  // Sync data based on selected tab
  const refreshTabData = async () => {
    if (!isAuthenticated || !auth.currentUser) return;
    setTabLoading(true);
    setFeedbackMsg('');
    try {
      if (activeTab === 'queue') {
        const pendingData = await fetchPendingSubmissions();
        setPendingItems(pendingData);
        const students = await fetchStudents();
        setStudentsList(students as Student[]);
      } else if (activeTab === 'students') {
        const students = await fetchStudents();
        setStudentsList(students as Student[]);
      } else if (activeTab === 'superlatives') {
        const superlatives = await fetchSuperlatives();
        setSuperlativesList(superlatives);
      } else if (activeTab === 'photos') {
        const photos = await fetchPhotos();
        setPhotosList(photos);
      } else if (activeTab === 'videos') {
        const snap = await getDocs(collection(db, "videos"));
        setVideosList(snap.docs.map(d => d.data() as VideoMemory));
      } else if (activeTab === 'timeline') {
        const snap = await getDocs(collection(db, "timeline"));
        setTimelineList(snap.docs.map(d => d.data() as TimelineEvent));
      } else if (activeTab === 'tributes') {
        const tributes = await fetchTeacherTributes();
        setTributesList(tributes);
      } else if (activeTab === 'admins') {
        const admins = await fetchAdmins();
        setAdminsList(admins || []);
        
        // Also fetch approved photos to extract unique event titles
        const photos = await fetchPhotos();
        const titles = Array.from(new Set(photos.map(p => p.title.trim()).filter(Boolean)));
        setUniqueEventsList(titles);
      } else if (activeTab === 'settings') {
        // Load settings/school
        const schoolDoc = await getDoc(doc(db, "settings", "school"));
        if (schoolDoc.exists()) {
          const d = schoolDoc.data();
          setAboutSettings(prev => ({
            aboutTitle: d.aboutTitle || prev.aboutTitle,
            aboutSubtitle: d.aboutSubtitle || prev.aboutSubtitle,
            aboutText: d.aboutText || prev.aboutText,
            aboutImage: d.aboutImage !== undefined ? d.aboutImage : prev.aboutImage,
            aboutProprietorName: d.aboutProprietorName || prev.aboutProprietorName,
            aboutProprietorRole: d.aboutProprietorRole || prev.aboutProprietorRole,
          }));
        }

        // Load settings/visibility
        const visDoc = await getDoc(doc(db, "settings", "visibility"));
        if (visDoc.exists()) {
          setComponentVisibility(prev => ({
            ...prev,
            ...visDoc.data()
          }));
        }

        // Load settings/titles
        const titlesDoc = await getDoc(doc(db, "settings", "titles"));
        if (titlesDoc.exists()) {
          const d = titlesDoc.data();
          setHeaderSettings(prev => ({
            graduandsTitle: d.graduands?.title || prev.graduandsTitle,
            graduandsSubtitle: d.graduands?.subtitle || prev.graduandsSubtitle,
            guestbookTitle: d.guestbook?.title || prev.guestbookTitle,
            guestbookSubtitle: d.guestbook?.subtitle || prev.guestbookSubtitle,
            teachersTitle: d.teachers?.title || prev.teachersTitle,
            teachersSubtitle: d.teachers?.subtitle || prev.teachersSubtitle,
          }));
        }

        // Load custom sections list to allow merging/unifying
        const sectionsSnap = await getDocs(collection(db, "custom_sections"));
        const customSecs = sectionsSnap.docs.map(d => d.data() as CustomSection);
        customSecs.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        setCustomSectionsList(customSecs);

        // Load settings/order
        const orderDoc = await getDoc(doc(db, "settings", "order"));
        let loadedSections = ["about", "graduands", "superlatives", "teachers", "photos", "timeline", "videos", "countdown", "guestbook", "closing"];
        if (orderDoc.exists()) {
          const d = orderDoc.data();
          if (Array.isArray(d.sections)) {
            loadedSections = d.sections;
          }
        }

        // Unify with custom sections
        const unified = [...loadedSections];
        customSecs.forEach(cs => {
          if (!unified.includes(cs.id)) {
            unified.push(cs.id);
          }
        });
        const finalOrder = unified.filter(id => 
          ["about", "graduands", "superlatives", "teachers", "photos", "timeline", "videos", "countdown", "guestbook", "closing"].includes(id) || 
          customSecs.some(cs => cs.id === id)
        );
        setSectionOrder(finalOrder);
      } else if (activeTab === 'custom_sections') {
        const sectionsSnap = await getDocs(collection(db, "custom_sections"));
        const list = sectionsSnap.docs.map(d => d.data() as CustomSection);
        list.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        setCustomSectionsList(list);
      }
    } catch (err) {
      console.error("Error refreshing tab data:", err);
    } finally {
      setTabLoading(false);
    }
  };

  useEffect(() => {
    refreshTabData();
  }, [activeTab, isAuthenticated, refreshKey]);

  useEffect(() => {
    const unsubscribe = subscribeSchoolLogo(url => {
      setSchoolLogo(url || '');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeActiveBannerEvent(eventName => {
      setActiveBannerEventState(eventName || '');
    });
    return () => unsubscribe();
  }, []);

  // Handle Admin Auth Form
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user) {
        const isAdminUser = await checkIsAdmin(result.user.email);
        if (isAdminUser) {
          setIsAuthenticated(true);
          localStorage.setItem('scholars_admin_session', 'true');
          localStorage.setItem('scholars_admin_email', result.user.email || '');
          setPassword('');
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('scholars_admin_session');
          localStorage.removeItem('scholars_admin_email');
          await signOut(auth);
          setLoginError(`Access Denied: ${result.user.email} is not authorized as an administrator.`);
        }
      }
    } catch (err: any) {
      if (
        (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') &&
        email === 'justfashion414@gmail.com' &&
        password === 'admin2026'
      ) {
        try {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          if (result.user) {
            setIsAuthenticated(true);
            localStorage.setItem('scholars_admin_session', 'true');
            localStorage.setItem('scholars_admin_email', result.user.email || '');
            setPassword('');
          }
        } catch (createErr: any) {
          setLoginError(createErr.message || 'Failed to initialize admin account.');
        }
      } else {
        setLoginError('Invalid admin email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setLoginError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        const isAdminUser = await checkIsAdmin(result.user.email);
        if (isAdminUser) {
          setIsAuthenticated(true);
          localStorage.setItem('scholars_admin_session', 'true');
          localStorage.setItem('scholars_admin_email', result.user.email || '');
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('scholars_admin_session');
          localStorage.removeItem('scholars_admin_email');
          await signOut(auth);
          setLoginError(`Access Denied: ${result.user.email} is not authorized as an administrator.`);
        }
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setLoginError('Sign-in popup was blocked. Please enable popups in your browser.');
      } else {
        setLoginError(err.message || 'Google authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Log out
  const handleLogout = async () => {
    localStorage.removeItem('scholars_admin_session');
    localStorage.removeItem('scholars_admin_email');
    await signOut(auth);
    setPendingItems([]);
    setIsAuthenticated(false);
  };

  // Handle Moderation Action
  const handleModerationAction = async (pendingId: string, action: 'approve' | 'reject') => {
    setActionLoading(prev => ({ ...prev, [pendingId]: action }));
    try {
      const item = pendingItems.find(i => i.id === pendingId);
      if (!item) return;

      if (action === 'approve') {
        await approveSubmission(item);
        setFeedbackMsg(`Item successfully approved and posted live!`);
      } else {
        await rejectSubmission(item);
        setFeedbackMsg(`Item rejected and purged from moderation queues.`);
      }

      setPendingItems(prev => prev.filter(i => i.id !== pendingId));
      onDataChange();
    } catch (err: any) {
      console.error('Error in moderation action:', err);
      alert(err.message || 'Failed to complete moderation action.');
    } finally {
      setActionLoading(prev => ({ ...prev, [pendingId]: null }));
    }
  };

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setAddAdminError('');
    const targetEmail = newAdminEmail.trim().toLowerCase();
    if (!targetEmail) return;

    setAddAdminLoading(true);
    try {
      const currentUserEmail = auth.currentUser?.email || 'justfashion414@gmail.com';
      await addAdminUser(targetEmail, currentUserEmail);
      setNewAdminEmail('');
      setFeedbackMsg(`Successfully granted admin privileges to ${targetEmail}!`);
      refreshTabData();
    } catch (err: any) {
      console.error("Error adding admin:", err);
      setAddAdminError(err.message || "Failed to authorize email.");
    } finally {
      setAddAdminLoading(false);
    }
  };

  const handleRemoveAdmin = async (emailToRemove: string) => {
    if (emailToRemove === 'justfashion414@gmail.com') {
      alert("The primary administrator account ('justfashion414@gmail.com') cannot be removed.");
      return;
    }
    if (!confirm(`Are you sure you want to remove administrator privileges from ${emailToRemove}?`)) {
      return;
    }
    try {
      await removeAdminUser(emailToRemove);
      setFeedbackMsg(`Successfully revoked admin privileges from ${emailToRemove}.`);
      refreshTabData();
    } catch (err: any) {
      console.error("Error removing admin:", err);
      alert(err.message || "Failed to revoke admin privileges.");
    }
  };

  // Admin actions for specific collections
  const handleSaveStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentForm.name) return;
    setTabLoading(true);

    try {
      const targetId = studentForm.id || `stud-user-${Date.now()}`;
      const payload: Student = {
        id: targetId,
        name: studentForm.name,
        nickname: studentForm.nickname || 'Graduand',
        image: studentForm.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop',
        favoriteMemory: studentForm.favoriteMemory || 'The beautiful moments we shared.',
        messageToClassmates: studentForm.messageToClassmates || 'Never stop pursuing your absolute best!',
        aspirations: studentForm.aspirations || 'Future Professional',
        house: studentForm.house as any || 'Blue House (Sovereigns)'
      };

      await addApprovedStudent(payload);
      setStudentForm({ name: '', nickname: '', image: '', favoriteMemory: '', messageToClassmates: '', aspirations: '', house: 'Blue House (Sovereigns)' });
      setFeedbackMsg(`Successfully saved student ${payload.name}!`);
      refreshTabData();
      onDataChange();
    } catch (err) {
      console.error(err);
      alert("Failed to save student.");
    } finally {
      setTabLoading(false);
    }
  };

  const handleSaveSuperlative = async (e: FormEvent) => {
    e.preventDefault();
    if (!superlativeForm.category || !superlativeForm.studentName) return;
    setTabLoading(true);

    try {
      const targetId = superlativeForm.id || `sup-user-${Date.now()}`;
      const payload: Superlative = {
        id: targetId,
        category: superlativeForm.category,
        description: superlativeForm.description || 'Awarded with high honors',
        studentName: superlativeForm.studentName,
        studentImage: superlativeForm.studentImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop'
      };

      await addSuperlative(payload);
      setSuperlativeForm({ category: '', description: '', studentName: '', studentImage: '' });
      setFeedbackMsg(`Successfully awarded ${payload.category} to ${payload.studentName}!`);
      refreshTabData();
      onDataChange();
    } catch (err) {
      console.error(err);
      alert("Failed to save superlative.");
    } finally {
      setTabLoading(false);
    }
  };

  const handleSavePhoto = async (e: FormEvent) => {
    e.preventDefault();
    if (!photoForm.url) return;
    setTabLoading(true);

    try {
      const targetId = `photo-user-${Date.now()}`;
      const payload: Photo = {
        id: targetId,
        url: photoForm.url,
        title: photoForm.title || 'Graduation Highlights',
        uploadedAt: new Date().toISOString(),
        submittedBy: photoForm.submitterName || 'School Admin',
        role: (photoForm.submitterRole as any) || 'Teacher'
      };

      await addPhoto(payload);
      setPhotoForm({ title: '', url: '', submitterName: 'Admin Portal', submitterRole: 'Teacher' });
      setFeedbackMsg("Photo posted live to gallery successfully!");
      refreshTabData();
      onDataChange();
    } catch (err) {
      console.error(err);
      alert("Failed to save photo.");
    } finally {
      setTabLoading(false);
    }
  };

  const handleSaveVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!videoForm.url) return;
    setTabLoading(true);

    try {
      const targetId = `vid-user-${Date.now()}`;
      
      // Auto-extract thumbnail for YouTube/Vimeo
      let finalThumb = videoForm.thumbnailUrl || '';
      if (!finalThumb) {
        if (videoForm.url.includes("youtube.com") || videoForm.url.includes("youtu.be")) {
          const ytId = getYouTubeID(videoForm.url);
          if (ytId) finalThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        } else {
          finalThumb = "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=400&fit=crop";
        }
      }

      const payload: VideoMemory = {
        id: targetId,
        title: videoForm.title || 'Memory Vault highlight',
        url: videoForm.url,
        submittedBy: videoForm.submittedBy || 'Admin Portal',
        role: (videoForm.role as any) || 'Teacher',
        uploadedAt: new Date().toISOString(),
        thumbnailUrl: finalThumb
      };

      await addApprovedVideoMemory(payload);
      setVideoForm({ title: '', url: '', submittedBy: 'Admin Portal', role: 'Teacher', thumbnailUrl: '' });
      setFeedbackMsg("Video Memory added successfully!");
      refreshTabData();
      onDataChange();
    } catch (err) {
      console.error(err);
      alert("Failed to save video.");
    } finally {
      setTabLoading(false);
    }
  };

  const handleSaveTimeline = async (e: FormEvent) => {
    e.preventDefault();
    if (!timelineForm.title || !timelineForm.date) return;
    setTabLoading(true);

    try {
      const targetId = timelineForm.id || `time-user-${Date.now()}`;
      const payload: TimelineEvent = {
        id: targetId,
        date: timelineForm.date,
        title: timelineForm.title,
        description: timelineForm.description || '',
        image: timelineForm.image || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=400&fit=crop'
      };

      await addApprovedTimelineEvent(payload);
      setTimelineForm({ date: '', title: '', description: '', image: '' });
      setFeedbackMsg(`Timeline event "${payload.title}" saved successfully!`);
      refreshTabData();
      onDataChange();
    } catch (err) {
      console.error(err);
      alert("Failed to save timeline event.");
    } finally {
      setTabLoading(false);
    }
  };

  const handleSaveTribute = async (e: FormEvent) => {
    e.preventDefault();
    if (!tributeForm.name || !tributeForm.message) return;
    setTabLoading(true);

    try {
      const targetId = tributeForm.id || `trib-user-${Date.now()}`;
      const payload: TeacherTribute = {
        id: targetId,
        name: tributeForm.name,
        subject: tributeForm.subject || 'Faculty Advisor',
        message: tributeForm.message,
        image: tributeForm.image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=256&h=256&fit=crop'
      };

      await addTeacherTribute(payload);
      setTributeForm({ name: '', subject: '', message: '', image: '' });
      setFeedbackMsg(`Teacher Tribute for "${payload.name}" posted successfully!`);
      refreshTabData();
      onDataChange();
    } catch (err) {
      console.error(err);
      alert("Failed to save teacher tribute.");
    } finally {
      setTabLoading(false);
    }
  };

  const handleSaveCustomSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!customSectionForm.title) return;
    setTabLoading(true);

    try {
      const targetId = customSectionForm.id || `sect-${Date.now()}`;
      const payload: CustomSection = {
        id: targetId,
        title: customSectionForm.title,
        subtext: customSectionForm.subtext || '',
        mediaUrl: customSectionForm.mediaUrl || '',
        mediaType: customSectionForm.mediaType || 'none',
        orderIndex: Number(customSectionForm.orderIndex) || 0,
        layoutType: customSectionForm.layoutType || 'standard'
      };

      if (customSectionForm.id) {
        await updateApprovedCustomSection(payload);
        setFeedbackMsg(`Custom section "${payload.title}" updated successfully!`);
      } else {
        await addApprovedCustomSection(payload);
        setFeedbackMsg(`Custom section "${payload.title}" created successfully!`);
      }

      setCustomSectionForm({ title: '', subtext: '', mediaUrl: '', mediaType: 'none', orderIndex: 0, layoutType: 'standard' });
      refreshTabData();
      onDataChange();
    } catch (err: any) {
      console.error(err);
      alert("Failed to save custom section: " + err.message);
    } finally {
      setTabLoading(false);
    }
  };

  const handleDeleteCustomSection = async (id: string, title: string, mediaUrl?: string) => {
    if (confirm(`Are you sure you want to permanently delete the custom section "${title}"?`)) {
      setTabLoading(true);
      try {
        await deleteApprovedCustomSection(id, mediaUrl);
        setFeedbackMsg(`Deleted custom section "${title}".`);
        refreshTabData();
        onDataChange();
      } catch (err: any) {
        console.error(err);
        alert("Failed to delete custom section: " + err.message);
      } finally {
        setTabLoading(false);
      }
    }
  };

  const getStudentNameById = (id: string) => {
    const s = studentsList.find(student => student.id === id);
    return s ? s.name : "Unknown Student";
  };

  const getStudentImageById = (id: string) => {
    const s = studentsList.find(student => student.id === id);
    return s ? s.image : null;
  };

  const filteredPending = pendingItems.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  return (
    <>
      {/* FLOATING ACTION GATEKEEPER BADGE/TRIGGER (Rendered ONLY if admin is authenticated) */}
      {(isAuthenticated || cleanUpMode) && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-1.5">
          {isAuthenticated && !cleanUpMode && (
            <div className="bg-emerald-950/90 backdrop-blur text-emerald-300 border border-emerald-500/30 text-[9px] font-mono px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Admin Active</span>
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className={`flex items-center gap-2 font-semibold text-xs px-4 py-3 rounded-full shadow-2xl border cursor-pointer relative font-mono tracking-wider transition-all ${
              cleanUpMode
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-rose-600/50'
                : 'bg-[#0F2557] hover:bg-[#15347a] text-[#D4A017] border-[#D4A017]/30 shadow-[#D4A017]/25'
            }`}
            id="btn-trigger-admin-portal"
          >
            {cleanUpMode ? (
              <Trash2 className="w-4 h-4 text-white animate-bounce" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            <span>{cleanUpMode ? 'Admin Clean Up' : 'Admin Control Panel'}</span>
            {!cleanUpMode && pendingItems.length > 0 && (
              <span className="absolute -top-2 -right-1 bg-red-500 text-white font-sans text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse shadow-md border border-white">
                {pendingItems.length}
              </span>
            )}
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-10">
            {/* OVERLAY BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#050E22]/95 backdrop-blur-md"
              onClick={() => setIsOpen(false)}
            />

            {/* MODAL PORTAL CONTAINER */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative bg-[#0F2557] rounded-3xl overflow-y-auto md:overflow-hidden shadow-2xl max-w-7xl md:w-[95vw] w-full z-10 border border-[#D4A017]/30 flex flex-col max-h-[90vh] text-white scrollbar-thin scrollbar-thumb-white/10 [WebkitOverflowScrolling:touch]"
            >
              {/* HEADER */}
              <div className="p-6 md:p-8 bg-[#050E22]/80 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D4A017]/15 border border-[#D4A017]/40 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[#D4A017]" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-serif font-bold text-[#D4A017] flex items-center gap-2">
                      {isAuthenticated ? "Administrative Control Panel" : "Gatekeeper Authorization"}
                    </h2>
                    <p className="text-white/50 text-[10px] uppercase font-mono tracking-wider">
                      Database Editor & Year-Book Custodian
                    </p>
                  </div>
                </div>

                {isAuthenticated && (
                  <button
                    onClick={() => {
                      setCleanUpMode(!cleanUpMode);
                      if (!cleanUpMode) {
                        setIsOpen(false);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer border transition-all shadow-lg animate-pulse ${
                      cleanUpMode
                        ? 'bg-rose-600 text-white border-rose-400 hover:bg-rose-700 shadow-rose-600/40'
                        : 'bg-rose-500/25 text-rose-200 border-rose-500/45 hover:bg-rose-500/35 shadow-rose-950/50'
                    }`}
                    title={cleanUpMode ? "Turn Off Clean Up Mode" : "Turn On Clean Up Mode"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{cleanUpMode ? "Clean Up: ACTIVE" : "Clean Up Mode"}</span>
                  </button>
                )}

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 text-white/70 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer self-end md:self-auto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* AUTHENTICATION VIEW */}
              {!isAuthenticated ? (
                <div className="p-8 max-w-md mx-auto w-full text-center py-16 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <Shield className="w-8 h-8 text-[#D4A017]" />
                  </div>
                  <h3 className="text-xl font-serif font-bold mb-2">Gatekeeper Authentication</h3>
                  <p className="text-white/60 text-xs mb-8 leading-relaxed max-w-sm">
                    Access the Year-Book moderation panel. Please authenticate using the designated administrator Google account.
                  </p>

                  <div className="w-full space-y-6">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full py-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 ring-2 ring-white/20 hover:scale-[1.01]"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                      ) : (
                        <>
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                          <span>Sign in with Google (Admin)</span>
                        </>
                      )}
                    </button>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left space-y-2">
                      <p className="text-[#D4A017] text-[10px] font-mono uppercase tracking-wider font-bold">Admin Credentials (Password Backup)</p>
                      <p className="text-slate-200 text-xs leading-relaxed font-sans">
                        Email: <strong className="text-white font-mono bg-black/40 px-1.5 py-0.5 rounded">justfashion414@gmail.com</strong><br/>
                        Password: <strong className="text-white font-mono bg-black/40 px-1.5 py-0.5 rounded">admin2026</strong>
                      </p>
                      <p className="text-[10px] text-[#D4A017] font-mono leading-normal">
                        💡 <strong>Quick Unlock:</strong> Expand alternative section below, select password method.
                      </p>
                    </div>

                    {loginError && (
                      <p className="text-red-400 text-xs font-mono font-bold flex items-center gap-1.5 justify-center bg-red-500/10 border border-red-500/20 py-2.5 rounded-xl">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {loginError}
                      </p>
                    )}

                    <div className="pt-4 border-t border-white/5">
                      <details className="group">
                        <summary className="text-xs text-white/40 hover:text-white/60 cursor-pointer list-none font-mono uppercase tracking-wider select-none flex items-center justify-center gap-1">
                          <span>Use password credentials instead</span>
                          <span className="transition-transform group-open:rotate-180">▾</span>
                        </summary>
                        
                        <div className="mt-4 pt-4 text-left space-y-4 border-t border-white/5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1">Admin Email</label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1">Password</label>
                            <input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleLogin(e)}
                            disabled={loading}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-white/10"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Unlock Console</span></>}
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              ) : (
                /* AUTHENTICATED PANEL WRAPPER */
                <div className="flex-grow flex flex-col md:flex-row overflow-y-visible md:overflow-hidden min-h-[60vh] md:h-[70vh]">
                  
                  {/* SIDEBAR TABS NAV */}
                  <div className={`w-full md:w-64 bg-[#050E22]/60 border-r border-white/5 p-4 flex flex-col justify-between shrink-0 overflow-y-visible md:overflow-y-auto ${mobileShowSidebar ? 'flex' : 'hidden md:flex'}`}>
                    <div className="space-y-6">
                      {/* Mobile Title for Sidebar */}
                      <div className="md:hidden flex items-center justify-between border-b border-white/5 pb-3">
                        <span className="text-[#D4A017] font-serif font-bold text-sm">Select Admin Tab</span>
                        <button
                          onClick={() => setMobileShowSidebar(false)}
                          className="px-2.5 py-1 text-[10px] font-mono text-white/70 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10"
                        >
                          Show Active
                        </button>
                      </div>

                      <div className="px-2">
                        <span className="text-white/45 font-mono text-[9px] uppercase tracking-wider block mb-1">Administrative Role</span>
                        <div className="text-sm font-bold text-[#D4A017] truncate">{auth.currentUser?.email}</div>
                      </div>

                      {/* VERTICAL NAV LIST */}
                      <div className="space-y-1">
                        {[
                          { id: 'queue', label: 'Mod Queue', icon: Shield, count: pendingItems.length },
                          { id: 'students', label: 'Graduand Wall', icon: UserPlus, count: studentsList.length },
                          { id: 'superlatives', label: 'Medal Superlatives', icon: Award, count: superlativesList.length },
                          { id: 'photos', label: 'Photo Album', icon: Camera, count: photosList.length },
                          { id: 'videos', label: 'Video Vault', icon: Video, count: videosList.length },
                          { id: 'timeline', label: 'Milestones', icon: Calendar, count: timelineList.length },
                          { id: 'tributes', label: 'Teacher Tributes', icon: Quote, count: tributesList.length },
                          { id: 'custom_sections', label: 'Custom Sections', icon: FileText, count: customSectionsList.length },
                          { id: 'admins', label: 'Brand & Admins', icon: Lock },
                          { id: 'settings', label: 'Settings & Layout', icon: Settings }
                        ].map(tab => {
                          const Icon = tab.icon;
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => {
                                setActiveTab(tab.id as any);
                                setFeedbackMsg('');
                                setMobileShowSidebar(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                                isActive 
                                  ? 'bg-[#D4A017] text-[#0F2557] font-bold shadow-md' 
                                  : 'hover:bg-white/5 text-white/70 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                              </div>
                              {tab.count !== undefined && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${isActive ? 'bg-[#0F2557]/25 text-[#0F2557]' : 'bg-white/10 text-white/60'}`}>
                                  {tab.count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-2">
                      <button
                        onClick={refreshTabData}
                        disabled={tabLoading}
                        className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${tabLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh Data</span>
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-300 rounded-xl text-[10px] font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Lock Console</span>
                      </button>
                    </div>
                  </div>

                  {/* MAIN PANEL CONTENT VIEWS */}
                  <div className={`flex-grow p-6 md:p-8 overflow-y-visible md:overflow-y-auto bg-[#0A193F] ${!mobileShowSidebar ? 'block' : 'hidden md:block'}`}>
                    {/* MOBILE TOP NAVIGATION BAR */}
                    <div className="md:hidden flex items-center justify-between bg-[#050E22]/60 border-b border-white/5 p-4 -mx-6 -mt-6 mb-6">
                      <button
                        onClick={() => setMobileShowSidebar(true)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono font-bold flex items-center gap-1.5 text-[#D4A017] cursor-pointer"
                      >
                        <Menu className="w-4 h-4" />
                        <span>Admin Menu</span>
                      </button>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-[#D4A017] font-serif tracking-wider uppercase">
                          {activeTab === 'queue' ? 'Approval Queue' : activeTab.toUpperCase()}
                        </span>
                        {activeTab === 'queue' && pendingItems.length > 0 && (
                          <span className="text-[9px] font-mono text-emerald-400 font-semibold">
                            {pendingItems.length} awaiting
                          </span>
                        )}
                      </div>
                    </div>
                    {feedbackMsg && (
                      <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{feedbackMsg}</span>
                      </div>
                    )}

                    {tabLoading && (
                      <div className="bg-[#D4A017]/10 text-[#D4A017] px-4 py-2 rounded-xl mb-4 text-xs font-mono animate-pulse flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Synchronizing data collections...
                      </div>
                    )}

                    {/* 1. MODERATION QUEUE TAB */}
                    {activeTab === 'queue' && (
                      <div className="space-y-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-4">
                          <div>
                            <h3 className="text-lg font-serif font-bold text-[#D4A017]">Awaiting Approval Queue</h3>
                            <p className="text-[10px] text-white/40 font-mono mt-0.5">Moderate guest uploads and student portrait proposals before they go live.</p>
                          </div>
                          <div className="flex bg-[#050E22] p-1 rounded-lg border border-white/5 gap-1 overflow-x-auto max-w-full scrollbar-none whitespace-nowrap shrink-0">
                            {['all', 'guestbook', 'student_add', 'student_portrait_update', 'video_memory', 'teacher_tribute', 'photo', 'timeline'].map(f => (
                              <button
                                key={f}
                                onClick={() => setFilterType(f)}
                                className={`px-2.5 py-1 rounded-md text-[9px] font-mono uppercase tracking-widest cursor-pointer transition-colors ${filterType === f ? 'bg-[#D4A017] text-[#0F2557] font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                              >
                                {f.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>

                        {filteredPending.length === 0 ? (
                          <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl text-white/45">
                            <CheckCircle2 className="w-12 h-12 text-[#D4A017] mx-auto mb-3 opacity-60" />
                            <h4 className="font-serif font-bold text-white/80">All Clean!</h4>
                            <p className="text-xs font-mono uppercase tracking-widest mt-1">No pending guest or graduand posts awaiting review.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filteredPending.map(item => {
                              const data = item.data;
                              const isApproving = actionLoading[item.id] === 'approve';
                              const isRejecting = actionLoading[item.id] === 'reject';

                              return (
                                <div key={item.id} className="bg-[#050E22]/40 border border-white/10 rounded-2xl p-5 hover:border-[#D4A017]/30 transition-all flex flex-col md:flex-row items-start justify-between gap-6">
                                  <div className="flex-grow space-y-3 w-full">
                                    <div className="flex items-center gap-2.5">
                                      <span className="px-2 py-0.5 rounded bg-[#D4A017]/10 border border-[#D4A017]/30 text-[#D4A017] font-mono text-[9px] font-bold uppercase tracking-wider">
                                        {item.type.replace('_', ' ')}
                                      </span>
                                      <span className="text-[10px] text-white/40 font-mono">
                                        {new Date(item.submittedAt).toLocaleDateString()}
                                      </span>
                                    </div>

                                    {item.type === 'guestbook' && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-semibold text-white font-mono">{data.name} ({data.role})</p>
                                        <p className="text-xs text-white/80 italic font-serif text-left">"{data.message}"</p>
                                        {data.imageUrl && (
                                          <img 
                                            src={data.imageUrl} 
                                            onClick={() => triggerPreview(item)}
                                            className="w-36 h-24 sm:w-24 sm:h-24 object-cover rounded-lg border border-white/10 mt-2 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                                            referrerPolicy="no-referrer" 
                                            title="Click to preview"
                                          />
                                        )}
                                      </div>
                                    )}

                                    {item.type === 'student_add' && (
                                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                                        <img 
                                          src={data.image} 
                                          onClick={() => triggerPreview(item)}
                                          className="w-24 h-30 sm:w-16 sm:h-20 object-cover rounded-lg border border-white/10 bg-black/20 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                                          referrerPolicy="no-referrer" 
                                          title="Click to preview"
                                        />
                                        <div className="space-y-1 text-xs text-left">
                                          <p className="font-bold text-[#D4A017]">{data.name} ({data.nickname})</p>
                                          <p className="text-white/60 font-mono text-[10px] uppercase">{data.house}</p>
                                          <p className="text-white/70 italic">"Fav Memory: {data.favoriteMemory}"</p>
                                        </div>
                                      </div>
                                    )}

                                    {item.type === 'student_portrait_update' && (
                                      <div className="space-y-2 text-left">
                                        <p className="text-xs text-white">Replacing portrait of <strong className="text-[#D4A017]">{getStudentNameById(data.studentId)}</strong></p>
                                        <div className="flex items-center gap-3">
                                          <div className="text-center">
                                            <span className="text-[8px] font-mono text-white/40 block mb-1">CURRENT</span>
                                            <img 
                                              src={getStudentImageById(data.studentId) || ''} 
                                              className="w-16 h-20 sm:w-12 sm:h-16 object-cover rounded border border-white/5" 
                                              referrerPolicy="no-referrer" 
                                            />
                                          </div>
                                          <ArrowRight className="w-4 h-4 text-[#D4A017]" />
                                          <div className="text-center">
                                            <span className="text-[8px] font-mono text-[#D4A017] block mb-1">PROPOSED</span>
                                            <img 
                                              src={data.image} 
                                              onClick={() => triggerPreview(item)}
                                              className="w-16 h-20 sm:w-12 sm:h-16 object-cover rounded border-2 border-emerald-500 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                                              referrerPolicy="no-referrer" 
                                              title="Click to preview"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {item.type === 'video_memory' && (
                                      <div className="space-y-3 text-xs text-left">
                                        <p className="font-bold text-white">{data.title}</p>
                                        {data.urls && Array.isArray(data.urls) ? (
                                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full max-w-lg mt-2">
                                            {data.urls.map((url, i) => {
                                              const thumb = data.thumbnailUrls?.[i] || "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=500&auto=format&fit=crop";
                                              return (
                                                <div key={i} className="relative group aspect-video bg-black/20 rounded-lg overflow-hidden border border-white/5">
                                                  <img src={thumb} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                  <button 
                                                    type="button"
                                                    onClick={() => {
                                                      const ytId = getYouTubeID(url);
                                                      const finalUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : url;
                                                      setPreviewMedia({
                                                        id: item.id,
                                                        type: 'video',
                                                        url: finalUrl,
                                                        title: `${data.title} (${i+1}/${data.urls.length})`,
                                                        submittedBy: data.submittedBy || 'Contributor',
                                                        role: data.role || 'Contributor'
                                                      });
                                                    }}
                                                    className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors cursor-pointer"
                                                  >
                                                    <Play className="w-4 h-4 text-[#D4A017]" />
                                                  </button>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="flex gap-4 items-start">
                                            {data.thumbnailUrl && (
                                              <img 
                                                src={data.thumbnailUrl} 
                                                onClick={() => triggerPreview(item)}
                                                className="w-32 h-20 sm:w-24 sm:h-16 object-cover rounded-lg border border-white/10 bg-black/20 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                                                referrerPolicy="no-referrer" 
                                              />
                                            )}
                                            <button 
                                              type="button"
                                              onClick={() => triggerPreview(item)}
                                              className="text-xs text-[#D4A017] hover:underline flex items-center gap-1 cursor-pointer"
                                            >
                                              <Play className="w-3 h-3" /> Preview Video Memory
                                            </button>
                                          </div>
                                        )}
                                        <p className="text-white/50 font-mono text-[10px]">
                                          Posted by {data.submittedBy} ({data.role})
                                          {data.urls && Array.isArray(data.urls) && ` • Group of ${data.urls.length} videos`}
                                        </p>
                                      </div>
                                    )}

                                    {item.type === 'teacher_tribute' && (
                                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                                        <img 
                                          src={data.image || "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&auto=format&fit=crop&q=80"} 
                                          onClick={() => triggerPreview(item)}
                                          className="w-24 h-24 sm:w-16 sm:h-16 object-cover rounded-lg border border-white/10 bg-black/20 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                                          referrerPolicy="no-referrer" 
                                          title="Click to preview"
                                        />
                                        <div className="space-y-1 text-xs text-left w-full">
                                          <p className="font-bold text-[#D4A017]">{data.name} (Teacher of {data.subject})</p>
                                          <p className="text-white/85 italic">"{data.message}"</p>
                                        </div>
                                      </div>
                                    )}

                                    {item.type === 'photo' && (
                                      <div className="space-y-3 text-xs text-left">
                                        <p className="font-bold text-white">{data.title}</p>
                                        {data.urls && Array.isArray(data.urls) ? (
                                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full max-w-lg mt-2">
                                            {data.urls.map((url, i) => (
                                              <img 
                                                key={i} 
                                                src={url} 
                                                onClick={() => {
                                                  setPreviewMedia({
                                                    id: item.id,
                                                    type: 'image',
                                                    url: url,
                                                    title: `${data.title} (${i+1}/${data.urls.length})`,
                                                    submittedBy: data.submittedBy || 'Contributor',
                                                    role: data.role || 'Contributor'
                                                  });
                                                }}
                                                className="w-full aspect-video sm:w-16 sm:h-12 object-cover rounded-lg border border-white/10 bg-black/20 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                                                referrerPolicy="no-referrer" 
                                              />
                                            ))}
                                          </div>
                                        ) : (
                                          <img 
                                            src={data.url} 
                                            onClick={() => triggerPreview(item)}
                                            className="w-36 h-24 sm:w-24 sm:h-16 object-cover rounded-lg border border-white/10 bg-black/20 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                                            referrerPolicy="no-referrer" 
                                            title="Click to preview"
                                          />
                                        )}
                                        <p className="text-white/50 font-mono text-[10px]">
                                          Submitted by {data.submittedBy} ({data.role})
                                          {data.urls && Array.isArray(data.urls) && ` • Group of ${data.urls.length} images`}
                                        </p>
                                      </div>
                                    )}

                                    {item.type === 'timeline' && (
                                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                                        {data.image && (
                                          <img 
                                            src={data.image} 
                                            onClick={() => triggerPreview(item)}
                                            className="w-36 h-24 sm:w-24 sm:h-16 object-cover rounded-lg border border-white/10 bg-black/20 cursor-pointer hover:ring-2 hover:ring-[#D4A017] transition-all" 
                                            referrerPolicy="no-referrer" 
                                            title="Click to preview"
                                          />
                                        )}
                                        <div className="space-y-1 text-xs text-left">
                                          <p className="font-bold text-[#D4A017]">{data.title} ({data.date})</p>
                                          <p className="text-white/80">"{data.description}"</p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Quick Preview Assist Button */}
                                    {(data.imageUrl || data.image || data.url || data.urls) && (
                                      <div className="pt-2">
                                        <button
                                          type="button"
                                          onClick={() => triggerPreview(item)}
                                          className="w-full sm:w-auto py-2 px-3.5 bg-white/5 hover:bg-white/10 active:scale-95 text-[#D4A017] font-mono text-[10px] font-bold rounded-xl border border-white/10 hover:border-[#D4A017]/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>Immersive Media Inspect</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 w-full md:w-auto self-end md:self-center shrink-0">
                                    <button
                                      onClick={() => handleModerationAction(item.id, 'approve')}
                                      disabled={isApproving || isRejecting}
                                      className="flex-1 md:flex-none py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                      {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      onClick={() => handleModerationAction(item.id, 'reject')}
                                      disabled={isApproving || isRejecting}
                                      className="flex-1 md:flex-none py-2 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                      {isRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                      <span>Reject</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. GRADUAND WALL / STUDENTS LIST MANAGEMENT */}
                    {activeTab === 'students' && (
                      <div className="space-y-8">
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
                                placeholder="e.g. Ebks"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Portrait Image File</label>
                              <input 
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      setTabLoading(true);
                                      const url = await handleUploadImageFile(file);
                                      setStudentForm(prev => ({...prev, image: url}));
                                    } catch (err: any) {
                                      alert(err.message);
                                    } finally {
                                      setTabLoading(false);
                                    }
                                  }
                                }}
                                className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20"
                              />
                              {studentForm.image && (
                                <img src={studentForm.image} className="w-12 h-16 object-cover rounded border border-white/10 mt-1" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">House Affiliation</label>
                              <select 
                                value={studentForm.house || 'Blue House (Sovereigns)'}
                                onChange={(e) => setStudentForm(prev => ({...prev, house: e.target.value as any}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono"
                              >
                                <option value="Blue House (Sovereigns)">Blue House (Sovereigns)</option>
                                <option value="Red House (Challengers)">Red House (Challengers)</option>
                                <option value="Green House (Champions)">Green House (Champions)</option>
                                <option value="Yellow House (Leaders)">Yellow House (Leaders)</option>
                              </select>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Favorite High-school Memory</label>
                              <input 
                                type="text"
                                value={studentForm.favoriteMemory || ''}
                                onChange={(e) => setStudentForm(prev => ({...prev, favoriteMemory: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="Write the memory here..."
                              />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Message to Classmates / Bye Note</label>
                              <textarea 
                                rows={2}
                                value={studentForm.messageToClassmates || ''}
                                onChange={(e) => setStudentForm(prev => ({...prev, messageToClassmates: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="Goodbyes and sweet advice..."
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Future Aspirations</label>
                              <input 
                                type="text"
                                value={studentForm.aspirations || ''}
                                onChange={(e) => setStudentForm(prev => ({...prev, aspirations: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="e.g. AI Scientist"
                              />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                              {studentForm.id && (
                                <button 
                                  type="button" 
                                  onClick={() => setStudentForm({ name: '', nickname: '', image: '', favoriteMemory: '', messageToClassmates: '', aspirations: '', house: 'Blue House (Sovereigns)' })}
                                  className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white cursor-pointer"
                                >
                                  Cancel Edit
                                </button>
                              )}
                              <button 
                                type="submit" 
                                className="py-2 px-6 rounded-xl bg-[#D4A017] hover:bg-[#b58814] text-[#0F2557] font-bold text-xs cursor-pointer shadow-md"
                              >
                                {studentForm.id ? "Update Profile" : "Save / Register Graduand"}
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* LIST RENDER WITH DIRECT EDIT/DELETE */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Active Yearbook Graduand Directory ({studentsList.length})</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {studentsList.map(student => (
                              <div key={student.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex gap-3 relative hover:border-[#D4A017]/45 transition-all">
                                <img src={student.image} className="w-14 h-18 object-cover rounded-lg border border-white/10 bg-black/20" referrerPolicy="no-referrer" />
                                <div className="space-y-1 text-xs truncate">
                                  <p className="font-serif font-bold text-white truncate">{student.name}</p>
                                  <p className="text-[#D4A017] font-mono text-[9px] truncate">"{student.nickname}" • {student.aspirations}</p>
                                  <p className="text-white/40 text-[9px] font-mono font-semibold uppercase">{student.house}</p>
                                </div>

                                <div className="absolute top-2 right-2 flex gap-1">
                                  <button 
                                    onClick={() => setStudentForm(student)}
                                    className="p-1.5 bg-white/5 hover:bg-white/10 text-[#D4A017] rounded-lg border border-white/5 cursor-pointer"
                                    title="Edit Profile"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to permanently delete student profile "${student.name}"? This deletes their portrait and profile data.`)) {
                                        try {
                                          setTabLoading(true);
                                          await deleteApprovedStudent(student.id, student.image);
                                          refreshTabData();
                                          onDataChange();
                                        } catch (err) {
                                          console.error(err);
                                        } finally {
                                          setTabLoading(false);
                                        }
                                      }
                                    }}
                                    className="p-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 rounded-lg border border-rose-500/20 cursor-pointer"
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
                    )}

                    {/* 3. CLASS SUPERLATIVES MANAGEMENT */}
                    {activeTab === 'superlatives' && (
                      <div className="space-y-8">
                        <div className="bg-[#050E22]/60 p-6 rounded-2xl border border-white/5">
                          <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5" />
                            {superlativeForm.id ? "Edit Superlative Award" : "Assign New Class Superlative Medal"}
                          </h4>
                          <form onSubmit={handleSaveSuperlative} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Superlative Title / Category</label>
                              <input 
                                type="text"
                                required
                                value={superlativeForm.category || ''}
                                onChange={(e) => setSuperlativeForm(prev => ({...prev, category: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="e.g. Most Likely to Succeed"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Award Recipient Student Name</label>
                              <input 
                                type="text"
                                required
                                value={superlativeForm.studentName || ''}
                                onChange={(e) => setSuperlativeForm(prev => ({...prev, studentName: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="e.g. Ebuka Obi-Uchendu"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Recipient Image File</label>
                              <input 
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      setTabLoading(true);
                                      const url = await handleUploadImageFile(file);
                                      setSuperlativeForm(prev => ({...prev, studentImage: url}));
                                    } catch (err: any) {
                                      alert(err.message);
                                    } finally {
                                      setTabLoading(false);
                                    }
                                  }
                                }}
                                className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20"
                              />
                              {superlativeForm.studentImage && (
                                <img src={superlativeForm.studentImage} className="w-12 h-16 object-cover rounded border border-white/10 mt-1" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Description / Medal Citation</label>
                              <input 
                                type="text"
                                value={superlativeForm.description || ''}
                                onChange={(e) => setSuperlativeForm(prev => ({...prev, description: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="e.g. For showing unparalleled academic performance and vision"
                              />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                              {superlativeForm.id && (
                                <button 
                                  type="button" 
                                  onClick={() => setSuperlativeForm({ category: '', description: '', studentName: '', studentImage: '' })}
                                  className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white cursor-pointer"
                                >
                                  Cancel Edit
                                </button>
                              )}
                              <button 
                                type="submit" 
                                className="py-2 px-6 rounded-xl bg-[#D4A017] hover:bg-[#b58814] text-[#0F2557] font-bold text-xs cursor-pointer shadow-md"
                              >
                                {superlativeForm.id ? "Update Award" : "Issue Superlative Award"}
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* LIST RENDER WITH DIRECT EDIT/DELETE */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Class Superlatives Wall & Medals ({superlativesList.length})</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {superlativesList.map(sup => (
                              <div key={sup.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex gap-3 relative hover:border-[#D4A017]/45 transition-all">
                                <img src={sup.studentImage} className="w-14 h-18 object-cover rounded-lg border border-white/10 bg-black/20" referrerPolicy="no-referrer" />
                                <div className="space-y-1 text-xs truncate">
                                  <p className="font-serif font-bold text-white truncate">{sup.category}</p>
                                  <p className="text-[#D4A017] font-mono text-[9px] truncate">Recipient: {sup.studentName}</p>
                                  <p className="text-white/50 text-[9px] truncate font-serif italic">"{sup.description}"</p>
                                </div>

                                <div className="absolute top-2 right-2 flex gap-1">
                                  <button 
                                    onClick={() => setSuperlativeForm(sup)}
                                    className="p-1.5 bg-white/5 hover:bg-white/10 text-[#D4A017] rounded-lg border border-white/5 cursor-pointer"
                                    title="Edit Medal"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to permanently delete medal superlative "${sup.category}" awarded to "${sup.studentName}"?`)) {
                                        try {
                                          setTabLoading(true);
                                          await deleteApprovedSuperlative(sup.id, sup.studentImage);
                                          refreshTabData();
                                          onDataChange();
                                        } catch (err) {
                                          console.error(err);
                                        } finally {
                                          setTabLoading(false);
                                        }
                                      }
                                    }}
                                    className="p-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 rounded-lg border border-rose-500/20 cursor-pointer"
                                    title="Delete Superlative"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. PHOTO ALBUM */}
                    {activeTab === 'photos' && (
                      <div className="space-y-8">
                        <div className="bg-[#050E22]/60 p-6 rounded-2xl border border-white/5">
                          <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center gap-2">
                            <Camera className="w-5 h-5" />
                            Directly Post Photo to Yearbook Album
                          </h4>
                          <form onSubmit={handleSavePhoto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Photo Title / Caption</label>
                              <input 
                                type="text"
                                required
                                value={photoForm.title || ''}
                                onChange={(e) => setPhotoForm(prev => ({...prev, title: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="e.g. Interhouse Sports Day"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Photo Image File</label>
                              <input 
                                type="file"
                                accept="image/*"
                                required={!photoForm.url}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      setTabLoading(true);
                                      const url = await handleUploadImageFile(file);
                                      setPhotoForm(prev => ({...prev, url}));
                                    } catch (err: any) {
                                      alert(err.message);
                                    } finally {
                                      setTabLoading(false);
                                    }
                                  }
                                }}
                                className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20"
                              />
                              {photoForm.url && (
                                <img src={photoForm.url} className="w-24 h-16 object-cover rounded border border-white/10 mt-1" />
                              )}
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                              <button 
                                type="submit" 
                                className="py-2 px-6 rounded-xl bg-[#D4A017] hover:bg-[#b58814] text-[#0F2557] font-bold text-xs cursor-pointer shadow-md"
                              >
                                Upload Photo Live
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* LIST RENDER */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Album Photo Gallery ({photosList.length})</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {photosList.map(photo => (
                              <div key={photo.id} className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 bg-black/40 group hover:border-[#D4A017]/55 transition-all">
                                <img src={photo.url} className="w-full h-full object-cover filter brightness-90 group-hover:brightness-100 transition-all" referrerPolicy="no-referrer" />
                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black to-black/0 text-left">
                                  <p className="text-[10px] font-sans font-bold text-white truncate">{photo.title}</p>
                                  <p className="text-[8px] font-mono text-white/50">Posted {new Date(photo.uploadedAt).toLocaleDateString()}</p>
                                </div>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to permanently delete this photo? This clears it from database and Cloudinary storage.`)) {
                                      try {
                                        setTabLoading(true);
                                        await deleteApprovedPhoto(photo.id, photo.url);
                                        refreshTabData();
                                        onDataChange();
                                      } catch (err) {
                                        console.error(err);
                                      } finally {
                                        setTabLoading(false);
                                      }
                                    }
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md border border-red-500"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5. VIDEOS MANAGEMENT */}
                    {activeTab === 'videos' && (
                      <div className="space-y-8">
                        <div className="bg-[#050E22]/60 p-6 rounded-2xl border border-white/5">
                          <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center gap-2">
                            <Video className="w-5 h-5" />
                            Directly Add Video to Memory Vault
                          </h4>
                          <form onSubmit={handleSaveVideo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Video Title / Caption</label>
                              <input 
                                type="text"
                                required
                                value={videoForm.title || ''}
                                onChange={(e) => setVideoForm(prev => ({...prev, title: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="e.g. Highlights of SS3 Graduation Dance"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Video YouTube URL or Stream Link</label>
                              <input 
                                type="text"
                                required
                                value={videoForm.url || ''}
                                onChange={(e) => setVideoForm(prev => ({...prev, url: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="https://www.youtube.com/watch?v=..."
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Optional Thumbnail Image URL</label>
                              <input 
                                type="text"
                                value={videoForm.thumbnailUrl || ''}
                                onChange={(e) => setVideoForm(prev => ({...prev, thumbnailUrl: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="Leave blank for automatic YouTube resolution"
                              />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                              <button 
                                type="submit" 
                                className="py-2 px-6 rounded-xl bg-[#D4A017] hover:bg-[#b58814] text-[#0F2557] font-bold text-xs cursor-pointer shadow-md"
                              >
                                Save Video Live
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* LIST RENDER */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Active Memory Vault Videos ({videosList.length})</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {videosList.map(video => (
                              <div key={video.id} className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-white/5 bg-black/40 group hover:border-[#D4A017]/55 transition-all">
                                <img src={video.thumbnailUrl || "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=400&fit=crop"} className="w-full h-full object-cover filter brightness-75 group-hover:brightness-90 transition-all" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white border border-white/15 group-hover:scale-110 transition-transform">
                                    <Play size={16} fill="white" />
                                  </div>
                                </div>
                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black to-black/0 text-left">
                                  <p className="text-[10px] font-sans font-bold text-white truncate">{video.title}</p>
                                </div>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to permanently delete this video memory?`)) {
                                      try {
                                        setTabLoading(true);
                                        await deleteApprovedVideoMemory(video.id, video.url, video.thumbnailUrl);
                                        refreshTabData();
                                        onDataChange();
                                      } catch (err) {
                                        console.error(err);
                                      } finally {
                                        setTabLoading(false);
                                      }
                                    }
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md border border-red-500"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 6. TIMELINE MILESTONES */}
                    {activeTab === 'timeline' && (
                      <div className="space-y-8">
                        <div className="bg-[#050E22]/60 p-6 rounded-2xl border border-white/5">
                          <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            {timelineForm.id ? "Edit Journey Milestone" : "Add Journey Timeline Milestone"}
                          </h4>
                          <form onSubmit={handleSaveTimeline} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Milestone Title</label>
                              <input 
                                type="text"
                                required
                                value={timelineForm.title || ''}
                                onChange={(e) => setTimelineForm(prev => ({...prev, title: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="e.g. First Academic Orientation"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Event Date / Period</label>
                              <input 
                                type="text"
                                required
                                value={timelineForm.date || ''}
                                onChange={(e) => setTimelineForm(prev => ({...prev, date: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="e.g. Sept 2020"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Event Image File</label>
                              <input 
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      setTabLoading(true);
                                      const url = await handleUploadImageFile(file);
                                      setTimelineForm(prev => ({...prev, image: url}));
                                    } catch (err: any) {
                                      alert(err.message);
                                    } finally {
                                      setTabLoading(false);
                                    }
                                  }
                                }}
                                className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20"
                              />
                              {timelineForm.image && (
                                <img src={timelineForm.image} className="w-16 h-12 object-cover rounded border border-white/10 mt-1" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Milestone Description</label>
                              <input 
                                type="text"
                                value={timelineForm.description || ''}
                                onChange={(e) => setTimelineForm(prev => ({...prev, description: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="Write description details here..."
                              />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                              {timelineForm.id && (
                                <button 
                                  type="button" 
                                  onClick={() => setTimelineForm({ date: '', title: '', description: '', image: '' })}
                                  className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white cursor-pointer"
                                >
                                  Cancel Edit
                                </button>
                              )}
                              <button 
                                type="submit" 
                                className="py-2 px-6 rounded-xl bg-[#D4A017] hover:bg-[#b58814] text-[#0F2557] font-bold text-xs cursor-pointer shadow-md"
                              >
                                {timelineForm.id ? "Update Milestone" : "Save Milestone"}
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* LIST RENDER */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Academic Journey Milestones ({timelineList.length})</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {timelineList.map(ev => (
                              <div key={ev.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex gap-3 relative hover:border-[#D4A017]/45 transition-all">
                                <img src={ev.image} className="w-16 h-16 object-cover rounded-lg border border-white/10 bg-black/20" referrerPolicy="no-referrer" />
                                <div className="space-y-1 text-xs truncate">
                                  <p className="font-serif font-bold text-white truncate">{ev.title}</p>
                                  <p className="text-[#D4A017] font-mono text-[9px] truncate">{ev.date}</p>
                                  <p className="text-white/50 text-[9px] truncate">{ev.description}</p>
                                </div>

                                <div className="absolute top-2 right-2 flex gap-1">
                                  <button 
                                    onClick={() => setTimelineForm(ev)}
                                    className="p-1.5 bg-white/5 hover:bg-white/10 text-[#D4A017] rounded-lg border border-white/5 cursor-pointer"
                                    title="Edit Event"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to permanently delete milestone event "${ev.title}"?`)) {
                                        try {
                                          setTabLoading(true);
                                          await deleteApprovedTimelineEvent(ev.id, ev.image);
                                          refreshTabData();
                                          onDataChange();
                                        } catch (err) {
                                          console.error(err);
                                        } finally {
                                          setTabLoading(false);
                                        }
                                      }
                                    }}
                                    className="p-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 rounded-lg border border-rose-500/20 cursor-pointer"
                                    title="Delete Event"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 7. TEACHER TRIBUTES */}
                    {activeTab === 'tributes' && (
                      <div className="space-y-8">
                        <div className="bg-[#050E22]/60 p-6 rounded-2xl border border-white/5">
                          <h4 className="text-base font-serif font-bold text-[#D4A017] mb-4 flex items-center gap-2">
                            <Quote className="w-5 h-5" />
                            {tributeForm.id ? "Edit Teacher Tribute" : "Compose Wise Teacher Tribute Counsel"}
                          </h4>
                          <form onSubmit={handleSaveTribute} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Teacher / Mentor Name</label>
                              <input 
                                type="text"
                                required
                                value={tributeForm.name || ''}
                                onChange={(e) => setTributeForm(prev => ({...prev, name: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="e.g. Mrs. Adebayo Chinyere"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Academic Subject / Position</label>
                              <input 
                                type="text"
                                required
                                value={tributeForm.subject || ''}
                                onChange={(e) => setTributeForm(prev => ({...prev, subject: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="e.g. Chemistry HOD / VP Academics"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Portrait Photo</label>
                              <input 
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      setTabLoading(true);
                                      const url = await handleUploadImageFile(file);
                                      setTributeForm(prev => ({...prev, image: url}));
                                    } catch (err: any) {
                                      alert(err.message);
                                    } finally {
                                      setTabLoading(false);
                                    }
                                  }
                                }}
                                className="w-full text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20"
                              />
                              {tributeForm.image && (
                                <img src={tributeForm.image} className="w-12 h-12 object-cover rounded border border-white/10 mt-1" />
                              )}
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Wise Counsel Goodbye Message</label>
                              <textarea 
                                rows={3}
                                required
                                value={tributeForm.message || ''}
                                onChange={(e) => setTributeForm(prev => ({...prev, message: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="Wise instructions and final directives..."
                              />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                              {tributeForm.id && (
                                <button 
                                  type="button" 
                                  onClick={() => setTributeForm({ name: '', subject: '', message: '', image: '' })}
                                  className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white cursor-pointer"
                                >
                                  Cancel Edit
                                </button>
                              )}
                              <button 
                                type="submit" 
                                className="py-2 px-6 rounded-xl bg-[#D4A017] hover:bg-[#b58814] text-[#0F2557] font-bold text-xs cursor-pointer shadow-md"
                              >
                                {tributeForm.id ? "Update Tribute" : "Post Tribute live"}
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* LIST RENDER */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Faculty Tributes & Advice ({tributesList.length})</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {tributesList.map(tr => (
                              <div key={tr.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex gap-3 relative hover:border-[#D4A017]/45 transition-all">
                                <img src={tr.image} className="w-14 h-14 object-cover rounded-lg border border-white/10 bg-black/20 shrink-0" referrerPolicy="no-referrer" />
                                <div className="space-y-1 text-xs truncate">
                                  <p className="font-serif font-bold text-white truncate">{tr.name}</p>
                                  <p className="text-[#D4A017] font-mono text-[9px] truncate">{tr.subject}</p>
                                  <p className="text-white/50 text-[9px] truncate font-serif italic">"{tr.message}"</p>
                                </div>

                                <div className="absolute top-2 right-2 flex gap-1">
                                  <button 
                                    onClick={() => setTributeForm(tr)}
                                    className="p-1.5 bg-white/5 hover:bg-white/10 text-[#D4A017] rounded-lg border border-white/5 cursor-pointer"
                                    title="Edit Tribute"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to permanently delete teacher tribute for "${tr.name}"?`)) {
                                        try {
                                          setTabLoading(true);
                                          await deleteApprovedTeacherTribute(tr.id, tr.image);
                                          refreshTabData();
                                          onDataChange();
                                        } catch (err) {
                                          console.error(err);
                                        } finally {
                                          setTabLoading(false);
                                        }
                                      }
                                    }}
                                    className="p-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 rounded-lg border border-rose-500/20 cursor-pointer"
                                    title="Delete Tribute"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 8. MANAGE ADMIN ACCOUNTS */}
                    {activeTab === 'admins' && (
                      <div className="flex flex-col md:flex-row gap-8 min-h-0 h-full">
                        {/* LEFT PANEL: ADD ADMIN */}
                        <div className="w-full md:w-1/2 space-y-6">
                          <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <UserPlus className="w-5 h-5 text-[#D4A017]" />
                              <h3 className="text-lg font-serif font-bold">Authorize New Administrator</h3>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                              Enter any Google (Gmail) address below to authorize admin dashboard privileges. Authorizing an account lets them manage graduands, superlatives, and photo collections.
                            </p>

                            <form onSubmit={handleAddAdmin} className="space-y-4 pt-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1">Gmail Address</label>
                                <input
                                  type="email"
                                  required
                                  placeholder="e.g. classmate@gmail.com"
                                  value={newAdminEmail}
                                  onChange={(e) => setNewAdminEmail(e.target.value)}
                                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white"
                                />
                              </div>

                              {addAdminError && (
                                <p className="text-red-400 text-xs font-mono font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  {addAdminError}
                                </p>
                              )}

                              <button
                                type="submit"
                                disabled={addAdminLoading}
                                className="w-full py-3 bg-[#D4A017] hover:bg-[#D4A017]/90 text-[#0F2557] font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                              >
                                {addAdminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Authorize Email</span>}
                              </button>
                            </form>
                          </div>

                          <div className="bg-[#D4A017]/5 border border-[#D4A017]/15 rounded-2xl p-4 flex gap-3">
                            <Shield className="w-5 h-5 text-[#D4A017] shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-bold text-white mb-1">Security Recommendation</h4>
                              <p className="text-[11px] text-white/70 leading-relaxed">
                                Only authorize trusted emails. All authorized Gmails get full unrestricted database read/write permissions.
                              </p>
                            </div>
                          </div>

                          {/* SCHOOL BRAND SETTINGS */}
                          <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Camera className="w-5 h-5 text-[#D4A017]" />
                              <h3 className="text-lg font-serif font-bold">School Brand Settings</h3>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                              Upload the official school logo here. It will replace the default text indicators across headers, landing pages, and footers.
                            </p>

                            <div className="space-y-4 pt-2">
                              <div className="relative border-2 border-dashed border-[#D4A017]/30 hover:border-[#D4A017] rounded-2xl p-4 transition-all text-center bg-black/20">
                                {schoolLogo ? (
                                  <div className="space-y-2">
                                    <img src={schoolLogo} className="w-16 h-16 object-contain rounded-lg border border-white/10 mx-auto" referrerPolicy="no-referrer" />
                                    <div className="flex items-center justify-center gap-3">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (confirm("Are you sure you want to revert to the default text badges?")) {
                                            setTabLoading(true);
                                            try {
                                              await saveSchoolLogo('');
                                              setSchoolLogo('');
                                              onDataChange();
                                              setFeedbackMsg('School logo has been reverted to default badges.');
                                            } catch (err: any) {
                                              alert(err.message || "Failed to reset logo.");
                                            } finally {
                                              setTabLoading(false);
                                            }
                                          }
                                        }}
                                        className="text-[10px] text-red-400 hover:underline font-mono uppercase font-bold"
                                      >
                                        Revert to Default
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <label className="cursor-pointer block">
                                    {tabLoading ? (
                                      <div className="flex flex-col items-center justify-center gap-1">
                                        <Loader2 className="w-6 h-6 text-[#D4A017] animate-spin" />
                                        <span className="text-[10px] font-semibold text-white/60">Uploading logo...</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center text-white/40">
                                        <Upload size={20} className="text-[#D4A017] mb-1.5 mx-auto" />
                                        <span className="text-xs font-bold text-white/80">Upload official logo</span>
                                        <span className="text-[9px]">Max 5MB</span>
                                      </div>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          try {
                                            setTabLoading(true);
                                            const url = await handleUploadImageFile(file);
                                            await saveSchoolLogo(url);
                                            setSchoolLogo(url);
                                            onDataChange();
                                            setFeedbackMsg('School brand logo uploaded successfully!');
                                          } catch (err: any) {
                                            alert(err.message || "Failed to upload logo.");
                                          } finally {
                                            setTabLoading(false);
                                          }
                                        }
                                      }}
                                      disabled={tabLoading}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* WEBSITE BANNER PREVIEW SETTING */}
                          <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="w-5 h-5 text-[#D4A017]" />
                              <h3 className="text-lg font-serif font-bold">Homepage Banner Event</h3>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                              Select which event album photos should be featured in the homepage's scrolling banner marquee. If "Latest Event (Automatic)" is selected, the banner will automatically show photos from the event that was uploaded last.
                            </p>

                            <div className="space-y-2 pt-2">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1">Active Event Preview</label>
                              <select
                                value={activeBannerEvent}
                                onChange={async (e) => {
                                  const val = e.target.value;
                                  setTabLoading(true);
                                  try {
                                    await saveActiveBannerEvent(val);
                                    setActiveBannerEventState(val);
                                    setFeedbackMsg(val ? `Homepage banner set to showcase "${val}"!` : 'Homepage banner set to automatically showcase the latest event!');
                                    onDataChange();
                                  } catch (err: any) {
                                    alert(err.message || "Failed to save banner event setting.");
                                  } finally {
                                    setTabLoading(false);
                                  }
                                }}
                                disabled={tabLoading}
                                className="w-full px-4 py-3 bg-black/40 border border-[#D4A017]/30 hover:border-[#D4A017] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A017]/20 focus:border-[#D4A017] text-white cursor-pointer"
                              >
                                <option value="" className="bg-[#050E22] text-white">Latest Event (Automatic)</option>
                                {uniqueEventsList.map(eventTitle => (
                                  <option key={eventTitle} value={eventTitle} className="bg-[#050E22] text-white">
                                    {eventTitle}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT PANEL: CURRENT ADMINS LIST */}
                        <div className="w-full md:w-1/2 flex flex-col bg-[#050E22]/20 border border-white/5 p-6 rounded-2xl overflow-y-visible md:overflow-y-auto">
                          <div className="flex items-center justify-between mb-4 shrink-0">
                            <div className="flex items-center gap-2">
                              <Shield className="w-5 h-5 text-[#D4A017]" />
                              <h3 className="text-lg font-serif font-bold">Authorized Administrators</h3>
                            </div>
                          </div>

                          <div className="space-y-3 flex-grow overflow-y-visible md:overflow-y-auto">
                            {/* Super Admin Immutable */}
                            <div className="bg-[#050E22]/50 border-2 border-[#D4A017]/30 rounded-xl p-4 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-bold text-white font-mono">justfashion414@gmail.com</p>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4A017] font-bold">Primary Super Admin</span>
                              </div>
                              <span className="px-2 py-1 bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold">Immutable</span>
                            </div>

                            {fetchingAdmins ? (
                              <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-6 h-6 text-[#D4A017] animate-spin" />
                              </div>
                            ) : (
                              adminsList
                                .filter(admin => admin.email !== 'justfashion414@gmail.com')
                                .map(admin => (
                                  <div key={admin.email} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-bold text-white font-mono">{admin.email}</p>
                                      <p className="text-[9px] text-white/40 font-mono mt-0.5">
                                        Added {new Date(admin.addedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAdmin(admin.email)}
                                      className="p-2 hover:bg-red-500/15 text-red-400 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'settings' && (
                      <div className="flex-grow flex flex-col lg:flex-row gap-6 overflow-y-visible md:overflow-y-auto h-full pr-1 pb-12 min-h-0">
                        {/* LEFT COLUMN: CUSTOMIZERS */}
                        <div className="w-full lg:w-7/12 space-y-6">
                          
                          {/* ABOUT SCHOOL PANEL */}
                          <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <BookOpen className="w-5 h-5 text-[#D4A017]" />
                              <h3 className="text-lg font-serif font-bold">Customize About the School</h3>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                              Customize the "About the School" section. The admin has full control to change titles, add descriptions, edit the school's proprietor, and upload or remove their official photograph.
                            </p>

                            <form onSubmit={handleSaveAboutSchool} className="space-y-4 pt-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1">Section Title</label>
                                  <input
                                    type="text"
                                    value={aboutSettings.aboutTitle}
                                    onChange={(e) => setAboutSettings(prev => ({ ...prev, aboutTitle: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#D4A017] text-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1">Section Sub-text (Italic)</label>
                                  <input
                                    type="text"
                                    value={aboutSettings.aboutSubtitle}
                                    onChange={(e) => setAboutSettings(prev => ({ ...prev, aboutSubtitle: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#D4A017] text-white"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1">About Text / History</label>
                                <textarea
                                  rows={4}
                                  value={aboutSettings.aboutText}
                                  onChange={(e) => setAboutSettings(prev => ({ ...prev, aboutText: e.target.value }))}
                                  className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#D4A017] text-white font-sans leading-relaxed"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1">Proprietor Name</label>
                                  <input
                                    type="text"
                                    value={aboutSettings.aboutProprietorName}
                                    onChange={(e) => setAboutSettings(prev => ({ ...prev, aboutProprietorName: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#D4A017] text-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1">Proprietor Role</label>
                                  <input
                                    type="text"
                                    value={aboutSettings.aboutProprietorRole}
                                    onChange={(e) => setAboutSettings(prev => ({ ...prev, aboutProprietorRole: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#D4A017] text-white"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1 block">Proprietor Photograph</label>
                                  <div className="flex flex-wrap items-center gap-4 bg-black/20 p-3 rounded-xl border border-white/5 h-24">
                                    {aboutSettings.aboutImage ? (
                                      <>
                                        <img src={aboutSettings.aboutImage} className="w-10 h-12 object-cover rounded border border-white/10 shrink-0" referrerPolicy="no-referrer" />
                                        <div className="flex flex-col gap-0.5">
                                          <button
                                            type="button"
                                            onClick={handleRemoveProprietorImage}
                                            className="text-[10px] font-mono font-bold text-red-400 hover:underline uppercase text-left cursor-pointer"
                                          >
                                            Remove Photo
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-[10px] text-white/50 italic py-1">No proprietor photo.</div>
                                    )}

                                    <div className="ml-auto">
                                      <label className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-mono uppercase tracking-wider font-bold cursor-pointer transition-colors block">
                                        {tabLoading ? "..." : aboutSettings.aboutImage ? "Replace" : "Upload"}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          disabled={tabLoading}
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleProprietorImageUpload(file);
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider pl-1 block">School Brand Logo</label>
                                  <div className="flex flex-wrap items-center gap-4 bg-black/20 p-3 rounded-xl border border-white/5 h-24">
                                    {schoolLogo ? (
                                      <>
                                        <img src={schoolLogo} className="w-10 h-10 object-contain rounded border border-white/10 shrink-0 bg-white/5 p-0.5" referrerPolicy="no-referrer" />
                                        <div className="flex flex-col gap-0.5">
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              if (confirm("Are you sure you want to revert the logo?")) {
                                                setTabLoading(true);
                                                try {
                                                  await saveSchoolLogo('');
                                                  setSchoolLogo('');
                                                  onDataChange();
                                                  setFeedbackMsg('School logo has been reverted to default badges.');
                                                } catch (err: any) {
                                                  alert(err.message || "Failed to reset logo.");
                                                } finally {
                                                  setTabLoading(false);
                                                }
                                              }
                                            }}
                                            className="text-[10px] font-mono font-bold text-red-400 hover:underline uppercase text-left cursor-pointer"
                                          >
                                            Revert
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-[10px] text-white/50 italic py-1">No logo.</div>
                                    )}

                                    <div className="ml-auto">
                                      <label className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-mono uppercase tracking-wider font-bold cursor-pointer transition-colors block">
                                        {tabLoading ? "..." : schoolLogo ? "Replace" : "Upload"}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          disabled={tabLoading}
                                          className="hidden"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              try {
                                                setTabLoading(true);
                                                const url = await handleUploadImageFile(file);
                                                await saveSchoolLogo(url);
                                                setSchoolLogo(url);
                                                onDataChange();
                                                setFeedbackMsg('School brand logo uploaded successfully!');
                                              } catch (err: any) {
                                                alert(err.message || "Failed to upload logo.");
                                              } finally {
                                                setTabLoading(false);
                                              }
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="submit"
                                disabled={tabLoading}
                                className="w-full py-2.5 bg-[#D4A017] hover:bg-[#D4A017]/90 text-[#0F2557] font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                              >
                                {tabLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save About School Settings</span>}
                              </button>
                            </form>
                          </div>

                          {/* SECTION HEADERS CUSTOMIZER */}
                          <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-5 h-5 text-[#D4A017]" />
                              <h3 className="text-lg font-serif font-bold">Configure Section Headers</h3>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                              Customize titles and sub-texts for main components rendered on the homepage.
                            </p>

                            <form onSubmit={handleSaveHeaders} className="space-y-4 pt-2">
                              {/* Graduand Title */}
                              <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-3">
                                <span className="text-[9px] font-mono font-bold text-[#D4A017] uppercase tracking-wider">Graduand Wall Headers</span>
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={headerSettings.graduandsTitle}
                                    placeholder="Title"
                                    onChange={(e) => setHeaderSettings(prev => ({ ...prev, graduandsTitle: e.target.value }))}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#D4A017] text-white"
                                  />
                                  <textarea
                                    rows={2}
                                    value={headerSettings.graduandsSubtitle}
                                    placeholder="Subtitle"
                                    onChange={(e) => setHeaderSettings(prev => ({ ...prev, graduandsSubtitle: e.target.value }))}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#D4A017] text-white"
                                  />
                                </div>
                              </div>

                              {/* Memory Sticky Board Title */}
                              <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-3">
                                <span className="text-[9px] font-mono font-bold text-[#D4A017] uppercase tracking-wider">Memory Sticky Board Headers</span>
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={headerSettings.guestbookTitle}
                                    placeholder="Title"
                                    onChange={(e) => setHeaderSettings(prev => ({ ...prev, guestbookTitle: e.target.value }))}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#D4A017] text-white"
                                  />
                                  <textarea
                                    rows={2}
                                    value={headerSettings.guestbookSubtitle}
                                    placeholder="Subtitle"
                                    onChange={(e) => setHeaderSettings(prev => ({ ...prev, guestbookSubtitle: e.target.value }))}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#D4A017] text-white"
                                  />
                                </div>
                              </div>

                              {/* Teacher Tributes Title */}
                              <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-3">
                                <span className="text-[9px] font-mono font-bold text-[#D4A017] uppercase tracking-wider">Teacher Tributes Headers</span>
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={headerSettings.teachersTitle}
                                    placeholder="Title"
                                    onChange={(e) => setHeaderSettings(prev => ({ ...prev, teachersTitle: e.target.value }))}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#D4A017] text-white"
                                  />
                                  <textarea
                                    rows={2}
                                    value={headerSettings.teachersSubtitle}
                                    placeholder="Subtitle"
                                    onChange={(e) => setHeaderSettings(prev => ({ ...prev, teachersSubtitle: e.target.value }))}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#D4A017] text-white"
                                  />
                                </div>
                              </div>

                              <button
                                type="submit"
                                disabled={tabLoading}
                                className="w-full py-2.5 bg-[#D4A017] hover:bg-[#D4A017]/90 text-[#0F2557] font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                              >
                                {tabLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Section Headers</span>}
                              </button>
                            </form>
                          </div>

                        </div>

                        {/* RIGHT COLUMN: COMPONENT VISIBILITY ("UN-SEEING") & ORDER CUSTOMIZER */}
                        <div className="w-full lg:w-5/12 space-y-6">
                          
                          {/* COMPONENT VISIBILITY PANEL */}
                          <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <Eye className="w-5 h-5 text-[#D4A017]" />
                              <h3 className="text-lg font-serif font-bold">Component Visibility ("Un-seeing")</h3>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                              Toggle individual sections on or off. Hiding a component makes it completely invisible to campus users instantly.
                            </p>

                            <div className="space-y-2.5 pt-2">
                              {[
                                { id: 'about', label: 'About the School' },
                                { id: 'graduands', label: 'Graduand Wall' },
                                { id: 'superlatives', label: 'Medal Superlatives' },
                                { id: 'teachers', label: 'Teacher Tributes' },
                                { id: 'photos', label: 'Photo Album' },
                                { id: 'timeline', label: 'Milestones & Timeline' },
                                { id: 'videos', label: 'Video Vault' },
                                { id: 'countdown', label: 'Countdown Timer' },
                                { id: 'guestbook', label: 'Memory Sticky Board' },
                                { id: 'closing', label: 'Social & Closing Shares' },
                                ...customSectionsList.map(cs => ({ id: cs.id, label: `Custom Section: ${cs.title}` }))
                              ].map(item => {
                                const isVisible = item.id.startsWith('sect-')
                                  ? (customSectionsList.find(cs => cs.id === item.id)?.visible !== false)
                                  : (componentVisibility[item.id] !== false);
                                return (
                                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                                    <span className="text-xs font-semibold">{item.label}</span>
                                    <button
                                      type="button"
                                      disabled={tabLoading}
                                      onClick={() => handleToggleVisibility(item.id, isVisible)}
                                      className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                                        isVisible 
                                          ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/25' 
                                          : 'bg-rose-600/15 text-rose-400 border border-rose-500/30 hover:bg-rose-600/25'
                                      }`}
                                    >
                                      {isVisible ? "● VISIBLE" : "○ HIDDEN (UN-SEEN)"}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* RE-ARRANGEMENT PANEL */}
                          <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <RefreshCw className="w-5 h-5 text-[#D4A017]" />
                              <h3 className="text-lg font-serif font-bold">Homepage Section Ordering</h3>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                              Move sections up or down to re-arrange the visual order of the school landing page dynamically.
                            </p>

                            <div className="space-y-2 pt-2">
                              {sectionOrder.map((sectionId, idx) => {
                                const labels: Record<string, string> = {
                                  about: 'About the School',
                                  graduands: 'Graduand Wall',
                                  superlatives: 'Medal Superlatives',
                                  teachers: 'Teacher Tributes',
                                  photos: 'Photo Album',
                                  timeline: 'Milestones & Timeline',
                                  videos: 'Video Vault',
                                  countdown: 'Countdown Timer',
                                  guestbook: 'Memory Sticky Board',
                                  closing: 'Social & Closing Shares'
                                };
                                const customSec = customSectionsList.find(cs => cs.id === sectionId);
                                const label = customSec 
                                  ? `Custom: ${customSec.title}`
                                  : (labels[sectionId] || sectionId);
                                const isFirst = idx === 0;
                                const isLast = idx === sectionOrder.length - 1;

                                return (
                                  <div key={sectionId} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono font-bold text-[#D4A017] bg-white/5 w-5 h-5 rounded flex items-center justify-center border border-white/5">{idx + 1}</span>
                                      <span className="text-xs font-semibold">{label}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={isFirst || tabLoading}
                                        onClick={() => handleMoveSection(idx, 'up')}
                                        className="p-1.5 bg-white/5 hover:bg-[#D4A017] hover:text-[#0F2557] rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white"
                                      >
                                        <ArrowUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isLast || tabLoading}
                                        onClick={() => handleMoveSection(idx, 'down')}
                                        className="p-1.5 bg-white/5 hover:bg-[#D4A017] hover:text-[#0F2557] rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white"
                                      >
                                        <ArrowDown className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      </div>
                    )}

                    {/* 10. CUSTOM SECTION MANAGER */}
                    {activeTab === 'custom_sections' && (
                      <div className="flex-grow flex flex-col gap-6 overflow-y-visible md:overflow-y-auto h-full pr-1 pb-12 min-h-0 text-left">
                        <div className="bg-[#050E22]/60 p-6 rounded-2xl border border-white/5 space-y-4">
                          <h4 className="text-base font-serif font-bold text-[#D4A017] flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            {customSectionForm.id ? "Edit Custom Section" : "Add Custom Content Section"}
                          </h4>
                          <p className="text-xs text-white/60 leading-relaxed">
                            Create a custom container element on the website homepage. You can input custom titles, subtext parameters, and optionally embed an image or video file. Set an order index to arrange where it fits relative to other custom sections.
                          </p>

                          <form onSubmit={handleSaveCustomSection} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Section Header / Title</label>
                              <input 
                                type="text"
                                required
                                value={customSectionForm.title || ''}
                                onChange={(e) => setCustomSectionForm(prev => ({...prev, title: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="e.g. 2026 Special Global Award"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Section Layout Preset & Purpose</label>
                              <select 
                                value={customSectionForm.layoutType || 'standard'}
                                onChange={(e) => setCustomSectionForm(prev => ({...prev, layoutType: e.target.value as any}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono"
                              >
                                <option value="standard">Standard Alternating Split Media/Text</option>
                                <option value="birthday">🎉 Birthday / Celebration Spotlight Card</option>
                                <option value="announcement">📢 Important Notice / Alert Banner</option>
                                <option value="spotlight">🏆 Spotlight Commendation / Big Quote</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Display Order (Order Index)</label>
                              <input 
                                type="number"
                                value={customSectionForm.orderIndex || 0}
                                onChange={(e) => setCustomSectionForm(prev => ({...prev, orderIndex: Number(e.target.value)}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="e.g. 0 or 1"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Optional Section Media Type</label>
                              <select 
                                value={customSectionForm.mediaType || 'none'}
                                onChange={(e) => setCustomSectionForm(prev => ({...prev, mediaType: e.target.value as any, mediaUrl: ''}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono"
                              >
                                <option value="none">No Image or Video</option>
                                <option value="image">Image Attachment</option>
                                <option value="video">Video Attachment</option>
                              </select>
                            </div>

                            <div className="space-y-1 md:col-span-2">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Section Content Subtext / Paragraph Body / Quote</label>
                              <textarea 
                                rows={3}
                                value={customSectionForm.subtext || ''}
                                onChange={(e) => setCustomSectionForm(prev => ({...prev, subtext: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="Describe this custom section in detail or enter a celebratory message..."
                              />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-1">Media Resource URL (Image/Video Direct Link)</label>
                              <input 
                                type="text"
                                value={customSectionForm.mediaUrl || ''}
                                onChange={(e) => setCustomSectionForm(prev => ({...prev, mediaUrl: e.target.value}))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                                placeholder="Paste direct URL, or upload file below..."
                              />
                            </div>

                            {customSectionForm.mediaType !== 'none' && (
                              <div className="md:col-span-2 bg-black/20 p-4 rounded-xl border border-white/5 space-y-2">
                                <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block">
                                  Upload {customSectionForm.mediaType === 'image' ? 'Image File' : 'Video File'}
                                </label>
                                <input 
                                  type="file"
                                  accept={customSectionForm.mediaType === 'image' ? "image/*" : "video/*"}
                                  disabled={tabLoading}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        setTabLoading(true);
                                        let url = '';
                                        if (customSectionForm.mediaType === 'image') {
                                          url = await handleUploadImageFile(file);
                                        } else {
                                          url = await handleUploadVideoFile(file);
                                        }
                                        setCustomSectionForm(prev => ({...prev, mediaUrl: url}));
                                      } catch (err: any) {
                                        alert(err.message);
                                      } finally {
                                        setTabLoading(false);
                                      }
                                    }
                                  }}
                                  className="w-full text-xs text-white/50 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-mono file:font-bold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20"
                                />
                                {customSectionForm.mediaUrl && (
                                  <div className="mt-2">
                                    <p className="text-[9px] font-mono text-[#D4A017] mb-1">Uploaded Resource Preview:</p>
                                    {customSectionForm.mediaType === 'image' ? (
                                      <img src={customSectionForm.mediaUrl} className="max-h-32 object-contain rounded border border-white/10" referrerPolicy="no-referrer" />
                                    ) : (
                                      <video src={customSectionForm.mediaUrl} controls className="max-h-32 rounded border border-white/10" />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                              {customSectionForm.id && (
                                <button 
                                  type="button" 
                                  onClick={() => setCustomSectionForm({ title: '', subtext: '', mediaUrl: '', mediaType: 'none', orderIndex: 0, layoutType: 'standard' })}
                                  className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white cursor-pointer"
                                >
                                  Cancel Edit
                                </button>
                              )}
                              <button 
                                type="submit" 
                                className="py-2 px-6 rounded-xl bg-[#D4A017] hover:bg-[#b58814] text-[#0F2557] font-bold text-xs cursor-pointer shadow-md"
                              >
                                {customSectionForm.id ? "Update Custom Section" : "Save / Create Section"}
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* CUSTOM SECTIONS LIST */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase tracking-widest text-[#D4A017] font-bold">Active Dynamic Sections ({customSectionsList.length})</h4>
                          {customSectionsList.length === 0 ? (
                            <p className="text-xs text-white/40 italic">No custom sections created yet. Use the form above to add a dynamic section.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {customSectionsList.map(section => (
                                <div key={section.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex gap-3 relative hover:border-[#D4A017]/45 transition-all">
                                  {section.mediaUrl && section.mediaType === 'image' && (
                                    <img src={section.mediaUrl} className="w-16 h-16 object-cover rounded-lg border border-white/10 bg-black/20 shrink-0" referrerPolicy="no-referrer" />
                                  )}
                                  {section.mediaUrl && section.mediaType === 'video' && (
                                    <div className="w-16 h-16 bg-black/50 border border-white/10 rounded-lg flex items-center justify-center shrink-0">
                                      <Video className="w-6 h-6 text-[#D4A017]" />
                                    </div>
                                  )}
                                  <div className="space-y-1 text-xs truncate flex-grow">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/60">Idx: {section.orderIndex}</span>
                                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#D4A017]/15 text-[#D4A017] uppercase tracking-wider">
                                        {section.layoutType || 'standard'}
                                      </span>
                                      <p className="font-serif font-bold text-white truncate max-w-full">{section.title}</p>
                                    </div>
                                    <p className="text-white/60 text-[10px] leading-relaxed truncate">{section.subtext}</p>
                                    <p className="text-[#D4A017] font-mono text-[9px] uppercase tracking-wider">
                                      Media type: {section.mediaType}
                                    </p>
                                  </div>

                                  <div className="absolute top-2 right-2 flex gap-1">
                                    <button 
                                      onClick={() => setCustomSectionForm(section)}
                                      className="p-1.5 bg-white/5 hover:bg-white/10 text-[#D4A017] rounded-lg border border-white/5 cursor-pointer"
                                      title="Edit Section"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteCustomSection(section.id, section.title, section.mediaUrl)}
                                      className="p-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 rounded-lg border border-rose-500/20 cursor-pointer"
                                      title="Delete Section"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL-SCREEN IMMERSIVE MEDIA LIGHTBOX */}
      <AnimatePresence>
        {previewMedia && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewMedia(null)}
              className="absolute inset-0 bg-[#050E22]/95 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-[#0F2557] border border-[#D4A017]/30 rounded-3xl overflow-hidden w-full max-w-4xl shadow-2xl z-10 flex flex-col max-h-[90vh] text-white"
            >
              <button
                onClick={() => setPreviewMedia(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 border border-white/15 flex items-center justify-center hover:bg-[#D4A017] hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex-grow flex items-center justify-center bg-black/80 aspect-video relative overflow-hidden min-h-[30vh]">
                {previewMedia.type === 'video' ? (
                  (() => {
                    const ytId = getYouTubeID(previewMedia.url);
                    const iframeSrc = ytId ? `https://www.youtube.com/embed/${ytId}` : previewMedia.url;
                    return (
                      <iframe
                        className="w-full h-full min-h-[320px]"
                        src={iframeSrc}
                        allowFullScreen
                      />
                    );
                  })()
                ) : (
                  <img src={previewMedia.url} className="max-h-[60vh] md:max-h-[70vh] w-full object-contain" referrerPolicy="no-referrer" />
                )}
              </div>

              <div className="p-6 bg-[#050E22] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 bg-[#D4A017]/20 text-[#D4A017] text-[9px] font-mono font-bold uppercase tracking-widest rounded-full">
                    Media Review
                  </span>
                  <h4 className="text-base font-serif font-bold text-white">{previewMedia.title}</h4>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      handleModerationAction(previewMedia.id, 'approve');
                      setPreviewMedia(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    onClick={() => {
                      handleModerationAction(previewMedia.id, 'reject');
                      setPreviewMedia(null);
                    }}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Helpers to extract embed IDs
function getYouTubeID(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}
