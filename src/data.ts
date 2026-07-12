import { Student, Superlative, TeacherTribute, TimelineEvent, GuestbookEntry, VideoMemory, Photo } from './types';

// ==========================================
// PLACEHOLDER IMAGE VARIABLES (EASY TO REPLACE)
// ==========================================
// Centralized image declarations so the student builder can replace placeholder portraits easily.
export const GRADUAND_IMAGES = {
  chinedu: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=500&auto=format&fit=crop", // Smiling Black youth
  amina: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=500&auto=format&fit=crop", // Smiling Black girl
  oluwaseun: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=500&auto=format&fit=crop", // Smiling Black teen
  efe: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=500&auto=format&fit=crop", // Smiling Black student
  ngozi: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=500&auto=format&fit=crop", // Graceful Black girl
  tunde: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=500&auto=format&fit=crop", // Happy youth
  fatima: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=500&auto=format&fit=crop", // Bright smiling girl
  chioma: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=500&auto=format&fit=crop", // Warm smiling face
  yusuf: "https://images.unsplash.com/photo-1504257400765-188b545d247e?q=80&w=500&auto=format&fit=crop", // Smiling Black man
  temitope: "https://images.unsplash.com/photo-1517256064527-09c53b2d0c6b?q=80&w=500&auto=format&fit=crop", // Energetic young student
  emeka: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=500&auto=format&fit=crop", // Handsome smiling youth
  adama: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=500&auto=format&fit=crop", // Focus portrait girl
  esosa: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=500&auto=format&fit=crop", // Edo student profile
  itoro: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=500&auto=format&fit=crop", // Efik student portrait
  kelechi: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=500&auto=format&fit=crop" // Professional young man look
};

export const TEACHER_IMAGES = {
  principal: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=500&auto=format&fit=crop", // African-American/Black senior woman professional
  vicePrincipal: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=500&auto=format&fit=crop", // Black senior man in suit
  physics: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=500&auto=format&fit=crop", // Black male math/physics teacher
  literature: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=500&auto=format&fit=crop" // Black female literature teacher
};

export const TIMELINE_IMAGES = {
  resumption: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop", // School classroom/hallway
  sportsDay: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800&auto=format&fit=crop", // Running track/athletes
  culturalDay: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=800&auto=format&fit=crop", // Vibrant cultural festival/dress
  prizeGiving: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop" // Diploma certificate celebration
};

export const CAROUSEL_IMAGES = [
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop", // Graduation diploma scroll
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600&auto=format&fit=crop", // Tossing caps in the air
  "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=600&auto=format&fit=crop", // Students celebrating/laughing
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600&auto=format&fit=crop", // Friends in the sun laughing
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop", // Studying happily with computer
  "https://images.unsplash.com/photo-1525921429573-05911ed24129?q=80&w=600&auto=format&fit=crop", // Happy student reading outside
  "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?q=80&w=600&auto=format&fit=crop", // Black students sitting outdoors in discussion
  "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=600&auto=format&fit=crop", // Happy youth grouping together
  "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=600&auto=format&fit=crop", // Studying focusing on workspace
  "https://images.unsplash.com/photo-1517256064527-09c53b2d0c6b?q=80&w=600&auto=format&fit=crop", // Sitting outside smiling
  "https://images.unsplash.com/photo-1504257400765-188b545d247e?q=80&w=600&auto=format&fit=crop", // Smiling Black youth
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=600&auto=format&fit=crop"  // Smiling Black woman close-up
];

