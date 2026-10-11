/**
 * DOCUMENT VERSION MANAGER - Core Shared Engine & Storage Manager
 * Software Configuration Management (SCM) Project
 */

const DVM_STORAGE_KEYS = {
  USER: 'dvm_user',
  LOGGED_IN: 'dvm_logged_in',
  DOCUMENTS: 'dvm_documents',
  VERSIONS: 'dvm_versions',
  NOTIFICATIONS: 'dvm_notifications',
  ACTIVITIES: 'dvm_activities'
};

// Initial Seed Data for SCM College Project Demonstration
const INITIAL_USER = {
  name: "Dinesh Kumar R",
  mobile: "+91 9876543210",
  email: "dinesh.kumar@college.edu",
  role: "User",
  status: "Active",
  enrolledCourse: "Software Configuration Management (CS804)",
  college: "Faculty of Computer Engineering",
  rollNo: "SCM-2026-088",
  joinedDate: "15 July 2026"
};

const INITIAL_DOCUMENTS = [
  {
    id: "doc-1",
    name: "Project Report.pdf",
    type: "pdf",
    currentVersion: "v3.0",
    lastUpdated: "Today, 10:30 AM",
    owner: "Dinesh Kumar R",
    status: "Active",
    size: "4.2 MB",
    totalVersions: 3
  },
  {
    id: "doc-2",
    name: "Software Requirements.docx",
    type: "docx",
    currentVersion: "v2.2",
    lastUpdated: "Yesterday, 04:15 PM",
    owner: "Dinesh Kumar R",
    status: "Active",
    size: "1.8 MB",
    totalVersions: 3
  },
  {
    id: "doc-3",
    name: "System Design.docx",
    type: "docx",
    currentVersion: "v5.2",
    lastUpdated: "2 days ago",
    owner: "Dinesh Kumar R",
    status: "Active",
    size: "3.4 MB",
    totalVersions: 4
  },
  {
    id: "doc-4",
    name: "Database Design.pdf",
    type: "pdf",
    currentVersion: "v2.0",
    lastUpdated: "3 days ago",
    owner: "Dinesh Kumar R",
    status: "Active",
    size: "2.1 MB",
    totalVersions: 2
  },
  {
    id: "doc-5",
    name: "Research Paper.pdf",
    type: "pdf",
    currentVersion: "v2.1",
    lastUpdated: "4 days ago",
    owner: "Dinesh Kumar R",
    status: "Archived",
    size: "5.0 MB",
    totalVersions: 2
  },
  {
    id: "doc-6",
    name: "Presentation.pptx",
    type: "pptx",
    currentVersion: "v1.4",
    lastUpdated: "5 days ago",
    owner: "Dinesh Kumar R",
    status: "Active",
    size: "8.5 MB",
    totalVersions: 2
  },
  {
    id: "doc-7",
    name: "Meeting Notes.txt",
    type: "txt",
    currentVersion: "v1.1",
    lastUpdated: "6 days ago",
    owner: "Dinesh Kumar R",
    status: "Active",
    size: "120 KB",
    totalVersions: 2
  },
  {
    id: "doc-8",
    name: "Project Proposal.docx",
    type: "docx",
    currentVersion: "v3.1",
    lastUpdated: "1 week ago",
    owner: "Dinesh Kumar R",
    status: "Active",
    size: "2.7 MB",
    totalVersions: 3
  }
];

