import express from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { STUDENTS_DATA, TIMELINE_DATA, PRE_POPULATED_GUESTBOOK } from "./src/data";

// Load environment variables from .env
dotenv.config();

const DB_FILE = path.join(process.cwd(), "server_db.json");
const ADMIN_TOKEN = "scholars_admin_secure_session_token_2026"; // Simple static session token for prototype
const ADMIN_PASSWORD = "admin2026"; // Default password as requested

// Ensure database file exists with initial seeded data
function initDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    console.log("Initializing database file with default seeds...");
    const initialDB = {
      students: STUDENTS_DATA,
      timeline: TIMELINE_DATA,
      guestbook: PRE_POPULATED_GUESTBOOK,
      pending: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf-8");
  } else {
    // Validate if any key is missing
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      let updated = false;
      if (!data.students) { data.students = STUDENTS_DATA; updated = true; }
      if (!data.timeline) { data.timeline = TIMELINE_DATA; updated = true; }
      if (!data.guestbook) { data.guestbook = PRE_POPULATED_GUESTBOOK; updated = true; }
      if (!data.pending) { data.pending = []; updated = true; }
      if (updated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
      }
    } catch (e) {
      console.error("Error reading database, resetting to default...", e);
      const initialDB = {
        students: STUDENTS_DATA,
        timeline: TIMELINE_DATA,
        guestbook: PRE_POPULATED_GUESTBOOK,
        pending: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf-8");
    }
  }
}

// Read from JSON database
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read JSON DB", e);
    return { students: [], timeline: [], guestbook: [], pending: [] };
  }
}

// Write to JSON database
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write to JSON DB", e);
  }
}

// Helper to extract Cloudinary public ID from secure URL
function getCloudinaryPublicId(url: string): string | null {
  try {
    if (!url || !url.includes("cloudinary.com")) return null;
    
    let pathAndName = "";
    
    // 1. Try to split by version segment which is "/v" followed by digits, e.g. /v1720310230/
    const versionMatch = url.match(/\/v\d+\//);
    if (versionMatch) {
      const index = url.lastIndexOf(versionMatch[0]);
      pathAndName = url.substring(index + versionMatch[0].length);
    } else {
      // 2. If no version segment, split by "/upload/" or similar
      let uploadMarker = "/upload/";
      let uploadIndex = url.indexOf(uploadMarker);
      if (uploadIndex === -1) {
        uploadMarker = "/video/";
        uploadIndex = url.indexOf(uploadMarker);
      }
      if (uploadIndex === -1) {
        uploadMarker = "/image/";
        uploadIndex = url.indexOf(uploadMarker);
      }
      
      if (uploadIndex !== -1) {
        pathAndName = url.substring(uploadIndex + uploadMarker.length);
        
        // Split by slashes and filter out known transformation segments
        const segments = pathAndName.split("/");
        const cleanedSegments = segments.filter(seg => {
          if (seg.includes(",")) return false;
          const knownPrefixes = ["c_", "w_", "h_", "q_", "so_", "e_", "fl_", "ar_", "b_", "co_", "d_"];
          return !knownPrefixes.some(prefix => seg.startsWith(prefix));
        });
        pathAndName = cleanedSegments.join("/");
      } else {
        return null;
      }
    }
    
    // Remove query parameters or hash if any
    if (pathAndName.includes("?")) {
      pathAndName = pathAndName.split("?")[0];
    }
    if (pathAndName.includes("#")) {
      pathAndName = pathAndName.split("#")[0];
    }
    
    // Remove file extension
    const lastDot = pathAndName.lastIndexOf(".");
    if (lastDot !== -1) {
      pathAndName = pathAndName.substring(0, lastDot);
    }
    
    return pathAndName;
  } catch (e) {
    console.error("Error parsing Cloudinary URL public id:", e);
    return null;
  }
}

// Helper to delete an image or video from Cloudinary
async function deleteFromCloudinary(url: string): Promise<boolean> {
  const publicId = getCloudinaryPublicId(url);
  if (!publicId) return false;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("Cloudinary credentials missing for image/video deletion.");
    return false;
  }

  const isVideo = url.includes("/video/upload/");
  const resourceType = isVideo ? "video" : "image";

  try {
    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash("sha1")
      .update(stringToSign)
      .digest("hex");

    console.log(`Attempting to delete ${resourceType} ${publicId} from Cloudinary...`);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public_id: publicId,
        timestamp: timestamp,
        api_key: apiKey,
        signature: signature,
      }),
    });

    const data = (await response.json()) as { result?: string; error?: any };
    console.log("Cloudinary destroy response:", data);
    return data.result === "ok";
  } catch (err) {
    console.error("Cloudinary destroy API error:", err);
    return false;
  }
}