// ==========================================
// GRADUATING STUDENTS LIST (SS3 CLASS OF 2026)
// ==========================================
export const STUDENTS_DATA: Student[] = [
  {
    id: "stud-1",
    name: "Chinedu Okafor",
    nickname: "Edu Spark",
    image: GRADUAND_IMAGES.chinedu,
    favoriteMemory: "Winning the Inter-House Sports 100m Relay gold medal for Blue House after months of rigorous morning workouts on the school track.",
    messageToClassmates: "We started from the bottom and now we are here! Let's conquer the world together. Remember, the sky is just our starting line, not the limit.",
    aspirations: "Aeronautical Engineer",
    house: "Blue House (Sovereigns)"
  },
  {
    id: "stud-2",
    name: "Amina Bello",
    nickname: "Amby",
    image: GRADUAND_IMAGES.amina,
    favoriteMemory: "The midnight study sessions during WAEC prep where we shared chin-chin and plantain chips, laughing to keep ourselves awake.",
    messageToClassmates: "To my amazing friends, thank you for making the last six years unforgettable. May your paths be bright and full of gold!",
    aspirations: "Pediatric Cardiologist",
    house: "Yellow House (Leaders)"
  },
  {
    id: "stud-3",
    name: "Oluwaseun Adebayo",
    nickname: "Seun Beats",
    image: GRADUAND_IMAGES.oluwaseun,
    favoriteMemory: "Directing the SS3 Drama Night play and seeing the entire hall, including the Principal, give us a standing ovation.",
    messageToClassmates: "No matter where we go, our beats will never fade. Scholars Academy Class of 2026 will live forever in our hearts!",
    aspirations: "Music Producer & Software Developer",
    house: "Red House (Challengers)"
  },
  {
    id: "stud-4",
    name: "Efe Oghenekaro",
    nickname: "Effy-G",
    image: GRADUAND_IMAGES.efe,
    favoriteMemory: "Our Cultural Day excursion when we dressed in gorgeous traditional Niger Delta coral beads and danced the Urhobo traditional dance.",
    messageToClassmates: "Never forget our laughter, the funny nicknames, and the jokes we shared in the common room. Shine bright, my people!",
    aspirations: "International Relations Diplomat",
    house: "Green House (Champions)"
  },
  {
    id: "stud-5",
    name: "Ngozi Eze",
    nickname: "Ngo Baby",
    image: GRADUAND_IMAGES.ngozi,
    favoriteMemory: "The spontaneous rainy-day football match on the school pitch when we all got soaked, muddy, and incredibly happy.",
    messageToClassmates: "Life is a journey, and I'm so glad I walked this portion with you all. Let's keep making each other proud as we step out.",
    aspirations: "Human Rights Attorney",
    house: "Blue House (Sovereigns)"
  },
  {
    id: "stud-6",
    name: "Tunde Bakare",
    nickname: "TBax",
    image: GRADUAND_IMAGES.tunde,
    favoriteMemory: "When the generator went off during Chemistry lab, and we all sang Afrobeat hits in perfect acapella harmony using beakers as percussion.",
    messageToClassmates: "Keep moving forward and never look back. We are built for greatness, nurtured by Scholars Academy. Stay gold, family!",
    aspirations: "Artificial Intelligence Researcher",
    house: "Yellow House (Leaders)"
  },
  {
    id: "stud-7",
    name: "Fatima Yusuf",
    nickname: "Fati",
    image: GRADUAND_IMAGES.fatima,
    favoriteMemory: "The Literature-in-English debates where we passionately argued about Shakespeare and Wole Soyinka like real senators.",
    messageToClassmates: "To my girls and guys, we made it! Thank you for the support, the shared assignments, and the deep, priceless friendships.",
    aspirations: "Journalist & Creative Writer",
    house: "Green House (Champions)"
  },
  {
    id: "stud-8",
    name: "Chioma Nwachukwu",
    nickname: "Chommy",
    image: GRADUAND_IMAGES.chioma,
    favoriteMemory: "Being chosen as the Head Girl and leading the assembly with confidence under the warm gold sun of Scholars Academy.",
    messageToClassmates: "Let's live lives that reflect the rich knowledge we've gained here. We are leaders of today and tomorrow. God bless you all!",
    aspirations: "Macroeconomist & Policy Maker",
    house: "Red House (Challengers)"
  },
  {
    id: "stud-9",
    name: "Yusuf Abubakar",
    nickname: "Aboki",
    image: GRADUAND_IMAGES.yusuf,
    favoriteMemory: "Representing our school at the National Science Olympiad and hearing our teammates cheer 'Scholars!' across the national hall.",
    messageToClassmates: "Focus is the key to every locked door. I am proud to have studied alongside such brilliant minds. Keep pushing!",
    aspirations: "Robotics Engineer",
    house: "Yellow House (Leaders)"
  },
  {
    id: "stud-10",
    name: "Temitope Balogun",
    nickname: "Tope",
    image: GRADUAND_IMAGES.temitope,
    favoriteMemory: "The Inter-School Debate competition when we took first place and the entire school buses honked in triumph all the way back to campus.",
    messageToClassmates: "Keep smiling, keep studying, and keep succeeding. We are the light of the nation. I will miss every single one of you!",
    aspirations: "Renewable Energy Entrepreneur",
    house: "Green House (Champions)"
  },
  {
    id: "stud-11",
    name: "Emeka Nwosu",
    nickname: "Mekus",
    image: GRADUAND_IMAGES.emeka,
    favoriteMemory: "The final class party where we ate Jollof rice, plantain, and danced the 'Gbese' and 'Machala' with our favorite teachers.",
    messageToClassmates: "We survived WAEC and JAMB! There's absolutely nothing we cannot achieve. Cheers to the great future ahead!",
    aspirations: "Fintech Entrepreneur",
    house: "Blue House (Sovereigns)"
  },
  {
    id: "stud-12",
    name: "Adama Ibrahim",
    nickname: "Queen Addy",
    image: GRADUAND_IMAGES.adama,
    favoriteMemory: "Sitting under the large mango tree on campus during recess, writing poetry and talking about our dreams of the future.",
    messageToClassmates: "May your heart be courageous and your steps be firm. Thank you, Class of 2026, for the golden memories of my youth.",
    aspirations: "Architect & Landscape Designer",
    house: "Yellow House (Leaders)"
  },
  {
    id: "stud-13",
    name: "Esosa Igbinovia",
    nickname: "Sosa",
    image: GRADUAND_IMAGES.esosa,
    favoriteMemory: "The Arts & Fine Art Exhibition where my paintings of old Benin Kingdom walls were displayed and appreciated by the state commissioner.",
    messageToClassmates: "Let's paint our futures with bold, bright colors. Our potential is limitless, and Scholars Academy has given us the brush.",
    aspirations: "Creative Director & Fine Artist",
    house: "Red House (Challengers)"
  },
  {
    id: "stud-14",
    name: "Itoro Bassey",
    nickname: "Ity-B",
    image: GRADUAND_IMAGES.itoro,
    favoriteMemory: "Singing the national and school anthem in front of the parent-teacher association during our valedictory church service.",
    messageToClassmates: "Let the light we received at Scholars Academy shine bright in every dark corner of the earth. We are champions!",
    aspirations: "Biomedical Researcher",
    house: "Green House (Champions)"
  },
  {
    id: "stud-15",
    name: "Kelechi Onuoha",
    nickname: "Kaycee",
    image: GRADUAND_IMAGES.kelechi,
    favoriteMemory: "Our final assembly when the SS3 class presented a beautiful handmade appreciation banner to the junior students.",
    messageToClassmates: "Stay connected, stay humble, and keep striving. No matter where we are, the bond of Scholars Academy is forever.",
    aspirations: "Chemical Engineer & Novelist",
    house: "Blue House (Sovereigns)"
  }
];

