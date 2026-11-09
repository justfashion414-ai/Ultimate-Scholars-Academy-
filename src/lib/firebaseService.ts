import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  writeBatch,
  getDoc,
  onSnapshot
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { deleteFromCloudinary } from "./cloudinaryService";
import { STUDENTS_DATA, TIMELINE_DATA, PRE_POPULATED_GUESTBOOK, PRE_POPULATED_VIDEOS, PRE_POPULATED_PHOTOS, SUPERLATIVES_DATA, TEACHER_TRIBUTES_DATA } from "../data";
import { Student, TimelineEvent, GuestbookEntry, VideoMemory, AdminUser, Photo, Superlative, TeacherTribute, CustomSection, CodingProject, CodingStudentProfile } from "../types";

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

    // 8. Check & Seed Coding Projects collection (ensures collection is visible in Firebase Console)
    try {
      const codingProjectsRef = collection(db, "coding_projects");
      const codingProjectsSnap = await getDocs(codingProjectsRef);
      if (codingProjectsSnap.empty) {
        console.log("Seeding initial coding_projects collection in Firestore...");
        const starterProject: CodingProject = {
          id: "starter_practice_project",
          studentId: "student_starter",
          studentName: "Class Starter",
          studentEmail: "class@scholarsacademy.edu",
          title: "Welcome to Coding Lab Starter",
          files: {
            "index.html": "<div class=\"welcome-box\">\n  <h1>Welcome to Coding Lab!</h1>\n  <p>Start editing or select a template above.</p>\n</div>",
            "styles.css": ".welcome-box {\n  text-align: center;\n  padding: 40px;\n  font-family: sans-serif;\n  color: #0F2557;\n}",
            "script.js": "console.log('Coding lab ready.');"
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, "coding_projects", starterProject.id), starterProject);
      }
    } catch (err) {
      console.warn("Notice: coding_projects check/seed notice:", err);
    }

    // 9. Check & Seed Coding Students collection (ensures collection is visible in Firebase Console)
    try {
      const codingStudentsRef = collection(db, "coding_students");
      const codingStudentsSnap = await getDocs(codingStudentsRef);
      if (codingStudentsSnap.empty) {
        console.log("Seeding initial coding_students collection in Firestore...");
        const demoStudent: CodingStudentProfile = {
          studentId: "student_starter_demo",
          studentName: "Demo Student",
          studentEmail: "demo@scholarsacademy.edu",
          className: "Class of 2026",
          authMethod: "student_id_pin",
          loginIdentifier: "STD001",
          pin: "1234",
          lastActive: new Date().toISOString()
        };
        await setDoc(doc(db, "coding_students", demoStudent.studentId), demoStudent);
      }
    } catch (err) {
      console.warn("Notice: coding_students check/seed notice:", err);
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
        try {
          await deleteFromCloudinary(oldImage);
        } catch (e) {
          console.warn("Unable to delete old image from Cloudinary", e);
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
  const urlsToDelete: string[] = [];

  const extractUrls = (val: any) => {
    if (typeof val === 'string') {
      if (val.includes('cloudinary.com') && !urlsToDelete.includes(val)) {
        urlsToDelete.push(val);
      }
    } else if (Array.isArray(val)) {
      val.forEach(extractUrls);
    } else if (typeof val === 'object' && val !== null) {
      Object.values(val).forEach(extractUrls);
    }
  };

  if (item.data) {
    extractUrls(item.data);
  }

  // Delete all Cloudinary assets associated with rejected submission
  if (urlsToDelete.length > 0) {
    console.log(`[Reject] Deleting ${urlsToDelete.length} Cloudinary asset(s) for rejected submission ${item.id}:`, urlsToDelete);
    await Promise.allSettled(urlsToDelete.map((url) => deleteFromCloudinary(url)));
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
      await deleteFromCloudinary(imageUrl);
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
      await deleteFromCloudinary(imageUrl);
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
      await deleteFromCloudinary(imageUrl);
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
      await deleteFromCloudinary(url);
    }
    if (thumbnailUrl && thumbnailUrl.includes("cloudinary.com")) {
      await deleteFromCloudinary(thumbnailUrl);
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

export function subscribePhotos(callback: (photos: Photo[]) => void) {
  try {
    const q = query(collection(db, "photos"), orderBy("uploadedAt", "desc"));
    return onSnapshot(q, (snap) => {
      if (snap.empty) {
        callback(PRE_POPULATED_PHOTOS);
      } else {
        const photos = snap.docs.map(d => d.data() as Photo);
        callback(photos);
      }
    }, (err) => {
      console.error("Error subscribing to photos snapshot:", err);
      callback(PRE_POPULATED_PHOTOS);
    });
  } catch (err) {
    console.error("Failed to subscribe to photos:", err);
    callback(PRE_POPULATED_PHOTOS);
    return () => {};
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
      await deleteFromCloudinary(url);
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
      await deleteFromCloudinary(studentImage);
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
      await deleteFromCloudinary(image);
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
  // Primary Super Admins are authorized by hardcode so admin login never
  // depends on an admins/{email} Firestore document existing.
  if (["opadijoadeniyi20@gmail.com", "justfashion414@gmail.com"].includes(normalizedEmail)) return true;
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
      await deleteFromCloudinary(mediaUrl);
    }
  } catch (err) {
    console.error("Error deleting approved custom section:", err);
    throw err;
  }
}

// ==========================================
// STUDENT CODING LAB PERSISTENCE & MONITORING
// ==========================================

export async function saveCodingProject(project: CodingProject): Promise<void> {
  const updatedProject: CodingProject = {
    ...project,
    updatedAt: new Date().toISOString()
  };

  // Always mirror in localStorage for offline resilience & immediate feedback
  try {
    const localKey = `scholars_coding_projects_${project.studentId}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    const index = existing.findIndex((p: any) => p.id === project.id);
    if (index >= 0) {
      existing[index] = updatedProject;
    } else {
      existing.unshift(updatedProject);
    }
    localStorage.setItem(localKey, JSON.stringify(existing));
  } catch (e) {
    console.warn("Local storage save error:", e);
  }

  // Save to Cloud Firestore
  try {
    await setDoc(doc(db, "coding_projects", project.id), updatedProject);
    console.log(`[Firestore] Project "${project.title}" saved to cloud successfully.`);
  } catch (err: any) {
    console.error("[Firestore] saveCodingProject cloud save failed:", err);
    throw new Error(`Cloud save error: ${err.message || 'Unable to reach Firestore'}. Changes kept in local browser cache.`);
  }
}

export async function fetchStudentCodingProjects(studentId: string): Promise<CodingProject[]> {
  const localKey = `scholars_coding_projects_${studentId}`;
  let localProjects: CodingProject[] = [];
  try {
    localProjects = JSON.parse(localStorage.getItem(localKey) || '[]');
  } catch (e) {
    localProjects = [];
  }

  try {
    const q = query(
      collection(db, "coding_projects"),
      where("studentId", "==", studentId)
    );
    const snap = await getDocs(q);
    const remoteProjects: CodingProject[] = [];
    snap.forEach(docSnap => {
      remoteProjects.push(docSnap.data() as CodingProject);
    });

    // Auto-sync: If this device contains local projects that haven't been pushed to the cloud yet
    // (e.g. created prior to rules deployment or offline), upload them now to make them visible across all devices!
    for (const lp of localProjects) {
      const alreadyInRemote = remoteProjects.some(rp => rp.id === lp.id);
      if (!alreadyInRemote && lp.id && lp.studentId) {
        try {
          console.log(`[Cloud Sync] Uploading unsynced project "${lp.title}" to Firestore...`);
          await setDoc(doc(db, "coding_projects", lp.id), {
            ...lp,
            updatedAt: lp.updatedAt || new Date().toISOString()
          });
          remoteProjects.push(lp);
        } catch (syncErr) {
          console.warn("[Cloud Sync] Failed uploading unsynced project:", syncErr);
        }
      }
    }

    if (remoteProjects.length > 0) {
      remoteProjects.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      try {
        localStorage.setItem(localKey, JSON.stringify(remoteProjects));
      } catch (e) {
        // ignore
      }
      return remoteProjects;
    }
  } catch (err) {
    console.warn("Firestore fetchStudentCodingProjects notice (using local cache):", err);
  }

  return localProjects;
}

export async function fetchAllCodingProjects(): Promise<CodingProject[]> {
  try {
    const snap = await getDocs(collection(db, "coding_projects"));
    const projects: CodingProject[] = [];
    snap.forEach(docSnap => {
      projects.push(docSnap.data() as CodingProject);
    });
    // Sort by updatedAt desc
    projects.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    return projects;
  } catch (err) {
    console.warn("Firestore fetchAllCodingProjects notice:", err);
    // Gather all local projects across all keys
    const allLocal: CodingProject[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("scholars_coding_projects_")) {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          allLocal.push(...list);
        }
      }
    } catch (e) {
      // ignore
    }
    return allLocal;
  }
}

export async function deleteCodingProject(projectId: string, studentId: string): Promise<void> {
  try {
    const localKey = `scholars_coding_projects_${studentId}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter((p: any) => p.id !== projectId);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Local storage delete error:", e);
  }

  try {
    await deleteDoc(doc(db, "coding_projects", projectId));
  } catch (err) {
    console.warn("Firestore deleteCodingProject notice:", err);
  }
}

// -----------------------------------------------------------------
// STUDENT REGISTRATION & AUTHENTICATION (STUDENT ID & PIN / EMAIL)
// -----------------------------------------------------------------

export function getCleanStudentDocId(studentId: string): string {
  const sanitized = studentId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `student_${sanitized}`;
}

export async function saveStudentProfile(profile: CodingStudentProfile): Promise<void> {
  // Mirror in localStorage
  try {
    const stored = JSON.parse(localStorage.getItem('scholars_coding_students_db') || '{}');
    stored[profile.studentId] = profile;
    localStorage.setItem('scholars_coding_students_db', JSON.stringify(stored));
  } catch (e) {
    console.warn("Local storage save error for student profile:", e);
  }

  // Save to Firestore cloud
  try {
    await setDoc(doc(db, "coding_students", profile.studentId), {
      ...profile,
      lastActive: new Date().toISOString()
    }, { merge: true });
    console.log(`[Firestore] Student profile "${profile.studentName}" synced to cloud.`);
  } catch (err: any) {
    console.warn("Firestore saveStudentProfile notice (cached locally):", err);
  }
}

export async function fetchStudentProfile(studentId: string): Promise<CodingStudentProfile | null> {
  // Try Firestore first
  try {
    const snap = await getDoc(doc(db, "coding_students", studentId));
    if (snap.exists()) {
      const data = snap.data() as CodingStudentProfile;
      try {
        const stored = JSON.parse(localStorage.getItem('scholars_coding_students_db') || '{}');
        stored[studentId] = data;
        localStorage.setItem('scholars_coding_students_db', JSON.stringify(stored));
      } catch (e) {
        // ignore
      }
      return data;
    }
  } catch (err) {
    console.warn("Firestore fetchStudentProfile notice:", err);
  }

  // Fallback to local storage
  try {
    const stored = JSON.parse(localStorage.getItem('scholars_coding_students_db') || '{}');
    if (stored[studentId]) {
      const localData = stored[studentId];
      // Attempt background push to cloud so other devices have access
      try {
        await setDoc(doc(db, "coding_students", studentId), localData, { merge: true });
      } catch (syncErr) {
        // ignore
      }
      return localData;
    }
  } catch (e) {
    // ignore
  }

  return null;
}

export async function registerStudentWithIdPin(
  rawStudentId: string, 
  name: string, 
  pin: string, 
  className?: string,
  track: 'coding' | 'graphics' = 'coding'
): Promise<CodingStudentProfile> {
  const trimmedId = rawStudentId.trim();
  const trimmedPin = pin.trim();
  const trimmedName = name.trim();

  if (!trimmedId) throw new Error("Student ID is required.");
  if (!trimmedName) throw new Error("Student Name is required.");
  if (trimmedPin.length < 4) throw new Error("PIN must be at least 4 digits.");

  const docId = getCleanStudentDocId(trimmedId);

  // Check if student already exists in Firestore
  try {
    const existingSnap = await getDoc(doc(db, "coding_students", docId));
    if (existingSnap.exists()) {
      throw new Error(`Student ID "${trimmedId.toUpperCase()}" is already registered. Please use the Sign In tab.`);
    }
  } catch (e: any) {
    if (e.message?.includes("already registered")) {
      throw e;
    }
  }

  // Also check local store
  try {
    const stored = JSON.parse(localStorage.getItem('scholars_coding_students_db') || '{}');
    if (stored[docId]) {
      throw new Error(`Student ID "${trimmedId.toUpperCase()}" is already registered. Please use the Sign In tab.`);
    }
  } catch (e: any) {
    if (e.message?.includes("already registered")) {
      throw e;
    }
  }

  const newProfile: CodingStudentProfile = {
    studentId: docId,
    studentName: trimmedName,
    studentEmail: `${trimmedId.toLowerCase()}@student.local`,
    className: className?.trim() || 'Class of 2026',
    authMethod: 'student_id_pin',
    loginIdentifier: trimmedId.toUpperCase(),
    pin: trimmedPin,
    track,
    lastActive: new Date().toISOString()
  };

  await saveStudentProfile(newProfile);
  return newProfile;
}

export async function loginStudentWithIdPin(rawStudentId: string, pin: string): Promise<CodingStudentProfile> {
  const trimmedId = rawStudentId.trim();
  const trimmedPin = pin.trim();

  if (!trimmedId) throw new Error("Please enter your Student ID.");
  if (!trimmedPin) throw new Error("Please enter your PIN.");

  const docId = getCleanStudentDocId(trimmedId);

  let profile: CodingStudentProfile | null = null;

  // Try Firestore cloud
  try {
    const snap = await getDoc(doc(db, "coding_students", docId));
    if (snap.exists()) {
      profile = snap.data() as CodingStudentProfile;
      try {
        const stored = JSON.parse(localStorage.getItem('scholars_coding_students_db') || '{}');
        stored[docId] = profile;
        localStorage.setItem('scholars_coding_students_db', JSON.stringify(stored));
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.warn("Firestore lookup failed, checking local store:", e);
  }

  // Fallback to local storage if offline or not in Firestore
  if (!profile) {
    try {
      const stored = JSON.parse(localStorage.getItem('scholars_coding_students_db') || '{}');
      if (stored[docId]) {
        profile = stored[docId];
        // Background push to Firestore so second device can login!
        try {
          await setDoc(doc(db, "coding_students", docId), profile, { merge: true });
        } catch (syncErr) {
          console.warn("Could not sync local student profile to Firestore:", syncErr);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!profile) {
    throw new Error(`Student ID "${trimmedId.toUpperCase()}" not found. If this is your first time, please click "Register New ID".`);
  }

  if (profile.pin && profile.pin !== trimmedPin) {
    throw new Error("Incorrect PIN. Please re-enter your 4-digit PIN or ask your teacher for help.");
  }

  // Update last active; lazy-migrate legacy students to the coding track
  profile.lastActive = new Date().toISOString();
  if (!profile.track) profile.track = 'coding';
  await saveStudentProfile(profile);

  return profile;
}

export async function fetchAllStudents(): Promise<CodingStudentProfile[]> {
  const studentMap = new Map<string, CodingStudentProfile>();

  // Fetch Firestore
  try {
    const snap = await getDocs(collection(db, "coding_students"));
    snap.forEach(docSnap => {
      const s = docSnap.data() as CodingStudentProfile;
      studentMap.set(s.studentId, s);
    });
  } catch (e) {
    console.warn("Firestore fetchAllStudents notice:", e);
  }

  // Merge localStorage
  try {
    const stored = JSON.parse(localStorage.getItem('scholars_coding_students_db') || '{}');
    Object.values(stored).forEach((s: any) => {
      if (s?.studentId && !studentMap.has(s.studentId)) {
        studentMap.set(s.studentId, s as CodingStudentProfile);
      }
    });
  } catch (e) {
    // ignore
  }

  return Array.from(studentMap.values()).sort((a, b) => 
    new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime()
  );
}

export async function resetStudentPin(studentId: string, newPin: string): Promise<void> {
  const trimmed = newPin.trim();
  if (trimmed.length < 4) throw new Error("New PIN must be at least 4 digits.");

  try {
    await setDoc(doc(db, "coding_students", studentId), {
      pin: trimmed,
      lastActive: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn("Firestore reset PIN error:", e);
  }

  try {
    const stored = JSON.parse(localStorage.getItem('scholars_coding_students_db') || '{}');
    if (stored[studentId]) {
      stored[studentId].pin = trimmed;
      localStorage.setItem('scholars_coding_students_db', JSON.stringify(stored));
    }
  } catch (e) {
    // ignore
  }
}
