export const APP_NAME = "ReadHub";

export const USER_ROLES = ["reader", "writer", "admin"] as const;

// Debe coincidir con allowed_mime_types del bucket "media"
// (ver supabase/migrations/20260703121600_storage_media_bucket.sql).
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
