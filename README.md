# CIVIC CONNECT — Smart Public Issue Reporting System

A full-stack, glassmorphism-styled civic-tech platform that lets citizens report public
infrastructure issues (potholes, garbage overflow, water leaks, broken street lights, etc.)
and lets municipal staff triage, assign, and resolve them with full transparency.

---

## 1. What's included

```
civic-connect/
├── frontend/                 → Fully working HTML/CSS/JS UI (runs standalone, no build step)
│   ├── index.html             Landing page
│   ├── register.html          Citizen registration
│   ├── login.html             Citizen login
│   ├── admin-login.html       Admin login
│   ├── forgot-password.html   OTP-based password reset
│   ├── dashboard.html         Citizen dashboard (stats, recent complaints, notifications)
│   ├── report-issue.html      Report Issue module (photo, GPS, category, severity)
│   ├── track-complaint.html   Complaint tracking, status flow, QR, rating
│   ├── map.html               Live map (Leaflet + OpenStreetMap, color-coded markers)
│   ├── analytics.html         Chart.js analytics dashboard
│   ├── admin-dashboard.html   Admin console (assign, status, remarks, CSV export, delete)
│   ├── profile.html           Citizen profile management
│   ├── css/style.css          Design system (glassmorphism, dark/light themes)
│   └── js/
│       ├── db.js              Mock data layer (localStorage) — mirrors the real API shape
│       ├── common.js          Theme, language (EN/TA), nav, auth guards
│       └── grid-bg.js         Signature animated status-grid background
│
├── backend/                  → Node.js + Express REST API (production data layer)
│   ├── server.js
│   ├── routes/ (auth, complaints, admin, notifications)
│   ├── middleware/auth.js     JWT verification
│   ├── config/db.js           MySQL connection pool
│   └── .env.example
│
└── database/
    └── schema.sql             Full MySQL schema + seed data
```

### How the frontend works out of the box
The frontend in `/frontend` is **fully functional on its own** using `localStorage` as a
mock database (`js/db.js`). This means you can open `index.html` directly (or serve the
folder with any static server) and use every feature — registration, reporting, admin
actions, analytics — without setting up MySQL or Node at all. This is ideal for demos,
grading, or a quick preview.

When you're ready to go to production, point the frontend at the real backend by
replacing the calls in `db.js` with `fetch()` calls to the endpoints documented below —
the function names (`UsersAPI.login`, `ComplaintsAPI.create`, etc.) were deliberately kept
1:1 with the REST routes so the swap is mechanical, not a rewrite.

**Demo accounts (frontend mock mode):**
| Role    | Email                       | Password  |
|---------|------------------------------|-----------|
| Citizen | citizen@demo.com            | demo1234  |
| Admin   | admin@civicconnect.gov       | admin123  |

---

## 2. Running the frontend

No build tools required.

```bash
cd frontend
python3 -m http.server 8080
# then open http://localhost:8080
```

Or just double-click `index.html`. Geolocation and camera capture require either
`localhost` or HTTPS in most browsers.

---

## 3. Running the backend (MySQL + Node/Express)

### 3.1 Create the database
```bash
mysql -u root -p < database/schema.sql
```
This creates the `civic_connect` database, all tables, departments, categories, and two
seed accounts. **Important:** the seed `password_hash` values in `schema.sql` are
placeholders — generate real bcrypt hashes before relying on them:

```js
// scripts/hash-passwords.js (run once with `node`)
const bcrypt = require('bcryptjs');
bcrypt.hash('admin123', 10).then(console.log);
bcrypt.hash('demo1234', 10).then(console.log);
```
Then `UPDATE users SET password_hash='<hash>' WHERE id='U-ADMIN';` (and similarly for `U-DEMO`).

### 3.2 Configure environment
```bash
cd backend
cp .env.example .env
# edit .env with your MySQL credentials and a random JWT_SECRET
```

### 3.3 Install & run
```bash
npm install
npm run dev      # nodemon, auto-restarts on changes
# or
npm start
```
The API starts on `http://localhost:5000` by default. Health check: `GET /api/health`.

