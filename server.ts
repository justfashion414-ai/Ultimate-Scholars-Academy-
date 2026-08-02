import express from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";

// Load environment variables from .env
dotenv.config();

// Configure multer memory storage and size limits based on Cloudinary standard caps
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for images
});

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for videos
});

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
    return data.result === "ok" || data.result === "not_found";
  } catch (err) {
    console.error("Cloudinary destroy API error:", err);
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // ==========================================
  // API ROUTE: Secure Cloudinary Image Upload
  // ==========================================
  app.post("/api/upload", uploadImage.single("image"), async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      let filePayload: string | undefined;

      if (req.file) {
        filePayload = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
      } else if (req.body && (req.body.file || req.body.image)) {
        filePayload = req.body.file || req.body.image;
      }

      if (!filePayload) {
        res.status(400).json({ error: "Missing 'image' or 'file' payload." });
        return;
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!cloudName || !apiKey || !apiSecret) {
        // Fallback: return simulated response if Cloudinary credentials are missing
        res.status(200).json({
          url: filePayload.startsWith("data:") ? filePayload : filePayload,
          success: true,
          simulated: true
        });
        return;
      }

      // Generate parameters for signed upload
      const timestamp = Math.round(new Date().getTime() / 1000).toString();
      const folder = (req.body && req.body.folder) || "scholars_class_2026";

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
          file: filePayload,
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
  app.post("/api/upload-video", uploadVideo.single("video"), async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      let filePayload: string | undefined;

      if (req.file) {
        filePayload = `data:${req.file.mimetype || 'video/mp4'};base64,${req.file.buffer.toString('base64')}`;
      } else if (req.body && req.body.file) {
        filePayload = req.body.file;
      }

      if (!filePayload) {
        res.status(400).json({ error: "Missing 'video' or 'file' payload." });
        return;
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!cloudName || !apiKey || !apiSecret) {
        res.status(200).json({
          url: filePayload.startsWith("data:") ? "https://assets.mixkit.co/videos/preview/mixkit-students-studying-in-a-classroom-43183-large.mp4" : filePayload,
          success: true,
          simulated: true
        });
        return;
      }

      const timestamp = Math.round(new Date().getTime() / 1000).toString();
      const folder = (req.body && req.body.folder) || "scholars_class_2026";
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
          file: filePayload,
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

  // Global Error Handler for Express, Multer, and body-parser limits
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Express Error Caught:", err);
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "File payload is too large! Maximum allowed is 10MB for images and 100MB for videos." });
      } else {
        res.status(400).json({ error: `Upload error: ${err.message}` });
      }
    } else if (err.status === 413) {
      res.status(413).json({ error: "File payload is too large! Maximum allowed is 10MB for images and 100MB for videos." });
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
