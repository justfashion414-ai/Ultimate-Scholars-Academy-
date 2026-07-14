import { useState, useEffect, FormEvent } from 'react';
import { 
  BookOpen, FileText, Eye, RefreshCw, Layers, Plus, Edit2, Trash2, Loader2, ArrowUp, ArrowDown 
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  doc, setDoc, getDoc, collection, getDocs 
} from 'firebase/firestore';
import { 
  fetchCustomSections, 
  addApprovedCustomSection, 
  updateApprovedCustomSection, 
  deleteApprovedCustomSection 
} from '../../lib/firebaseService';
import { CustomSection } from '../../types';
import { handleUploadImageFile } from './adminUtils';

interface SettingsPanelProps {
  onDataChange: () => void;
  refreshKey?: number;
}

export default function SettingsPanel({ onDataChange, refreshKey = 0 }: SettingsPanelProps) {
  const [tabLoading, setTabLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // About settings state
  const [aboutSettings, setAboutSettings] = useState({
    aboutTitle: 'Our Academic Institution',
    aboutSubtitle: 'A Legacy of Excellence & Character',
    aboutText: 'Established with a vision to nurture future leaders, our school has been a beacon of hope and excellence for generations.',
    aboutProprietorName: 'Dr. (Mrs.) J. O. Amao',
    aboutProprietorRole: 'Proprietress & Director of Studies',
    aboutImage: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400'
  });

  // School Logo
  const [schoolLogo, setSchoolLogo] = useState('');

  // Headers settings state
  const [headerSettings, setHeaderSettings] = useState({
    graduandsTitle: 'THE CLASS OF 2026',
    graduandsSubtitle: 'Celebrating our outstanding graduating scholars.',
    guestbookTitle: 'MEMORY STICKY BOARD',
    guestbookSubtitle: 'Leave a lovely tribute, congratulatory message, or advice.',
    teachersTitle: 'TEACHER TRIBUTES',
    teachersSubtitle: 'Heartfelt appreciation from students to our wonderful mentors.'
  });

  // Visibility state
  const [componentVisibility, setComponentVisibility] = useState<Record<string, boolean>>({});

  // Ordering state
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'about', 'graduands', 'superlatives', 'teachers', 'photos', 'timeline', 'videos', 'countdown', 'guestbook', 'closing'
  ]);

  // Custom Sections state
  const [customSectionsList, setCustomSectionsList] = useState<CustomSection[]>([]);
  const [customSectionForm, setCustomSectionForm] = useState<Partial<CustomSection>>({
    title: '', subtext: '', mediaUrl: '', mediaType: 'none', orderIndex: 0, layoutType: 'standard', subLabel: ''
  });

  const loadSettingsData = async () => {
    setTabLoading(true);
    setFeedbackMsg('');
    try {
      // 1. Load school settings
      const schoolDoc = await getDoc(doc(db, "settings", "school"));
      if (schoolDoc.exists()) {
        setAboutSettings(prev => ({ ...prev, ...schoolDoc.data() }));
      }

      // 2. Load school logo
      const logoDoc = await getDoc(doc(db, "settings", "school_logo"));
      if (logoDoc.exists()) {
        setSchoolLogo(logoDoc.data().logoUrl || '');
      }

      // 3. Load titles
      const titlesDoc = await getDoc(doc(db, "settings", "titles"));
      if (titlesDoc.exists()) {
        const d = titlesDoc.data();
        setHeaderSettings({
          graduandsTitle: d.graduands?.title || 'THE CLASS OF 2026',
          graduandsSubtitle: d.graduands?.subtitle || 'Celebrating our outstanding graduating scholars.',
          guestbookTitle: d.guestbook?.title || 'MEMORY STICKY BOARD',
          guestbookSubtitle: d.guestbook?.subtitle || 'Leave a lovely tribute, congratulatory message, or advice.',
          teachersTitle: d.teachers?.title || 'TEACHER TRIBUTES',
          teachersSubtitle: d.teachers?.subtitle || 'Heartfelt appreciation from students to our wonderful mentors.'
        });
      }

      // 4. Load visibility
      const visibilityDoc = await getDoc(doc(db, "settings", "visibility"));
      if (visibilityDoc.exists()) {
        setComponentVisibility(visibilityDoc.data());
      }

      // 5. Load section order
      const orderDoc = await getDoc(doc(db, "settings", "order"));
      if (orderDoc.exists() && orderDoc.data().sections) {
        setSectionOrder(orderDoc.data().sections);
      }

      // 6. Load custom sections
      const customSections = await fetchCustomSections();
      setCustomSectionsList(customSections);
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setTabLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, [refreshKey]);

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

  const handleRemoveProprietorImage = () => {
    setAboutSettings(prev => ({ ...prev, aboutImage: '' }));
    setFeedbackMsg("Proprietor photo marked for removal. Be sure to click 'Save About School' to apply.");
  };

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
      setFeedbackMsg("Homepage section headers updated successfully!");
      onDataChange();
    } catch (err: any) {
      alert("Error saving section headers: " + err.message);
    } finally {
      setTabLoading(false);
    }
  };

  const handleSaveCustomSection = async (e: FormEvent) => {
    e.preventDefault();
    if (!customSectionForm.title) return;
    setTabLoading(true);
    setFeedbackMsg('');
    try {
      const sectionId = customSectionForm.id || `sect-${Date.now()}`;
      const payload: CustomSection = {
        id: sectionId,
        title: customSectionForm.title,
        subtext: customSectionForm.subtext || '',
        subLabel: customSectionForm.subLabel || '',
        mediaUrl: customSectionForm.mediaUrl || '',
        mediaType: customSectionForm.mediaType || 'none',
        layoutType: customSectionForm.layoutType || 'standard',
        orderIndex: customSectionForm.orderIndex || customSectionsList.length,
        visible: customSectionForm.visible !== false
      };

      if (customSectionForm.id) {
        await updateApprovedCustomSection(payload);
        setFeedbackMsg("Custom section updated successfully!");
      } else {
        await addApprovedCustomSection(payload);
        setFeedbackMsg("New custom section published live!");
      }

      setCustomSectionForm({
        title: '', subtext: '', mediaUrl: '', mediaType: 'none', orderIndex: 0, layoutType: 'standard', subLabel: ''
      });
      const updated = await fetchCustomSections();
      setCustomSectionsList(updated);
      onDataChange();
    } catch (err: any) {
      alert("Error saving custom section: " + err.message);
    } finally {
      setTabLoading(false);
    }
  };

  const handleDeleteCustomSection = async (section: CustomSection) => {
    if (!confirm(`Are you sure you want to permanently delete custom section "${section.title}"?`)) return;
    setTabLoading(true);
    try {
      await deleteApprovedCustomSection(section.id, section.mediaUrl);
      setFeedbackMsg("Custom section deleted and purged.");
      const updated = await fetchCustomSections();
      setCustomSectionsList(updated);
      onDataChange();
    } catch (err: any) {
      alert("Error deleting section: " + err.message);
    } finally {
      setTabLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col lg:flex-row gap-6 overflow-y-visible md:overflow-y-auto h-full pr-1 pb-12 min-h-0 text-left">
      {/* LEFT COLUMN: CUSTOMIZERS */}
      <div className="w-full lg:w-7/12 space-y-6">
        
        {feedbackMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
            <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* ABOUT SCHOOL PANEL */}
        <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-[#D4A017]" />
            <h3 className="text-lg font-serif font-bold text-white">Customize About the School</h3>
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

            <div className="space-y-2 pt-1">
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
        <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-[#D4A017]" />
            <h3 className="text-lg font-serif font-bold text-white">Configure Section Headers</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Customize titles and sub-texts for main components rendered on the homepage.
          </p>

          <form onSubmit={handleSaveHeaders} className="space-y-4 pt-2">
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

      {/* RIGHT COLUMN: COMPONENT VISIBILITY ("UN-SEEING"), ORDERING & CUSTOM SECTIONS */}
      <div className="w-full lg:w-5/12 space-y-6">
        
        {/* COMPONENT VISIBILITY PANEL */}
        <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-5 h-5 text-[#D4A017]" />
            <h3 className="text-lg font-serif font-bold text-white">Component Visibility</h3>
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
              ...customSectionsList.map(cs => ({ id: cs.id, label: `Custom: ${cs.title}` }))
            ].map(item => {
              const isVisible = item.id.startsWith('sect-')
                ? (customSectionsList.find(cs => cs.id === item.id)?.visible !== false)
                : (componentVisibility[item.id] !== false);
              return (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                  <span className="text-xs font-semibold text-white">{item.label}</span>
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
                    {isVisible ? "● VISIBLE" : "○ HIDDEN"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RE-ARRANGEMENT PANEL */}
        <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-5 h-5 text-[#D4A017]" />
            <h3 className="text-lg font-serif font-bold text-white">Homepage Section Ordering</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Move sections up or down to re-arrange the visual order of the school landing page dynamically.
          </p>

          <div className="space-y-2 pt-2">
            {sectionOrder.map((secId, idx) => {
              const labelMap: Record<string, string> = {
                about: 'About the School Section',
                graduands: 'Graduand Profiles Wall',
                superlatives: 'Medal Superlatives Showcase',
                teachers: 'Teacher Appreciation Tributes',
                photos: 'Memory Photo Galleries',
                timeline: 'Milestones & History Timeline',
                videos: 'Student Video Memories Vault',
                countdown: 'Target Countdown Clock',
                guestbook: 'Yearbook Sticky Guestbook',
                closing: 'Social Media Footer & Share Card'
              };
              let label = labelMap[secId] || secId;
              if (secId.startsWith('sect-')) {
                const match = customSectionsList.find(c => c.id === secId);
                label = match ? `Custom: ${match.title}` : `Custom Section (${secId})`;
              }

              return (
                <div key={secId} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-[10px] font-mono text-[#D4A017] font-bold w-4">{idx + 1}</span>
                    <span className="text-xs font-semibold text-white truncate">{label}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0 || tabLoading}
                      onClick={() => handleMoveSection(idx, 'up')}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sectionOrder.length - 1 || tabLoading}
                      onClick={() => handleMoveSection(idx, 'down')}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CUSTOM SECTIONS CREATOR */}
        <div className="bg-[#050E22]/40 border border-white/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-[#D4A017]" />
            <h3 className="text-lg font-serif font-bold text-white">Dynamic Yearbook Sections</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Create completely custom page sections on the homepage with custom titles, layouts, rich body texts, and uploaded media files.
          </p>

          <form onSubmit={handleSaveCustomSection} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-white/50 uppercase pl-1">Section Title</label>
              <input
                type="text"
                required
                value={customSectionForm.title || ''}
                onChange={(e) => setCustomSectionForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Hall of Alumni Legends"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-white/50 uppercase pl-1">Sub-label / Category tag</label>
              <input
                type="text"
                value={customSectionForm.subLabel || ''}
                onChange={(e) => setCustomSectionForm(prev => ({ ...prev, subLabel: e.target.value }))}
                placeholder="e.g. SPECIAL EVENTS"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-white/50 uppercase pl-1">Description / Narrative Text</label>
              <textarea
                rows={3}
                value={customSectionForm.subtext || ''}
                onChange={(e) => setCustomSectionForm(prev => ({ ...prev, subtext: e.target.value }))}
                placeholder="Write description body text here..."
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-white/50 uppercase pl-1">Layout Type</label>
                <select
                  value={customSectionForm.layoutType || 'standard'}
                  onChange={(e) => setCustomSectionForm(prev => ({ ...prev, layoutType: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-[#050E22] border border-white/10 rounded-xl text-xs text-white"
                >
                  <option value="standard">Standard Banner</option>
                  <option value="split">Side-by-Side Split</option>
                  <option value="editorial">Centered Minimalist</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-white/50 uppercase pl-1">Media Type</label>
                <select
                  value={customSectionForm.mediaType || 'none'}
                  onChange={(e) => setCustomSectionForm(prev => ({ ...prev, mediaType: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-[#050E22] border border-white/10 rounded-xl text-xs text-white"
                >
                  <option value="none">No Media File</option>
                  <option value="image">Still Photograph</option>
                  <option value="video">YouTube Embed Video</option>
                </select>
              </div>
            </div>

            {(customSectionForm.mediaType === 'image' || customSectionForm.mediaType === 'video') && (
              <div className="space-y-2 p-3 bg-black/20 rounded-xl border border-white/5">
                <span className="text-[9px] font-mono text-[#D4A017] uppercase tracking-wider block">Media File Setup</span>
                
                {customSectionForm.mediaType === 'image' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setTabLoading(true);
                            const url = await handleUploadImageFile(file);
                            setCustomSectionForm(prev => ({ ...prev, mediaUrl: url }));
                          } catch (err: any) {
                            alert(err.message);
                          } finally {
                            setTabLoading(false);
                          }
                        }
                      }}
                      className="w-full text-xs text-white/50 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-mono file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20"
                    />
                    {customSectionForm.mediaUrl && (
                      <img src={customSectionForm.mediaUrl} className="w-20 h-12 object-cover rounded border border-white/10" />
                    )}
                  </div>
                )}

                {customSectionForm.mediaType === 'video' && (
                  <input
                    type="text"
                    value={customSectionForm.mediaUrl || ''}
                    onChange={(e) => setCustomSectionForm(prev => ({ ...prev, mediaUrl: e.target.value }))}
                    placeholder="YouTube Share Link or Embed URL"
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white"
                  />
                )}
              </div>
            )}

            <div className="flex gap-2">
              {customSectionForm.id && (
                <button
                  type="button"
                  onClick={() => setCustomSectionForm({
                    title: '', subtext: '', mediaUrl: '', mediaType: 'none', orderIndex: 0, layoutType: 'standard', subLabel: ''
                  })}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-xl text-white cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={tabLoading}
                className="flex-1 py-2 bg-[#D4A017] hover:bg-[#b58814] text-[#0F2557] font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {customSectionForm.id ? "Update Section" : "Publish Section"}
              </button>
            </div>
          </form>

          {/* CUSTOM SECTIONS LIST RENDER */}
          {customSectionsList.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest pl-1 block">Active Custom Sections ({customSectionsList.length})</span>
              <div className="space-y-2">
                {customSectionsList.map(cs => (
                  <div key={cs.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div className="text-left truncate pr-4">
                      <span className="text-[8px] font-mono text-[#D4A017] tracking-wider block">{cs.subLabel || 'CUSTOM SECTION'}</span>
                      <span className="text-xs font-bold text-white truncate block">{cs.title}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCustomSectionForm(cs)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#D4A017] cursor-pointer"
                        title="Edit Section"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomSection(cs)}
                        className="p-1.5 rounded-lg bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 border border-rose-500/15 cursor-pointer"
                        title="Delete Section"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