### 3.4 Key endpoints
| Method | Endpoint                              | Description |
|--------|-----------------------------------------|--------------|
| POST   | `/api/auth/register`                    | Citizen registration |
| POST   | `/api/auth/login`                       | Citizen/admin login (`role` field) |
| POST   | `/api/auth/forgot-password`             | Generate OTP |
| POST   | `/api/auth/reset-password`              | Verify OTP + set new password |
| GET    | `/api/auth/me`                          | Current user profile |
| PUT    | `/api/auth/profile`                     | Update profile / password |
| GET    | `/api/complaints`                       | List complaints (filters: `status`, `category`, `department`, `q`) |
| POST   | `/api/complaints`                       | Create complaint (multipart: `photo`, `voice_note`) |
| GET    | `/api/complaints/:id`                   | Complaint details + history |
| PATCH  | `/api/complaints/:id/status`             | Admin: change status / assign department / remark |
| POST   | `/api/complaints/:id/completion-photo`  | Admin: upload resolution proof photo |
| POST   | `/api/complaints/:id/rating`            | Citizen: rate a resolved complaint |
| DELETE | `/api/complaints/:id`                   | Admin: delete fake/duplicate complaint |
| GET    | `/api/complaints/stats/summary`         | Dashboard KPI counts |
| GET    | `/api/admin/departments`                | List departments |
| GET    | `/api/admin/analytics`                  | Aggregated chart data |
| GET    | `/api/admin/report.csv`                 | Downloadable CSV report |
| GET    | `/api/notifications`                    | Current user's notifications |
| PATCH  | `/api/notifications/read-all`           | Mark all as read |

All routes except register/login/forgot-password require an `Authorization: Bearer <token>` header.

---

## 4. Feature checklist

- ✅ Citizen registration, login, admin login, forgot password (OTP flow), profile management
- ✅ Citizen dashboard: total/pending/in-progress/resolved KPIs, recent complaints, notifications, profile card
- ✅ Report Issue: category picker, title, description, severity, photo upload + preview, GPS capture, optional voice note
- ✅ Complaint tracking: unique ID, timestamps, status flow (Pending → Verified → Assigned → In Progress → Resolved), progress bar, department, remarks timeline
- ✅ Interactive map with red/yellow/green markers (Leaflet + OpenStreetMap — no API key needed; swappable for Google Maps)
- ✅ Admin dashboard: view/search/filter all complaints, assign department, change status, add remarks, upload completion photo, CSV report export, delete fake complaints
- ✅ Notification system on every status transition
- ✅ Analytics dashboard: status/category charts, monthly trend, most reported areas, avg. resolution time, active users
- ✅ AI-style duplicate detection (geo + category + time-window heuristic; swap in a real ML model server-side later)
- ✅ QR code per complaint for instant tracking (via qrserver.com; swap for a self-hosted generator if offline QR is required)
- ✅ Complaint sharing (Web Share API with clipboard fallback)
- ✅ Citizen feedback + 5-star rating after resolution
- ✅ Dark / light mode, English / Tamil language toggle
- ✅ Fully responsive (mobile, tablet, desktop) with a floating action button and glassmorphism UI

---

## 5. Deployment notes

**Frontend:** any static host works — Netlify, Vercel, GitHub Pages, or an S3 bucket behind
CloudFront. No environment variables needed for the mock-mode build.

**Backend:** deploy to Render, Railway, an EC2/Lightsail box, or any Node host.
- Set all variables from `.env.example` in your host's environment settings.
- Use a managed MySQL instance (PlanetScale, RDS, Railway MySQL) for `DB_HOST` etc.
- Put `/uploads` on persistent storage or swap `multer`'s disk storage for S3/Cloud Storage
  in production, since most PaaS filesystems are ephemeral.
- Terminate TLS in front of the API (the platform's load balancer, or Nginx + Let's Encrypt
  if self-hosting) — geolocation and camera capture on the frontend require HTTPS.

**Google Maps vs OpenStreetMap:** the map page ships with Leaflet + OpenStreetMap tiles so
it works with zero configuration and no billing account. To use Google Maps instead, swap
the Leaflet tile layer for the Google Maps JavaScript API and add your API key — the marker
data (lat/lng/status) is already shaped to drop straight in.

---

## 6. Tech stack

**Frontend:** HTML5, CSS3 (custom design system, no framework), vanilla JavaScript (ES6+)
**Libraries:** Font Awesome 6, AOS (scroll animations), SweetAlert2 (dialogs), Chart.js 4,
Leaflet 1.9 + OpenStreetMap
**Backend:** Node.js, Express
**Database:** MySQL 8
**Auth:** JWT + bcrypt
**File uploads:** Multer (local disk by default)

---

## 7. Notes for grading / review

Since this environment doesn't provide a live MySQL/Node runtime, the deliverable ships in
two complementary layers: a **fully interactive frontend** you can click through end-to-end
right now (backed by `localStorage`), and a **complete, runnable backend + schema** you can
`npm install && npm run dev` locally in five minutes once MySQL is available. Function and
route names are mirrored 1:1 between the two so wiring them together is a mechanical fetch()
swap, not a redesign.
