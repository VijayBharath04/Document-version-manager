/**
 * DOCUMENT VERSION MANAGER - Version History Controller
 * Handles vertical timeline, version inspection, download, and safe restore
 */

document.addEventListener('DOMContentLoaded', () => {
  DVM.checkAuth(true);

  const urlParams = new URLSearchParams(window.location.search);
  let activeDocId = urlParams.get('docId') || 'doc-1';

  const docSelect = document.getElementById('versionDocSelector');
  const timelineContainer = document.getElementById('versionTimelineList');

  // Populate Document Selector Dropdown
  function setupDocSelector() {
    if (!docSelect) return;
    const docs = DVM.getDocuments();
    docSelect.innerHTML = '';
    
    docs.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.name} (${d.currentVersion})`;
      if (d.id === activeDocId) opt.selected = true;
      docSelect.appendChild(opt);
    });

    docSelect.addEventListener('change', (e) => {
      activeDocId = e.target.value;
      const newUrl = `${window.location.pathname}?docId=${activeDocId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      renderVersionHistory(activeDocId);
    });
  }

  // Render Version Timeline & Metadata
  function renderVersionHistory(docId) {
    const doc = DVM.getDocumentById(docId);
    if (!doc) {
      if (timelineContainer) {
        timelineContainer.innerHTML = `
          <div class="card-modern p-5 text-center">
            <i class="fa-solid fa-file-circle-xmark text-muted fs-1 mb-3"></i>
            <h5>Document Not Found</h5>
            <p class="text-muted">The requested document does not exist or has been removed.</p>
            <a href="dashboard.html" class="btn btn-primary btn-sm">Return to Dashboard</a>
          </div>
        `;
      }
      return;
    }

    // Update Header Metadata Elements
    const titleEl = document.getElementById('historyDocTitle');
    const badgeEl = document.getElementById('historyCurrentBadge');
    const metaEl = document.getElementById('historyDocMeta');
    const iconEl = document.getElementById('historyDocIcon');

    if (titleEl) titleEl.textContent = doc.name;
    if (badgeEl) badgeEl.textContent = doc.currentVersion;
    if (metaEl) {
      metaEl.textContent = `Owner: ${doc.owner} • Last modified: ${doc.lastUpdated} • File size: ${doc.size}`;
    }

    // Set icon
    if (iconEl) {
      let icon = 'fa-file-lines';
      if (doc.type === 'pdf') icon = 'fa-file-pdf text-danger';
      else if (doc.type === 'docx') icon = 'fa-file-word text-primary';
      else if (doc.type === 'pptx') icon = 'fa-file-powerpoint text-warning';
      else if (doc.type === 'xlsx') icon = 'fa-file-excel text-success';
      iconEl.className = `fa-solid ${icon} fs-2`;
    }

    const versions = DVM.getVersionsForDocument(docId);
    if (!timelineContainer) return;

    timelineContainer.innerHTML = '';

    // Render versions in reverse chronological order (newest first)
    const reversedVersions = [...versions].reverse();

    reversedVersions.forEach((v, index) => {
      const isCurrent = (v.version === doc.currentVersion);
      const item = document.createElement('div');
      item.className = `timeline-item ${isCurrent ? 'is-current' : ''}`;

      item.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-card">
          <div class="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-2">
            <div class="d-flex align-items-center gap-2">
              <span class="badge-version fs-6">${v.version}</span>
              ${isCurrent ? '<span class="badge-status-active"><i class="fa-solid fa-check" style="font-size: 8px;"></i> Current Version</span>' : ''}
              <span class="badge-tag">${v.type || 'Revision'}</span>
            </div>
            <div class="text-muted small">
              <i class="fa-regular fa-calendar me-1"></i> ${v.date}
            </div>
          </div>

          <p class="text-dark mb-3 small fw-medium">
            ${v.description || 'Routine version update commit.'}
          </p>

          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2 border-top">
            <div class="text-muted small">
              <i class="fa-regular fa-user me-1"></i> ${v.author} • <i class="fa-solid fa-hard-drive me-1 ms-2"></i> ${v.size || doc.size}
            </div>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-sm btn-outline-primary" onclick="viewVersionContent('${doc.id}', '${v.version}')" title="Preview Content">
                <i class="fa-regular fa-eye me-1"></i> View
              </button>
              <button class="btn btn-sm btn-outline-primary" onclick="downloadSpecificVersion('${doc.name}', '${v.version}')" title="Download This Version">
                <i class="fa-solid fa-download me-1"></i> Download
              </button>
              <a href="compare.html?docId=${doc.id}&vA=${v.version}&vB=${doc.currentVersion}" class="btn btn-sm btn-secondary-soft" title="Compare with Current">
                <i class="fa-solid fa-code-compare me-1"></i> Compare
              </a>
              ${!isCurrent ? `
                <button class="btn btn-sm btn-primary" onclick="openRestoreModal('${doc.id}', '${v.version}')" title="Restore this historical baseline">
                  <i class="fa-solid fa-rotate-left me-1"></i> Restore
                </button>
              ` : `
                <button class="btn btn-sm btn-secondary-soft" disabled>
                  <i class="fa-solid fa-check me-1"></i> Active
                </button>
              `}
            </div>
          </div>
        </div>
      `;
      timelineContainer.appendChild(item);
    });
  }

  // Restore Modal Logic
  let targetRestoreDocId = null;
  let targetRestoreVersion = null;

  const restoreModal = document.getElementById('restoreModal');
  const cancelRestoreBtn = document.getElementById('cancelRestoreBtn');
  const confirmRestoreBtn = document.getElementById('confirmRestoreBtn');

  if (cancelRestoreBtn && restoreModal) {
    cancelRestoreBtn.addEventListener('click', () => {
      restoreModal.classList.remove('is-active');
    });
  }

  if (confirmRestoreBtn && restoreModal) {
    confirmRestoreBtn.addEventListener('click', () => {
      if (targetRestoreDocId && targetRestoreVersion) {
        const success = DVM.restoreVersion(targetRestoreDocId, targetRestoreVersion);
        if (success) {
          DVM.showToast('Version Restored', `Version ${targetRestoreVersion} is now the active baseline. Historical records preserved.`, 'success');
          restoreModal.classList.remove('is-active');
          renderVersionHistory(targetRestoreDocId);
        }
      }
    });
  }

  // View Content Modal Logic
  const versionPreviewModal = document.getElementById('versionPreviewModal');
  const closeVersionPreviewBtn = document.getElementById('closeVersionPreviewBtn');
  if (closeVersionPreviewBtn && versionPreviewModal) {
    closeVersionPreviewBtn.addEventListener('click', () => {
      versionPreviewModal.classList.remove('is-active');
    });
  }

  window.openRestoreModal = function(docId, version) {
    targetRestoreDocId = docId;
    targetRestoreVersion = version;
    const doc = DVM.getDocumentById(docId);

    const docNameEl = document.getElementById('restoreTargetDocName');
    const verBadgeEl = document.getElementById('restoreTargetVerBadge');

    if (docNameEl && doc) docNameEl.textContent = doc.name;
    if (verBadgeEl) verBadgeEl.textContent = version;

    if (restoreModal) restoreModal.classList.add('is-active');
  };

  window.viewVersionContent = function(docId, version) {
    const doc = DVM.getDocumentById(docId);
    const versions = DVM.getVersionsForDocument(docId);
    const vObj = versions.find(v => v.version === version);

    const titleEl = document.getElementById('previewModalTitle');
    const verBadgeEl = document.getElementById('previewModalVerBadge');
    const contentEl = document.getElementById('previewModalContent');

    if (titleEl && doc) titleEl.textContent = doc.name;
    if (verBadgeEl) verBadgeEl.textContent = version;
    if (contentEl) {
      contentEl.textContent = vObj ? vObj.content : `No content representation available for version ${version}.`;
    }

    if (versionPreviewModal) versionPreviewModal.classList.add('is-active');
  };

  window.downloadSpecificVersion = function(docName, version) {
    const doc = DVM.getDocuments().find(d => d.name === docName);
    let content = null;
    if (doc) {
      const versions = DVM.getVersionsForDocument(doc.id);
      const vObj = versions.find(v => v.version === version);
      if (vObj) content = vObj.content;
    }
    DVM.downloadDocument(docName, version, content);
  };

  setupDocSelector();
  renderVersionHistory(activeDocId);
});
