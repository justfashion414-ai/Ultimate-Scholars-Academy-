/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import { subscribeCustomSections } from './lib/firebaseService';
import { CustomSection } from './types';
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

  useEffect(() => {
    const unsub = subscribeCustomSections((sections) => {
      setCustomSections(sections);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "visibility"), (docSnap) => {
      if (docSnap.exists()) {
        setVisibility(docSnap.data() as Record<string, boolean>);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "order"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.sections)) {
          setSectionOrder(data.sections);
        }
      }
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
