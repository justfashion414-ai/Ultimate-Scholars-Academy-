import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch,
  getDoc,
  onSnapshot
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { STUDENTS_DATA, TIMELINE_DATA, PRE_POPULATED_GUESTBOOK, PRE_POPULATED_VIDEOS, PRE_POPULATED_PHOTOS, SUPERLATIVES_DATA, TEACHER_TRIBUTES_DATA } from "../data";
import { Student, TimelineEvent, GuestbookEntry, VideoMemory, AdminUser, Photo, Superlative, TeacherTribute, CustomSection } from "../types";

// ==========================================
// ERROR HANDLING UTILITIES (Mandatory Skill Requirement)
// ==========================================

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}


// ==========================================
// AUTOMATIC SEEDING LAYER
// ==========================================

export async function seedDatabaseIfEmpty() {
  try {
    // 1. Check & Seed Guestbook
    const guestbookRef = collection(db, "guestbook");
    const guestbookSnap = await getDocs(guestbookRef);
    if (guestbookSnap.empty) {
      console.log("Seeding guestbook collection in Firestore...");
      const batch = writeBatch(db);
      PRE_POPULATED_GUESTBOOK.forEach((entry) => {
        const docRef = doc(db, "guestbook", entry.id);
        batch.set(docRef, entry);
      });
      await batch.commit();
    }

    // 2. Check & Seed Students
    const studentsRef = collection(db, "students");
    const studentsSnap = await getDocs(studentsRef);
    if (studentsSnap.empty) {
      console.log("Seeding students collection in Firestore...");
      const batch = writeBatch(db);
      STUDENTS_DATA.forEach((student) => {
        const docRef = doc(db, "students", student.id);
        batch.set(docRef, student);
      });
      await batch.commit();
    }

    // 3. Check & Seed Timeline
    const timelineRef = collection(db, "timeline");
    const timelineSnap = await getDocs(timelineRef);
    if (timelineSnap.empty) {
      console.log("Seeding timeline collection in Firestore...");
      const batch = writeBatch(db);
      TIMELINE_DATA.forEach((event) => {
        const docRef = doc(db, "timeline", event.id);
        batch.set(docRef, event);
      });
      await batch.commit();
    }

    // 4. Check & Seed Videos
    const videosRef = collection(db, "videos");
    const videosSnap = await getDocs(videosRef);
    if (videosSnap.empty) {
      console.log("Seeding videos collection in Firestore...");
      const batch = writeBatch(db);
      PRE_POPULATED_VIDEOS.forEach((vid) => {
        const docRef = doc(db, "videos", vid.id);
        batch.set(docRef, vid);
      });
      await batch.commit();
    }

    // 5. Check & Seed Photos
    const photosRef = collection(db, "photos");
    const photosSnap = await getDocs(photosRef);
    if (photosSnap.empty) {
      console.log("Seeding photos collection in Firestore...");
      const batch = writeBatch(db);
      PRE_POPULATED_PHOTOS.forEach((photo) => {
        const docRef = doc(db, "photos", photo.id);
        batch.set(docRef, photo);
      });
      await batch.commit();
    }

    // 6. Check & Seed Superlatives
    const superlativesRef = collection(db, "superlatives");
    const superlativesSnap = await getDocs(superlativesRef);
    if (superlativesSnap.empty) {
      console.log("Seeding superlatives collection in Firestore...");
      const batch = writeBatch(db);
      SUPERLATIVES_DATA.forEach((sup) => {
        const docRef = doc(db, "superlatives", sup.id);
        batch.set(docRef, sup);
      });
      await batch.commit();
    }

    // 7. Check & Seed Teacher Tributes
    const teacherTributesRef = collection(db, "teacher_tributes");
    const teacherTributesSnap = await getDocs(teacherTributesRef);
    if (teacherTributesSnap.empty) {
      console.log("Seeding teacher tributes collection in Firestore...");
      const batch = writeBatch(db);
      TEACHER_TRIBUTES_DATA.forEach((trib) => {
        const docRef = doc(db, "teacher_tributes", trib.id);
        batch.set(docRef, trib);
      });
      await batch.commit();
    }

    console.log("Firestore database check & seeding complete!");
  } catch (err) {
    console.error("Error during Firestore seeding:", err);
  }
}

