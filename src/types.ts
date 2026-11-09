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

export interface TeacherComment {
  id: string;
  text: string;
  author: string;
  at: string;
}

export interface CodingProject {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  title: string;
  description?: string;
  files: {
    'index.html': string;
    'styles.css': string;
    'script.js': string;
  };
  createdAt: string;
  updatedAt: string;
  /** Teacher/admin feedback left on the project (latest first when rendered). */
  teacherComments?: TeacherComment[];
  /** Score out of 100, empty string means unmarked. */
  grade?: string;
  /** Teacher starred/featured this project. */
  starred?: boolean;
  /** Who made the last change, e.g. "student" or "admin:<email>". */
  lastEditedBy?: string;
}

export interface CodingStudentProfile {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  className?: string;
  authMethod: 'email_password' | 'student_id_pin';
  loginIdentifier?: string;
  pin?: string;
  lastActive: string;
  /** Which class track this student belongs to. Missing = 'coding' (legacy students). */
  track?: 'coding' | 'graphics';
  /** Cloudinary URL of the student's profile picture. */
  photoUrl?: string;
}

export interface GraphicsSubmission {
  id: string;
  studentId: string;
  studentName: string;
  /** Assignment title, e.g. "Logo Design - Week 3" */
  title: string;
  description?: string;
  /** Cloudinary secure_url of the uploaded design */
  imageUrl: string;
  /** All images for multi-image assignments (imageUrl mirrors the first) */
  imageUrls?: string[];
  createdAt: string;
  teacherComments?: TeacherComment[];
  grade?: string;
}


