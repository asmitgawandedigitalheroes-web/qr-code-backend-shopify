const { v4: uuidv4 } = require("uuid");
const supabase = require("../database/db");
const { uploadPhoto, uploadQRCode, deleteFiles } = require("../services/storageService");
const { generateQRBuffer } = require("../services/qrService");

// POST /api/galleries
async function createGallery(req, res) {
  const { session_id, customer_name, event_id, event_name } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "At least one photo is required" });
  }

  const galleryToken = uuidv4().replace(/-/g, "").slice(0, 16);
  const galleryUrl = `${process.env.GALLERY_BASE_URL}?token=${galleryToken}`;

  try {
    // Upload all photos to Supabase Storage in parallel
    const photoUploads = await Promise.all(
      files.map((file, index) =>
        uploadPhoto(file.buffer, galleryToken, `photo_${index + 1}`)
      )
    );

    // Generate QR code and upload to Supabase Storage
    const qrBuffer = await generateQRBuffer(galleryUrl);
    const qrCodeUrl = await uploadQRCode(qrBuffer, galleryToken);

    // Save gallery record
    const { data: gallery, error: galleryError } = await supabase
      .from("galleries")
      .insert({ gallery_token: galleryToken, session_id, customer_name, event_id, event_name, qr_code_url: qrCodeUrl })
      .select("id")
      .single();

    if (galleryError) throw galleryError;

    // Save photo records
    const { error: photosError } = await supabase.from("photos").insert(
      photoUploads.map((p) => ({
        gallery_id: gallery.id,
        photo_url: p.url,
        storage_path: p.storage_path,
      }))
    );

    if (photosError) throw photosError;

    return res.status(201).json({
      success: true,
      gallery_id: galleryToken,
      gallery_url: galleryUrl,
      qr_code_url: qrCodeUrl,
    });
  } catch (err) {
    console.error("createGallery error:", err);
    return res.status(500).json({ error: "Gallery creation failed", details: err.message });
  }
}

// GET /api/galleries/:token
async function getGallery(req, res) {
  const { token } = req.params;

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("id, gallery_token, session_id, customer_name, event_id, event_name, created_at")
    .eq("gallery_token", token)
    .eq("status", "active")
    .single();

  if (galleryError || !gallery) {
    return res.status(404).json({ error: "Invalid QR or gallery expired" });
  }

  const { data: photos, error: photosError } = await supabase
    .from("photos")
    .select("photo_url")
    .eq("gallery_id", gallery.id)
    .order("created_at", { ascending: true });

  if (photosError) {
    return res.status(500).json({ error: "Failed to load photos" });
  }

  return res.json({
    gallery_id: gallery.gallery_token,
    session_id: gallery.session_id,
    customer_name: gallery.customer_name,
    event_id: gallery.event_id,
    event_name: gallery.event_name,
    created_at: gallery.created_at,
    photos: photos.map((p) => ({ url: p.photo_url })),
  });
}

// POST /api/galleries/:token/photos
async function addPhotos(req, res) {
  const { token } = req.params;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No photos provided" });
  }

  const { data: gallery, error } = await supabase
    .from("galleries")
    .select("id")
    .eq("gallery_token", token)
    .eq("status", "active")
    .single();

  if (error || !gallery) {
    return res.status(404).json({ error: "Gallery not found" });
  }

  try {
    const { count } = await supabase
      .from("photos")
      .select("*", { count: "exact", head: true })
      .eq("gallery_id", gallery.id);

    const photoUploads = await Promise.all(
      files.map((file, index) =>
        uploadPhoto(file.buffer, token, `photo_${(count || 0) + index + 1}`)
      )
    );

    const { error: insertError } = await supabase.from("photos").insert(
      photoUploads.map((p) => ({
        gallery_id: gallery.id,
        photo_url: p.url,
        storage_path: p.storage_path,
      }))
    );

    if (insertError) throw insertError;

    return res.json({ success: true, added: photoUploads.length });
  } catch (err) {
    console.error("addPhotos error:", err);
    return res.status(500).json({ error: "Photo upload failed", details: err.message });
  }
}

// DELETE /api/galleries/:token
async function deleteGallery(req, res) {
  const { token } = req.params;

  const { data: gallery, error } = await supabase
    .from("galleries")
    .select("id, gallery_token")
    .eq("gallery_token", token)
    .single();

  if (error || !gallery) {
    return res.status(404).json({ error: "Gallery not found" });
  }

  const { data: photos } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("gallery_id", gallery.id);

  // Delete files from Supabase Storage in background
  if (photos?.length) {
    const paths = [
      ...photos.map((p) => p.storage_path),
      `qr-codes/qr_${token}.png`,
    ];
    deleteFiles(paths).catch(console.error);
  }

  await supabase
    .from("galleries")
    .update({ status: "deleted" })
    .eq("gallery_token", token);

  return res.json({ success: true, message: "Gallery deleted" });
}

module.exports = { createGallery, getGallery, addPhotos, deleteGallery };
