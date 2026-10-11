/**
 * DOCUMENT VERSION MANAGER - Main Dashboard Controller
 * Handles metrics computation, document tables, search/filter, and actions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  DVM.checkAuth(true);

  // Setup user greetings
  const user = DVM.getUser();
  const userNameElements = document.querySelectorAll('.dynamic-user-name');
  userNameElements.forEach(el => el.textContent = user.name);

  const greetingEl = document.getElementById('dashboardGreeting');
  if (greetingEl) {
    const hour = new Date().getHours();
    let greet = 'Good Morning';
    if (hour >= 12 && hour < 17) greet = 'Good Afternoon';
    else if (hour >= 17) greet = 'Good Evening';
    greetingEl.textContent = `${greet}, ${user.name.split(' ')[0]}`;
  }

  // Load and Render
  renderDashboardStats();
  renderDocumentsTable();
  renderActivityFeed();
  setupSearchAndFilters();
  setupModals();
});

// Render the 4 SaaS Metric Summary Cards
function renderDashboardStats() {
  const docs = DVM.getDocuments();
  const allVersionsMap = DVM.getAllVersionsMap();

  let totalVersionsCount = 0;
  Object.values(allVersionsMap).forEach(vArr => {
    totalVersionsCount += vArr.length;
  });
  // If count is lower than documents, calculate based on totalVersions field
  if (totalVersionsCount < docs.length) {
    totalVersionsCount = docs.reduce((acc, d) => acc + (d.totalVersions || 1), 0);
  }

  const totalDocsEl = document.getElementById('statTotalDocs');
  const totalVersEl = document.getElementById('statTotalVers');
  const storageEl = document.getElementById('statStorageUsed');
  const updatesEl = document.getElementById('statRecentUpdates');

  if (totalDocsEl) totalDocsEl.textContent = docs.length;
  if (totalVersEl) totalVersEl.textContent = totalVersionsCount;
  if (storageEl) storageEl.textContent = '2.4 GB';
  if (updatesEl) updatesEl.textContent = '8';
}

// Current Filter State
let currentFilter = 'All';
let currentSearchQuery = '';

function setupSearchAndFilters() {
  const searchInput = document.getElementById('docSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim();
      renderDocumentsTable();
    });
  }

  const filterTabs = document.querySelectorAll('.filter-tab-btn');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter') || 'All';
      renderDocumentsTable();
    });
  });
}

// Render Document Rows
function renderDocumentsTable() {
  const tbody = document.getElementById('documentsTableBody');
  const emptyState = document.getElementById('emptyDocsState');
  if (!tbody) return;

  const docs = DVM.getDocuments();

  // Filter criteria
  const filtered = docs.filter(doc => {
    // Type/Category Filter
    let matchesCategory = true;
    if (currentFilter === 'PDF') matchesCategory = (doc.type === 'pdf');
    else if (currentFilter === 'DOCX') matchesCategory = (doc.type === 'docx');
    else if (currentFilter === 'TXT') matchesCategory = (doc.type === 'txt');
    else if (currentFilter === 'Other') matchesCategory = ['pptx', 'xlsx', 'image'].includes(doc.type);
    else if (currentFilter === 'Archived') matchesCategory = (doc.status === 'Archived');
    else if (currentFilter === 'All') matchesCategory = true;

    // Search Query Filter
    let matchesSearch = true;
    if (currentSearchQuery) {
      const matchName = doc.name.toLowerCase().includes(currentSearchQuery);
      const matchOwner = doc.owner.toLowerCase().includes(currentSearchQuery);
      const matchVersion = doc.currentVersion.toLowerCase().includes(currentSearchQuery);
      const matchType = doc.type.toLowerCase().includes(currentSearchQuery);
      matchesSearch = matchName || matchOwner || matchVersion || matchType;
    }

    return matchesCategory && matchesSearch;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  } else {
    if (emptyState) emptyState.style.display = 'none';
  }

  filtered.forEach(doc => {
    const tr = document.createElement('tr');
    
    // File icon helper
    let iconClass = 'fa-file-lines';
    let badgeClass = 'doc-icon-txt';
    if (doc.type === 'pdf') { iconClass = 'fa-file-pdf'; badgeClass = 'doc-icon-pdf'; }
    else if (doc.type === 'docx') { iconClass = 'fa-file-word'; badgeClass = 'doc-icon-docx'; }
    else if (doc.type === 'pptx') { iconClass = 'fa-file-powerpoint'; badgeClass = 'doc-icon-pptx'; }
    else if (doc.type === 'xlsx') { iconClass = 'fa-file-excel'; badgeClass = 'doc-icon-xlsx'; }

    // Status badge
    const statusBadge = doc.status === 'Active'
      ? `<span class="badge-status-active"><i class="fa-solid fa-circle" style="font-size: 6px;"></i> Active</span>`
      : `<span class="badge-status-archived"><i class="fa-solid fa-box-archive" style="font-size: 9px;"></i> Archived</span>`;

    tr.innerHTML = `
      <td>
        <div class="doc-name-cell">
          <div class="doc-icon-badge ${badgeClass}">
            <i class="fa-solid ${iconClass}"></i>
          </div>
          <div>
            <div class="fw-bold text-dark">${doc.name}</div>
            <span class="text-muted small">${doc.size} • ${doc.totalVersions || 1} versions</span>
          </div>
        </div>
      </td>
      <td>
        <span class="badge-version">${doc.currentVersion}</span>
      </td>
      <td class="text-muted small">
        <i class="fa-regular fa-clock me-1 text-muted"></i> ${doc.lastUpdated}
      </td>
      <td>
        <div class="small fw-semibold text-dark">${doc.owner}</div>
      </td>
      <td>
        ${statusBadge}
      </td>
      <td>
        <div class="d-flex align-items-center gap-1">
          <button class="btn btn-sm btn-outline-primary" title="View Content" onclick="openPreviewModal('${doc.id}')">
            <i class="fa-regular fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary" title="Download Document" onclick="DVM.downloadDocument('${doc.name}', '${doc.currentVersion}')">
            <i class="fa-solid fa-download"></i>
          </button>
          <a href="versions.html?docId=${doc.id}" class="btn btn-sm btn-outline-primary" title="Version History">
            <i class="fa-solid fa-code-branch"></i>
          </a>
          <a href="compare.html?docId=${doc.id}" class="btn btn-sm btn-secondary-soft" title="Compare Versions">
            <i class="fa-solid fa-code-compare"></i>
          </a>
          <button class="btn btn-sm btn-secondary-soft" title="${doc.status === 'Archived' ? 'Unarchive Document' : 'Archive Document'}" onclick="confirmArchiveDoc('${doc.id}', '${doc.name}')">
            <i class="fa-solid ${doc.status === 'Archived' ? 'fa-box-open' : 'fa-box-archive'}"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Recent SCM Activity Logs
function renderActivityFeed() {
  const container = document.getElementById('activityFeedList');
  if (!container) return;

  const activities = DVM.getActivities().slice(0, 5);
  container.innerHTML = '';

  activities.forEach(act => {
    let icon = 'fa-file-arrow-up text-primary';
    let badge = 'bg-primary-subtle text-primary';
    if (act.action === 'Restore') { icon = 'fa-rotate-left text-success'; badge = 'bg-success-subtle text-success'; }
    if (act.action === 'Compare') { icon = 'fa-code-compare text-warning'; badge = 'bg-warning-subtle text-warning'; }
    if (act.action === 'Archive') { icon = 'fa-box-archive text-secondary'; badge = 'bg-light text-secondary'; }

    const item = document.createElement('div');
    item.className = 'd-flex align-items-center justify-content-between p-3 border-bottom';
    item.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <div class="rounded-circle p-2 bg-light d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div>
          <div class="fw-semibold text-dark small">${act.user} <span class="badge ${badge} ms-1">${act.action}</span></div>
          <div class="text-muted small">${act.document} • <span class="font-monospace">${act.version}</span></div>
        </div>
      </div>
      <div class="text-end">
        <div class="text-muted small">${act.date}</div>
        <span class="badge bg-success-subtle text-success small" style="font-size: 0.7rem;">${act.status}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

// Modals setup
let targetArchiveDocId = null;

function setupModals() {
  const cancelArchiveBtn = document.getElementById('cancelArchiveBtn');
  const confirmArchiveBtn = document.getElementById('confirmArchiveBtn');
  const archiveModal = document.getElementById('archiveModal');

  if (cancelArchiveBtn && archiveModal) {
    cancelArchiveBtn.addEventListener('click', () => {
      archiveModal.classList.remove('is-active');
    });
  }

  if (confirmArchiveBtn && archiveModal) {
    confirmArchiveBtn.addEventListener('click', () => {
      if (targetArchiveDocId) {
        DVM.archiveDocument(targetArchiveDocId);
        DVM.showToast('Document Updated', 'Document archive state changed successfully. Version history remains intact.', 'success');
        archiveModal.classList.remove('is-active');
        renderDocumentsTable();
        renderActivityFeed();
      }
    });
  }

  const closePreviewBtn = document.getElementById('closePreviewBtn');
  const previewModal = document.getElementById('previewModal');
  if (closePreviewBtn && previewModal) {
    closePreviewBtn.addEventListener('click', () => {
      previewModal.classList.remove('is-active');
    });
  }
}

// Global modal triggers
window.confirmArchiveDoc = function(docId, docName) {
  targetArchiveDocId = docId;
  const modal = document.getElementById('archiveModal');
  const nameSpan = document.getElementById('archiveDocName');
  if (nameSpan) nameSpan.textContent = docName;
  if (modal) modal.classList.add('is-active');
};

window.openPreviewModal = function(docId) {
  const doc = DVM.getDocumentById(docId);
  if (!doc) return;

  const versions = DVM.getVersionsForDocument(docId);
  const current = versions.find(v => v.version === doc.currentVersion) || versions[versions.length - 1];

  const modal = document.getElementById('previewModal');
  const title = document.getElementById('previewDocTitle');
  const versionBadge = document.getElementById('previewDocVersion');
  const body = document.getElementById('previewDocBody');

  if (title) title.textContent = doc.name;
  if (versionBadge) versionBadge.textContent = current ? current.version : doc.currentVersion;
  if (body) {
    body.textContent = current ? current.content : `Content preview for ${doc.name}`;
  }

  if (modal) modal.classList.add('is-active');
};
