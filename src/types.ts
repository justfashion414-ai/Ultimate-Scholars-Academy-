export interface Student {
  id: string;
  name: string;
  nickname: string;
  image: string;
  favoriteMemory: string;
  messageToClassmates: string;
  aspirations?: string;
  house?: 'Blue House (Sovereigns)' | 'Red House (Challengers)' | 'Green House (Champions)' | 'Yellow House (Leaders)';
}

export interface Superlative {
  id: string;
  category: string;
  description: string;
  studentName: string;
  studentImage: string;
}

export interface TeacherTribute {
  id: string;
  name: string;
  subject: string;
  image: string;
  message: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  image: string;
}

export interface GuestbookEntry {
  id: string;
  name: string;
  role: 'Student' | 'Parent' | 'Teacher' | 'Alumni' | 'Well-wisher';
  message: string;
  timestamp: string;
  imageUrl?: string;
  selectedDate?: string;
}

export interface VideoMemory {
  id: string;
  title: string;
  submittedBy: string;
  role: string;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

export interface Photo {
  id: string;
  url: string;
  title: string;
  submittedBy: string;
  role: string;
  uploadedAt: string;
}

export interface AdminUser {
  email: string;
  addedAt: string;
  addedBy: string;
}

export interface CustomSection {
  id: string;
  title: string;
  subtext: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'none';
  orderIndex: number;
  layoutType?: 'standard' | 'birthday' | 'announcement' | 'spotlight';
  visible?: boolean;
  subLabel?: string;
}


