# QR Photo Gallery – Setup Guide

## Project Structure

```
├── src/
│   ├── index.js                    ← Express server entry point
│   ├── database/
│   │   └── db.js                   ← SQLite setup + schema
│   ├── services/
│   │   ├── cloudinaryService.js    ← Cloudinary upload helpers
│   │   └── qrService.js            ← QR code PNG generator
│   ├── routes/
│   │   └── galleries.js            ← Route definitions + multer
│   └── controllers/
│       └── galleryController.js    ← All business logic
├── shopify/
│   ├── sections/
│   │   └── photo-gallery.liquid    ← Shopify gallery section
│   └── templates/
│       └── page.gallery.json       ← Page template JSON
├── .env.example
└── package.json
```

---

## Step 1 – Install Dependencies

```bash
npm install
```

---

## Step 2 – Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your values:

```env
PORT=3000
BASE_URL=https://your-api-domain.com

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GALLERY_BASE_URL=https://your-shopify-store.myshopify.com/pages/gallery
```

### How to get Cloudinary credentials
1. Sign up at https://cloudinary.com (free tier is enough to start)
2. Go to **Dashboard** → copy **Cloud Name**, **API Key**, **API Secret**

---

## Step 3 – Run the Backend

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:3000`

---

## Step 4 – Deploy the Backend

Deploy to any Node.js host:

- **Railway**: `railway up` (easiest)
- **Render**: connect GitHub repo, set env vars in dashboard
- **Heroku**: `git push heroku main`
- **VPS**: use PM2 — `pm2 start src/index.js`

After deploy, note your public URL, e.g. `https://qr-gallery-api.railway.app`

---

## Step 5 – Add Gallery Page to Shopify

### 5a. Add the section file

In **Shopify Admin → Online Store → Themes → Edit Code**:

1. Under **Sections**, click **Add a new section**
2. Name it `photo-gallery`
3. Replace the content with everything from `shopify/sections/photo-gallery.liquid`

### 5b. Add the page template

1. Under **Templates**, click **Add a new template**
2. Choose **page**, name it `gallery`
3. Replace the content with everything from `shopify/templates/page.gallery.json`

### 5c. Create the Shopify Page

1. Go to **Online Store → Pages → Add Page**
2. Title: `Gallery`
3. Handle (URL slug): `gallery` ← important, must match
4. Template: choose `page.gallery`
5. Save

Your gallery page will be at:
`https://your-store.myshopify.com/pages/gallery?token=YOUR_TOKEN`

### 5d. Set the API base URL in Shopify theme settings

In `photo-gallery.liquid`, the JavaScript reads `{{ settings.gallery_api_base_url | json }}`.

To set this:
1. Go to **Online Store → Themes → Customize**
2. Open **Theme settings** (bottom left gear icon)
3. Look for a **"Gallery API Base URL"** setting and enter your deployed backend URL

**OR** (simpler) replace the variable directly in the section file:

```javascript
// Change this line in photo-gallery.liquid:
const API_BASE = {{ settings.gallery_api_base_url | json }};

// To this (hardcoded):
const API_BASE = "https://your-api-domain.com";
```

---

## API Reference

### POST /api/galleries
Create a new gallery and get QR code back.

**Content-Type**: `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| photos | File[] | Yes (1–20 images) |
| session_id | string | No |
| event_id | string | No |

**Response:**
```json
{
  "success": true,
  "gallery_id": "af72d9b31c2e4501",
  "gallery_url": "https://your-store.myshopify.com/pages/gallery?token=af72d9b31c2e4501",
  "qr_code_url": "https://res.cloudinary.com/.../qr_af72d9b31c2e4501.png"
}
```

---

### GET /api/galleries/:token
Fetch gallery photos.

**Response:**
```json
{
  "gallery_id": "af72d9b31c2e4501",
  "session_id": "booth_100245",
  "event_id": "expo2025",
  "created_at": "2025-04-24T10:30:00.000Z",
  "photos": [
    { "url": "https://res.cloudinary.com/.../photo_1.jpg" },
    { "url": "https://res.cloudinary.com/.../photo_2.jpg" }
  ]
}
```

---

### POST /api/galleries/:token/photos
Add more photos to an existing gallery.

**Content-Type**: `multipart/form-data`

| Field | Type |
|-------|------|
| photos | File[] |

---

### DELETE /api/galleries/:token
Soft-delete a gallery (marks it as deleted, cleans up Cloudinary).

---

## Photo Booth Client — Example Request

This is what Muhammad's booth software should send:

```javascript
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function uploadToGallery(photoPaths, sessionId, eventId) {
  const form = new FormData();
  form.append('session_id', sessionId);
  form.append('event_id', eventId);

  for (const photoPath of photoPaths) {
    form.append('photos', fs.createReadStream(photoPath));
  }

  const response = await fetch('https://your-api-domain.com/api/galleries', {
    method: 'POST',
    body: form,
  });

  const data = await response.json();
  // data.qr_code_url → download this PNG and send to printer
  return data;
}
```

---

## How Shopify Calls the API (Flow)

```
1. Customer scans QR
         ↓
2. QR URL opens: https://your-store.myshopify.com/pages/gallery?token=af72d9b31c2e4501
         ↓
3. Shopify renders page.gallery template → loads photo-gallery section
         ↓
4. Browser JS reads token from URL: new URLSearchParams(location.search).get("token")
         ↓
5. JS calls: GET https://your-api-domain.com/api/galleries/af72d9b31c2e4501
         ↓
6. Backend returns photo URLs from database
         ↓
7. JS renders photo grid with download buttons
```

---

## CORS Note

The backend already has `cors()` middleware enabled for all origins.
For production, restrict it to your Shopify domain only:

```javascript
// In src/index.js, replace:
app.use(cors());

// With:
app.use(cors({
  origin: "https://your-store.myshopify.com"
}));
```
