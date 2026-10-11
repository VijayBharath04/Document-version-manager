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
  - 6-digit OTP verification with automatic input tabbing, paste handling, and 30-second resend timer.
  - **Demo Mode OTP:** `123456`.
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
- **Web Storage API (`localStorage`)**: Persistent client-side data store pre-populated with realistic multi-version documents.
- **Netlify**: Static website hosting with automated git-based continuous deployment.

---

## 📂 Project Structure

```
document-version-manager/
│
├── index.html            # Landing page (hero, feature cards, SCM highlights, footer)
├── login.html            # Full-screen login card with Indian mobile validation (+91)
├── otp.html              # 6-box OTP input with 30s timer & demo credentials
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
│   ├── app.js            # Shared engine: localStorage data seed, auth guard, toast system
│   ├── login.js          # Mobile validation & session redirection
│   ├── otp.js            # 6-box keyboard navigation, timer & verification logic
│   ├── dashboard.js      # Dashboard stats, document search/filtering, activity feed
│   ├── upload.js         # File drag & drop, metadata preview & upload progress
│   ├── versions.js       # Chronological timeline builder & restore modal controller
│   ├── compare.js        # Line-by-line diffing algorithm & change statistics
│   └── admin.js          # Admin user management & storage monitoring
│
├── assets/
│   ├── images/           # Brand graphics and illustrations
│   └── icons/            # Document icons
│
├── netlify.toml          # Netlify static deployment and security configuration
├── .gitignore            # Git ignore file for editor and temporary files
└── README.md             # Project documentation
```

---

## 🚀 How to Run Locally

### Option 1: VS Code Live Server (Recommended)
1. Open Visual Studio Code.
2. Open the `document-version-manager` folder:
   - `File` > `Open Folder...` > Select `document-version-manager`.
3. If you have the **Live Server** extension installed:
   - Right-click `index.html` and click **"Open with Live Server"**.
4. The website will open in your default browser at `http://127.0.0.1:5500/index.html`.

### Option 2: Direct Browser Launch
Because this project uses 100% static HTML, CSS, and vanilla JavaScript without any node build step, you can also double-click `index.html` to run it directly in any modern browser (Chrome, Edge, Firefox, Safari).

---

## 🌐 How to Deploy on Netlify

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "feat: initial commit for Document Version Manager"
git branch -M main
git remote add origin https://github.com/dinesh16122006-gif/Document-version-Manager.git
git push -u origin main
```

### Step 2: Deploy to Netlify
1. Log in to [Netlify](https://www.netlify.com/).
2. Click **"Add new site"** > **"Import an existing project"**.
3. Choose **GitHub** and authorize access.
4. Select the repository: `dinesh16122006-gif/Document-version-Manager`.
5. Configuration settings:
   - **Branch to deploy**: `main`
   - **Build command**: *(Leave blank, no build command needed)*
   - **Publish directory**: `.`
6. Click **"Deploy site"**.
7. Netlify will build and provide a live URL (e.g. `https://your-site-name.netlify.app`).

---

## 🔑 Demo Login Credentials

For demonstration and grading evaluation:
- **Mobile Number**: Any valid 10-digit Indian number (e.g. `9876543210`)
- **Demo OTP**: `123456`
- **Authenticated User**: Dinesh Kumar R

---

## 🧪 SCM Testing Checklist

| Test Scenario | Action | Expected Result |
|---|---|---|
| **Mobile Validation** | Enter `12345` or letters | Displays: *"Please enter a valid 10-digit mobile number."* |
| **Valid Login** | Enter `9876543210` | Proceeds to `otp.html` with masked number `+91 ******3210`. |
| **OTP Auto-tabbing** | Type digits or paste `123456` | Advances automatically across boxes and triggers verification. |
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