async function startServer() {
  // Initialize our small server DB
  initDatabase();

  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // ==========================================
  // API ROUTE: Secure Cloudinary Image Upload
  // ==========================================
  app.post("/api/upload", async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { file: rawFile, image, filename } = req.body;
      const file = rawFile || image;

      if (!file) {
        res.status(400).json({ error: "Missing 'file' or 'image' payload. Please provide a base64 string or image URL." });
        return;
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!cloudName || !apiKey || !apiSecret) {
        // Fallback: return the file base64 data URI directly if Cloudinary is not configured
        res.status(200).json({
          url: file,
          success: true,
          simulated: true
        });
        return;
      }

      // Generate parameters for signed upload
      const timestamp = Math.round(new Date().getTime() / 1000).toString();
      const folder = "scholars_class_2026";

      // Cloudinary parameters sorted alphabetically
      const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto
        .createHash("sha1")
        .update(stringToSign)
        .digest("hex");

      // Post payload to Cloudinary upload API
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: file,
          timestamp: timestamp,
          folder: folder,
          api_key: apiKey,
          signature: signature,
        }),
      });

      const responseText = await response.text();
      let data: { secure_url?: string; error?: { message: string } } = {};
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error("Failed to parse Cloudinary image response as JSON:", responseText);
        res.status(response.status || 400).json({ 
          error: `Cloudinary upload returned an invalid response format (Status ${response.status}).` 
        });
        return;
      }

      if (!response.ok || data.error) {
        console.error("Cloudinary Error:", data.error || data);
        res.status(response.status || 400).json({ 
          error: data.error?.message || "Cloudinary upload failed." 
        });
        return;
      }

      res.status(200).json({
        url: data.secure_url,
        success: true,
      });
    } catch (err: any) {
      console.error("Upload proxy error:", err);
      res.status(500).json({ error: err.message || "Internal server error during upload." });
    }
  });

  // ==========================================
  // API ROUTE: Secure Cloudinary Video Upload
  // ==========================================
  app.post("/api/upload-video", async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { file, filename } = req.body;

      if (!file) {
        res.status(400).json({ error: "Missing 'file' payload. Please provide a base64 string or video URL." });
        return;
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!cloudName || !apiKey || !apiSecret) {
        // Fallback or simulate upload if Cloudinary is not configured yet
        res.status(200).json({
          url: file.startsWith("data:") ? "https://assets.mixkit.co/videos/preview/mixkit-students-studying-in-a-classroom-43183-large.mp4" : file,
          success: true,
          simulated: true
        });
        return;
      }

      const timestamp = Math.round(new Date().getTime() / 1000).toString();
      const folder = "scholars_class_2026";
      const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto
        .createHash("sha1")
        .update(stringToSign)
        .digest("hex");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: file,
          timestamp: timestamp,
          folder: folder,
          api_key: apiKey,
          signature: signature,
        }),
      });

      const responseText = await response.text();
      let data: { secure_url?: string; error?: { message: string } } = {};
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error("Failed to parse Cloudinary video response as JSON:", responseText);
        res.status(response.status || 400).json({ 
          error: `Cloudinary video upload returned an invalid response format (Status ${response.status}).` 
        });
        return;
      }

      if (!response.ok || data.error) {
        console.error("Cloudinary Video Error:", data.error || data);
        res.status(response.status || 400).json({ 
          error: data.error?.message || "Cloudinary video upload failed." 
        });
        return;
      }

      res.status(200).json({
        url: data.secure_url,
        success: true,
      });
    } catch (err: any) {
      console.error("Video upload proxy error:", err);
      res.status(500).json({ error: err.message || "Internal server error during video upload." });
    }
  });

  // ==========================================
  // API ROUTE: Secure Cloudinary Image Deletion
  // ==========================================
  app.post("/api/delete-cloudinary", async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { url } = req.body;
      if (!url) {
        res.status(400).json({ error: "Missing image url to delete" });
        return;
      }
      
      const success = await deleteFromCloudinary(url);
      if (success) {
        res.status(200).json({ success: true, message: "Image deleted successfully from Cloudinary" });
      } else {
        res.status(400).json({ error: "Could not delete image from Cloudinary or image is not hosted on Cloudinary" });
      }
    } catch (err: any) {
      console.error("Delete Cloudinary proxy error:", err);
      res.status(500).json({ error: err.message || "Failed to process image deletion." });
    }
  });

  // ==========================================
  // API ROUTE: Fetch Active Data
  // ==========================================
  app.get("/api/data", (req, res) => {
    const db = readDB();
    res.json({
      students: db.students || [],
      timeline: db.timeline || [],
      guestbook: db.guestbook || []
    });
  });

  // ==========================================
  // API ROUTE: Submit Pending Item
  // ==========================================
  app.post("/api/submissions", (req, res) => {
    try {
      const { type, data } = req.body;
      if (!type || !data) {
        res.status(400).json({ error: "Missing type or data" });
        return;
      }

      const db = readDB();
      const newPendingItem = {
        id: `pend-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type,
        submittedAt: new Date().toISOString(),
        data
      };

      db.pending.push(newPendingItem);
      writeDB(db);

      res.status(200).json({
        success: true,
        message: "Your submission has been received and is waiting for admin approval!",
        id: newPendingItem.id
      });
    } catch (e: any) {
      console.error("Failed to submit item:", e);
      res.status(500).json({ error: e.message || "Failed to register submission." });
    }
  });

  // ==========================================
  // API ROUTE: Admin Login Auth
  // ==========================================
  app.post("/api/admin/auth", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      res.json({ success: true, token: ADMIN_TOKEN });
    } else {
      res.status(401).json({ success: false, error: "Incorrect admin password" });
    }
  });

  // ==========================================
  // API ROUTE: Admin Get Pending Submissions
  // ==========================================
  app.get("/api/admin/pending", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
      res.status(403).json({ error: "Unauthorized access" });
      return;
    }

    const db = readDB();
    res.json({ pending: db.pending || [] });
  });

  // ==========================================
  // API ROUTE: Admin Action (Approve / Reject)
  // ==========================================
  app.post("/api/admin/action", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
      res.status(403).json({ error: "Unauthorized access" });
      return;
    }

    const { pendingId, action } = req.body;
    if (!pendingId || !action || !["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "Invalid pendingId or action" });
      return;
    }

    const db = readDB();
    const pendingIndex = db.pending.findIndex((p: any) => p.id === pendingId);

    if (pendingIndex === -1) {
      res.status(444).json({ error: "Pending item not found or already processed" });
      return;
    }

    const pendingItem = db.pending[pendingIndex];

    try {
      if (action === "approve") {
        const itemData = pendingItem.data;

        if (pendingItem.type === "guestbook") {
          const newEntry = {
            id: `guest-user-${Date.now()}`,
            name: itemData.name,
            role: itemData.role,
            message: itemData.message,
            timestamp: itemData.timestamp || new Date().toISOString(),
            imageUrl: itemData.imageUrl
          };
          db.guestbook.unshift(newEntry);

        } else if (pendingItem.type === "student_add") {
          const newStudent = {
            id: `stud-user-${Date.now()}`,
            name: itemData.name,
            nickname: itemData.nickname || "Graduand",
            image: itemData.image,
            favoriteMemory: itemData.favoriteMemory || "Graduation Day!",
            messageToClassmates: itemData.messageToClassmates || "Keep shining!",
            aspirations: itemData.aspirations || "Leader",
            house: itemData.house || "Blue House (Sovereigns)"
          };
          db.students.push(newStudent);

        } else if (pendingItem.type === "student_portrait_update") {
          const { studentId, image } = itemData;
          const studentIdx = db.students.findIndex((s: any) => s.id === studentId);
          if (studentIdx !== -1) {
            // Find if existing student had a custom cloudinary image to clean up
            const oldImage = db.students[studentIdx].image;
            if (oldImage && oldImage.includes("cloudinary.com")) {
              await deleteFromCloudinary(oldImage);
            }
            db.students[studentIdx].image = image;
          }

        } else if (pendingItem.type === "timeline") {
          const newEvent = {
            id: `time-user-${Date.now()}`,
            date: itemData.date,
            title: itemData.title,
            description: itemData.description,
            image: itemData.image
          };
          db.timeline.push(newEvent);
        }

        // Remove from pending
        db.pending.splice(pendingIndex, 1);
        writeDB(db);

        res.json({ success: true, message: "Submission approved and published successfully!" });

      } else {
        // REJECT AND DELETE MEDIA FROM CLOUDINARY
        const itemData = pendingItem.data;
        let imageUrlToDelete: string | null = null;

        if (pendingItem.type === "guestbook") {
          imageUrlToDelete = itemData.imageUrl || null;
        } else if (pendingItem.type === "student_add") {
          imageUrlToDelete = itemData.image || null;
        } else if (pendingItem.type === "student_portrait_update") {
          imageUrlToDelete = itemData.image || null;
        } else if (pendingItem.type === "timeline") {
          imageUrlToDelete = itemData.image || null;
        } else if (pendingItem.type === "video_memory") {
          imageUrlToDelete = itemData.url || null;
          const thumbToDelete = itemData.thumbnailUrl || null;
          if (thumbToDelete && thumbToDelete.includes("cloudinary.com")) {
            await deleteFromCloudinary(thumbToDelete);
          }
        }

        if (imageUrlToDelete) {
          await deleteFromCloudinary(imageUrlToDelete);
        }

        // Remove from pending
        db.pending.splice(pendingIndex, 1);
        writeDB(db);

        res.json({ success: true, message: "Submission rejected and associated image removed from Cloudinary!" });
      }
    } catch (err: any) {
      console.error("Error processing admin action:", err);
      res.status(500).json({ error: err.message || "Failed to execute admin action." });
    }
  });

  // Global Error Handler for Express and body-parser limits
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Express Error Caught:", err);
    if (err.status === 413) {
      res.status(413).json({ error: "File payload is too large! Maximum allowed is 15MB. Please choose a smaller file or compress it before uploading." });
    } else if (err instanceof SyntaxError) {
      res.status(400).json({ error: "Invalid JSON or request payload format." });
    } else {
      res.status(500).json({ error: err.message || "An unexpected error occurred." });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT} (${process.env.NODE_ENV || "development"} mode)`);
  });
}

startServer();
