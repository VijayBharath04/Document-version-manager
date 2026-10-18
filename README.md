# Document Version Manager

A modern, responsive web application for **Software Configuration Management (SCM)**, built to allow users to upload documents, maintain multi-version baselines, compare versions with visual line-by-line diffs, restore previous baselines non-destructively, download document representations, and inspect repository audit logs.

**GitHub Repository:** [https://github.com/dinesh16122006-gif/Document-version-Manager.git](https://github.com/dinesh16122006-gif/Document-version-Manager.git)  
**Live Netlify Website:** [https://6aa58429940d5033332622fe--dinesh-doc-version-manager.netlify.app](https://6aa58429940d5033332622fe--dinesh-doc-version-manager.netlify.app)

---

## 📌 Project Overview

This project was developed for a college **Software Configuration Management** curriculum demonstration. It models the core lifecycle and tenets of SCM:
1. **Configuration Identification**: Unique document IDs, baseline tagging (`v1.0`, `v2.0`, `v3.0`), timestamps, and owner attribution.
2. **Configuration Control**: Structured upload workflows, version bump tracking, and mandatory commit change descriptions.
3. **Configuration Status Accounting**: Continuous activity logging of user actions (Upload, Restore, Compare, Archive, Download) with real-time timestamps.
4. **Configuration Verification & Audit**: Side-by-side split visual diff inspection to verify additions, deletions, and modifications between baselines prior to rollback.

The user interface follows a modern SaaS dashboard aesthetic (clean white cards, light slate backgrounds, navy typography, primary blue accents, and responsive layout) while remaining 100% static, lightweight, and framework-free for quick local execution in VS Code and zero-build deployment on Netlify.

---

## ✨ Key Features

- **SaaS Landing Page (`index.html`)**: Product hero, SCM feature cards, architecture overview, and quick links.
- **Secure Authentication UI (`login.html` & `otp.html`)**:
  - Validates 10-digit Indian mobile numbers (`+91`).
  - 6-digit OTP verification with automatic input tabbing, paste handling, and 60-second resend cooldown.
  - **Real SMS OTP** delivered via Supabase Phone Auth (see *Backend Setup* below). The code is never displayed in the UI, returned by the API, or written to the browser console.
- **Main SaaS Dashboard (`dashboard.html`)**:
  - 4 Summary metric cards: Total Documents, Total Versions, Storage Used, Recent Updates.
  - Interactive documents table with category filters (All, PDF, DOCX, TXT, PPT/Images, Archived).
  - Dynamic instant search by document name, owner, type, or version.
  - Real-time audit activity feed.
- **Drag & Drop Upload (`upload.html`)**:
  - Drag-and-drop zone supporting PDF, DOC, DOCX, TXT, PPT, PPTX, XLS, XLSX, and Images.
  - File metadata extraction (name, size, type).
  - Support for creating a new document or bumping a new version to an existing document.
  - Simulated multi-step progress bar (integrity analysis, checksum generation, metadata write).
- **Version History Timeline (`versions.html`)**:
  - Interactive vertical timeline showing every baseline release.
  - Actions per version: Preview Content, Download representation, Compare, and Restore.
  - Highlights active baseline with distinct badges.
- **Visual Diff Engine (`compare.html`)**:
  - Side-by-side comparison between Version A and Version B.
  - Visual delta highlighting:
    - **Green (+)**: Added lines.
    - **Red (-)**: Removed lines.
    - **Amber (~)**: Modified lines.
  - Summary metrics banner: "X changes detected (Added, Removed, Modified)".
  - Quick single-click restore options from either baseline.
- **Safe Non-Destructive Restore**:
  - Restoring a previous version changes the active baseline pointer while keeping all subsequent versions and audit trails preserved.
- **Document Download Engine**:
  - Generates downloadable text representations using HTML5 Blobs with SHA integrity labels.
- **Notifications Center (`notifications.html`)**:
  - Read/unread states, filter tabs, and "Mark all as read" capability.
- **Profile Page (`profile.html`)**:
  - Student profile for **Dinesh Kumar R**, course credentials, mobile mask, and edit modals.
- **Admin Dashboard (`admin.html`)**:
  - System-wide metric cards (Users, Documents, Versions, Storage).
  - User management table with account Enable/Disable toggles.
  - File format storage breakdown progress bars.
  - Complete repository audit activity log.

---

## 🛠️ Technologies Used

- **HTML5**: Semantic tags, drag-and-drop APIs, HTML5 Blob generation.
- **CSS3**: Custom CSS properties, modern SaaS design system, responsive flexbox/grid, animations.
- **JavaScript (ES6+)**: Modular scripts, DOM manipulation, line-by-line diffing algorithm, client-side storage orchestration.
- **Bootstrap 5 (CDN)**: Grid layout and utility classes.
- **Font Awesome 6 (CDN)**: Modern icons for documents, versions, and navigation.
- **Web Storage API (`localStorage`)**: Persistent client-side cache pre-populated with realistic multi-version documents.
- **Node.js + Express**: Backend API (`server/`) providing authentication, rate limiting, and document/version/notification/activity routes.
- **SQLite (`better-sqlite3`)**: Local application database for profiles, documents, versions, notifications, activities, and OTP state.
- **Supabase (Phone Auth + PostgreSQL)**: Real SMS OTP delivery/verification and a `profiles` table protected by Row Level Security.
- **Netlify**: Static website hosting with automated git-based continuous deployment (API served via a Netlify function).

---

## 📂 Project Structure

```
document-version-manager/
│
├── index.html            # Landing page (hero, feature cards, SCM highlights, footer)
├── login.html            # Full-screen login card with Indian mobile validation (+91)
├── otp.html              # 6-box OTP input with 60s resend cooldown
├── dashboard.html        # Main dashboard with 4 metric cards, document table & activity
├── upload.html           # Drag & drop upload area with progress bar & version fields
├── versions.html         # Document baseline timeline, content preview & safe restore
├── compare.html          # Visual side-by-side diff analyzer with change metrics
├── notifications.html    # Notification center with read/unread filters
├── profile.html          # User profile for Dinesh Kumar R with project credentials
├── admin.html            # Administrative dashboard with user toggles & storage graphs
│
├── css/
│   └── style.css         # Modern SaaS CSS design system & responsive rules
│
├── js/
│   ├── auth.js           # Auth client: send/verify OTP, session restore & refresh
│   ├── app.js            # Shared engine: localStorage data seed, auth guard, toast system
│   ├── login.js          # Mobile validation & session redirection
│   ├── otp.js            # 6-box keyboard navigation, timer & verification logic
│   ├── dashboard.js      # Dashboard stats, document search/filtering, activity feed
│   ├── upload.js         # File drag & drop, metadata preview & upload progress
│   ├── versions.js       # Chronological timeline builder & restore modal controller
│   ├── compare.js        # Line-by-line diffing algorithm & change statistics
│   └── admin.js          # Admin user management & storage monitoring
│
├── server/
│   ├── server.js         # Express API: auth, profile, documents, versions, notifications
│   ├── supabase-auth.js  # Supabase Phone Auth (send/verify/refresh) + profile upsert
│   ├── sms.js            # Custom SMS gateways (Fast2SMS / Twilio / 2Factor)
│   └── db.js             # SQLite data layer (profiles, docs, versions, OTP state)
│
├── database/
│   └── supabase_schema.sql  # Supabase PostgreSQL schema, RLS policies & triggers
│
├── tests/
│   └── test-auth-and-db.js  # Integration tests (auth, API, DB, security)
│
├── netlify/
│   └── functions/api.js  # Netlify serverless wrapper for the Express API
│
├── assets/
│   ├── images/           # Brand graphics and illustrations
│   └── icons/            # Document icons
│
├── .env.example          # Environment variable template (copy to .env)
├── netlify.toml          # Netlify deployment, API redirect & security headers
├── .gitignore            # Git ignore file for editor and temporary files
└── README.md             # Project documentation
```

---

## 🚀 How to Run Locally

The frontend is static, but authentication and data now run through the Express API,
so start the backend (which also serves the frontend) for the full experience.

### Setup
```bash
npm install
copy .env.example .env      # Windows  (use: cp .env.example .env on macOS/Linux)
# then edit .env and add your Supabase / SMS provider credentials
npm start                   # starts the server on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

> Without SMS provider credentials the server runs in a clearly-labelled
> **development fallback**: no SMS is actually sent and the code is printed only
> in the server terminal. In `NODE_ENV=production` the server refuses to simulate
> and returns an error until real credentials are configured.

### Static-only preview (landing pages only)
1. Open the project folder in Visual Studio Code.
2. Right-click `index.html` and choose **"Open with Live Server"** (`http://127.0.0.1:5500`).
   *(OTP login will not work in this mode because the API is not running.)*

---

## 🔐 Backend Setup (Real SMS OTP + Supabase)

### 1. Create the Supabase project
1. Sign up at [https://supabase.com](https://supabase.com) (free tier, no card required).
2. **New project** → choose a name, database password, and region.
3. **Project Settings → API** → copy the **Project URL**, **anon public key**, and **service_role key**.
4. Paste them into `.env`:
   ```
   SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_ANON_KEY=<anon public key>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # SERVER ONLY — never expose
   ```
   Also set a strong `JWT_SECRET` (32+ random characters).

### 2. Create the database schema
1. In Supabase, open **SQL Editor**.
2. Paste the entire contents of `database/supabase_schema.sql` and run it.
   This creates the `profiles` table (+ documents/versions/notifications/activities),
   Row Level Security policies, a profile auto-creation trigger, and an `updated_at` trigger.

### 3. Enable a real SMS provider (required for physical delivery)
1. In Supabase, go to **Authentication → Providers → Phone** and enable it.
2. Choose a provider and enter its credentials:
   - **Twilio** (global; free trial credit, card/phone verification required).
   - **MessageBird / Vonage / TextLocal** (other supported providers).
   > SMS is **not** free or unlimited. A payment method, credits, and possibly
   > sender/DLT registration are typically required for delivery to Indian numbers.
3. Save the provider settings in Supabase.

### Alternative: SMS providers configured directly in `.env`
If you prefer not to configure a provider inside Supabase, you can use one of these
instead (used when Supabase Phone Auth is unavailable):
- `FAST2SMS_API_KEY` — India, free signup at [https://www.fast2sms.com](https://www.fast2sms.com).
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` — global, $15 trial credit.
- `TWO_FACTOR_API_KEY` — India, [https://2factor.in](https://2factor.in).

---

## 🌐 How to Deploy on Netlify

### Step 1: Push to GitHub
```bash
git add .
git commit -m "feat: real SMS OTP + Supabase backend"
git push
```

### Step 2: Configure & deploy on Netlify
1. Log in to [Netlify](https://www.netlify.com/) and select the repository.
2. **Build command**: *(leave blank)* — **Publish directory**: `.`
3. Add the environment variables from your `.env` under
   **Site configuration → Environment variables** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `NODE_ENV=production`, and any SMS keys).
4. Deploy. The `/api/*` routes are served by `netlify/functions/api.js`.

---

## 🔑 Signing In

- **Mobile Number**: any valid 10-digit Indian number (e.g. `9876543210`).
- **OTP**: the 6-digit code actually texted to that phone. There is **no demo code** —
  a verified new number creates an account, and a returning verified number logs in.

> A real SMS can only be received after a provider is configured (step 3 above).
> Until then, the development fallback prints the code **in the server terminal only**.

---

## 🧪 SCM Testing Checklist

| Test Scenario | Action | Expected Result |
|---|---|---|
| **Mobile Validation** | Enter `12345` or letters | Displays: *"Please enter a valid 10-digit mobile number."* |
| **Valid Login** | Enter `9876543210` | Proceeds to `otp.html` with masked number `+91 ******3210`. |
| **OTP Auto-tabbing** | Type or paste the 6-digit SMS code | Advances automatically across boxes and triggers verification. |
| **Incorrect OTP** | Enter a wrong 6-digit code | Displays an error; the account is not authenticated. |
| **Dashboard Metrics** | Open `dashboard.html` | Displays Total Docs (8+), Total Versions, Storage (2.4 GB). |
| **Search & Filter** | Type "Report" or click "PDF" tab | Instantly filters the table; displays empty state if no match. |
| **Upload Flow** | Drag a file, enter version and description | Shows progress bar and redirects to updated version timeline. |
| **Version History** | View `versions.html` | Shows interactive timeline with `v1.0`, `v2.0`, `v3.0`. |
| **Side-by-Side Diff** | Open `compare.html` | Shows line diffs with Green (+), Red (-), and Amber (~). |
| **Safe Rollback** | Click "Restore" on `v2.0` | Restores `v2.0` as current while retaining `v3.0` in history. |
| **Download** | Click "Download" on any document | Triggers real text export file download in browser. |
| **Session Logout** | Click "Logout" | Clears session and redirects safely to `login.html`. |

---

## 📄 License & Attribution

Developed as a college course project for **Software Configuration Management (SCM)** by **Dinesh Kumar R** (2026).
All rights reserved.
