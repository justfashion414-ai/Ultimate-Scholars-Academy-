import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookOpen, Award, Sparkles } from 'lucide-react';

interface AboutSchoolSettings {
  aboutTitle?: string;
  aboutSubtitle?: string;
  aboutText?: string;
  aboutImage?: string | null;
  aboutProprietorName?: string;
  aboutProprietorRole?: string;
}

export default function AboutSchool() {
  const [settings, setSettings] = useState<AboutSchoolSettings>({
    aboutTitle: "About the School",
    aboutSubtitle: "Nurturing Leaders, Inspiring Excellence",
    aboutText: "Scholars Academy was founded with a singular focus: to foster academic brilliance and build character in our students. Over the years, our institution has stood as a beacon of academic achievement, athletic prowess, and strong moral leadership.",
    aboutImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop",
    aboutProprietorName: "Mrs. O. Okafor",
    aboutProprietorRole: "Founder / Proprietor"
  });

  useEffect(() => {
    // Real-time subscription to the school setting doc in Firestore
    const docRef = doc(db, "settings", "school");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(prev => ({
          aboutTitle: data.aboutTitle !== undefined ? data.aboutTitle : prev.aboutTitle,
          aboutSubtitle: data.aboutSubtitle !== undefined ? data.aboutSubtitle : prev.aboutSubtitle,
          aboutText: data.aboutText !== undefined ? data.aboutText : prev.aboutText,
          aboutImage: data.aboutImage !== undefined ? data.aboutImage : prev.aboutImage,
          aboutProprietorName: data.aboutProprietorName !== undefined ? data.aboutProprietorName : prev.aboutProprietorName,
          aboutProprietorRole: data.aboutProprietorRole !== undefined ? data.aboutProprietorRole : prev.aboutProprietorRole,
        }));
      }
    }, (err) => {
      console.error("Error loading about school settings:", err);
    });

    return () => unsubscribe();
  }, []);

  const hasImage = !!settings.aboutImage;

  return (
    <section className="py-24 px-4 md:px-8 bg-[#0F2557] border-t border-[#D4A017]/20 relative overflow-hidden" id="about-school">
      {/* Ambient background blur circles */}
      <div className="absolute top-1/4 left-10 w-96 h-96 rounded-full bg-[#D4A017]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 rounded-full bg-[#16377c]/20 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* SECTION HEADER */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-[#D4A017]/15 border border-[#D4A017]/30 text-[#D4A017] text-xs font-mono tracking-wider uppercase mb-3">
            Our Foundation
          </span>
          <h2 className="text-3xl md:text-5xl font-serif text-white font-bold tracking-tight mb-2">
            {settings.aboutTitle || "About the School"}
          </h2>
          <div className="w-16 h-1 bg-[#D4A017] mx-auto mb-4" />
          <p className="text-white/85 text-sm md:text-base max-w-2xl mx-auto leading-relaxed italic">
            {settings.aboutSubtitle || "Nurturing Leaders, Inspiring Excellence"}
          </p>
        </div>

        {/* CONTENT LAYOUT */}
        <div className={`grid grid-cols-1 ${hasImage ? 'lg:grid-cols-12' : 'max-w-3xl mx-auto'} gap-12 items-center`}>
          
          {/* IMAGE COLUMN (PROPRIETOR) */}
          {hasImage && (
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5 flex flex-col items-center"
            >
              <div className="relative group w-full max-w-sm aspect-[4/5] rounded-3xl overflow-hidden border-2 border-[#D4A017]/30 shadow-2xl bg-black/20">
                <img 
                  src={settings.aboutImage!} 
                  alt={settings.aboutProprietorName} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                
                <div className="absolute bottom-0 inset-x-0 p-6 text-center">
                  <h4 className="text-white font-serif text-xl font-bold">{settings.aboutProprietorName}</h4>
                  <p className="text-[#D4A017] font-mono text-xs mt-1 uppercase tracking-widest">{settings.aboutProprietorRole}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* TEXT COLUMN */}
          <motion.div 
            initial={{ opacity: 0, x: hasImage ? 30 : 0 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`${hasImage ? 'lg:col-span-7' : 'w-full'} space-y-6 text-white`}
          >
            <div className="space-y-4">
              <h3 className="text-xl md:text-2xl font-serif font-semibold text-[#D4A017] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#D4A017]" />
                Our Heritage & Vision
              </h3>
              <p className="text-white/80 text-sm md:text-base leading-relaxed whitespace-pre-line">
                {settings.aboutText || "Welcome to Scholars Academy. We are dedicated to nurturing future leaders and fostering academic excellence."}
              </p>
            </div>

            {/* Quick stats / bullet points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4A017]/10 flex items-center justify-center shrink-0 border border-[#D4A017]/20">
                  <Award className="w-4 h-4 text-[#D4A017]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono text-[#D4A017] uppercase tracking-wider">Quality Education</h4>
                  <p className="text-[11px] text-white/65 mt-0.5">Approved West African & International standards.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4A017]/10 flex items-center justify-center shrink-0 border border-[#D4A017]/20">
                  <Sparkles className="w-4 h-4 text-[#D4A017]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono text-[#D4A017] uppercase tracking-wider">Character First</h4>
                  <p className="text-[11px] text-white/65 mt-0.5">Empowering graduates with honor and accountability.</p>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
