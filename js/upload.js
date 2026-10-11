/**
 * DOCUMENT VERSION MANAGER - Upload Document Controller
 * Handles drag-and-drop, metadata extraction, simulated progress, and version recording
 */

document.addEventListener('DOMContentLoaded', () => {
  DVM.checkAuth(true);

  const dropzone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('fileInput');
  const filePreviewCard = document.getElementById('filePreviewCard');
  const previewFileName = document.getElementById('previewFileName');
  const previewFileSize = document.getElementById('previewFileSize');
  const previewFileType = document.getElementById('previewFileType');
  const previewFileIcon = document.getElementById('previewFileIcon');

  const uploadModeRadios = document.querySelectorAll('input[name="uploadMode"]');
  const existingDocGroup = document.getElementById('existingDocGroup');
  const existingDocSelect = document.getElementById('existingDocSelect');
  const docNameInput = document.getElementById('docNameInput');
  const versionInput = document.getElementById('versionInput');
  const changeDescInput = document.getElementById('changeDescInput');
  const uploadForm = document.getElementById('uploadForm');

  const progressWrapper = document.getElementById('uploadProgressWrapper');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressStatusText = document.getElementById('progressStatusText');
  const progressPercentText = document.getElementById('progressPercentText');
  const uploadSubmitBtn = document.getElementById('uploadSubmitBtn');

  let selectedFileObject = null;

  // Populate existing documents dropdown
  function populateExistingDocs() {
    if (!existingDocSelect) return;
    existingDocSelect.innerHTML = '<option value="">-- Choose Existing Document --</option>';
    const docs = DVM.getDocuments();
    docs.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.name} (Current: ${d.currentVersion})`;
      existingDocSelect.appendChild(opt);
    });
  }
  populateExistingDocs();

  // Mode switch: New Document vs New Version of Existing
  uploadModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'existing') {
        if (existingDocGroup) existingDocGroup.style.display = 'block';
        if (docNameInput) docNameInput.readOnly = true;
      } else {
        if (existingDocGroup) existingDocGroup.style.display = 'none';
        if (docNameInput) {
          docNameInput.readOnly = false;
          docNameInput.value = selectedFileObject ? selectedFileObject.name : '';
        }
        if (versionInput) versionInput.value = 'v1.0';
      }
    });
  });

  // When existing document is picked, calculate next version suggestion
  if (existingDocSelect) {
    existingDocSelect.addEventListener('change', (e) => {
      const docId = e.target.value;
      if (docId) {
        const doc = DVM.getDocumentById(docId);
        if (doc) {
          if (docNameInput) docNameInput.value = doc.name;
          // Suggest next version e.g. v3.0 -> v3.1 or v4.0
          const cur = doc.currentVersion.replace('v', '');
          const parts = cur.split('.');
          if (parts.length >= 2) {
            const nextMinor = `v${parts[0]}.${parseInt(parts[1] || '0') + 1}`;
            if (versionInput) versionInput.value = nextMinor;
          } else {
            if (versionInput) versionInput.value = `v${parseInt(cur || '1') + 1}.0`;
          }
          if (changeDescInput) changeDescInput.placeholder = `Describe modifications made to ${doc.name}...`;
        }
      }
    });
  }

  // File Dropzone Events
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        handleFileSelection(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  // Display selected file metadata
  function handleFileSelection(file) {
    selectedFileObject = file;
    const isNewMode = document.querySelector('input[name="uploadMode"]:checked')?.value === 'new';

    if (previewFileName) previewFileName.textContent = file.name;
    if (previewFileSize) previewFileSize.textContent = formatBytes(file.size);
    if (previewFileType) previewFileType.textContent = file.type || file.name.split('.').pop().toUpperCase();
    
    // Icon badge update
    const ext = file.name.split('.').pop().toLowerCase();
    let icon = 'fa-file-lines';
    if (ext === 'pdf') icon = 'fa-file-pdf text-danger';
    else if (['doc', 'docx'].includes(ext)) icon = 'fa-file-word text-primary';
    else if (['ppt', 'pptx'].includes(ext)) icon = 'fa-file-powerpoint text-warning';
    else if (['xls', 'xlsx'].includes(ext)) icon = 'fa-file-excel text-success';
    else if (['jpg', 'jpeg', 'png', 'svg'].includes(ext)) icon = 'fa-file-image text-info';

    if (previewFileIcon) {
      previewFileIcon.className = `fa-solid ${icon} fs-3`;
    }

    if (filePreviewCard) filePreviewCard.style.display = 'flex';

    if (isNewMode && docNameInput) {
      docNameInput.value = file.name;
    }
  }

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Handle Form Submission with simulated progress bar
  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!selectedFileObject && !docNameInput.value.trim()) {
        DVM.showToast('Validation Error', 'Please select a document or specify a document name.', 'warning');
        return;
      }

      const uploadMode = document.querySelector('input[name="uploadMode"]:checked')?.value || 'new';
      const docName = docNameInput.value.trim() || (selectedFileObject ? selectedFileObject.name : 'Untitled Document.docx');
      const version = versionInput.value.trim() || 'v1.0';
      const desc = changeDescInput.value.trim() || (uploadMode === 'new' ? 'Initial document baseline upload' : 'Incremental version update');
      const formattedSize = selectedFileObject ? formatBytes(selectedFileObject.size) : '2.1 MB';

      // Lock UI and show progress bar
      if (uploadSubmitBtn) uploadSubmitBtn.disabled = true;
      if (progressWrapper) progressWrapper.style.display = 'block';

      let step = 0;
      const progressSteps = [
        { pct: 25, label: 'Analyzing document structure & file integrity...' },
        { pct: 60, label: 'Generating SHA-256 SCM hash and version baseline...' },
        { pct: 90, label: 'Writing version metadata to repository...' },
        { pct: 100, label: 'Document uploaded successfully!' }
      ];

      const interval = setInterval(() => {
        if (step < progressSteps.length) {
          const currentStep = progressSteps[step];
          if (progressBar) progressBar.style.width = `${currentStep.pct}%`;
          if (progressPercentText) progressPercentText.textContent = `${currentStep.pct}%`;
          if (progressStatusText) progressStatusText.textContent = currentStep.label;
          step++;
        } else {
          clearInterval(interval);
          finishUpload(uploadMode, docName, version, desc, formattedSize);
        }
      }, 450);
    });
  }

  function finishUpload(uploadMode, docName, version, desc, size) {
    if (uploadMode === 'existing') {
      const selectedDocId = existingDocSelect ? existingDocSelect.value : null;
      if (selectedDocId) {
        DVM.addVersionToDocument(selectedDocId, {
          version: version,
          description: desc,
          size: size,
          content: `Updated version ${version} for ${docName}.\nChange Log: ${desc}\nTimestamp: ${new Date().toISOString()}`
        });
        DVM.showToast('Version Created', `Added ${version} to ${docName}.`, 'success');
        setTimeout(() => {
          window.location.href = `versions.html?docId=${selectedDocId}`;
        }, 1200);
      }
    } else {
      const newDoc = DVM.addDocument(
        { name: docName, version: version, size: size },
        { description: desc }
      );
      DVM.showToast('Document Uploaded', `${docName} (${version}) is now tracked in SCM.`, 'success');
      setTimeout(() => {
        window.location.href = `versions.html?docId=${newDoc.id}`;
      }, 1200);
    }
  }
});
