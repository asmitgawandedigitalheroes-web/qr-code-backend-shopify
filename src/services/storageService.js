const supabase = require("../database/db");

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "gallery-photos";

async function uploadPhoto(fileBuffer, galleryToken, filename) {
  const path = `customer-gallery/${galleryToken}/${filename}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileBuffer, { contentType: "image/jpeg", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, storage_path: path };
}

async function uploadQRCode(qrBuffer, galleryToken) {
  const path = `qr-codes/qr_${galleryToken}.png`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, qrBuffer, { contentType: "image/png", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function deleteFiles(storagePaths) {
  const { error } = await supabase.storage.from(BUCKET).remove(storagePaths);
  if (error) console.error("Storage delete error:", error);
}

module.exports = { uploadPhoto, uploadQRCode, deleteFiles };