const INITIAL_VERSIONS = {
  "doc-1": [
    {
      version: "v1.0",
      type: "Initial Baseline",
      date: "10 July 2026, 09:00 AM",
      author: "Dinesh Kumar R",
      size: "3.1 MB",
      description: "Initial document upload for semester project evaluation",
      content: 
`=============================================================
DOCUMENT: Project Report
BASELINE: v1.0
STATUS: Draft Release
=============================================================

1. INTRODUCTION
Document Version Manager is a collegiate Software Configuration
Management system built to illustrate baseline version tracking.

2. SYSTEM ARCHITECTURE
The system provides a basic client-side user interface.
Data is maintained locally within the browser session.

3. SCM WORKFLOW
- Step 1: Upload document
- Step 2: Track version iterations
- Step 3: Compare differences manually`
    },
    {
      version: "v2.0",
      type: "Major Revision",
      date: "15 July 2026, 02:30 PM",
      author: "Dinesh Kumar R",
      size: "3.8 MB",
      description: "Added system architecture diagrams and audit logging specs",
      content: 
`=============================================================
DOCUMENT: Project Report
BASELINE: v2.0
STATUS: Milestone Release
=============================================================

1. INTRODUCTION
Document Version Manager is a collegiate Software Configuration
Management system built to illustrate baseline version tracking,
branching concepts, and document restoration.

2. SYSTEM ARCHITECTURE
The system provides a modern SaaS responsive web interface.
Data is maintained with persistent Web Storage (localStorage).
Added system architecture diagrams and audit logging specifications.

3. SCM WORKFLOW
- Step 1: Upload document with metadata and change notes
- Step 2: Track version iterations with full chronological timeline
- Step 3: Automated visual side-by-side comparison engine`
    },
    {
      version: "v3.0",
      type: "Current Release",
      date: "20 July 2026, 11:15 AM",
      author: "Dinesh Kumar R",
      size: "4.2 MB",
      description: "Updated diagrams, conclusions, and Netlify deployment pipeline",
      content: 
`=============================================================
DOCUMENT: Project Report
BASELINE: v3.0
STATUS: Production Release (Current)
=============================================================

1. INTRODUCTION
Document Version Manager is a collegiate Software Configuration
Management system built to illustrate baseline version tracking,
branching concepts, and non-destructive document restoration.

2. SYSTEM ARCHITECTURE
The system provides a modern SaaS responsive web interface.
Data is maintained with persistent Web Storage (localStorage).
Added system architecture diagrams, security indicators, and audit logging specifications.
Integrated Netlify continuous deployment configuration.

3. SCM WORKFLOW
- Step 1: Upload document with metadata and change notes
- Step 2: Track version iterations with full chronological timeline
- Step 3: Automated visual side-by-side comparison engine
- Step 4: Non-destructive historical version rollback with audit logs

4. CONCLUSION & EVALUATION
The software demonstrates key configuration control tenets:
version identification, status accounting, and verification.`
    }
  ],
  "doc-2": [
    {
      version: "v1.0",
      type: "Initial Baseline",
      date: "01 Aug 2026",
      author: "Dinesh Kumar R",
      size: "1.2 MB",
      description: "Initial SRS document draft",
      content: "Software Requirements Specification:\n1. User Authentication via Mobile\n2. Document Upload\n3. Single Version Storage"
    },
    {
      version: "v2.0",
      type: "Feature Update",
      date: "12 Aug 2026",
      author: "Dinesh Kumar R",
      size: "1.5 MB",
      description: "Added multi-version support and diff comparison requirements",
      content: "Software Requirements Specification:\n1. User Authentication via Mobile & OTP\n2. Document Upload (PDF, DOCX, TXT)\n3. Multi-version History Tracking\n4. Side-by-side visual diff comparison"
    },
    {
      version: "v2.2",
      type: "Current Release",
      date: "Yesterday",
      author: "Dinesh Kumar R",
      size: "1.8 MB",
      description: "Added Admin dashboard and storage audit metrics",
      content: "Software Requirements Specification:\n1. User Authentication via Mobile & OTP (Demo mode 123456)\n2. Document Upload (PDF, DOCX, TXT, PPT, Images)\n3. Multi-version History Tracking with non-destructive restore\n4. Side-by-side visual diff comparison with metrics\n5. Admin dashboard with storage monitoring"
    }
  ],
  "doc-3": [
    {
      version: "v4.0",
      type: "Major Release",
      date: "22 Aug 2026",
      author: "Dinesh Kumar R",
      size: "2.9 MB",
      description: "High-level component diagrams",
      content: "System Design Document:\nTier 1: Web presentation tier\nTier 2: Client data service layer"
    },
    {
      version: "v5.0",
      type: "Revision",
      date: "28 Aug 2026",
      author: "Dinesh Kumar R",
      size: "3.1 MB",
      description: "Added security indicators and mobile responsiveness spec",
      content: "System Design Document:\nTier 1: Responsive Web Presentation Layer (Mobile & Desktop)\nTier 2: Client Data Service Layer with LocalStorage API\nTier 3: Audit Logging & Notification Dispatcher"
    },
    {
      version: "v5.2",
      type: "Current Release",
      date: "2 days ago",
      author: "Dinesh Kumar R",
      size: "3.4 MB",
      description: "Optimized diff engine rendering algorithms",
      content: "System Design Document:\nTier 1: Responsive Web Presentation Layer (Mobile & Desktop)\nTier 2: Client Data Service Layer with LocalStorage API\nTier 3: Audit Logging & Notification Dispatcher\nTier 4: Line-by-Line Tokenized Diffing Engine"
    }
  ]
};