// ==========================================
// CLASS SUPERLATIVES
// ==========================================
export const SUPERLATIVES_DATA: Superlative[] = [
  {
    id: "sup-1",
    category: "Most Likely to Succeed",
    description: "Determined, focused, and always leading the academic scoreboard with pristine plans for a better tomorrow.",
    studentName: "Chioma Nwachukwu",
    studentImage: GRADUAND_IMAGES.chioma
  },
  {
    id: "sup-2",
    category: "Best Dressed",
    description: "Whether in pristine ironed school uniform, house wear, or traditional party attire, always looks red-carpet ready.",
    studentName: "Efe Oghenekaro",
    studentImage: GRADUAND_IMAGES.efe
  },
  {
    id: "sup-3",
    category: "Class Clown",
    description: "The spark of every boring prep. Can make even the sternest physics teacher crack a smile during exams.",
    studentName: "Oluwaseun Adebayo",
    studentImage: GRADUAND_IMAGES.oluwaseun
  },
  {
    id: "sup-4",
    category: "Most Studious",
    description: "The library's permanent resident. Always armed with a textbook, ready to solve any complex math problem at a glance.",
    studentName: "Yusuf Abubakar",
    studentImage: GRADUAND_IMAGES.yusuf
  },
  {
    id: "sup-5",
    category: "Most Likely to Become President",
    description: "Eloquent, persuasive, and possesses a natural leadership aura that keeps the entire class organized and inspired.",
    studentName: "Amina Bello",
    studentImage: GRADUAND_IMAGES.amina
  }
];

