/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './lib/firebase';
import { subscribeCustomSections } from './lib/firebaseService';
import { CustomSection } from './types';
import { AlertTriangle, Copy, Check, ExternalLink, Settings } from 'lucide-react';
import HeroCarousel from './components/HeroCarousel';
import AboutSchool from './components/AboutSchool';
import GraduandWall from './components/GraduandWall';
import Superlatives from './components/Superlatives';
import TeacherTributes from './components/TeacherTributes';
import MemoryTimeline from './components/MemoryTimeline';
import VideoGallery from './components/VideoGallery';
import PhotoGallery from './components/PhotoGallery';
import CountdownTimer from './components/CountdownTimer';
import Guestbook from './components/Guestbook';
import ClosingSection from './components/ClosingSection';
import CustomSectionsRenderer from './components/CustomSectionsRenderer';
import AdminPortal from './components/AdminPortal';

function AppContent({
  refreshKey,
  cleanUpMode,
  setCleanUpMode,
  handleDataChange,
  handleScrollToAlbum,
  TARGET_GRADUATION_DATE
}: {
  refreshKey: number;
  cleanUpMode: boolean;
  setCleanUpMode: (val: boolean) => void;
  handleDataChange: () => void;
  handleScrollToAlbum: () => void;
  TARGET_GRADUATION_DATE: string;
}) {
  const location = useLocation();
  const [visibility, setVisibility] = useState<Record<string, boolean>>({
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

  const [sectionOrder, setSectionOrder] = useState<string[]>([
    "about",
    "graduands",
    "superlatives",
    "teachers",
    "photos",
    "timeline",
    "videos",
    "countdown",
    "guestbook",
    "closing"
  ]);

  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = subscribeCustomSections((sections) => {
      setCustomSections(sections);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onSnapshot(doc(db, "settings", "visibility"), (docSnap) => {
      if (docSnap.exists()) {
        setVisibility(docSnap.data() as Record<string, boolean>);
      }
    }, (error) => {
      console.warn("Firestore visibility snapshot error (safe fallback):", error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onSnapshot(doc(db, "settings", "order"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.sections)) {
          setSectionOrder(data.sections);
        }
      }
    }, (error) => {
      console.warn("Firestore order snapshot error (safe fallback):", error);
    });
    return () => unsub();
  }, []);

  // Scroll restoration logic
  useEffect(() => {
    if (location.pathname === '/') {
      const params = new URLSearchParams(location.search);
      const backTo = params.get('backTo');
      if (backTo) {
        let attempts = 0;
        const interval = setInterval(() => {
          const element = document.getElementById(backTo);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          attempts++;
          if (attempts >= 10) {
            clearInterval(interval);
          }
        }, 150);
        return () => clearInterval(interval);
      } else {
        const savedScroll = sessionStorage.getItem('homeScrollY');
        if (savedScroll) {
          const timer = setTimeout(() => {
            window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' });
          }, 150);
          return () => clearTimeout(timer);
        }
      }
    } else {
      // Subpages always start at the top
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.location.pathname === '/' && !window.location.search.includes('backTo=')) {
        sessionStorage.setItem('homeScrollY', window.scrollY.toString());
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const DEFAULT_SECTION_KEYS = [
    "about", "graduands", "superlatives", "teachers", "photos", "timeline", "videos", "countdown", "guestbook", "closing"
  ];

  // Merge loaded sectionOrder with any custom sections
  const unifiedSectionOrder = [...sectionOrder];
  customSections.forEach((cs) => {
    if (!unifiedSectionOrder.includes(cs.id)) {
      unifiedSectionOrder.push(cs.id);
    }
  });

  const validUnifiedSectionOrder = unifiedSectionOrder.filter(id => 
    DEFAULT_SECTION_KEYS.includes(id) || customSections.some(cs => cs.id === id)
  );

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 md:p-8 font-sans antialiased">
        <div className="max-w-2xl w-full bg-white border border-slate-200/80 shadow-xl rounded-2xl p-6 md:p-10 text-slate-800 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#D4A017]/10 rounded-xl text-[#D4A017]">
              <Settings className="w-8 h-8 font-bold" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0F2557]">Ultimate Scholars Academy</h1>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">Deployment Integration Guide</p>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3.5 items-start mb-8">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">Firebase Environment Variables Required</h3>
              <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                The connection to Firebase is not active on your live Netlify domain. To sync your Graduand Wall, Memory Sticky Board, and school events, please add your environment variables in Netlify.
              </p>
            </div>
          </div>

          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>Step-by-Step Setup Guide</span>
          </h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2557]/10 text-[#0F2557] font-semibold text-xs shrink-0 mt-0.5">1</span>
              <p className="text-sm text-slate-600 leading-relaxed">
                Log into your <strong className="text-slate-900">Netlify Dashboard</strong> and open your deployed site's settings.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2557]/10 text-[#0F2557] font-semibold text-xs shrink-0 mt-0.5">2</span>
              <p className="text-sm text-slate-600 leading-relaxed">
                Navigate to <strong className="text-slate-900">Site configuration</strong> &rarr; <strong className="text-slate-900">Environment variables</strong> in the left menu.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2557]/10 text-[#0F2557] font-semibold text-xs shrink-0 mt-0.5">3</span>
              <div className="text-sm text-slate-600 leading-relaxed w-full">
                Click <strong className="text-slate-900">Add a variable</strong> and enter the 6 following variables. Copy each name below:
                
                <div className="grid grid-cols-1 gap-2 mt-3 font-mono text-xs">
                  {[
                    'VITE_FIREBASE_API_KEY',
                    'VITE_FIREBASE_AUTH_DOMAIN',
                    'VITE_FIREBASE_PROJECT_ID',
                    'VITE_FIREBASE_STORAGE_BUCKET',
                    'VITE_FIREBASE_MESSAGING_SENDER_ID',
                    'VITE_FIREBASE_APP_ID'
                  ].map((varName) => (
                    <div key={varName} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-100 border border-slate-200">
                      <span className="text-slate-700 select-all font-semibold">{varName}</span>
                      <button
                        onClick={() => handleCopy(varName, varName)}
                        className="text-xs text-[#0F2557] hover:text-[#D4A017] transition-colors flex items-center gap-1 font-sans cursor-pointer font-medium px-2 py-1 hover:bg-slate-200/50 rounded-md border-0 bg-transparent"
                      >
                        {copiedKey === varName ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2557]/10 text-[#0F2557] font-semibold text-xs shrink-0 mt-0.5">4</span>
              <p className="text-sm text-slate-600 leading-relaxed">
                Paste the corresponding values from your Google AI Studio Secrets Panel.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0F2557]/10 text-[#0F2557] font-semibold text-xs shrink-0 mt-0.5">5</span>
              <p className="text-sm text-slate-600 leading-relaxed">
                Go to <strong className="text-slate-900">Deploys</strong> and select <strong className="text-slate-900">Trigger deploy &rarr; Clear cache and deploy site</strong> to apply.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <p className="text-xs text-slate-500">
              Need assistance? Check the <strong>Google AI Studio Settings &rarr; Secrets</strong> menu.
            </p>
            <a 
              href="https://app.netlify.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F2557] text-white hover:bg-[#1a3a7a] transition-all rounded-xl font-semibold text-sm cursor-pointer shadow-md shadow-[#0F2557]/15 decoration-none"
            >
              <span>Go to Netlify</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 antialiased selection:bg-[#D4A017]/30 selection:text-[#0F2557]">
      
      {/* PERSISTENT ADMIN CLEAN UP NOTIFICATION BANNER */}
      {cleanUpMode && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-rose-600 text-white py-3 px-4 md:px-8 shadow-2xl flex items-center justify-between font-mono text-xs md:text-sm border-b border-rose-500 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>🧹 <strong>ADMIN CLEAN UP ACTIVE:</strong> Click any approved portrait, timeline event, video clip, photo, or guestbook message to permanently delete it from the system.</span>
          </div>
          <button
            onClick={() => setCleanUpMode(false)}
            className="bg-white text-rose-700 px-3.5 py-1 rounded-full font-bold hover:bg-slate-100 transition-all cursor-pointer shadow-sm shrink-0"
          >
            Exit Clean Up
          </button>
        </div>
      )}

      <Routes>
        {/* LANDING PAGE ROUTE */}
        <Route path="/" element={
          <>
            {/* 1. HERO SECTION & SCROLLING CAROUSEL */}
            <HeroCarousel 
              targetDate={TARGET_GRADUATION_DATE} 
              onViewAlbumClick={handleScrollToAlbum} 
            />

            {validUnifiedSectionOrder.map((sectionId) => {
              if (sectionId.startsWith('sect-')) {
                const cs = customSections.find(c => c.id === sectionId);
                if (!cs || cs.visible === false) return null;
                return (
                  <div key={sectionId} id={`custom-sec-${cs.id}`}>
                    <CustomSectionsRenderer sections={[cs]} />
                  </div>
                );
              }

              switch (sectionId) {
                case "about":
                  return visibility.about !== false && (
                    <div key={sectionId} id="about">
                      <AboutSchool />
                    </div>
                  );
                case "graduands":
                  return visibility.graduands !== false && (
                    <div key={sectionId} id="graduands">
                      <GraduandWall 
                        refreshKey={refreshKey} 
                        cleanUpMode={cleanUpMode} 
                        onDataChange={handleDataChange} 
                        isPreview={true}
                      />
                    </div>
                  );
                case "superlatives":
                  return visibility.superlatives !== false && (
                    <div key={sectionId} id="superlatives">
                      <Superlatives isPreview={true} />
                    </div>
                  );
                case "teachers":
                  return visibility.teachers !== false && (
                    <div key={sectionId} id="teachers">
                      <TeacherTributes 
                        refreshKey={refreshKey}
                        cleanUpMode={cleanUpMode}
                        onDataChange={handleDataChange}
                        isPreview={true}
                      />
                    </div>
                  );
                case "photos":
                  return visibility.photos !== false && (
                    <div key={sectionId} id="photos">
                      <PhotoGallery 
                        refreshKey={refreshKey}
                        cleanUpMode={cleanUpMode}
                        onDataChange={handleDataChange}
                        isPreview={true}
                      />
                    </div>
                  );
                case "timeline":
                  return visibility.timeline !== false && (
                    <div key={sectionId} id="timeline">
                      <MemoryTimeline 
                        refreshKey={refreshKey} 
                        cleanUpMode={cleanUpMode} 
                        onDataChange={handleDataChange} 
                        isPreview={true}
                      />
                    </div>
                  );
                case "videos":
                  return visibility.videos !== false && (
                    <div key={sectionId} id="videos">
                      <VideoGallery 
                        refreshKey={refreshKey} 
                        cleanUpMode={cleanUpMode} 
                        onDataChange={handleDataChange} 
                        isPreview={true}
                      />
                    </div>
                  );
                case "countdown":
                  return visibility.countdown !== false && (
                    <div key={sectionId} id="countdown">
                      <CountdownTimer targetDate={TARGET_GRADUATION_DATE} />
                    </div>
                  );
                case "guestbook":
                  return visibility.guestbook !== false && (
                    <div key={sectionId} id="guestbook">
                      <Guestbook 
                        refreshKey={refreshKey} 
                        cleanUpMode={cleanUpMode} 
                        onDataChange={handleDataChange} 
                        isPreview={true}
                      />
                    </div>
                  );
                case "closing":
                  return visibility.closing !== false && (
                    <div key={sectionId} id="closing">
                      <ClosingSection />
                    </div>
                  );
                default:
                  return null;
              }
            })}
          </>
        } />

        {/* FULL SUB-PAGES */}
        <Route path="/photo-gallery" element={
          <PhotoGallery 
            refreshKey={refreshKey}
            cleanUpMode={cleanUpMode}
            onDataChange={handleDataChange}
            isPreview={false}
          />
        } />

        <Route path="/video-gallery" element={
          <VideoGallery 
            refreshKey={refreshKey}
            cleanUpMode={cleanUpMode}
            onDataChange={handleDataChange}
            isPreview={false}
          />
        } />

        <Route path="/guestbook" element={
          <Guestbook 
            refreshKey={refreshKey}
            cleanUpMode={cleanUpMode}
            onDataChange={handleDataChange}
            isPreview={false}
          />
        } />

        <Route path="/timeline" element={
          <MemoryTimeline 
            refreshKey={refreshKey}
            cleanUpMode={cleanUpMode}
            onDataChange={handleDataChange}
            isPreview={false}
          />
        } />

        <Route path="/teacher-tributes" element={
          <TeacherTributes 
            refreshKey={refreshKey}
            cleanUpMode={cleanUpMode}
            onDataChange={handleDataChange}
            isPreview={false}
          />
        } />

        <Route path="/graduands" element={
          <GraduandWall 
            refreshKey={refreshKey}
            cleanUpMode={cleanUpMode}
            onDataChange={handleDataChange}
            isPreview={false}
          />
        } />

        <Route path="/superlatives" element={
          <Superlatives 
            isPreview={false}
          />
        } />
      </Routes>

      {/* PERSISTENT FLOATING ADMIN GATEKEEPER AND CONTROL PANEL */}
      <AdminPortal 
        onDataChange={handleDataChange} 
        refreshKey={refreshKey} 
        cleanUpMode={cleanUpMode} 
        setCleanUpMode={setCleanUpMode} 
      />
    </div>
  );
}

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [cleanUpMode, setCleanUpMode] = useState(false);
  
  // Set the official event target date (July 31, 2026)
  const TARGET_GRADUATION_DATE = "2026-07-31T18:00:00+01:00"; // Lagos time (GMT+1)

  const handleDataChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Smooth scroll handler to scroll cleanly to the public gallery
  const handleScrollToAlbum = () => {
    const target = document.getElementById('photos');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Accessible keyboard handler to skip directly to album content
  useEffect(() => {
    const handleSkip = (e: KeyboardEvent) => {
      if (e.key === 'a' && e.altKey) {
        handleScrollToAlbum();
      }
    };
    window.addEventListener('keydown', handleSkip);
    return () => window.removeEventListener('keydown', handleSkip);
  }, []);

  return (
    <BrowserRouter>
      <AppContent 
        refreshKey={refreshKey}
        cleanUpMode={cleanUpMode}
        setCleanUpMode={setCleanUpMode}
        handleDataChange={handleDataChange}
        handleScrollToAlbum={handleScrollToAlbum}
        TARGET_GRADUATION_DATE={TARGET_GRADUATION_DATE}
      />
    </BrowserRouter>
  );
}