const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "Document Updated",
    message: "Project Report.pdf was updated to v3.0.",
    time: "10 minutes ago",
    read: false,
    icon: "fa-file-arrow-up",
    iconColor: "text-primary"
  },
  {
    id: "notif-2",
    title: "Version Restored",
    message: "Software Design.docx was restored to v4.0.",
    time: "2 hours ago",
    read: false,
    icon: "fa-rotate-left",
    iconColor: "text-success"
  },
  {
    id: "notif-3",
    title: "Upload Completed",
    message: "New document Software Requirements.docx uploaded successfully.",
    time: "Yesterday",
    read: true,
    icon: "fa-check-circle",
    iconColor: "text-info"
  },
  {
    id: "notif-4",
    title: "Diff Analysis Ready",
    message: "Version comparison completed between v2.0 and v3.0.",
    time: "3 days ago",
    read: true,
    icon: "fa-code-compare",
    iconColor: "text-warning"
  }
];

const INITIAL_ACTIVITIES = [
  {
    id: "act-1",
    user: "Dinesh Kumar R",
    action: "Upload",
    document: "Project Report.pdf",
    version: "v3.0",
    date: "04 Sep 2026, 11:15 AM",
    status: "Success"
  },
  {
    id: "act-2",
    user: "Dinesh Kumar R",
    action: "Restore",
    document: "Project Report.pdf",
    version: "v2.0",
    date: "04 Sep 2026, 09:40 AM",
    status: "Success"
  },
  {
    id: "act-3",
    user: "Dinesh Kumar R",
    action: "Upload",
    document: "Software Requirements.docx",
    version: "v2.2",
    date: "03 Sep 2026, 04:15 PM",
    status: "Success"
  },
  {
    id: "act-4",
    user: "Dinesh Kumar R",
    action: "Compare",
    document: "System Design.docx",
    version: "v5.0 vs v5.2",
    date: "02 Sep 2026, 01:20 PM",
    status: "Success"
  },
  {
    id: "act-5",
    user: "Dinesh Kumar R",
    action: "Archive",
    document: "Research Paper.pdf",
    version: "v2.1",
    date: "01 Sep 2026, 11:00 AM",
    status: "Archived"
  }
];

