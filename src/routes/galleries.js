const express = require("express");
const multer = require("multer");
const {
  createGallery,
  getAllGalleries,
  getGallery,
  addPhotos,
  deleteGallery,
} = require("../controllers/galleryController");

const router = express.Router();

// Store files in memory so we can pipe buffer directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

router.post("/", upload.array("photos", 20), createGallery);
router.get("/", getAllGalleries);
router.get("/:token", getGallery);
router.post("/:token/photos", upload.array("photos", 20), addPhotos);
router.delete("/:token", deleteGallery);

module.exports = router;