// ==========================================
// TEACHER TRIBUTES
// ==========================================
export const TEACHER_TRIBUTES_DATA: TeacherTribute[] = [
  {
    id: "teach-1",
    name: "Mrs. Florence Adebayo",
    subject: "Principal & Literature Guide",
    image: TEACHER_IMAGES.principal,
    message: "To the Class of 2026, you have been a pillar of creativity and strength. You leaves behind a legacy of academic excellence and warmth that will echo in these corridors. Keep your light shining bright, and always remember that knowledge lights the way to your dreams."
  },
  {
    id: "teach-2",
    name: "Mr. Ibrahim Babangida",
    subject: "Vice Principal & Mathematics Coach",
    image: TEACHER_IMAGES.vicePrincipal,
    message: "Calculated efforts lead to exponential success. Watching you master calculus, overcome challenging WAEC trials, and grow into outstanding young men and women has been a supreme joy. Step out and multiply your greatness. Scholars Academy is proud of you!"
  },
  {
    id: "teach-3",
    name: "Dr. Chijioke Okeke",
    subject: "Physics & Chemistry Lead Instructor",
    image: TEACHER_IMAGES.physics,
    message: "Remember that success is not static; it requires kinetic energy and focus. You are like particles ready to diffuse and positively charge the outer world. Never fear the friction of life—it only shapes your trajectory. Go and succeed!"
  },
  {
    id: "teach-4",
    name: "Miss Evelyn Duke",
    subject: "Civic Education & History Patron",
    image: TEACHER_IMAGES.literature,
    message: "History will write beautiful chapters about this set. You have shown deep patriotism, respect, and a hunger for national development. Be honest, be resilient, and serve humanity with all your heart. Congratulations on your graduation!"
  }
];

// ==========================================
// MEMORY TIMELINE
// ==========================================
export const TIMELINE_DATA: TimelineEvent[] = [
  {
    id: "time-1",
    date: "September 15, 2023",
    title: "SS3 Resumption Day",
    description: "Stepping into the senior hall as the final-year students! A morning filled with high hopes, clean uniforms, and the weight of being the school leaders.",
    image: TIMELINE_IMAGES.resumption
  },
  {
    id: "time-2",
    date: "February 12, 2024",
    title: "Annual Inter-House Sports",
    description: "A day of high adrenaline, cheering crowds, and athletic records! From the march-past in vibrant colors to Blue House claiming the relay trophy, the air was electric.",
    image: TIMELINE_IMAGES.sportsDay
  },
  {
    id: "time-3",
    date: "May 21, 2024",
    title: "Grand Cultural Day Celebration",
    description: "A gorgeous festival of unity in diversity. We proudly represented Yoruba, Igbo, Hausa, Urhobo, and Efik cultures with delicious traditional meals, beads, and historic dances.",
    image: TIMELINE_IMAGES.culturalDay
  },
  {
    id: "time-4",
    date: "July 31, 2026",
    title: "Valedictory Prize Giving & Dinner",
    description: "Our final celebration—the End of Session Party. Receiving awards, saying sweet tearful goodbyes, and stepping into the future as true graduands of Scholars Academy.",
    image: TIMELINE_IMAGES.prizeGiving
  }
];

// ==========================================
// PRE-POPULATED GUESTBOOK ENTRIES
// ==========================================
export const PRE_POPULATED_GUESTBOOK: GuestbookEntry[] = [
  {
    id: "guest-1",
    name: "Chief Dr. Festus Okafor",
    role: "Parent",
    message: "An incredibly proud moment for all parents of the Class of 2026. Seeing our children transform into confident, knowledgeable leaders at Scholars Academy is a blessing. Thank you to the school administration and teachers for their dedication!",
    timestamp: "2026-07-04T14:30:00-07:00"
  },
  {
    id: "guest-2",
    name: "Aisha Yusuf",
    role: "Student",
    message: "I can't believe our six years together is coming to an end. Scholars Academy has been a second home. To my desk partner Amina, I will miss you so much! Let's stay in touch forever. 2026 set is indeed the best set!",
    timestamp: "2026-07-05T09:15:00-07:00"
  },
  {
    id: "guest-3",
    name: "Elder Bassey Effiong",
    role: "Alumni",
    message: "Welcome to the alumni network! As a 2018 graduate, I can assure you that the training you received under Mrs. Adebayo and the teachers will sustain you anywhere in the world. Stand tall and keep the flag flying!",
    timestamp: "2026-07-05T10:45:00-07:00"
  },
  {
    id: "guest-4",
    name: "Mrs. Florence Adebayo",
    role: "Teacher",
    message: "Congratulations once again to our shining lights. Always carry our school motto in your hearts: let your Knowledge truly Light the Way wherever your feet may tread. My office door is always open to you.",
    timestamp: "2026-07-05T11:20:00-07:00"
  }
];