// Document Version Manager Core API
const DVM = {
  // Initialize default localStorage data
  init() {
    if (!localStorage.getItem(DVM_STORAGE_KEYS.DOCUMENTS)) {
      localStorage.setItem(DVM_STORAGE_KEYS.DOCUMENTS, JSON.stringify(INITIAL_DOCUMENTS));
    }
    if (!localStorage.getItem(DVM_STORAGE_KEYS.VERSIONS)) {
      localStorage.setItem(DVM_STORAGE_KEYS.VERSIONS, JSON.stringify(INITIAL_VERSIONS));
    }
    if (!localStorage.getItem(DVM_STORAGE_KEYS.NOTIFICATIONS)) {
      localStorage.setItem(DVM_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    }
    if (!localStorage.getItem(DVM_STORAGE_KEYS.ACTIVITIES)) {
      localStorage.setItem(DVM_STORAGE_KEYS.ACTIVITIES, JSON.stringify(INITIAL_ACTIVITIES));
    }
    if (!localStorage.getItem(DVM_STORAGE_KEYS.USER)) {
      localStorage.setItem(DVM_STORAGE_KEYS.USER, JSON.stringify(INITIAL_USER));
    }

    this.setupToastContainer();
    this.setupGlobalHandlers();

    // Sync state with backend if authenticated
    if (this.isLoggedIn()) {
      this.syncWithBackend();
    }
  },

  // Auth Management
  isLoggedIn() {
    return localStorage.getItem(DVM_STORAGE_KEYS.LOGGED_IN) === 'true';
  },

  getAuthToken() {
    return localStorage.getItem('dvm_session_token') || null;
  },

  login(mobile) {
    localStorage.setItem(DVM_STORAGE_KEYS.LOGGED_IN, 'true');
    const user = this.getUser();
    user.mobile = mobile ? (mobile.startsWith('+') ? mobile : `+91 ${mobile}`) : user.mobile;
    localStorage.setItem(DVM_STORAGE_KEYS.USER, JSON.stringify(user));
  },

  async logout() {
    if (window.DVM_AUTH && typeof window.DVM_AUTH.logout === 'function') {
      await window.DVM_AUTH.logout();
      return;
    }
    localStorage.removeItem(DVM_STORAGE_KEYS.LOGGED_IN);
    localStorage.removeItem('dvm_session_token');
    window.location.href = 'login.html';
  },

  checkAuth(requireAuth = true) {
    const logged = this.isLoggedIn();
    if (requireAuth && !logged) {
      window.location.href = 'login.html';
      return false;
    }
    if (!requireAuth && logged) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(DVM_STORAGE_KEYS.USER)) || INITIAL_USER;
    } catch {
      return INITIAL_USER;
    }
  },

  async updateUser(userData) {
    const current = this.getUser();
    const updated = { ...current, ...userData };
    localStorage.setItem(DVM_STORAGE_KEYS.USER, JSON.stringify(updated));

    // Sync to backend DB if session token exists
    const token = this.getAuthToken();
    if (token) {
      try {
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            full_name: updated.name || updated.full_name,
            email: updated.email
          })
        });
      } catch (e) {
        console.warn('[DVM] Backend profile sync postponed:', e.message);
      }
    }

    return updated;
  },

  async syncWithBackend() {
    const token = this.getAuthToken();
    if (!token) return;

    try {
      const resp = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.profile) {
          const current = this.getUser();
          const merged = {
            ...current,
            name: data.profile.full_name || current.name,
            email: data.profile.email || current.email,
            mobile: data.profile.phone_number || current.mobile,
            role: data.profile.role || current.role
          };
          localStorage.setItem(DVM_STORAGE_KEYS.USER, JSON.stringify(merged));
          document.querySelectorAll('.dynamic-user-name').forEach(el => el.textContent = merged.name);
        }
      }
    } catch (_) {}
  },

  // Document Operations
  getDocuments() {
    try {
      return JSON.parse(localStorage.getItem(DVM_STORAGE_KEYS.DOCUMENTS)) || [];
    } catch {
      return [];
    }
  },

  getDocumentById(docId) {
    const docs = this.getDocuments();
    return docs.find(d => d.id === docId) || null;
  },

  saveDocuments(docs) {
    localStorage.setItem(DVM_STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
  },

  addDocument(newDoc, initialVersion) {
    const docs = this.getDocuments();
    const docId = 'doc-' + Date.now();
    
    const docEntry = {
      id: docId,
      name: newDoc.name,
      type: newDoc.type || this.inferFileType(newDoc.name),
      currentVersion: newDoc.version || 'v1.0',
      lastUpdated: 'Just now',
      owner: this.getUser().name,
      status: 'Active',
      size: newDoc.size || '1.5 MB',
      totalVersions: 1
    };

    docs.unshift(docEntry);
    this.saveDocuments(docs);

    // Save initial version
    const allVersions = this.getAllVersionsMap();
    allVersions[docId] = [
      {
        version: docEntry.currentVersion,
        type: 'Initial Baseline',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        author: docEntry.owner,
        size: docEntry.size,
        description: initialVersion.description || 'Initial document upload',
        content: initialVersion.content || `=============================================================\nDOCUMENT: ${docEntry.name}\nBASELINE: ${docEntry.currentVersion}\nSTATUS: Initial Release\n=============================================================\n\nUploaded by ${docEntry.owner}.\nChange Description: ${initialVersion.description || 'Initial document baseline.'}`
      }
    ];
    localStorage.setItem(DVM_STORAGE_KEYS.VERSIONS, JSON.stringify(allVersions));

    // Audit & Notification
    this.addActivity('Upload', docEntry.name, docEntry.currentVersion, 'Success');
    this.addNotification('New Document Uploaded', `${docEntry.name} (${docEntry.currentVersion}) has been added to the repository.`, 'fa-file-arrow-up', 'text-primary');

    return docEntry;
  },

  archiveDocument(docId) {
    const docs = this.getDocuments();
    const target = docs.find(d => d.id === docId);
    if (target) {
      target.status = target.status === 'Archived' ? 'Active' : 'Archived';
      this.saveDocuments(docs);
      this.addActivity('Archive', target.name, target.currentVersion, target.status);
      this.addNotification('Document Status Changed', `${target.name} is now ${target.status}.`, 'fa-box-archive', 'text-warning');
      return target;
    }
    return null;
  },

  // Version Operations
  getAllVersionsMap() {
    try {
      return JSON.parse(localStorage.getItem(DVM_STORAGE_KEYS.VERSIONS)) || {};
    } catch {
      return {};
    }
  },

  getVersionsForDocument(docId) {
    const all = this.getAllVersionsMap();
    if (all[docId]) {
      return all[docId];
    }
    // Fallback generate default versions if missing
    const doc = this.getDocumentById(docId);
    if (doc) {
      return [
        {
          version: doc.currentVersion,
          type: 'Current Version',
          date: doc.lastUpdated,
          author: doc.owner,
          size: doc.size,
          description: 'Document version baseline',
          content: `Content for ${doc.name} at version ${doc.currentVersion}`
        }
      ];
    }
    return [];
  },

  addVersionToDocument(docId, versionData) {
    const docs = this.getDocuments();
    const doc = docs.find(d => d.id === docId);
    if (!doc) return false;

    const all = this.getAllVersionsMap();
    const versions = all[docId] || [];

    const newVersionEntry = {
      version: versionData.version,
      type: 'New Version',
      date: 'Just now',
      author: this.getUser().name,
      size: versionData.size || doc.size,
      description: versionData.description || 'Version update',
      content: versionData.content || `Content for ${doc.name} updated at version ${versionData.version}`
    };

    versions.push(newVersionEntry);
    all[docId] = versions;
    localStorage.setItem(DVM_STORAGE_KEYS.VERSIONS, JSON.stringify(all));

    // Update document record
    doc.currentVersion = versionData.version;
    doc.lastUpdated = 'Just now';
    doc.totalVersions = versions.length;
    this.saveDocuments(docs);

    // Audit & Notification
    this.addActivity('Upload', doc.name, versionData.version, 'Success');
    this.addNotification('Document Version Updated', `${doc.name} updated to ${versionData.version}.`, 'fa-code-branch', 'text-primary');

    return true;
  },

  restoreVersion(docId, targetVersion) {
    const docs = this.getDocuments();
    const doc = docs.find(d => d.id === docId);
    if (!doc) return false;

    const versions = this.getVersionsForDocument(docId);
    const target = versions.find(v => v.version === targetVersion);
    if (!target) return false;

    // SCM Safe Restore: Does NOT destroy history, updates active pointer
    doc.currentVersion = targetVersion;
    doc.lastUpdated = 'Just now (Restored)';
    this.saveDocuments(docs);

    this.addActivity('Restore', doc.name, targetVersion, 'Success');
    this.addNotification('Version Restored', `${doc.name} restored to historical baseline ${targetVersion}. Existing history preserved.`, 'fa-rotate-left', 'text-success');

    return true;
  },

  // Document File Download Simulation (Generates actual file representation)
  downloadDocument(docName, version, content = null) {
    const blobContent = content || 
`=====================================================================
DOCUMENT VERSION MANAGER - SCM REPOSITORY EXPORT
=====================================================================
Document:    ${docName}
Version:     ${version || 'Current'}
Exported By: ${this.getUser().name}
Date:        ${new Date().toISOString()}
Integrity:   SHA-256 Verified (Mock SCM Signature)
=====================================================================

This is a certified export from Document Version Manager.
All historical versions and changelog trails are safely preserved
in the SCM repository.
`;
    const blob = new Blob([blobContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docName.replace(/\.[^/.]+$/, '')}_${version || 'current'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast('Download Started', `Downloading representation for ${docName} (${version || 'current'}).`, 'info');
    this.addActivity('Download', docName, version || 'current', 'Success');
  },

  // Notifications
  getNotifications() {
    try {
      return JSON.parse(localStorage.getItem(DVM_STORAGE_KEYS.NOTIFICATIONS)) || [];
    } catch {
      return [];
    }
  },

  addNotification(title, message, icon = 'fa-bell', iconColor = 'text-primary') {
    const list = this.getNotifications();
    list.unshift({
      id: 'notif-' + Date.now(),
      title,
      message,
      time: 'Just now',
      read: false,
      icon,
      iconColor
    });
    localStorage.setItem(DVM_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    this.updateNotificationBadge();
  },

  markAllNotificationsRead() {
    const list = this.getNotifications();
    list.forEach(n => n.read = true);
    localStorage.setItem(DVM_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    this.updateNotificationBadge();
  },

  // Activities
  getActivities() {
    try {
      return JSON.parse(localStorage.getItem(DVM_STORAGE_KEYS.ACTIVITIES)) || [];
    } catch {
      return [];
    }
  },

  addActivity(action, document, version, status = 'Success') {
    const list = this.getActivities();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    list.unshift({
      id: 'act-' + Date.now(),
      user: this.getUser().name,
      action,
      document,
      version,
      date: dateStr,
      status
    });
    localStorage.setItem(DVM_STORAGE_KEYS.ACTIVITIES, JSON.stringify(list.slice(0, 30)));
  },

  // UI Toast System
  setupToastContainer() {
    if (!document.getElementById('toastStack')) {
      const container = document.createElement('div');
      container.id = 'toastStack';
      container.className = 'toast-stack';
      document.body.appendChild(container);
    }
  },

  showToast(title, message, type = 'info') {
    this.setupToastContainer();
    const stack = document.getElementById('toastStack');
    
    let iconClass = 'fa-info-circle text-primary';
    if (type === 'success') iconClass = 'fa-circle-check text-success';
    if (type === 'danger' || type === 'error') iconClass = 'fa-circle-exclamation text-danger';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation text-warning';

    const toast = document.createElement('div');
    toast.className = 'toast-custom';
    toast.innerHTML = `
      <i class="fa-solid ${iconClass} toast-icon"></i>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;

    stack.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  },

  updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge-count');
    if (badge) {
      const notifs = this.getNotifications();
      const unread = notifs.filter(n => !n.read).length;
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'inline-block' : 'none';
    }
  },

  inferFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['pdf', 'docx', 'txt', 'pptx', 'xlsx'].includes(ext)) return ext;
    if (['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext)) return 'image';
    return 'docx';
  },

  setupGlobalHandlers() {
    // Sidebar toggle for mobile/tablet
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.app-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show-sidebar');
      });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (sidebar && sidebar.classList.contains('show-sidebar')) {
        if (!sidebar.contains(e.target) && !e.target.closest('#sidebarToggle')) {
          sidebar.classList.remove('show-sidebar');
        }
      }
    });

    this.updateNotificationBadge();
  }
};

// Auto-initialize on script load
document.addEventListener('DOMContentLoaded', () => {
  DVM.init();
});