// ==========================================
// GUESTBOOK SERVICES
// ==========================================

export async function fetchGuestbook(): Promise<GuestbookEntry[]> {
  try {
    const q = query(collection(db, "guestbook"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      return PRE_POPULATED_GUESTBOOK;
    }
    return snap.docs.map(d => d.data() as GuestbookEntry);
  } catch (err) {
    console.error("Error fetching guestbook entries:", err);
    return PRE_POPULATED_GUESTBOOK;
  }
}

// ==========================================
// STUDENTS SERVICES
// ==========================================

export async function fetchStudents(): Promise<Student[]> {
  try {
    const snap = await getDocs(collection(db, "students"));
    if (snap.empty) {
      return STUDENTS_DATA;
    }
    return snap.docs.map(d => d.data() as Student);
  } catch (err) {
    console.error("Error fetching students:", err);
    return STUDENTS_DATA;
  }
}

// ==========================================
// TIMELINE SERVICES
// ==========================================

export async function fetchTimeline(): Promise<TimelineEvent[]> {
  try {
    const q = query(collection(db, "timeline"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      return TIMELINE_DATA;
    }
    return snap.docs.map(d => d.data() as TimelineEvent);
  } catch (err) {
    console.error("Error fetching timeline events:", err);
    return TIMELINE_DATA;
  }
}

// ==========================================
// VIDEO MEMORIES SERVICES
// ==========================================

export async function fetchVideos(): Promise<VideoMemory[]> {
  try {
    const q = query(collection(db, "videos"), orderBy("uploadedAt", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      return PRE_POPULATED_VIDEOS;
    }
    return snap.docs.map(d => d.data() as VideoMemory);
  } catch (err) {
    console.error("Error fetching videos from Firestore:", err);
    return PRE_POPULATED_VIDEOS;
  }
}

// ==========================================
// PENDING SUBMISSIONS SERVICES
// ==========================================

export interface PendingSubmission {
  id: string;
  type: "guestbook" | "student_add" | "student_portrait_update" | "timeline" | "video_memory" | "teacher_tribute" | "photo";
  submittedAt: string;
  data: any;
}

function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        cleaned[key] = cleanUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

export async function submitToModeration(
  type: PendingSubmission["type"],
  data: any
): Promise<{ success: boolean; message: string; id: string }> {
  const id = `pend-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const submission: PendingSubmission = {
    id,
    type,
    submittedAt: new Date().toISOString(),
    data: cleanUndefined(data)
  };

  try {
    await setDoc(doc(db, "submissions", id), submission);
    return {
      success: true,
      message: "Your submission has been received and is waiting for Admin Gatekeeper approval!",
      id
    };
  } catch (err: any) {
    console.error("Error submitting to moderation queue:", err);
    throw new Error(err.message || "Failed to submit for moderation.");
  }
}

export async function fetchPendingSubmissions(): Promise<PendingSubmission[]> {
  try {
    const q = query(collection(db, "submissions"), orderBy("submittedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PendingSubmission);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "submissions");
  }
}

// ==========================================
// ADMIN MODERATION ACTIONS
// ==========================================

export async function approveSubmission(item: PendingSubmission): Promise<void> {
  const batch = writeBatch(db);
  const itemData = item.data;

  if (item.type === "guestbook") {
    const newEntry: GuestbookEntry = {
      id: `guest-user-${Date.now()}`,
      name: itemData.name,
      role: itemData.role,
      message: itemData.message,
      timestamp: itemData.timestamp || new Date().toISOString(),
      imageUrl: itemData.imageUrl || undefined
    };
    batch.set(doc(db, "guestbook", newEntry.id), newEntry);

  } else if (item.type === "student_add") {
    const newStudent: Student = {
      id: `stud-user-${Date.now()}`,
      name: itemData.name,
      nickname: itemData.nickname || "Graduand",
      image: itemData.image,
      favoriteMemory: itemData.favoriteMemory || "Graduation Day!",
      messageToClassmates: itemData.messageToClassmates || "Keep shining!",
      aspirations: itemData.aspirations || "Leader",
      house: itemData.house || "Blue House (Sovereigns)"
    };
    batch.set(doc(db, "students", newStudent.id), newStudent);

  } else if (item.type === "student_portrait_update") {
    const { studentId, image } = itemData;
    const studentRef = doc(db, "students", studentId);
    
    // Get existing student to check if old image can be cleaned up
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      const existingStudent = studentSnap.data() as Student;
      const oldImage = existingStudent.image;
      if (oldImage && oldImage.includes("cloudinary.com")) {
        // Try calling server route to destroy old image from Cloudinary
        try {
          await fetch("/api/delete-cloudinary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: oldImage })
          });
        } catch (e) {
          console.warn("Unable to delete old image from Cloudinary (might be client-only host)", e);
        }
      }
    }
    
    batch.update(studentRef, { image });

  } else if (item.type === "timeline") {
    const newEvent: TimelineEvent = {
      id: `time-user-${Date.now()}`,
      date: itemData.date,
      title: itemData.title,
      description: itemData.description,
      image: itemData.image
    };
    batch.set(doc(db, "timeline", newEvent.id), newEvent);
  } else if (item.type === "video_memory") {
    if (itemData.urls && Array.isArray(itemData.urls)) {
      itemData.urls.forEach((url: string, index: number) => {
        const newVideo: VideoMemory = {
          id: `vid-user-${Date.now()}-${index}-${Math.floor(Math.random() * 100)}`,
          title: `${itemData.title || "Class Memory"} (${index + 1}/${itemData.urls.length})`,
          submittedBy: itemData.submittedBy || "Visitor",
          role: itemData.role || "Student",
          url: url,
          thumbnailUrl: itemData.thumbnailUrls?.[index] || undefined,
          uploadedAt: itemData.uploadedAt || new Date().toISOString()
        };
        batch.set(doc(db, "videos", newVideo.id), newVideo);
      });
    } else {
      const newVideo: VideoMemory = {
        id: `vid-user-${Date.now()}`,
        title: itemData.title,
        submittedBy: itemData.submittedBy,
        role: itemData.role || "Student",
        url: itemData.url,
        thumbnailUrl: itemData.thumbnailUrl || undefined,
        uploadedAt: itemData.uploadedAt || new Date().toISOString()
      };
      batch.set(doc(db, "videos", newVideo.id), newVideo);
    }
  } else if (item.type === "teacher_tribute") {
    const newTribute: TeacherTribute = {
      id: `trib-user-${Date.now()}`,
      name: itemData.name,
      subject: itemData.subject,
      message: itemData.message,
      image: itemData.image || "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&auto=format&fit=crop&q=80"
    };
    batch.set(doc(db, "teacher_tributes", newTribute.id), newTribute);
  } else if (item.type === "photo") {
    if (itemData.urls && Array.isArray(itemData.urls)) {
      itemData.urls.forEach((url: string, index: number) => {
        const newPhoto: Photo = {
          id: `photo-user-${Date.now()}-${index}-${Math.floor(Math.random() * 100)}`,
          url: url,
          title: itemData.title || "School Highlights",
          submittedBy: itemData.submittedBy || "Visitor",
          role: itemData.role || "Visitor",
          uploadedAt: itemData.uploadedAt || new Date().toISOString()
        };
        batch.set(doc(db, "photos", newPhoto.id), newPhoto);
      });
    } else {
      const newPhoto: Photo = {
        id: `photo-user-${Date.now()}`,
        url: itemData.url,
        title: itemData.title || "School Highlights",
        submittedBy: itemData.submittedBy || "Visitor",
        role: itemData.role || "Visitor",
        uploadedAt: itemData.uploadedAt || new Date().toISOString()
      };
      batch.set(doc(db, "photos", newPhoto.id), newPhoto);
    }
  }

  // Delete from submissions
  batch.delete(doc(db, "submissions", item.id));
  await batch.commit();
}

export async function rejectSubmission(item: PendingSubmission): Promise<void> {
  const itemData = item.data;
  let imageUrlToDelete: string | null = null;

  if (item.type === "guestbook") {
    imageUrlToDelete = itemData.imageUrl || null;
  } else if (item.type === "student_add" || item.type === "student_portrait_update" || item.type === "timeline" || item.type === "teacher_tribute") {
    imageUrlToDelete = itemData.image || null;
  } else if (item.type === "photo") {
    if (itemData.urls && Array.isArray(itemData.urls)) {
      for (const url of itemData.urls) {
        if (url && url.includes("cloudinary.com")) {
          try {
            await fetch("/api/delete-cloudinary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url })
            });
          } catch (e) {
            console.warn("Unable to delete image from Cloudinary", e);
          }
        }
      }
    } else {
      imageUrlToDelete = itemData.url || null;
    }
  } else if (item.type === "video_memory") {
    if (itemData.urls && Array.isArray(itemData.urls)) {
      for (const url of itemData.urls) {
        if (url && url.includes("cloudinary.com")) {
          try {
            await fetch("/api/delete-cloudinary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url })
            });
          } catch (e) {
            console.warn("Unable to delete video from Cloudinary", e);
          }
        }
      }
      if (itemData.thumbnailUrls && Array.isArray(itemData.thumbnailUrls)) {
        for (const thumb of itemData.thumbnailUrls) {
          if (thumb && thumb.includes("cloudinary.com")) {
            try {
              await fetch("/api/delete-cloudinary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: thumb })
              });
            } catch (e) {
              console.warn("Unable to delete thumbnail from Cloudinary", e);
            }
          }
        }
      }
    } else {
      imageUrlToDelete = itemData.url || null;
      const thumbToDelete = itemData.thumbnailUrl || null;
      if (thumbToDelete && thumbToDelete.includes("cloudinary.com")) {
        try {
          await fetch("/api/delete-cloudinary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: thumbToDelete })
          });
        } catch (e) {
          console.warn("Unable to delete thumbnail from Cloudinary", e);
        }
      }
    }
  }

  // Delete from Cloudinary if image exists
  if (imageUrlToDelete && imageUrlToDelete.includes("cloudinary.com")) {
    try {
      await fetch("/api/delete-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrlToDelete })
      });
    } catch (e) {
      console.warn("Unable to delete image from Cloudinary (might be client-only host)", e);
    }
  }

  // Delete from submissions collection
  await deleteDoc(doc(db, "submissions", item.id));
}

// ==========================================
// APPROVED DATA CLEANUP SERVICES
// ==========================================

export async function deleteApprovedGuestbookEntry(id: string, imageUrl?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "guestbook", id));
    if (imageUrl && imageUrl.includes("cloudinary.com")) {
      await fetch("/api/delete-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl })
      });
    }
  } catch (err) {
    console.error("Error deleting approved guestbook entry:", err);
    throw err;
  }
}

export async function deleteApprovedStudent(id: string, imageUrl?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "students", id));
    if (imageUrl && imageUrl.includes("cloudinary.com")) {
      await fetch("/api/delete-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl })
      });
    }
  } catch (err) {
    console.error("Error deleting approved student:", err);
    throw err;
  }
}

export async function deleteApprovedTimelineEvent(id: string, imageUrl?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "timeline", id));
    if (imageUrl && imageUrl.includes("cloudinary.com")) {
      await fetch("/api/delete-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl })
      });
    }
  } catch (err) {
    console.error("Error deleting approved timeline event:", err);
    throw err;
  }
}

export async function deleteApprovedVideoMemory(id: string, url?: string, thumbnailUrl?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "videos", id));
    if (url && url.includes("cloudinary.com")) {
      await fetch("/api/delete-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
    }
    if (thumbnailUrl && thumbnailUrl.includes("cloudinary.com")) {
      await fetch("/api/delete-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: thumbnailUrl })
      });
    }
  } catch (err) {
    console.error("Error deleting approved video memory:", err);
    throw err;
  }
}

// ==========================================
// PHOTO GALLERY SERVICES
// ==========================================

export async function fetchPhotos(): Promise<Photo[]> {
  try {
    const q = query(collection(db, "photos"), orderBy("uploadedAt", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      return PRE_POPULATED_PHOTOS;
    }
    return snap.docs.map(d => d.data() as Photo);
  } catch (err) {
    console.error("Error fetching photos:", err);
    return PRE_POPULATED_PHOTOS;
  }
}

export async function addPhoto(photo: Photo): Promise<void> {
  try {
    await setDoc(doc(db, "photos", photo.id), photo);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `photos/${photo.id}`);
  }
}

export async function deleteApprovedPhoto(id: string, url?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "photos", id));
    if (url && url.includes("cloudinary.com")) {
      await fetch("/api/delete-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
    }
  } catch (err) {
    console.error("Error deleting approved photo:", err);
    throw err;
  }
}

// ==========================================
// SUPERLATIVES SERVICES
// ==========================================

export async function fetchSuperlatives(): Promise<Superlative[]> {
  try {
    const snap = await getDocs(collection(db, "superlatives"));
    if (snap.empty) {
      return SUPERLATIVES_DATA;
    }
    return snap.docs.map(d => d.data() as Superlative);
  } catch (err) {
    console.error("Error fetching superlatives:", err);
    return SUPERLATIVES_DATA;
  }
}

export async function addSuperlative(sup: Superlative): Promise<void> {
  try {
    await setDoc(doc(db, "superlatives", sup.id), sup);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `superlatives/${sup.id}`);
  }
}

export async function deleteApprovedSuperlative(id: string, studentImage?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "superlatives", id));
    if (studentImage && studentImage.includes("cloudinary.com")) {
      await fetch("/api/delete-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: studentImage })
      });
    }
  } catch (err) {
    console.error("Error deleting approved superlative:", err);
    throw err;
  }
}

// ==========================================
// TEACHER TRIBUTES SERVICES
// ==========================================

export async function fetchTeacherTributes(): Promise<TeacherTribute[]> {
  try {
    const snap = await getDocs(collection(db, "teacher_tributes"));
    if (snap.empty) {
      return TEACHER_TRIBUTES_DATA;
    }
    return snap.docs.map(d => d.data() as TeacherTribute);
  } catch (err) {
    console.error("Error fetching teacher tributes:", err);
    return TEACHER_TRIBUTES_DATA;
  }
}

export async function addTeacherTribute(trib: TeacherTribute): Promise<void> {
  try {
    await setDoc(doc(db, "teacher_tributes", trib.id), trib);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `teacher_tributes/${trib.id}`);
  }
}

export async function deleteApprovedTeacherTribute(id: string, image?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "teacher_tributes", id));
    if (image && image.includes("cloudinary.com")) {
      await fetch("/api/delete-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: image })
      });
    }
  } catch (err) {
    console.error("Error deleting teacher tribute:", err);
    throw err;
  }
}

// ==========================================
// ADMIN MANAGEMENT SERVICES
// ==========================================

export async function fetchAdmins(): Promise<AdminUser[]> {
  try {
    const snap = await getDocs(collection(db, "admins"));
    return snap.docs.map(d => d.data() as AdminUser);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "admins");
  }
}

export async function addAdminUser(email: string, addedByEmail: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) {
    throw new Error("Invalid email address");
  }
  try {
    await setDoc(doc(db, "admins", normalizedEmail), {
      email: normalizedEmail,
      addedAt: new Date().toISOString(),
      addedBy: addedByEmail
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `admins/${normalizedEmail}`);
  }
}

export async function removeAdminUser(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    await deleteDoc(doc(db, "admins", normalizedEmail));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `admins/${normalizedEmail}`);
  }
}

export async function checkIsAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail === "opadijoadeniyi20@gmail.com") return true;
  try {
    const docRef = doc(db, "admins", normalizedEmail);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `admins/${normalizedEmail}`);
  }
}

// ==========================================
// DIRECT ADMIN WRITE HELPERS (Bypassing queue)
// ==========================================

export async function addApprovedStudent(student: Student): Promise<void> {
  try {
    await setDoc(doc(db, "students", student.id), student);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `students/${student.id}`);
  }
}

export async function updateApprovedStudent(student: Student): Promise<void> {
  try {
    await setDoc(doc(db, "students", student.id), student);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `students/${student.id}`);
  }
}

export async function addApprovedTimelineEvent(event: TimelineEvent): Promise<void> {
  try {
    await setDoc(doc(db, "timeline", event.id), event);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `timeline/${event.id}`);
  }
}

export async function addApprovedVideoMemory(video: VideoMemory): Promise<void> {
  try {
    await setDoc(doc(db, "videos", video.id), video);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `videos/${video.id}`);
  }
}

export async function fetchSchoolLogo(): Promise<string | null> {
  try {
    const docRef = doc(db, "settings", "school");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().logoUrl || null;
    }
    return null;
  } catch (err) {
    console.error("Error fetching school logo:", err);
    return null;
  }
}

export async function saveSchoolLogo(logoUrl: string): Promise<void> {
  try {
    const docRef = doc(db, "settings", "school");
    await setDoc(docRef, { logoUrl }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "settings/school");
  }
}

export function subscribeSchoolLogo(callback: (logoUrl: string | null) => void): () => void {
  const docRef = doc(db, "settings", "school");
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().logoUrl || null);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error("Error subscribing to school logo:", err);
    callback(null);
  });
}

export async function saveActiveBannerEvent(eventName: string): Promise<void> {
  try {
    const docRef = doc(db, "settings", "school");
    await setDoc(docRef, { activeBannerEvent: eventName }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "settings/school");
  }
}

export function subscribeActiveBannerEvent(callback: (eventName: string | null) => void): () => void {
  const docRef = doc(db, "settings", "school");
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().activeBannerEvent || null);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error("Error subscribing to active banner event:", err);
    callback(null);
  });
}

// ==========================================
// CUSTOM DYNAMIC SECTIONS SERVICES
// ==========================================

export async function fetchCustomSections(): Promise<CustomSection[]> {
  try {
    const q = query(collection(db, "custom_sections"), orderBy("orderIndex", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as CustomSection);
  } catch (err) {
    console.error("Error fetching custom sections:", err);
    return [];
  }
}

export function subscribeCustomSections(callback: (sections: CustomSection[]) => void): () => void {
  const q = query(collection(db, "custom_sections"), orderBy("orderIndex", "asc"));
  return onSnapshot(q, (snap) => {
    const sections = snap.docs.map(d => d.data() as CustomSection);
    callback(sections);
  }, (err) => {
    console.error("Error subscribing to custom sections:", err);
    callback([]);
  });
}

export async function addApprovedCustomSection(section: CustomSection): Promise<void> {
  try {
    await setDoc(doc(db, "custom_sections", section.id), section);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `custom_sections/${section.id}`);
  }
}

export async function updateApprovedCustomSection(section: CustomSection): Promise<void> {
  try {
    await setDoc(doc(db, "custom_sections", section.id), section, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `custom_sections/${section.id}`);
  }
}

export async function deleteApprovedCustomSection(id: string, mediaUrl?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "custom_sections", id));
    if (mediaUrl && mediaUrl.includes("cloudinary.com")) {
      await fetch("/api/delete-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: mediaUrl })
      });
    }
  } catch (err) {
    console.error("Error deleting approved custom section:", err);
    throw err;
  }
}

