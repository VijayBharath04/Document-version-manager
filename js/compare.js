/**
 * DOCUMENT VERSION MANAGER - Version Comparison & Visual Diff Engine
 * SCM Side-by-Side Diff Analysis with Addition, Deletion, and Modification Highlighting
 */

document.addEventListener('DOMContentLoaded', () => {
  DVM.checkAuth(true);

  const urlParams = new URLSearchParams(window.location.search);
  let activeDocId = urlParams.get('docId') || 'doc-1';
  let paramVA = urlParams.get('vA');
  let paramVB = urlParams.get('vB');

  const docSelect = document.getElementById('compareDocSelector');
  const verASelect = document.getElementById('compareVersionA');
  const verBSelect = document.getElementById('compareVersionB');
  const compareBtn = document.getElementById('runCompareBtn');

  // Populate Document Selector
  function setupDocumentSelector() {
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
      populateVersionDropdowns(activeDocId);
    });
  }

  // Populate Version A and Version B Dropdowns
  function populateVersionDropdowns(docId) {
    if (!verASelect || !verBSelect) return;

    const versions = DVM.getVersionsForDocument(docId);
    verASelect.innerHTML = '';
    verBSelect.innerHTML = '';

    if (versions.length < 2) {
      verASelect.innerHTML = '<option value="">No versions available to compare</option>';
      verBSelect.innerHTML = '<option value="">No versions available to compare</option>';
      return;
    }

    versions.forEach((v, index) => {
      const optA = document.createElement('option');
      optA.value = v.version;
      optA.textContent = `${v.version} - ${v.description ? v.description.slice(0, 35) + '...' : v.date}`;

      const optB = document.createElement('option');
      optB.value = v.version;
      optB.textContent = `${v.version} - ${v.description ? v.description.slice(0, 35) + '...' : v.date}`;

      // Set default selections
      if (paramVA && v.version === paramVA) {
        optA.selected = true;
      } else if (!paramVA && index === Math.max(0, versions.length - 2)) {
        optA.selected = true;
      }

      if (paramVB && v.version === paramVB) {
        optB.selected = true;
      } else if (!paramVB && index === versions.length - 1) {
        optB.selected = true;
      }

      verASelect.appendChild(optA);
      verBSelect.appendChild(optB);
    });

    // Run comparison initially
    runDiffComparison();
  }

  // Diff Engine: Calculates line-by-line differences between Version A and Version B
  function runDiffComparison() {
    const vA = verASelect.value;
    const vB = verBSelect.value;

    if (!vA || !vB) {
      DVM.showToast('Select Versions', 'Please select two versions to compare.', 'warning');
      return;
    }

    const doc = DVM.getDocumentById(activeDocId);
    const versions = DVM.getVersionsForDocument(activeDocId);

    const versionObjA = versions.find(v => v.version === vA);
    const versionObjB = versions.find(v => v.version === vB);

    if (!versionObjA || !versionObjB) {
      DVM.showToast('Comparison Error', 'One or both versions could not be loaded.', 'danger');
      return;
    }

    // Update panel headers
    const labelA = document.getElementById('panelHeaderA');
    const labelB = document.getElementById('panelHeaderB');
    if (labelA) labelA.textContent = `VERSION ${vA} (Baseline A)`;
    if (labelB) labelB.textContent = `VERSION ${vB} (Baseline B)`;

    // Perform line-by-line diff computation
    const linesA = (versionObjA.content || '').split('\n');
    const linesB = (versionObjB.content || '').split('\n');

    const maxLines = Math.max(linesA.length, linesB.length);
    const panelAContent = document.getElementById('diffPanelAContent');
    const panelBContent = document.getElementById('diffPanelBContent');

    if (!panelAContent || !panelBContent) return;

    panelAContent.innerHTML = '';
    panelBContent.innerHTML = '';

    let addedCount = 0;
    let removedCount = 0;
    let modifiedCount = 0;

    for (let i = 0; i < maxLines; i++) {
      const textA = linesA[i];
      const textB = linesB[i];

      const lineNum = i + 1;

      if (textA !== undefined && textB !== undefined) {
        if (textA === textB) {
          // Unchanged
          panelAContent.appendChild(createDiffLine(lineNum, ' ', textA, 'unchanged'));
          panelBContent.appendChild(createDiffLine(lineNum, ' ', textB, 'unchanged'));
        } else {
          // Modified line
          modifiedCount++;
          panelAContent.appendChild(createDiffLine(lineNum, '~', textA, 'diff-line-modified'));
          panelBContent.appendChild(createDiffLine(lineNum, '~', textB, 'diff-line-modified'));
        }
      } else if (textA !== undefined && textB === undefined) {
        // Line removed in B
        removedCount++;
        panelAContent.appendChild(createDiffLine(lineNum, '-', textA, 'diff-line-removed'));
        panelBContent.appendChild(createDiffLine(lineNum, ' ', '', 'diff-line-empty'));
      } else if (textA === undefined && textB !== undefined) {
        // Line added in B
        addedCount++;
        panelAContent.appendChild(createDiffLine(lineNum, ' ', '', 'diff-line-empty'));
        panelBContent.appendChild(createDiffLine(lineNum, '+', textB, 'diff-line-added'));
      }
    }

    // Update Summary Metrics
    const totalChanges = addedCount + removedCount + modifiedCount;
    const summaryCountEl = document.getElementById('diffTotalChangesCount');
    const addedCountEl = document.getElementById('diffAddedCount');
    const removedCountEl = document.getElementById('diffRemovedCount');
    const modifiedCountEl = document.getElementById('diffModifiedCount');

    if (summaryCountEl) summaryCountEl.textContent = `${totalChanges} changes detected`;
    if (addedCountEl) addedCountEl.textContent = `${addedCount} Added`;
    if (removedCountEl) removedCountEl.textContent = `${removedCount} Removed`;
    if (modifiedCountEl) modifiedCountEl.textContent = `${modifiedCount} Modified`;

    // Log Activity
    DVM.addActivity('Compare', doc ? doc.name : 'Document', `${vA} vs ${vB}`, 'Success');
  }

  function createDiffLine(lineNo, marker, text, className) {
    const div = document.createElement('div');
    div.className = `diff-line ${className}`;
    div.innerHTML = `
      <span class="diff-line-number">${lineNo}</span>
      <span class="diff-line-marker">${marker}</span>
      <span class="diff-line-text">${escapeHtml(text)}</span>
    `;
    return div;
  }

  function escapeHtml(str) {
    if (!str) return '&nbsp;';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (compareBtn) {
    compareBtn.addEventListener('click', () => {
      runDiffComparison();
      DVM.showToast('Comparison Updated', `Analyzed differences between ${verASelect.value} and ${verBSelect.value}.`, 'info');
    });
  }

  // Quick Restore from Compare Page
  window.restoreFromCompare = function(versionChoice) {
    const targetVersion = (versionChoice === 'A') ? verASelect.value : verBSelect.value;
    const doc = DVM.getDocumentById(activeDocId);
    if (!doc || !targetVersion) return;

    if (confirm(`Restore ${doc.name} to version ${targetVersion}? This will make ${targetVersion} the current baseline while preserving all history.`)) {
      DVM.restoreVersion(activeDocId, targetVersion);
      DVM.showToast('Version Restored', `${doc.name} is now restored to ${targetVersion}.`, 'success');
      setTimeout(() => {
        window.location.href = `versions.html?docId=${activeDocId}`;
      }, 1000);
    }
  };

  setupDocumentSelector();
  populateVersionDropdowns(activeDocId);
});