export const PRE_POPULATED_VIDEOS: VideoMemory[] = [
  {
    id: "vid-1",
    title: "Class of 2026 Sports Day Highlights",
    submittedBy: "Chinedu Okafor",
    role: "Student",
    url: "https://assets.mixkit.co/videos/preview/mixkit-boys-playing-basketball-in-a-sunny-day-40019-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=500&auto=format&fit=crop",
    uploadedAt: "2026-06-15T10:00:00Z"
  },
  {
    id: "vid-2",
    title: "WAEC Preparation & Study Group Laughs",
    submittedBy: "Amina Bello",
    role: "Student",
    url: "https://assets.mixkit.co/videos/preview/mixkit-students-studying-in-a-classroom-43183-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=500&auto=format&fit=crop",
    uploadedAt: "2026-06-20T14:30:00Z"
  },
  {
    id: "vid-3",
    title: "Behind the Scenes of the SS3 Drama Play",
    submittedBy: "Oluwaseun Adebayo",
    role: "Student",
    url: "https://assets.mixkit.co/videos/preview/mixkit-multiracial-students-walking-down-a-hallway-43187-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=500&auto=format&fit=crop",
    uploadedAt: "2026-06-25T11:15:00Z"
  }
];

export const PRE_POPULATED_PHOTOS: Photo[] = [
  {
    id: "photo-1",
    url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop",
    title: "Tossing Caps in Triumph",
    submittedBy: "Chioma Nwachukwu",
    role: "Student",
    uploadedAt: "2026-07-01T10:00:00Z"
  },
  {
    id: "photo-2",
    url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop",
    title: "The Diploma Scroll",
    submittedBy: "Chinedu Okafor",
    role: "Student",
    uploadedAt: "2026-07-02T11:30:00Z"
  },
  {
    id: "photo-3",
    url: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=800&auto=format&fit=crop",
    title: "Uncontrollable Laughter in the Common Room",
    submittedBy: "Amina Bello",
    role: "Student",
    uploadedAt: "2026-07-03T09:15:00Z"
  },
  {
    id: "photo-4",
    url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=800&auto=format&fit=crop",
    title: "SS3 Set Outing & Fun Day",
    submittedBy: "Oluwaseun Adebayo",
    role: "Student",
    uploadedAt: "2026-07-04T15:45:00Z"
  },
  {
    id: "photo-5",
    url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop",
    title: "Midnight Group Prep for WAEC",
    submittedBy: "Yusuf Abubakar",
    role: "Student",
    uploadedAt: "2026-07-05T08:00:00Z"
  },
  {
    id: "photo-6",
    url: "https://images.unsplash.com/photo-1525921429573-05911ed24129?q=80&w=800&auto=format&fit=crop",
    title: "Reading under the Mango Tree",
    submittedBy: "Adama Ibrahim",
    role: "Student",
    uploadedAt: "2026-07-05T12:00:00Z"
  },
  {
    id: "photo-7",
    url: "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?q=80&w=800&auto=format&fit=crop",
    title: "Spontaneous Lawn Debates",
    submittedBy: "Efe Oghenekaro",
    role: "Student",
    uploadedAt: "2026-07-06T10:30:00Z"
  },
  {
    id: "photo-8",
    url: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=800&auto=format&fit=crop",
    title: "SS3 Best Friends Set",
    submittedBy: "Ngozi Eze",
    role: "Student",
    uploadedAt: "2026-07-06T14:15:00Z"
  }
];


