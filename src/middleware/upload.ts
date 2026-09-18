import multer, { type StorageEngine } from "multer";
import type { Request } from "express";
import { cloudinary } from "../config/cloudinary.js";

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        // Cloudinary's resolved resource type ("image" | "raw" | "video") —
        // needed later to regenerate a signed URL for authenticated (KYC) assets.
        resourceType?: string;
      }
    }
  }
}

/**
 * Minimal multer storage engine that streams the file buffer straight to
 * Cloudinary (no local disk write). The ID document is KYC material and
 * stays private (authenticated delivery, admin-only). The photo is
 * deliberately public — the brief requires the public verification page to
 * display it with no auth, so it can't live behind a signed URL.
 */
class CloudinaryStorage implements StorageEngine {
  _handleFile(
    _req: Request,
    file: Express.Multer.File,
    callback: (error?: unknown, info?: Partial<Express.Multer.File>) => void,
  ) {
    const isPhoto = file.fieldname === "photo";
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: isPhoto ? "nexworth/photos" : "nexworth/kyc",
        type: isPhoto ? "upload" : "authenticated",
        resource_type: "auto",
      },
      (error, result) => {
        if (error || !result) {
          return callback(error ?? new Error("Cloudinary upload failed"));
        }
        callback(null, { path: result.secure_url, filename: result.public_id, resourceType: result.resource_type });
      },
    );
    file.stream.pipe(uploadStream);
  }

  _removeFile(_req: Request, _file: Express.Multer.File, callback: (error: Error | null) => void) {
    callback(null);
  }
}

export const uploadKycFiles = multer({
  storage: new CloudinaryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: "photo", maxCount: 1 },
  { name: "document", maxCount: 1 },
]);

export const uploadProfilePhoto = multer({
  storage: new CloudinaryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("photo");
